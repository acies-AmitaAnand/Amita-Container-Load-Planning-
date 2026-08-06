"""
Container Fleet Optimizer
=========================
Key constraint change:
  - FLEET_LIMIT trucks are shared across ALL lane groups combined.
  - Groups are processed in delivery-date order (most urgent first).
  - Each truck carries exactly 1 container.
  - When the fleet is exhausted, remaining pallets go to unallocated.

Actions (function calls — sequential order):
    load_equipment_to_container_spec(row)         → Dict
    open_new_container(spec, idx, group)          → Container
    load_pallets_into_container(container, pallets) → ContainerOptimizationResult
    allocate_fleet_to_groups(groups, fleet_limit) → List[GroupAllocation]
    optimize_group_with_budget(group, spec, max_containers, lifo) → ContainerFleetOptimizationResult
    run_full_optimization(...)                    → GlobalFleetResult
    export_container_json(fleet_result, out_dir)  → List[str]
"""

from __future__ import annotations
from copy import deepcopy
import logging
import uuid
from datetime import date, datetime
from typing import List, Optional, Dict, Any, Tuple

import pandas as pd

from objects.Container import Container
from objects.Pallet import Pallet
from objects.Axle import Axle
from objects.ContainerLoadingRules import ContainerLoadingRules
from objects.ContainerSummary import ContainerSummary
from objects.ContainerOptimizationResult import ContainerOptimizationResult
from objects.ContainerFleetOptimizationResult import ContainerFleetOptimizationResult
from objects.ShipmentGroup import ShipmentGroup


# from placement_engine.placement import (
#     place_pallet, compute_axle_loads, compute_utilization,
#     reset_packer, log_container_summary,
# )



from planning_engine.feature_engineering.transformation import (
    create_pallet_features, breakdown_into_pallets,
    group_pallets_by_lane, sort_pallets_for_loading,
)
from objects.GlobalFleetResult import GlobalFleetResult
from objects.GroupAllocation import GroupAllocation
from planning_engine.metrics.utilization import compute_utilization, log_container_summary
from planning_engine.optimizers.MaxRectPacker import reset_packer
from planning_engine.placement import place_pallet
from planning_engine.validators.axle import compute_axle_loads

logger = logging.getLogger("placement_engine")

# ── Action 1: Map equipment row → Container constructor kwargs ────────────────

def load_equipment_to_container_spec(row: pd.Series) -> Container:
    axle_conf = str(row.get("axle_configuration", "single")).lower()
    if "tandem" in axle_conf or "2" in axle_conf:
        axles = [
            Axle(axleId="FRONT", maxWeight=10000,
                 positionX=float(row.get("internal_length_mm", 12000)) * 0.15),
            Axle(axleId="REAR",  maxWeight=20000,
                 positionX=float(row.get("internal_length_mm", 12000)) * 0.75),
        ]
    else:
        axles = [Axle(axleId="DEFAULT", maxWeight=30000,
                      positionX=float(row.get("internal_length_mm", 12000)) * 0.45)]

    return Container(
        containerType=str(row.get("equipment_name", "CONTAINER")),
        containerDepth=float(row.get("length_mm", 12191)),
        containerWidth=float(row.get("width_mm", 2438)),
        containerHeight=float(row.get("height_mm", 2591)),
        internalDepth=float(row.get("internal_length_mm", 11836)),
        internalWidth=float(row.get("internal_width_mm", 2352)),
        internalHeight=float(row.get("internal_height_mm", 2391)),
        maxPayloadWeightIn_kg=float(row.get("max_payload_weight_kg", 25000)),
        tareWeightIn_kg=float(row.get("tare_weight_kg", 2000)),
        doorWidth=float(row.get("door_width_mm", 2352)),
        doorHeight=float(row.get("door_height_mm", 2391)),
        refrigerationCapable=bool(row.get("refrigeration_capable", False)),
        temperatureMin_c=row.get("temperature_min_c"),
        temperatureMax_c=row.get("temperature_max_c"),
        axles=axles,
        loadingRules=ContainerLoadingRules(
            maxStackHeightIn_mm=float(row.get("max_stack_height_mm", 0) or 0),
            allowStacking=float(row.get("max_stack_height_mm", 0) or 0) > 0,
        ),
    )


# ── Action 2: Open a single fresh container ───────────────────────────────────
 
def open_new_container(
    container_spec: Container,
    container_idx: int,
    group: ShipmentGroup,
) -> Container:
    cid = f"CONT_{group.originLocationId}_{group.destinationLocationId}_{container_idx:03d}"
    summary = ContainerSummary(
        routeId=group.groupId,
        origin=group.originLocationId,
        destinationInSequence=[group.destinationLocationId],
    )
    
    new_container_spec = deepcopy(container_spec)
    new_container_spec.containerId=cid+"_on_"+str(group.deliveryDateWindow)
    new_container_spec.pallets=[]
    new_container_spec.summary=summary
    return new_container_spec


# ── Action 3: Load one container ──────────────────────────────────────────────

def load_pallets_into_container(
    container: Container,
    pallets: List[Pallet],
) -> ContainerOptimizationResult:
    """Try to place each pallet. Returns what was loaded vs what is still pending."""
    loaded:  List[Pallet] = []
    pending: List[Pallet] = []

    for pallet in pallets:
        if place_pallet(container, pallet):
            container.pallets.append(pallet)
            loaded.append(pallet)
        else:
            pending.append(pallet)

    return ContainerOptimizationResult(
        container=container,
        loadedPallets=loaded,
        pendingPallets=pending,
        axleLoads=[],        # computed once when container closes
        utilization=None,    # computed once when container closes
        remainingCapacity=None,
    )


# ── Action 4: Fill containers for one group ───────────────────────────────────
 
def optimize_container_fleet(
    group: ShipmentGroup,
    equipment_spec: Dict[str, Any],
    lifo: bool = True,
    max_containers: int = 999,
) -> ContainerFleetOptimizationResult:
    """
    For a lane (origin → destination):
      - Open a container.
      - Fill it with pallets for the oldest delivery date first.
      - When that date's pallets are exhausted, advance to the next date
        and keep filling the SAME container (it may still have capacity).
      - When the container is full (nothing fits), close it and open the next.
      - Stop when all pallets are loaded or max_containers is reached.
    """
    # Pallets are pre-sorted by date inside the group (group_pallets_by_lane did this).
    # Build an ordered list of unique dates so we can iterate day-by-day.
    from itertools import groupby
 
    # Bucket pallets by date string — order is already date ASC from group_pallets_by_lane
    date_buckets: List[Tuple[str, List[Pallet]]] = [
        (dt, list(ps))
        for dt, ps in groupby(
            group.pallets,
            key=lambda p: p.estimatedDeliveryDate.strftime("%Y-%m-%d")
        )
    ]
 
    all_containers: List[Container]                   = []
    all_results:    List[ContainerOptimizationResult] = []
    unallocated:    List[Pallet]                      = []
    container_idx = 1
 
    date_idx = 0   # which day we are currently filling from
 
    while date_idx < len(date_buckets) and container_idx <= max_containers:
        container      = open_new_container(container_spec=equipment_spec, container_idx=container_idx, group=group)
        loaded_any     = False
        local_date_idx = date_idx   # walk forward inside this container
 
        while local_date_idx < len(date_buckets):
            dt_key, day_pallets = date_buckets[local_date_idx]
 
            result = load_pallets_into_container(container, day_pallets)
 
            if result.loadedPallets:
                loaded_any = True
                # Update the bucket to only what was not loaded (partial day)
                date_buckets[local_date_idx] = (dt_key, result.pendingPallets)
 
                if not result.pendingPallets:
                    # This date is fully loaded — advance the global date cursor
                    date_idx        = local_date_idx + 1
                    local_date_idx += 1
                    # Try to keep filling the same container with the next date
                else:
                    # Container is full mid-day — close it, retry same date next container
                    break
            else:
                if not loaded_any:
                    # Nothing from this date fits at all — skip it entirely
                    unallocated.extend(day_pallets)
                    date_buckets[local_date_idx] = (dt_key, [])
                    date_idx        = local_date_idx + 1
                    local_date_idx += 1
                else:
                    # Container full, next date will start fresh in a new container
                    break

        if not loaded_any:
            break  # safety: nothing loaded in any date — stop

        all_containers.append(container)
        pending_this_container = [p for _, ps in date_buckets[date_idx:] for p in ps]
        axle_loads                 = compute_axle_loads(container)
        utilization, remaining_cap = compute_utilization(container, pending_this_container)
        container.summary.totalPallets     = len(container.pallets)
        container.summary.totalWeightIn_kg = round(container.usedWeightIn_kg, 2)
        container.summary.totalVolumeIn_m3 = round(container.usedVolume_m3, 4)
        log_container_summary(container, pending_this_container)
        all_results.append(ContainerOptimizationResult(
            container=container,
            loadedPallets=list(container.pallets),
            pendingPallets=pending_this_container,
            axleLoads=axle_loads,
            utilization=utilization,
            remainingCapacity=remaining_cap,
        ))
        container_idx += 1
 
    # Anything left in date_buckets after the loop is unallocated
    unallocated += [p for _, ps in date_buckets[date_idx:] for p in ps]
 
    total_wt      = sum(c.usedWeightIn_kg for c in all_containers)
    total_max_wt  = sum(c.maxPayloadWeightIn_kg for c in all_containers)
    total_vol     = sum(c.usedVolume_m3 for c in all_containers)
    total_max_vol = sum(c.maxVolume_m3 for c in all_containers)
 
    return ContainerFleetOptimizationResult(
        containers=all_containers,
        containerResults=all_results,
        unallocated_pallets=unallocated,
        total_pallets=len(group.pallets),
        total_containers=len(all_containers),
        fleet_weight_utilization_pct=round(total_wt  / total_max_wt  * 100, 2) if total_max_wt  else 0,
        fleet_volume_utilization_pct=round(total_vol / total_max_vol * 100, 2) if total_max_vol else 0,
        optimizer_run_id=uuid.uuid4().hex,
    )




# ── Action 5: Full pipeline ───────────────────────────────────────────────────
 
def run_full_optimization(
    shipment_demand_df: pd.DataFrame,
    sku_pallet_df: pd.DataFrame,
    load_equipment_metadata_df: pd.DataFrame,
    lane_master_df: Optional[pd.DataFrame] = None,
    preferred_equipment_type: str = "CONTAINER",
    fleet_limit: int = 10,
    lifo: bool = True,
    planning_date:date = None,
    horizon_days:date = None,
    total_containers: int = 10,
    container_free_after_days: int = 1,
) -> Dict[str, ContainerFleetOptimizationResult]:
    """
    Flow:
      1. Convert units → pallets
      2. Create groups by lane (origin, destination) — sorted by earliest date
      3. For each lane, fill containers day-by-day from the shared fleet budget
    """
    
    shipment_demand_df = shipment_demand_df[shipment_demand_df["estimated_delivery_date"]>=pd.to_datetime(planning_date)] # Filter for date

    candidate_df   = create_pallet_features(shipment_demand_df, sku_pallet_df)
    all_pallets    = breakdown_into_pallets(candidate_df)
    groups         = group_pallets_by_lane(all_pallets, lane_master_df)
 
    mask   = load_equipment_metadata_df["equipment_type"].str.upper() == preferred_equipment_type.upper()
    eq_df  = load_equipment_metadata_df[mask]
    eq_row = eq_df.iloc[0] if len(eq_df) else load_equipment_metadata_df.iloc[0]
    equipment_spec = load_equipment_to_container_spec(eq_row)
 
    results:         Dict[str, ContainerFleetOptimizationResult] = {}
    containers_used: int = 0
 
    for group in groups:
        budget = fleet_limit - containers_used
        if budget <= 0:
            results[group.groupId] = ContainerFleetOptimizationResult(
                containers=[], containerResults=[],
                unallocated_pallets=list(group.pallets),
                total_pallets=len(group.pallets), total_containers=0,
                fleet_weight_utilization_pct=0, fleet_volume_utilization_pct=0,
                optimizer_run_id=uuid.uuid4().hex,
            )
            continue
        result = optimize_container_fleet(
            group, equipment_spec, lifo=lifo, max_containers=budget
        )
        results[group.groupId]  = result
        containers_used        += result.total_containers
 
    return results



def run_full_optimization_daily(
    shipment_demand_df: pd.DataFrame,
    sku_pallet_df: pd.DataFrame,
    load_equipment_metadata_df: pd.DataFrame,
    lane_master_df: Optional[pd.DataFrame] = None,
    preferred_equipment_type: str = "CONTAINER",
    fleet_limit: int = 10,
    lifo: bool = True,
    planning_date: date = None,
    horizon_days: int = 7,
    total_containers: int = 10,
    container_free_after_days: int = 1,
) -> Dict[str, ContainerFleetOptimizationResult]:
    """
    Multi-day rolling container planner.

    Day 0  = planning_date  (no shipments)
    Day 1  = planning_date + 1 day  (first shipment day)
    ...
    Day N  = planning_date + horizon_days

    Container pool
    --------------
    total_containers trucks are shared across all days and all lanes.
    A truck used on day D becomes free again on day D + container_free_after_days.
    container_free_on[i] = first day index the i-th truck is available.

    Overflow rule
    -------------
    Pallets not loaded on day D carry forward to day D+1, prepended before
    that day's own demand (overflow-first).
    """
    if planning_date is None:
        planning_date = date.fromisoformat('2026-04-08')

    # ── Equipment spec ────────────────────────────────────────────────────────
    mask   = load_equipment_metadata_df["equipment_type"].str.upper() == preferred_equipment_type.upper()
    eq_df  = load_equipment_metadata_df[mask]
    eq_row = eq_df.iloc[0] if len(eq_df) else load_equipment_metadata_df.iloc[0]
    equipment_spec = load_equipment_to_container_spec(eq_row)

    # ── Build all pallets from full demand ────────────────────────────────────
    candidate_df = create_pallet_features(shipment_demand_df, sku_pallet_df)
    all_pallets  = breakdown_into_pallets(candidate_df)

    # ── Bucket pallets by (origin, dest, delivery_date) ───────────────────────
    # { "2026-07-07": { "GRP_A_B": [Pallet, ...] } }
    from collections import defaultdict
    from datetime import timedelta

    daily_lane_pallets: Dict[str, Dict[str, list]] = defaultdict(lambda: defaultdict(list))
    for p in all_pallets:
        dk  = p.estimatedDeliveryDate.strftime("%Y-%m-%d")
        lid = f"GRP_{p.originLocationId}_{p.destinationLocationId}"
        daily_lane_pallets[dk][lid].append(p)

    # ── Container pool ────────────────────────────────────────────────────────
    # container_free_on[i] = day index (1-based) when truck i is next available
    container_free_on = [1] * total_containers

    # ── Rolling day loop ──────────────────────────────────────────────────────
    results:  Dict[str, ContainerFleetOptimizationResult] = {}
    # overflow: { lane_id: [Pallet] } — carries forward to next day
    overflow: Dict[str, list] = defaultdict(list)

    for day_idx in range(1, horizon_days + 1):
        day_date = planning_date + timedelta(days=day_idx)
        dk       = day_date.strftime("%Y-%m-%d")

        # How many containers are free today?
        free_today = sum(1 for f in container_free_on if f <= day_idx)
        if free_today == 0:
            # No trucks — all pallets for today carry forward
            for lid, pallets in daily_lane_pallets.get(dk, {}).items():
                overflow[lid].extend(pallets)
            for lid, pallets in overflow.items():
                pass  # already in overflow, stays there
            continue

        # Combine overflow (from previous days) with today's demand per lane
        today_lanes: Dict[str, list] = defaultdict(list)
        # Overflow first
        for lid, pallets in overflow.items():
            today_lanes[lid].extend(pallets)
        # Then today's demand
        for lid, pallets in daily_lane_pallets.get(dk, {}).items():
            today_lanes[lid].extend(pallets)

        if not any(today_lanes.values()):
            overflow = defaultdict(list)
            continue

        overflow = defaultdict(list)  # reset; repopulate from what didn't fit
        containers_used_today = 0

        for lane_id, pallets in today_lanes.items():
            if not pallets:
                continue

            budget = free_today - containers_used_today
            if budget <= 0:
                overflow[lane_id].extend(pallets)
                continue

            # Build a ShipmentGroup for this lane on this day
            origin, dest = _parse_lane_id(lane_id)
            group = ShipmentGroup(
                groupId=f"{lane_id}_{dk}",
                originLocationId=origin,
                destinationLocationId=dest,
                deliveryDateWindow=dk,
                pallets=sort_pallets_for_loading(pallets, lifo=lifo),
                estimatedDeliveryDate=day_date,
            )

            fleet_result = optimize_container_fleet(
                group, equipment_spec,
                lifo=lifo,
                max_containers=budget,
            )

            # Track how many trucks were consumed
            trucks_used = fleet_result.total_containers
            containers_used_today += trucks_used

            # Mark those trucks as busy until day_idx + F
            _occupy_containers(container_free_on, day_idx, trucks_used, container_free_after_days)

            # Carry unloaded pallets forward
            if fleet_result.unallocated_pallets:
                overflow[lane_id].extend(fleet_result.unallocated_pallets)

            # Key: lane_day so each day's result is separate
            result_key = f"{lane_id}_{dk}"
            results[result_key] = fleet_result

    return results


def _parse_lane_id(lane_id: str):
    """GRP_<origin>_<dest> → (origin, dest). Handles location IDs with underscores."""
    parts = lane_id.replace("GRP_", "", 1).split("_", 1)
    return (parts[0], parts[1]) if len(parts) == 2 else (parts[0], parts[0])


def _occupy_containers(
    container_free_on: list,
    current_day: int,
    count: int,
    free_after: int,
) -> None:
    """Mark `count` available containers as busy until current_day + free_after."""
    marked = 0
    for i in range(len(container_free_on)):
        if marked == count:
            break
        if container_free_on[i] <= current_day:
            container_free_on[i] = current_day + free_after
            marked += 1
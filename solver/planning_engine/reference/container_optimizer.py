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
import json
import logging
import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple

import pandas as pd

from models import (
    Container, Pallet, Axle, ContainerLoadingRules, ContainerSummary,
    ContainerOptimizationResult, ContainerFleetOptimizationResult,
    ShipmentGroup,
)
from placement_engine import (
    place_pallet, compute_axle_loads, compute_utilization,
    reset_packer, log_container_summary,
)
from feature_engineering import (
    create_pallet_features, breakdown_into_pallets,
    group_pallets_by_lane, sort_pallets_for_loading,
)

logger = logging.getLogger("placement_engine")


# ── Fleet allocation result ───────────────────────────────────────────────────

@dataclass
class GroupAllocation:
    """How many trucks are budgeted to a single lane group."""
    group: ShipmentGroup
    trucks_allocated: int          # containers this group may open
    trucks_needed_estimate: int    # based on pallet count / avg capacity
    is_fully_funded: bool          # True when allocated >= needed


@dataclass
class GlobalFleetResult:
    """Top-level result spanning all lane groups."""
    group_results: Dict[str, ContainerFleetOptimizationResult]  # groupId → result
    allocations: List[GroupAllocation]
    total_trucks_used: int
    fleet_limit: int
    total_pallets: int
    total_loaded_pallets: int
    total_unallocated_pallets: int
    unallocated_pallets: List[Pallet]   # pallets with no truck at all
    optimizer_run_id: str = field(default_factory=lambda: uuid.uuid4().hex)
    run_timestamp: datetime = field(default_factory=datetime.utcnow)


# ── Action 1: Map equipment row → Container constructor kwargs ────────────────

def load_equipment_to_container_spec(row: pd.Series) -> Dict[str, Any]:
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

    return dict(
        containerType=str(row.get("equipment_name", "CONTAINER")),
        depth=float(row.get("length_mm", 12191)),
        width=float(row.get("width_mm", 2438)),
        height=float(row.get("height_mm", 2591)),
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
    spec: Dict[str, Any],
    container_idx: int,
    group: ShipmentGroup,
) -> Container:
    cid = (
        f"CONT_{group.originLocationId}_{group.destinationLocationId}"
        f"_{group.deliveryDateWindow}_{container_idx:03d}"
    )
    summary = ContainerSummary(
        routeId=group.groupId,
        origin=group.originLocationId,
        destinationInSequence=[group.destinationLocationId],
    )
    return Container(containerId=cid, pallets=[], summary=summary, **spec)


# ── Action 3: Load one container ──────────────────────────────────────────────

def load_pallets_into_container(
    container: Container,
    pallets: List[Pallet],
) -> ContainerOptimizationResult:
    reset_packer(container.containerId)
    loaded:  List[Pallet] = []
    pending: List[Pallet] = []

    for pallet in pallets:
        if place_pallet(container, pallet):
            container.pallets.append(pallet)
            loaded.append(pallet)
        else:
            pending.append(pallet)

    container.summary.totalPallets     = len(loaded)
    container.summary.totalWeightIn_kg = round(container.usedWeightIn_kg, 2)
    container.summary.totalVolumeIn_m3 = round(container.usedVolume_m3, 4)

    axle_loads            = compute_axle_loads(container)
    utilization, remaining = compute_utilization(container, pending)
    log_container_summary(container, pending)

    return ContainerOptimizationResult(
        container=container,
        loadedPallets=loaded,
        pendingPallets=pending,
        axleLoads=axle_loads,
        utilization=utilization,
        remainingCapacity=remaining,
    )


# ── Action 4: Allocate fleet budget across groups ─────────────────────────────

def allocate_fleet_to_groups(
    groups: List[ShipmentGroup],
    fleet_limit: int,
    avg_pallets_per_container: int = 20,
) -> List[GroupAllocation]:
    """
    Sort groups by estimatedDeliveryDate ASC (most urgent first) then
    greedily assign trucks from the shared budget.

    Args:
        groups:                    All lane groups to be shipped.
        fleet_limit:               Total trucks available across all groups.
        avg_pallets_per_container: Used to estimate how many trucks a group
                                   needs before actually packing it.
                                   Default 20 pallets per 40ft container.

    Returns:
        List[GroupAllocation] in priority order (most urgent first).
    """
    # Sort: earliest delivery date first; ties broken by pallet count DESC
    sorted_groups = sorted(
        groups,
        key=lambda g: (
            g.estimatedDeliveryDate or datetime.max,
            -len(g.pallets),
        ),
    )

    remaining_budget = fleet_limit
    allocations: List[GroupAllocation] = []

    logger.info("=" * 70)
    logger.info("FLEET ALLOCATION — budget: %d trucks across %d groups",
                fleet_limit, len(sorted_groups))

    for g in sorted_groups:
        needed = max(1, -(-len(g.pallets) // avg_pallets_per_container))  # ceil div
        given  = min(needed, remaining_budget)
        remaining_budget -= given

        alloc = GroupAllocation(
            group=g,
            trucks_allocated=given,
            trucks_needed_estimate=needed,
            is_fully_funded=(given >= needed),
        )
        allocations.append(alloc)

        status = "FULL" if alloc.is_fully_funded else f"PARTIAL {given}/{needed}"
        logger.info(
            "  %-40s  date=%-10s  pallets=%3d  trucks=%s  budget_left=%d",
            g.groupId[:40],
            g.deliveryDateWindow,
            len(g.pallets),
            status,
            remaining_budget,
        )

    logger.info("Fleet used: %d / %d", fleet_limit - remaining_budget, fleet_limit)
    logger.info("=" * 70)
    return allocations


# ── Action 5: Pack one group within its truck budget ─────────────────────────

def optimize_group_with_budget(
    group: ShipmentGroup,
    equipment_spec: Dict[str, Any],
    max_containers: int,           # hard limit for this group
    lifo: bool = True,
) -> ContainerFleetOptimizationResult:
    """
    Opens up to max_containers trucks for a single lane group.
    Pallets that do not fit within the budget become unallocated.
    """
    sorted_pallets = sort_pallets_for_loading(group.pallets, lifo=lifo)
    remaining      = list(sorted_pallets)

    all_containers: List[Container]               = []
    all_results:    List[ContainerOptimizationResult] = []
    container_idx = 1

    logger.info(
        "[%s] packing %d pallets into max %d truck(s)",
        group.groupId, len(sorted_pallets), max_containers,
    )

    while remaining and container_idx <= max_containers:
        container = open_new_container(equipment_spec, container_idx, group)
        result    = load_pallets_into_container(container, remaining)

        all_containers.append(container)
        all_results.append(result)
        remaining = result.pendingPallets

        if not result.loadedPallets:
            break   # nothing fit — stop opening containers

        container_idx += 1

    # Pallets still left after budget exhausted → unallocated
    if remaining:
        logger.warning(
            "[%s] %d pallets unallocated — truck budget (%d) exhausted",
            group.groupId, len(remaining), max_containers,
        )

    total_wt      = sum(c.usedWeightIn_kg for c in all_containers)
    total_max_wt  = sum(c.maxPayloadWeightIn_kg for c in all_containers)
    total_vol     = sum(c.usedVolume_m3 for c in all_containers)
    total_max_vol = sum(c.maxVolume_m3 for c in all_containers)

    return ContainerFleetOptimizationResult(
        containers=all_containers,
        containerResults=all_results,
        unallocated_pallets=remaining,
        total_pallets=len(group.pallets),
        total_containers=len(all_containers),
        fleet_weight_utilization_pct=round(total_wt  / total_max_wt  * 100, 2) if total_max_wt  else 0,
        fleet_volume_utilization_pct=round(total_vol / total_max_vol * 100, 2) if total_max_vol else 0,
        optimizer_run_id=uuid.uuid4().hex,
    )


# ── Action 6: Full pipeline entry point ──────────────────────────────────────

def run_full_optimization(
    shipment_demand_df: pd.DataFrame,
    sku_pallet_df: pd.DataFrame,
    load_equipment_metadata_df: pd.DataFrame,
    lane_master_df: Optional[pd.DataFrame] = None,
    preferred_equipment_type: str = "CONTAINER",
    fleet_limit: int = 10,                 # ← total trucks for the entire run
    avg_pallets_per_container: int = 20,   # ← used for pre-allocation estimate
    lifo: bool = True,
) -> GlobalFleetResult:
    """
    End-to-end optimization with a shared fleet budget.

    Steps:
      1. Feature engineering  → enriched candidate_df
      2. Breakdown            → Pallet objects
      3. Group by lane        → ShipmentGroup list
      4. Fleet allocation     → trucks per group (date-priority order)
      5. Pack each group      → ContainerFleetOptimizationResult per group
      6. Collect globals      → GlobalFleetResult
    """

    # ── 1. Feature engineering ────────────────────────────────────────────
    candidate_df = create_pallet_features(shipment_demand_df, sku_pallet_df)

    # ── 2. Breakdown into Pallet objects ──────────────────────────────────
    all_pallets = breakdown_into_pallets(candidate_df)

    # ── 3. Group by lane (origin × dest × date) ───────────────────────────
    groups = group_pallets_by_lane(all_pallets, lane_master_df)

    # ── 4. Select equipment spec ──────────────────────────────────────────
    mask   = load_equipment_metadata_df["equipment_type"].str.upper() == preferred_equipment_type.upper()
    eq_df  = load_equipment_metadata_df[mask]
    eq_row = eq_df.iloc[0] if len(eq_df) else load_equipment_metadata_df.iloc[0]
    equipment_spec = load_equipment_to_container_spec(eq_row)

    # ── 5. Allocate trucks across groups by delivery date ─────────────────
    allocations = allocate_fleet_to_groups(
        groups,
        fleet_limit=fleet_limit,
        avg_pallets_per_container=avg_pallets_per_container,
    )

    # ── 6. Pack each group within its truck budget ────────────────────────
    group_results: Dict[str, ContainerFleetOptimizationResult] = {}
    all_unallocated: List[Pallet] = []
    total_trucks_used = 0

    for alloc in allocations:
        if alloc.trucks_allocated == 0:
            # No budget at all — all pallets are unallocated
            all_unallocated.extend(alloc.group.pallets)
            logger.warning(
                "[%s] 0 trucks allocated — all %d pallets unallocated",
                alloc.group.groupId, len(alloc.group.pallets),
            )
            # Record an empty result so the group still appears in output
            group_results[alloc.group.groupId] = ContainerFleetOptimizationResult(
                containers=[],
                containerResults=[],
                unallocated_pallets=list(alloc.group.pallets),
                total_pallets=len(alloc.group.pallets),
                total_containers=0,
                fleet_weight_utilization_pct=0,
                fleet_volume_utilization_pct=0,
                optimizer_run_id=uuid.uuid4().hex,
            )
            continue

        fleet_result = optimize_group_with_budget(
            alloc.group,
            equipment_spec,
            max_containers=alloc.trucks_allocated,
            lifo=lifo,
        )
        group_results[alloc.group.groupId] = fleet_result
        all_unallocated.extend(fleet_result.unallocated_pallets)
        total_trucks_used += fleet_result.total_containers

    total_loaded = sum(
        r.total_containers > 0 and
        sum(len(cr.loadedPallets) for cr in r.containerResults)
        for r in group_results.values()
    )

    logger.info(
        "RUN COMPLETE — trucks_used=%d/%d  loaded=%d  unallocated=%d",
        total_trucks_used, fleet_limit,
        sum(len(cr.loadedPallets) for r in group_results.values()
            for cr in r.containerResults),
        len(all_unallocated),
    )

    return GlobalFleetResult(
        group_results=group_results,
        allocations=allocations,
        total_trucks_used=total_trucks_used,
        fleet_limit=fleet_limit,
        total_pallets=len(all_pallets),
        total_loaded_pallets=sum(
            len(cr.loadedPallets)
            for r in group_results.values()
            for cr in r.containerResults
        ),
        total_unallocated_pallets=len(all_unallocated),
        unallocated_pallets=all_unallocated,
    )


# ── Action 7: Export each container to JSON ───────────────────────────────────

def export_all_containers_json(
    global_result: GlobalFleetResult,
    out_dir: str = "./output",
) -> List[str]:
    """
    Writes one JSON file per container across all groups.
    Returns list of file paths written.
    """
    os.makedirs(out_dir, exist_ok=True)
    paths: List[str] = []

    for group_id, fleet_result in global_result.group_results.items():
        for cr in fleet_result.containerResults:
            c = cr.container
            payload = {
                "containerId":       c.containerId,
                "containerType":     c.containerType,
                "containerDepth":    c.depth,
                "containerWidth":    c.width,
                "containerHeight":   c.height,
                "internalDepth":     c.internalDepth,
                "internalWidth":     c.internalWidth,
                "internalHeight":    c.internalHeight,
                "maxPayloadWeight":  c.maxPayloadWeightIn_kg,
                "tareWeight":        c.tareWeightIn_kg,
                "maxVolume":         round(c.maxVolume_m3, 6),
                "unit":              c.unit,
                "door_width":        c.doorWidth,
                "door_height":       c.doorHeight,
                "axles": [
                    {
                        "axleId":      a.axleId,
                        "maxWeight":   a.maxWeight,
                        "positionX":   a.positionX,
                        "currentLoad": round(a.currentLoad, 2),
                    }
                    for a in c.axles
                ],
                "pallets": [_pallet_to_viz_dict(p) for p in cr.loadedPallets],
                "summary": {
                    "shipmentId":           c.summary.shipmentId,
                    "routeId":              c.summary.routeId,
                    "origin":               c.summary.origin,
                    "destinationInSequence": c.summary.destinationInSequence,
                    "totalPallets":         c.summary.totalPallets,
                    "totalWeight":          c.summary.totalWeightIn_kg,
                    "totalVolume":          c.summary.totalVolumeIn_m3,
                },
                "loadingRules": {
                    "allowStacking":          c.loadingRules.allowStacking,
                    "maxStackHeight":         c.loadingRules.maxStackHeightIn_mm,
                    "lifoEnabled":            c.loadingRules.lifoEnabled,
                    "fragileSeparation":      c.loadingRules.fragileSeparation,
                    "hazmatSegregation":      c.loadingRules.hazmatSegregation,
                    "centerGravityThreshold": c.loadingRules.centerGravityThreshold,
                },
                "utilization": cr.utilization.model_dump(),
                "axleLoads":   [al.model_dump() for al in cr.axleLoads],
                "pendingPalletCount": len(cr.pendingPallets),
                "groupId": group_id,
            }

            fname = f"{c.containerId}.json"
            fpath = os.path.join(out_dir, fname)
            with open(fpath, "w") as f:
                json.dump(payload, f, indent=2, default=str)
            paths.append(fpath)

    # Write a fleet summary manifest
    manifest = {
        "run_id":          global_result.optimizer_run_id,
        "run_timestamp":   str(global_result.run_timestamp),
        "fleet_limit":     global_result.fleet_limit,
        "trucks_used":     global_result.total_trucks_used,
        "total_pallets":   global_result.total_pallets,
        "loaded_pallets":  global_result.total_loaded_pallets,
        "unallocated_pallets": global_result.total_unallocated_pallets,
        "groups": [
            {
                "groupId":           a.group.groupId,
                "origin":            a.group.originLocationId,
                "destination":       a.group.destinationLocationId,
                "deliveryDate":      a.group.deliveryDateWindow,
                "pallets":           len(a.group.pallets),
                "trucks_allocated":  a.trucks_allocated,
                "trucks_needed_est": a.trucks_needed_estimate,
                "fully_funded":      a.is_fully_funded,
                "containers_opened": group_results_trucks(global_result, a.group.groupId),
            }
            for a in global_result.allocations
        ],
    }
    manifest_path = os.path.join(out_dir, "fleet_manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2, default=str)
    paths.append(manifest_path)

    return paths


def group_results_trucks(result: GlobalFleetResult, group_id: str) -> int:
    r = result.group_results.get(group_id)
    return r.total_containers if r else 0


def _pallet_to_viz_dict(p: Pallet) -> dict:
    return {
        "candidatePalletId": p.candidatePalletId,
        "dimensions": {
            "depth":  p.dimensions.depth,
            "width":  p.dimensions.width,
            "height": p.dimensions.height,
        },
        "position": {
            "x":              p.position.x,
            "y":              p.position.y,
            "z":              p.position.z,
            "orientation":    p.position.orientation,
            "effectiveWidth":  p.position.effectiveWidth,
            "effectiveDepth":  p.position.effectiveDepth,
            "effectiveHeight": p.position.effectiveHeight,
        },
        "label":          p.label or p.skuId,
        "color":          p.color,
        "weightIn_kg":    p.weightIn_kg,
        "isPartialPallet": p.isPartialPallet,
        "fillPct":        p.fillPct,
        "shipmentId":     p.shipmentId,
        "skuId":          p.skuId,
        "priority":       p.priority,
        "destinationStop": p.destinationStop,
        "unloadSequence": p.unloadSequence,
    }
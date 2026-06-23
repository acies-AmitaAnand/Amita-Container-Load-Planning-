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
from datetime import datetime
from typing import List, Optional, Dict, Any

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
    cid = (
        f"CONT_{group.originLocationId}_{group.destinationLocationId}"
        f"_{group.deliveryDateWindow}_{container_idx:03d}"
    )
    summary = ContainerSummary(
        routeId=group.groupId,
        origin=group.originLocationId,
        destinationInSequence=[group.destinationLocationId],
    )
    new_container_spec = deepcopy(container_spec)
    new_container_spec.containerId=cid
    new_container_spec.pallets=[]
    new_container_spec.summary=summary

    return new_container_spec


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


# ── Action 4: Fill containers for one group ───────────────────────────────────
 
def optimize_container_fleet(
    group: ShipmentGroup,
    equipment_spec: Container,
    lifo: bool = True,
) -> ContainerFleetOptimizationResult:
    """
    Opens containers one by one until all pallets in the group are loaded.
    No fleet cap — containers open as long as pallets remain and at least
    one pallet fits per container (weight + volume + floor area + position).
    """
    sorted_pallets = sort_pallets_for_loading(group.pallets, lifo=lifo)
    remaining      = list(sorted_pallets)
 
    all_containers: List[Container]                   = []
    all_results:    List[ContainerOptimizationResult] = []
    container_idx = 1
 
    while remaining:
        container = open_new_container(equipment_spec, container_idx, group)
        result    = load_pallets_into_container(container=container, pallets=remaining)
 
        all_containers.append(container)
        all_results.append(result)
        remaining = result.pendingPallets
 
        if not result.loadedPallets:
            break   # nothing fit — avoid infinite loop
 
        container_idx += 1
 
    total_wt      = sum(c.usedWeightIn_kg for c in all_containers)
    total_max_wt  = sum(c.maxPayloadWeightIn_kg for c in all_containers)
    total_vol     = sum(c.usedVolume_m3 for c in all_containers)
    total_max_vol = sum(c.maxVolume_m3 for c in all_containers)
 
    return ContainerFleetOptimizationResult(
        containerResults=all_results,
        unallocated_pallets=remaining,
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
    lifo: bool = True,
    optimizer='MAX_RECT_PACKER',
) -> Dict[str, ContainerFleetOptimizationResult]:
    """
    Flow:
      1. Convert units → pallets
      2. Create groups  (origin, destination, date, priority)
      3. Sort groups    (earliest date ASC, highest priority DESC)
      4. For each group, open containers until all pallets are loaded
    """
    candidate_df = create_pallet_features(shipment_demand_df, sku_pallet_df)
    all_pallets  = breakdown_into_pallets(candidate_df)
    groups       = group_pallets_by_lane(all_pallets, lane_master_df)
 
    mask   = load_equipment_metadata_df["equipment_type"].str.upper() == preferred_equipment_type.upper()
    eq_df  = load_equipment_metadata_df[mask]
    eq_row = eq_df.iloc[0] if len(eq_df) else load_equipment_metadata_df.iloc[0]
    equipment_spec = load_equipment_to_container_spec(eq_row)
 
    return {
        group.groupId: optimize_container_fleet(group, equipment_spec, lifo=lifo)
        for group in groups
    }
 
 
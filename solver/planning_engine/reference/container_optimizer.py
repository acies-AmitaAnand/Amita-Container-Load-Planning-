"""
Container Fleet Optimizer
=========================
Orchestrates the full load planning pipeline:

  Actions (function calls):
    load_equipment_to_container_spec(row)
    open_new_container(spec, container_idx, group)
    load_pallets_into_container(container, pallets) -> ContainerOptimizationResult
    optimize_container_fleet(group, equipment_df, rules) -> ContainerFleetOptimizationResult
    run_full_optimization(shipment_candidate_df, ...) -> ContainerFleetOptimizationResult
    export_container_json(result, out_dir) -> str
"""

from __future__ import annotations
import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any

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


# ── Action: Map equipment row → Container spec ────────────────────────────────

def load_equipment_to_container_spec(row: pd.Series) -> Dict[str, Any]:
    """Convert a load_equipment_metadata_df row to Container constructor kwargs."""
    axle_conf = str(row.get("axle_configuration", "single")).lower()
    axles = []
    if "tandem" in axle_conf or "2" in axle_conf:
        axles = [
            Axle(axleId="FRONT", maxWeight=10000, positionX=float(row.get("internal_length_mm", 12000)) * 0.15),
            Axle(axleId="REAR", maxWeight=20000, positionX=float(row.get("internal_length_mm", 12000)) * 0.75),
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
            maxStackHeightIn_mm=float(row.get("max_stack_height_mm", 0)) or 0,
            allowStacking=float(row.get("max_stack_height_mm", 0) or 0) > 0,
        ),
    )


# ── Action: Open a fresh container for a group ────────────────────────────────

def open_new_container(
    spec: Dict[str, Any],
    container_idx: int,
    group: ShipmentGroup,
) -> Container:
    """Instantiate a new Container with summary pre-populated from the lane group."""
    cid = f"CONT_{group.originLocationId}_{group.destinationLocationId}_{container_idx:03d}"
    summary = ContainerSummary(
        routeId=group.groupId,
        origin=group.originLocationId,
        destinationInSequence=[group.destinationLocationId],
    )
    container = Container(
        containerId=cid,
        pallets=[],
        summary=summary,
        **spec,
    )
    return container


# ── Action: Load sorted pallets into a single container ───────────────────────

def load_pallets_into_container(
    container: Container,
    pallets: List[Pallet],
) -> ContainerOptimizationResult:
    """
    Greedily loads pallets into container until no more fit.
    Returns a ContainerOptimizationResult with loaded / pending pallets.
    """
    reset_packer(container.containerId)
    loaded: List[Pallet] = []
    pending: List[Pallet] = []

    for pallet in pallets:
        if place_pallet(container, pallet):
            container.pallets.append(pallet)
            loaded.append(pallet)
        else:
            pending.append(pallet)

    container.summary.totalPallets      = len(loaded)
    container.summary.totalWeightIn_kg  = round(container.usedWeightIn_kg, 2)
    container.summary.totalVolumeIn_m3  = round(container.usedVolume_m3, 4)

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


# ── Action: Optimize full fleet for a shipment group ─────────────────────────

def optimize_container_fleet(
    group: ShipmentGroup,
    equipment_spec: Dict[str, Any],
    lifo: bool = True,
    max_containers: int = 999,
) -> ContainerFleetOptimizationResult:
    """
    Creates as many containers as needed to load all pallets in the group.
    Current version: infinite containers available.
    """
    sorted_pallets = sort_pallets_for_loading(group.pallets, lifo=lifo)
    remaining = list(sorted_pallets)

    all_containers: List[Container] = []
    all_results: List[ContainerOptimizationResult] = []
    container_idx = 1

    while remaining and container_idx <= max_containers:
        container = open_new_container(equipment_spec, container_idx, group)
        result = load_pallets_into_container(container, remaining)

        all_containers.append(container)
        all_results.append(result)

        # Pallets still pending after this container
        remaining = result.pendingPallets

        if not result.loadedPallets:
            # No pallet fit at all — break to avoid infinite loop
            break

        container_idx += 1

    # Fleet metrics
    total_wt = sum(c.usedWeightIn_kg for c in all_containers)
    total_max_wt = sum(c.maxPayloadWeightIn_kg for c in all_containers)
    total_vol = sum(c.usedVolume_m3 for c in all_containers)
    total_max_vol = sum(c.maxVolume_m3 for c in all_containers)

    return ContainerFleetOptimizationResult(
        containers=all_containers,
        containerResults=all_results,
        unallocated_pallets=remaining,
        total_pallets=len(group.pallets),
        total_containers=len(all_containers),
        fleet_weight_utilization_pct=round(total_wt / total_max_wt * 100, 2) if total_max_wt else 0,
        fleet_volume_utilization_pct=round(total_vol / total_max_vol * 100, 2) if total_max_vol else 0,
        optimizer_run_id=uuid.uuid4().hex,
    )


# ── Action: Full pipeline entry point ─────────────────────────────────────────

def run_full_optimization(
    shipment_demand_df: pd.DataFrame,
    sku_pallet_df: pd.DataFrame,
    load_equipment_metadata_df: pd.DataFrame,
    lane_master_df: Optional[pd.DataFrame] = None,
    preferred_equipment_type: str = "CONTAINER",
    lifo: bool = True,
) -> Dict[str, ContainerFleetOptimizationResult]:
    """
    End-to-end optimization:
      1. Feature engineering → pallets
      2. Group by lane
      3. Per group: fleet optimization
    Returns dict keyed by groupId.
    """
    # Step 1 — Enrich demand with pallet features
    candidate_df = create_pallet_features(shipment_demand_df, sku_pallet_df)

    # Step 2 — Breakdown into Pallet objects
    all_pallets = breakdown_into_pallets(candidate_df)

    # Step 3 — Group by lane
    groups = group_pallets_by_lane(all_pallets, lane_master_df)

    # Step 4 — Select default equipment spec
    eq_row = load_equipment_metadata_df[
        load_equipment_metadata_df["equipment_type"].str.upper() == preferred_equipment_type.upper()
    ].iloc[0] if len(load_equipment_metadata_df) else pd.Series()

    if eq_row.empty:
        eq_row = load_equipment_metadata_df.iloc[0]

    equipment_spec = load_equipment_to_container_spec(eq_row)

    # Step 5 — Optimize each group
    results: Dict[str, ContainerFleetOptimizationResult] = {}
    for group in groups:
        fleet_result = optimize_container_fleet(
            group, equipment_spec, lifo=lifo
        )
        results[group.groupId] = fleet_result

    return results


# ── Action: Export to JSON ────────────────────────────────────────────────────

def _pallet_to_viz_dict(p: Pallet) -> dict:
    return {
        "dimensions": {
            "depth": p.dimensions.depth,
            "width": p.dimensions.width,
            "height": p.dimensions.height,
        },
        "position": {
            "x": p.position.x,
            "y": p.position.y,
            "z": p.position.z,
        },
        "label": p.label or p.skuId,
        "color": p.color,
        "weightIn_kg": p.weightIn_kg,
        "isPartialPallet": p.isPartialPallet,
        "fillPct": p.fillPct,
        "shipmentId": p.shipmentId,
        "skuId": p.skuId,
        "priority": p.priority,
        "destinationStop": p.destinationStop,
        "unloadSequence": p.unloadSequence,
    }


def export_container_json(
    fleet_result: ContainerFleetOptimizationResult,
    out_dir: str = "./output",
    group_id: str = "default",
) -> List[str]:
    """
    Dumps each container as a visualization-ready JSON file.
    Returns list of file paths written.
    """
    os.makedirs(out_dir, exist_ok=True)
    paths = []

    for cr in fleet_result.containerResults:
        c = cr.container
        payload = {
            "containerId": c.containerId,
            "containerType": c.containerType,
            "length": c.depth,
            "width": c.width,
            "height": c.height,
            "internal_length": c.internalDepth,
            "internal_width": c.internalWidth,
            "internal_height": c.internalHeight,
            "maxPayloadWeight": c.maxPayloadWeightIn_kg,
            "tareWeight": c.tareWeightIn_kg,
            "maxVolume": round(c.maxVolume_m3, 6),
            "unit": c.unit,
            "door_width": c.doorWidth,
            "door_height": c.doorHeight,
            "axles": [
                {"axleId": a.axleId, "maxWeight": a.maxWeight, "positionX": a.positionX,
                 "currentLoad": round(a.currentLoad, 2)}
                for a in c.axles
            ],
            "pallets": [_pallet_to_viz_dict(p) for p in cr.loadedPallets],
            "summary": {
                "shipmentId": c.summary.shipmentId,
                "routeId": c.summary.routeId,
                "origin": c.summary.origin,
                "destinationInSequence": c.summary.destinationInSequence,
                "totalPallets": c.summary.totalPallets,
                "totalWeight": c.summary.totalWeightIn_kg,
                "totalVolume": c.summary.totalVolumeIn_m3,
            },
            "loadingRules": {
                "allowStacking": c.loadingRules.allowStacking,
                "maxStackHeight": c.loadingRules.maxStackHeightIn_mm,
                "lifoEnabled": c.loadingRules.lifoEnabled,
                "fragileSeparation": c.loadingRules.fragileSeparation,
                "hazmatSegregation": c.loadingRules.hazmatSegregation,
                "centerGravityThreshold": c.loadingRules.centerGravityThreshold,
            },
            "utilization": cr.utilization.model_dump(),
            "axleLoads": [al.model_dump() for al in cr.axleLoads],
            "pendingPalletCount": len(cr.pendingPallets),
        }

        fname = f"{group_id}_{c.containerId}.json"
        fpath = os.path.join(out_dir, fname)
        with open(fpath, "w") as f:
            json.dump(payload, f, indent=2, default=str)
        paths.append(fpath)

    return paths
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
from typing import List


from objects.Pallet import Pallet


from solver.objects.GlobalFleetResult import GlobalFleetResult
from utils.CustomJSONEncoder import CustomJSONEncoder

logger = logging.getLogger("export result")


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
                json.dump(payload, f, indent=2, default=str, cls=CustomJSONEncoder) 
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
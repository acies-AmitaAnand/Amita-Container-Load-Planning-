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
from typing import Dict, List


from objects.Pallet import Pallet


from objects.GlobalFleetResult import GlobalFleetResult
from objects.ContainerFleetOptimizationResult import ContainerFleetOptimizationResult
from utils.CustomJSONEncoder import CustomJSONEncoder

logger = logging.getLogger("export result")


# ── Action 6: Export to JSON ──────────────────────────────────────────────────
 
def export_container_json(
    fleet_result: Dict[str, ContainerFleetOptimizationResult],
    out_dir: str = "./output",
    group_id: str = "default",
) -> List[str]:
    os.makedirs(out_dir, exist_ok=True)
    paths = {}
    i = 0
    for group, fleet in fleet_result.items():
        for cr in fleet.containerResults:
            c = cr.container
            payload = {
                "containerId":     c.containerId,
                "containerType":   c.containerType,
                "containerDepth":  c.containerDepth,
                "containerWidth":  c.containerWidth,
                "containerHeight": c.containerHeight,
                "internalDepth":   c.internalDepth,
                "internalWidth":   c.internalWidth,
                "internalHeight":  c.internalHeight,
                "maxPayloadWeight": c.maxPayloadWeightIn_kg,
                "tareWeight":      c.tareWeightIn_kg,
                "maxVolume":       round(c.maxVolume_m3, 6),
                "unit":            c.unit,
                "door_width":      c.doorWidth,
                "door_height":     c.doorHeight,
                "axles": [
                    {"axleId": a.axleId, "maxWeight": a.maxWeight,
                    "positionX": a.positionX, "currentLoad": round(a.currentLoad, 2)}
                    for a in c.axles
                ],
                "pallets": [_pallet_to_viz_dict(p) for p in cr.loadedPallets],
                "summary": {
                    "shipmentId":            c.summary.shipmentId,
                    "routeId":               c.summary.routeId,
                    "origin":                c.summary.origin,
                    "destinationInSequence": c.summary.destinationInSequence,
                    "totalPallets":          c.summary.totalPallets,
                    "totalWeight":           c.summary.totalWeightIn_kg,
                    "totalVolume":           c.summary.totalVolumeIn_m3,
                },
                "loadingRules": {
                    "allowStacking":          c.loadingRules.allowStacking,
                    "maxStackHeight":         c.loadingRules.maxStackHeightIn_mm,
                    "lifoEnabled":            c.loadingRules.lifoEnabled,
                    "fragileSeparation":      c.loadingRules.fragileSeparation,
                    "hazmatSegregation":      c.loadingRules.hazmatSegregation,
                    "centerGravityThreshold": c.loadingRules.centerGravityThreshold,
                },
                "utilization":       cr.utilization.model_dump(),
                "axleLoads":         [al.model_dump() for al in cr.axleLoads],
                "pendingPalletCount": len(cr.pendingPallets),
            }
            fname = f"res-{i}-{group_id}_{c.containerId}.json"
            fpath = os.path.join(out_dir, fname)
            with open(fpath, "w") as f:
                json.dump(payload, f, indent=2, default=str)
                dumped = json.dumps(payload, default=str, cls=CustomJSONEncoder)
                paths[fname] = dumped
            i += 1

        return paths
 
 
def _pallet_to_viz_dict(p: Pallet) -> dict:
    return {
        "candidatePalletId": p.candidatePalletId,
        "dimensions": {"depth": p.dimensions.depth, "width": p.dimensions.width, "height": p.dimensions.height},
        "position": {
            "x": p.position.x, "y": p.position.y, "z": p.position.z,
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
 
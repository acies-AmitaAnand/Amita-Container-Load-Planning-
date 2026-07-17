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
) -> dict:
    """
    Writes one JSON file per container to out_dir.
    Returns a dict structured for the API response:
      {
        "containers_by_day": [ { "date": ..., "groupId": ..., "containers": [...summary...] } ],
        "localStorage_entries": [ { "key": "res_<containerId>", "payload": <full container dict> } ]
      }
    React iterates localStorage_entries and writes each to localStorage,
    then MultiContainerView picks them up by filtering keys starting with "res".
    """
    os.makedirs(out_dir, exist_ok=True)
 
    localStorage_entries = []
    containers_by_day    = []
 
    for i, (group, fleet) in enumerate(fleet_result.items()):
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
                "utilization":        cr.utilization.model_dump() if cr.utilization else None,
                "axleLoads":          [al.model_dump() for al in cr.axleLoads],
                "pendingPalletCount": len(cr.pendingPallets),
            }
 
            # Write file
            fname = f"{c.containerId}.json"
            fpath = os.path.join(out_dir, fname)
            with open(fpath, "w") as f:
                json.dump(payload, f, indent=2, default=str)
 
            # localStorage entry — key must start with "res" for MultiContainerView
            localStorage_entries.append({
                "key":     f"res_{c.containerId}",
                "payload": payload,
            })
 
            # Summary entry for the day timeline in the UI
            util = cr.utilization
            containers_by_day.append({
                "groupId":       group,
                "deliveryDate":  c.summary.routeId,
                "containerId":   c.containerId,
                "loadedPallets": len(cr.loadedPallets),
                "pendingPallets": len(cr.pendingPallets),
                "weightUtil":    round(util.weightUtilization_pct, 1) if util else 0,
                "volumeUtil":    round(util.volumeUtilization_pct, 1) if util else 0,
                "floorUtil":     round(util.floorAreaUtilization_pct, 1) if util else 0,
            })
 
    # ── FIX: return is outside both for loops ─────────────────────────────────
    return {
        "containers_by_day":    containers_by_day,
        "localStorage_entries": localStorage_entries,
    }
 
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
        # ── SKU detail fields (shown in 3D container view) ─────────────────
        "orderLineId":             p.orderLineId             if hasattr(p, "orderLineId")             else None,
        "skuId":                   p.skuId,
        "actualDeliveryDate":      str(p.actualDeliveryDate)      if hasattr(p, "actualDeliveryDate")      else None,
        "originLocationId":        p.originLocationId,
        "destinationLocationId":   p.destinationLocationId,
        "estimatedDeliveryDate":   str(p.estimatedDeliveryDate),
        "maxTransitTimeInDays":    p.maxTransitTimeInDays    if hasattr(p, "maxTransitTimeInDays")    else None,
    }
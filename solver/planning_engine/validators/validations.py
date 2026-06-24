

from __future__ import annotations
from typing import Tuple
from objects.Pallet import Pallet
from objects.Container import Container


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


def validate_pallet_fits(container: Container, pallet: Pallet) -> Tuple[bool, str]:
    """
    Mirror of reference get_maximum_shipment_loaded_by_constraint_for_bulk:
    check every capacity constraint independently; reject only when ALL remaining
    capacity on that dimension is exhausted (i.e. the pallet itself exceeds what's left).
    Also guards axle overload (CoG) before committing the placement.
    """
    if container.usedWeightIn_kg + pallet.weightIn_kg > container.maxPayloadWeightIn_kg:
        return False, (f"Weight exceeded: "
                       f"{container.usedWeightIn_kg + pallet.weightIn_kg:.1f} "
                       f"> {container.maxPayloadWeightIn_kg:.1f} kg")
    if container.usedVolume_m3 + pallet.volume_m3 > container.maxVolume_m3:
        return False, (f"Volume exceeded: "
                       f"{container.usedVolume_m3 + pallet.volume_m3:.4f} "
                       f"> {container.maxVolume_m3:.4f} m3")
    if container.usedFloorArea_m2 + pallet.floorArea_m2 > container.maxFloorArea_m2:
        return False, (f"Floor area exceeded: "
                       f"{container.usedFloorArea_m2 + pallet.floorArea_m2:.3f} "
                       f"> {container.maxFloorArea_m2:.3f} m2")
    # CoG / axle overload pre-check — use container midpoint as worst-case position
    # ponytail: midpoint approximation; exact position unknown until find_position runs.
    # Upgrade: run find_position first, then validate axle load at actual z.
    cog_z = container.internalDepth / 2
    for axle in container.axles:
        factor = max(0.0, 1 - abs(cog_z - axle.positionX) / container.internalDepth)
        if axle.currentLoad + pallet.weightIn_kg * factor > axle.maxWeight:
            return False, (f"Axle {axle.axleId} would exceed limit: "
                           f"{axle.currentLoad + pallet.weightIn_kg * factor:.1f} "
                           f"> {axle.maxWeight:.1f} kg")
    if pallet.temperatureRequirement not in ("ambient", ""):
        if not container.refrigerationCapable:
            return False, "Refrigeration required but container not capable"
    if pallet.isHazmat and container.loadingRules.hazmatSegregation:
        if any(not p.isHazmat for p in container.pallets):
            return False, "Hazmat segregation violation"
    return True, ""
 
 
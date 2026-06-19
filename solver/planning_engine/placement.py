
from __future__ import annotations
import logging
import time


from objects.Container import Container
from objects.Pallet import Pallet
from objects.Position import Position
from planning_engine.validators.validations import validate_pallet_fits
from planning_engine.optimizers.MaxRectPacker import _get_packer
from planning_engine.validators.axle import distribute_weight_to_axles

logger = logging.getLogger("placement_engine")

# ---------------------------------------------------------------------------
# place_pallet — main action
# ---------------------------------------------------------------------------

def place_pallet(container: Container, pallet: Pallet) -> bool:
    """Place pallet into container. Mutates both on success. Returns True if placed."""
    t0 = time.perf_counter()

    ok, reason = validate_pallet_fits(container, pallet)
    if not ok:
        pallet.rejectionReason = reason
        logger.debug("[%s] SKIP %-38s  %s",
                     container.containerId, pallet.candidatePalletId[-38:], reason)
        return False

    packer = _get_packer(container)
    result = packer.find_position(pallet)
    if result is None:
        pallet.rejectionReason = "No free rect large enough"
        logger.debug("[%s] SKIP %-38s  no_space",
                     container.containerId, pallet.candidatePalletId[-38:])
        return False

    x, z, dep, wid, hgt, orient = result

    pallet.position = Position(
        x=x, y=0, z=z,
        orientation=orient,
        effectiveWidth=wid,
        effectiveDepth=dep,
        effectiveHeight=hgt,
    )
    pallet.loadedToContainer = True

    container.usedWeightIn_kg  += pallet.weightIn_kg
    container.usedFloorArea_m2 += (wid * dep) / 1_000_000
    container.usedVolume_m3    += (wid * dep * hgt) / 1_000_000_000
    container.loadedPallets    += 1

    packer.mark_placed(x, z, dep, wid)
    distribute_weight_to_axles(container, pallet, z, dep)

    # --- structured log ---
    elapsed_ms = (time.perf_counter() - t0) * 1000
    wt_pct   = container.usedWeightIn_kg  / container.maxPayloadWeightIn_kg  * 100
    vol_pct  = container.usedVolume_m3    / container.maxVolume_m3           * 100
    area_pct = container.usedFloorArea_m2 / container.maxFloorArea_m2        * 100

    logger.info(
        "[%s] LOAD #%-3d | pallet=%-36s | pos(x=%5d z=%5d) | "
        "dim(%4d x %4d x %4d mm) | orient=%-17s | wt=%6.1f kg | "
        "CTR: wt=%6.1f/%-.0f kg(%.1f%%) vol=%.3f/%.3f m3(%.1f%%) "
        "area=%.2f/%.2f m2(%.1f%%) pallets=%d | %.2fms",
        container.containerId,
        container.loadedPallets,
        pallet.candidatePalletId[-36:],
        x, z, wid, dep, hgt, orient,
        pallet.weightIn_kg,
        container.usedWeightIn_kg, container.maxPayloadWeightIn_kg, wt_pct,
        container.usedVolume_m3,   container.maxVolume_m3,          vol_pct,
        container.usedFloorArea_m2, container.maxFloorArea_m2,      area_pct,
        container.loadedPallets,
        elapsed_ms,
    )
    return True


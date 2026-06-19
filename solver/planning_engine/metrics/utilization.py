
from __future__ import annotations
import logging
from typing import List, Tuple

from objects.Container import Container
from objects.Pallet import Pallet
from objects.UtilizationMetrics import UtilizationMetrics
from objects.RemainingCapacity import RemainingCapacity


logger = logging.getLogger("placement_engine")



def compute_utilization(
    container: Container, pending: List[Pallet]
) -> Tuple[UtilizationMetrics, RemainingCapacity]:
    mw = container.maxPayloadWeightIn_kg
    mv = container.maxVolume_m3
    ma = container.maxFloorArea_m2
    util = UtilizationMetrics(
        weightUtilization_pct=round(container.usedWeightIn_kg / mw * 100 if mw else 0, 2),
        volumeUtilization_pct=round(container.usedVolume_m3   / mv * 100 if mv else 0, 2),
        floorAreaUtilization_pct=round(container.usedFloorArea_m2 / ma * 100 if ma else 0, 2),
        loadedPallets=container.loadedPallets,
        totalPallets=container.loadedPallets + len(pending),
        usedWeightIn_kg=round(container.usedWeightIn_kg, 2),
        usedVolumeIn_m3=round(container.usedVolume_m3, 4),
        usedFloorAreaIn_m2=round(container.usedFloorArea_m2, 4),
        maxWeightIn_kg=mw, maxVolumeIn_m3=round(mv, 4), maxFloorAreaIn_m2=round(ma, 4),
    )
    remaining = RemainingCapacity(
        remainingWeight_kg=round(mw - container.usedWeightIn_kg, 2),
        remainingVolume_m3=round(mv - container.usedVolume_m3, 4),
        remainingFloorArea_m2=round(ma - container.usedFloorArea_m2, 4),
    )
    return util, remaining



# ---------------------------------------------------------------------------
# Container summary log  (call after load_pallets_into_container)
# ---------------------------------------------------------------------------

def log_container_summary(container: Container, pending: List[Pallet]) -> None:
    util, rem = compute_utilization(container, pending)
    sep = "=" * 90
    logger.info(sep)
    logger.info("[%s] CONTAINER SUMMARY", container.containerId)
    logger.info("  Pallets : loaded=%d  pending=%d  total=%d",
                util.loadedPallets, len(pending), util.totalPallets)
    logger.info("  Weight  : %8.1f / %-8.0f kg   %5.1f%%   remaining %.1f kg",
                util.usedWeightIn_kg, util.maxWeightIn_kg,
                util.weightUtilization_pct, rem.remainingWeight_kg)
    logger.info("  Volume  : %8.3f / %-8.3f m3   %5.1f%%   remaining %.3f m3",
                util.usedVolumeIn_m3, util.maxVolumeIn_m3,
                util.volumeUtilization_pct, rem.remainingVolume_m3)
    logger.info("  Floor   : %8.3f / %-8.3f m2   %5.1f%%   remaining %.3f m2",
                util.usedFloorAreaIn_m2, util.maxFloorAreaIn_m2,
                util.floorAreaUtilization_pct, rem.remainingFloorArea_m2)
    for al in compute_axle_loads(container):
        logger.info("  Axle %-8s : %8.1f / %-8.0f kg  %5.1f%%  [%s]",
                    al.axleId, al.currentLoad_kg, al.maxLoad_kg,
                    al.utilization_pct, "OVERLOAD" if al.isOverloaded else "ok")
    logger.info(sep)
    


"""
placement_engine.py  —  Maximal Rectangles (MRRP) packer
=========================================================

Replaces Skyline. Key improvements:
  - Loads back-of-truck first, door last  (LIFO natural order)
  - No resolution grid  -> zero rounding gaps
  - O(n*k) per pallet, much faster than skyline O(n*cols^2)
  - Structured per-pallet logging with container metric snapshots
"""

from __future__ import annotations
import logging
import time
from dataclasses import dataclass
from typing import List, Optional, Tuple

from models import (
    Container, Pallet, Position, Dimension,
    AxleLoadResult, UtilizationMetrics, RemainingCapacity,
)

logger = logging.getLogger("placement_engine")


# ---------------------------------------------------------------------------
# Free rectangle dataclass
# ---------------------------------------------------------------------------

@dataclass
class FreeRect:
    x: int   # left edge  (width axis)
    z: int   # front edge (depth axis, 0 = door)
    w: int   # width extent
    d: int   # depth extent

    def contains(self, other: "FreeRect") -> bool:
        return (
            other.x >= self.x and other.z >= self.z and
            other.x + other.w <= self.x + self.w and
            other.z + other.d <= self.z + self.d
        )


# ---------------------------------------------------------------------------
# Orientation helper
# ---------------------------------------------------------------------------

def _orientations(dim: Dimension) -> List[Tuple[int, int, int, str]]:
    """Returns (eff_depth, eff_width, height, label) for each valid upright rotation."""
    d, w, h = dim.depth, dim.width, dim.height
    if d == w:
        return [(d, w, h, "FRONT_FACING")]
    return [
        (d, w, h, "FRONT_FACING"),
        (w, d, h, "SIDE_FACING_LEFT"),
    ]


# ---------------------------------------------------------------------------
# Maximal Rectangles packer  (Best-Short-Side Fit + back-first bias)
# ---------------------------------------------------------------------------

class MaxRectPacker:
    """One instance per container. Call place() for each pallet in sort order."""

    def __init__(self, container: Container):
        self.iW = int(container.internalWidth)
        self.iD = int(container.internalDepth)
        self.iH = int(container.internalHeight)
        self.free: List[FreeRect] = [FreeRect(0, 0, self.iW, self.iD)]

    def find_position(
        self, pallet: Pallet
    ) -> Optional[Tuple[int, int, int, int, int, str]]:
        """
        Returns (x, z, eff_depth, eff_width, eff_height, orientation) or None.
        Scoring: BSSF with high-z bias so truck back fills first (LIFO ready).
        """
        best_score: Optional[Tuple] = None
        best_result: Optional[Tuple] = None

        for rect in self.free:
            for (dep, wid, hgt, orient) in _orientations(pallet.dimensions):
                if hgt > self.iH or wid > rect.w or dep > rect.d:
                    continue
                short_fit = min(rect.w - wid, rect.d - dep)
                long_fit  = max(rect.w - wid, rect.d - dep)
                # Negate z: largest z (back of truck) scores first
                z_bias    = -(rect.z)
                score     = (short_fit, long_fit, z_bias)
                if best_score is None or score < best_score:
                    best_score  = score
                    best_result = (rect.x, rect.z, dep, wid, hgt, orient)

        return best_result

    def mark_placed(self, x: int, z: int, dep: int, wid: int) -> None:
        """Guillotine-split all intersecting free rects, then prune dominated ones."""
        new_free: List[FreeRect] = []
        for rect in self.free:
            if not self._hits(rect, x, z, dep, wid):
                new_free.append(rect)
                continue
            if x > rect.x:
                new_free.append(FreeRect(rect.x, rect.z, x - rect.x, rect.d))
            if x + wid < rect.x + rect.w:
                new_free.append(FreeRect(x + wid, rect.z, rect.x + rect.w - (x + wid), rect.d))
            if z > rect.z:
                new_free.append(FreeRect(rect.x, rect.z, rect.w, z - rect.z))
            if z + dep < rect.z + rect.d:
                new_free.append(FreeRect(rect.x, z + dep, rect.w, rect.z + rect.d - (z + dep)))
        self.free = self._prune(new_free)

    @staticmethod
    def _hits(rect: FreeRect, x: int, z: int, d: int, w: int) -> bool:
        return (x < rect.x + rect.w and x + w > rect.x and
                z < rect.z + rect.d and z + d > rect.z)

    @staticmethod
    def _prune(rects: List[FreeRect]) -> List[FreeRect]:
        out = []
        for i, r in enumerate(rects):
            if not any(j != i and rects[j].contains(r) for j in range(len(rects))):
                out.append(r)
        return out


# ---------------------------------------------------------------------------
# Module-level packer registry
# ---------------------------------------------------------------------------

_packers: dict[str, MaxRectPacker] = {}


def reset_packer(container_id: str) -> None:
    _packers.pop(container_id, None)


def _get_packer(container: Container) -> MaxRectPacker:
    if container.containerId not in _packers:
        _packers[container.containerId] = MaxRectPacker(container)
    return _packers[container.containerId]


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def validate_pallet_fits(container: Container, pallet: Pallet) -> Tuple[bool, str]:
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
    if pallet.temperatureRequirement not in ("ambient", ""):
        if not container.refrigerationCapable:
            return False, "Refrigeration required but container not capable"
    if pallet.isHazmat and container.loadingRules.hazmatSegregation:
        if any(not p.isHazmat for p in container.pallets):
            return False, "Hazmat segregation violation"
    return True, ""


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
    _distribute_weight_to_axles(container, pallet, z, dep)

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


# ---------------------------------------------------------------------------
# Axle load distribution
# ---------------------------------------------------------------------------

def _distribute_weight_to_axles(
    container: Container, pallet: Pallet, z_mm: int, depth_mm: int
) -> None:
    cog_z     = z_mm + depth_mm / 2
    total_len = container.internalDepth
    for axle in container.axles:
        factor = max(0.0, 1 - abs(cog_z - axle.positionX) / total_len)
        axle.currentLoad += pallet.weightIn_kg * factor


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

def compute_axle_loads(container: Container) -> List[AxleLoadResult]:
    return [
        AxleLoadResult(
            axleId=a.axleId,
            currentLoad_kg=round(a.currentLoad, 2),
            maxLoad_kg=a.maxWeight,
            utilization_pct=round(a.currentLoad / a.maxWeight * 100 if a.maxWeight else 0, 2),
            isOverloaded=a.currentLoad > a.maxWeight,
        )
        for a in container.axles
    ]


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
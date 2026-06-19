
from __future__ import annotations
import logging
from typing import List, Optional, Tuple

from objects.Container import Container
from objects.Pallet import Pallet
from objects.FreeRect import FreeRect
from planning_engine.utility.utils import orientations

logger = logging.getLogger("placement_engine")

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
            for (dep, wid, hgt, orient) in orientations(pallet.dimensions):
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

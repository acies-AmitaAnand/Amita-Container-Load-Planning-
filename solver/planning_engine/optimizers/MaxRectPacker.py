"""
MaxRectPacker — Maximal Rectangles Bin-Packing Algorithm
=========================================================

PURPOSE
-------
Places pallets onto the 2-D floor of a shipping container without overlap,
filling from the back of the truck toward the door (LIFO order).

ALGORITHM SUMMARY
-----------------
Free space is tracked as a list of axis-aligned "free rectangles" that together
cover every unoccupied area of the container floor.

For each pallet to be placed:

  1.  SCORE every (free_rect × orientation) pair using Best-Short-Side Fit (BSSF)
      with a back-first z-bias (high z wins → back of truck fills first).

  2.  PLACE the pallet at the best-scoring position, storing (x, z, effective dims,
      orientation) in the pallet's Position object.

  3.  SPLIT every free rect that overlaps the newly placed footprint into up to
      four smaller non-overlapping rects covering the remaining space (guillotine split).

  4.  PRUNE any free rect that is fully contained inside another — it is redundant
      because the containing rect already makes that space available.

COORDINATE CONVENTION
---------------------
All values are in millimetres. Origin = left-front corner of container interior.

    Axis      Field         Direction                Three.js axis
    ------    ----------    ----------------------   -------------
    Width     position.x    Left → Right             Z
    Depth     position.z    Door → Back of truck     X
    Height    position.y    Floor → Ceiling          Y

Note the Python-to-Three.js swap: depth→X, width→Z.  The React renderer uses
position.effectiveDepth for its X-axis box size and position.effectiveWidth for
its Z-axis box size.

COMPLEXITY
----------
    find_position()     O(k × r)    k = free rect count, r ≤ 2 orientations
    mark_placed()       O(k)        one pass to split + one pass to prune
    _prune()            O(k²)       double loop; fast for k < 200 (typical load)

Upgrade path for > 200 pallets: replace _prune double-loop with an R-tree
spatial index for O(k log k) containment queries.

USAGE
-----
    packer = MaxRectPacker(container)           # once per container
    result = packer.find_position(pallet)       # (x, z, dep, wid, hgt, orient) or None
    if result:
        x, z, dep, wid, hgt, orient = result
        packer.mark_placed(x, z, dep, wid)      # commit placement
"""

from __future__ import annotations
import logging
from typing import List, Optional, Tuple

from objects.Container import Container
from objects.Pallet import Pallet
from objects.FreeRect import FreeRect
from planning_engine.utility.utils import orientations

logger = logging.getLogger("placement_engine")


# ─────────────────────────────────────────────────────────────────────────────
# MaxRectPacker
# ─────────────────────────────────────────────────────────────────────────────

class MaxRectPacker:
    """
    One instance per container. Maintains a list of free rectangles representing
    all unoccupied floor space. Call find_position() then mark_placed() for each
    pallet in sorted order.

    Invariant after every mark_placed() call:
        • No two free rects overlap.
        • Every maximal empty rectangle on the container floor is represented
          (guaranteed by the guillotine split + prune cycle).
    """

    def __init__(self, container: Container) -> None:
        """
        Initialise with the full interior floor as a single free rect.

        Args:
            container: The container being loaded. Only internal dimensions
                       are used; outer dimensions and state fields are ignored.
        """
        self.iW: int = int(container.internalWidth)   # interior width  (mm, x-axis)
        self.iD: int = int(container.internalDepth)   # interior depth  (mm, z-axis)
        self.iH: int = int(container.internalHeight)  # interior height (mm, y-axis)

        # Seed the free list with a single rect covering the entire floor.
        self.free: List[FreeRect] = [FreeRect(0, 0, self.iW, self.iD)]

    # ── Placement ─────────────────────────────────────────────────────────────

    def find_position(
        self, pallet: Pallet
    ) -> Optional[Tuple[int, int, int, int, int, str]]:
        """
        Find the best position for this pallet among all free rects and orientations.

        Scoring — Best-Short-Side Fit (BSSF) with back-first z-bias:

            score = (short_fit, long_fit, z_bias)

            short_fit = min(rect.w - pallet.w,  rect.d - pallet.d)
                Waste on the tighter axis. Minimising this packs tighter
                and reduces slivers.

            long_fit  = max(rect.w - pallet.w,  rect.d - pallet.d)
                Waste on the looser axis. Used as a tie-breaker.

            z_bias    = -(rect.z)
                Negated so that a rect at z=10 000 mm has z_bias=-10 000,
                which is less than z_bias=-0 for a rect at z=0.
                Python's tuple comparison therefore prefers the deeper rect
                → back of truck fills first → LIFO-ready order.

        Both orientations are tried for every rect unless depth == width
        (square footprint, second orientation is identical).

        Args:
            pallet: Pallet to be placed. Uses pallet.dimensions only;
                    pallet.position is not read here.

        Returns:
            (x, z, eff_depth, eff_width, eff_height, orientation) if a valid
            placement exists, or None if no free rect can accommodate the pallet.
        """
        best_score:  Optional[Tuple] = None
        best_result: Optional[Tuple] = None

        for rect in self.free:
            for (dep, wid, hgt, orient) in orientations(pallet.dimensions):

                # ── Rejection filters ────────────────────────────────────────
                if hgt > self.iH:
                    continue          # pallet too tall for the container

                if wid > rect.w or dep > rect.d:
                    continue          # pallet footprint exceeds this free rect

                # ── BSSF score ───────────────────────────────────────────────
                short_fit = min(rect.w - wid, rect.d - dep)
                long_fit  = max(rect.w - wid, rect.d - dep)
                z_bias    = -(rect.z)          # negate: higher z → lower score → preferred

                score = (short_fit, long_fit, z_bias)

                if best_score is None or score < best_score:
                    best_score  = score
                    best_result = (rect.x, rect.z, dep, wid, hgt, orient)

        return best_result

    # ── Free space update ─────────────────────────────────────────────────────

    def mark_placed(self, x: int, z: int, dep: int, wid: int) -> None:
        """
        Remove the placed footprint from the free list using guillotine splitting.

        For every free rect that overlaps the placed region [x, x+wid) × [z, z+dep),
        that rect is discarded and replaced by up to four sub-rects:

            ┌──────────────────────┐
            │  left  │  FRONT  │ right │   (front slice: z side, door-side)
            │        ├────┤         │
            │        │PALLET   │         │   (placed footprint — now occupied)
            │        ├────┤         │
            │        │  BACK   │         │   (back slice: z + dep side)
            └──────────────────────┘

        Rects that do not intersect the placed footprint are kept unchanged.
        After splitting, dominated rects are pruned.

        Args:
            x:   Left edge of placed footprint (mm, width axis).
            z:   Front edge of placed footprint (mm, depth axis, 0 = door).
            dep: Placed depth extent (mm). Use eff_depth from find_position().
            wid: Placed width extent (mm). Use eff_width from find_position().
        """
        new_free: List[FreeRect] = []

        for rect in self.free:
            if not self._hits(rect, x, z, dep, wid):
                # Rect does not overlap — keep it untouched.
                new_free.append(rect)
                continue

            # Rect overlaps the placed footprint — split into surviving pieces.

            # Left slice: columns to the left of the placed pallet.
            if x > rect.x:
                new_free.append(
                    FreeRect(rect.x, rect.z, x - rect.x, rect.d)
                )

            # Right slice: columns to the right of the placed pallet.
            if x + wid < rect.x + rect.w:
                new_free.append(
                    FreeRect(x + wid, rect.z, rect.x + rect.w - (x + wid), rect.d)
                )

            # Front slice: rows in front of the placed pallet (door side, low z).
            if z > rect.z:
                new_free.append(
                    FreeRect(rect.x, rect.z, rect.w, z - rect.z)
                )

            # Back slice: rows behind the placed pallet (high z).
            if z + dep < rect.z + rect.d:
                new_free.append(
                    FreeRect(rect.x, z + dep, rect.w, rect.z + rect.d - (z + dep))
                )

        # Remove dominated rects to keep the free list compact.
        self.free = self._prune(new_free)

    # ── Internal helpers ──────────────────────────────────────────────────────

    @staticmethod
    def _hits(rect: FreeRect, x: int, z: int, d: int, w: int) -> bool:
        """
        Return True if the placed footprint [x, x+w) × [z, z+d) overlaps rect.

        Uses strict AABB (Axis-Aligned Bounding Box) intersection.
        Two rects that only share an edge (flush neighbours) do NOT overlap.

        Args:
            rect: A free rectangle from self.free.
            x, z: Top-left corner of the placed pallet (mm).
            d, w: Depth and width of the placed pallet (mm).
        """
        return (
            x     < rect.x + rect.w and   # pallet left edge is inside rect horizontally
            x + w > rect.x           and   # pallet right edge is inside rect horizontally
            z     < rect.z + rect.d  and   # pallet front edge is inside rect vertically
            z + d > rect.z                  # pallet back edge is inside rect vertically
        )

    @staticmethod
    def _prune(rects: List[FreeRect]) -> List[FreeRect]:
        """
        Remove any rect that is fully contained inside another rect in the list.

        A dominated rect can never host a placement that the containing rect
        could not, so it is redundant and safe to delete. This keeps the free
        list minimal and maintains the maximal-rectangles invariant.

        Complexity: O(k²) where k = len(rects).
        For typical containers (k < 150) this is negligible.
        Upgrade path: R-tree spatial index for O(k log k).

        Args:
            rects: The raw list of sub-rects produced by guillotine splitting.

        Returns:
            A new list containing only the non-dominated rects.
        """
        out = []
        for i, r in enumerate(rects):
            # Check if any other rect fully contains r.
            dominated = any(
                j != i and rects[j].contains(r)
                for j in range(len(rects))
            )
            if not dominated:
                out.append(r)
        return out


# ─────────────────────────────────────────────────────────────────────────────
# Module-level packer registry
# ─────────────────────────────────────────────────────────────────────────────
#
# Packers are keyed by container_id so that placement calls in placement.py
# can look up the correct packer without threading it through every call site.
#
# Thread safety: this global dict is NOT thread-safe. For parallel packing
# of multiple containers, either use a lock or pass packer instances explicitly.

_packers: dict[str, MaxRectPacker] = {}


def reset_packer(container_id: str) -> None:
    """
    Discard the packer for container_id so the next placement call starts fresh.

    Must be called in open_new_container() before any pallets are loaded.
    Forgetting to call this leaks the previous container's spatial state into
    the new one, causing incorrect placements.

    Args:
        container_id: The containerId string from the Container object.
    """
    _packers.pop(container_id, None)


def _get_packer(container: Container) -> MaxRectPacker:
    """
    Lazy-initialise and return the packer for this container.

    Creates a new MaxRectPacker the first time a container_id is seen.
    Subsequent calls return the same instance so spatial state accumulates
    correctly across multiple place_pallet() calls.

    Args:
        container: The container being loaded.

    Returns:
        The MaxRectPacker instance for this container.
    """
    if container.containerId not in _packers:
        _packers[container.containerId] = MaxRectPacker(container)
    return _packers[container.containerId]
"""
Skyline — with 50 mm inter-pallet spacing
===========================================

Spacing design
--------------
GAP = PALLET_GAP_MM (default 50 mm) is applied on BOTH axes:

  Depth axis (z):
    mark_occupied() advances the skyline to (z + depth + GAP).
    The next pallet in the same column therefore starts at least GAP mm
    clear of the previous one's trailing edge.

  Width axis (x):
    _overlaps() treats every placed block as [bx .. bx+bw+GAP) × [bz .. bz+bd+GAP).
    A column-2 candidate at x = bx+bw+GAP is exactly flush with that boundary
    (x < bx+bw+GAP  →  1269 < 1269 = False) so it passes overlap cleanly.
    The skyline columns are NOT extended by GAP on the width axis — doing so
    would bleed the skyline height into column-2 strips and incorrectly block z=0.

Stored coordinates
------------------
position.x, position.z are the TRUE pallet corner — no phantom offset.
effectiveWidth / effectiveDepth are the TRUE placed footprint.
React renders the actual box; the gap lives only in the reservation logic.

Two-column layout
-----------------
After P1 at (x=0, z=0, wid=W1):
  - candidate (W1+GAP, 0) is generated from the block extreme-point rule
  - _overlaps(W1+GAP, 0, ...) is False  ← x=W1+GAP is NOT < bx+bw+GAP=W1+GAP
  - skyline[col covering W1+GAP] = 0    ← untouched, so z=0 passes min_z check
  ⇒ column 2 pallet places flush against the gap at x=W1+GAP, z=0  ✓
"""

import math
from typing import List, Tuple

PALLET_GAP_MM: int = 50  # change here to adjust spacing globally


class Skyline:
    def __init__(
        self,
        container_width: int,
        container_depth: int,
        resolution: int = 50,
        gap_mm: int = PALLET_GAP_MM,
    ):
        self.resolution      = resolution
        self.gap             = gap_mm
        self.n_cols          = math.ceil(container_width / resolution)
        self.container_width = container_width
        self.container_depth = container_depth
        # skyline[c] = deepest reserved z in column c (door = z=0, back = z=max)
        self.skyline: List[int] = [0] * self.n_cols
        # Stored with TRUE placed dims  (x, y, z, actual_depth, actual_width, height)
        self.blocks: List[Tuple[int, int, int, int, int, int]] = []

    # ── Column helpers ─────────────────────────────────────────────────────

    def _col_range(self, x_mm: int, w_mm: int) -> Tuple[int, int]:
        c0 = x_mm // self.resolution
        c1 = math.ceil((x_mm + w_mm) / self.resolution)
        return max(0, c0), min(self.n_cols, c1)

    def max_depth_in_strip(self, x_mm: int, w_mm: int) -> int:
        c0, c1 = self._col_range(x_mm, w_mm)
        return max(self.skyline[c0:c1]) if c0 < c1 else 0

    # ── Mark occupied ──────────────────────────────────────────────────────

    def mark_occupied(
        self,
        x_mm: int, z_mm: int,
        d_mm: int, w_mm: int, h_mm: int,
    ) -> None:
        """
        Reserve the pallet's depth footprint + GAP on the skyline.

        Only the pallet's actual width columns are updated (no width bleed).
        Width-axis spacing is enforced entirely through _overlaps().
        """
        # Push skyline to z + depth + GAP so next row starts GAP mm clear
        reserved_z = min(z_mm + d_mm + self.gap, self.container_depth)
        c0, c1 = self._col_range(x_mm, w_mm)   # actual width columns only
        for c in range(c0, c1):
            self.skyline[c] = max(self.skyline[c], reserved_z)
        # Store true placed dims (no gap baked in)
        self.blocks.append((x_mm, 0, z_mm, d_mm, w_mm, h_mm))

    # ── Candidate positions ────────────────────────────────────────────────

    def candidate_positions(
        self, pallet_depth: int, pallet_width: int
    ) -> List[Tuple[int, int]]:
        """
        Returns valid (x, z) placement corners with 50 mm spacing baked in.

        Candidates are generated at:
          (bx,           bz + bd + GAP)  — next row, same column
          (bx + bw + GAP, bz)            — column 2, same row
          (bx + bw + GAP, bz + bd + GAP) — diagonal
          skyline step transitions (with and without GAP offset)
        """
        positions: set[Tuple[int, int]] = set()
        g = self.gap

        positions.add((0, 0))  # first pallet (door end / front of container)

        for (bx, by, bz, bd, bw, bh, *_) in self.blocks:
            positions.add((bx,          bz + bd + g))   # next row (depth axis)
            positions.add((bx + bw + g, bz))            # column 2 (width axis)
            positions.add((bx + bw + g, bz + bd + g))   # diagonal corner

        # Skyline transitions: seam between different-height strips
        for c in range(self.n_cols - 1):
            if self.skyline[c] != self.skyline[c + 1]:
                x_snap = c * self.resolution
                positions.add((x_snap,      self.skyline[c]))
                positions.add((x_snap,      self.skyline[c + 1]))
                positions.add((x_snap + g,  self.skyline[c]))   # gap-shifted seam

        cw = self.container_width
        cd = self.container_depth
        valid: List[Tuple[int, int]] = []

        for (x, z) in sorted(positions):  # deterministic: ascending x then z
            x, z = int(x), int(z)
            if x < 0 or z < 0:
                continue
            if x + pallet_width > cw:     # pallet must fit within interior
                continue
            if z + pallet_depth > cd:
                continue
            # z must be at or above the skyline for all spanned columns
            c0, c1 = self._col_range(x, pallet_width)
            min_z_needed = max(self.skyline[c0:c1]) if c0 < c1 else 0
            if z < min_z_needed:
                continue
            # Gap-aware overlap check
            if not self._overlaps(x, z, pallet_depth, pallet_width):
                valid.append((x, z))

        return valid

    # ── Overlap check ──────────────────────────────────────────────────────

    def _overlaps(self, x: int, z: int, d: int, w: int) -> bool:
        """
        AABB overlap against the GAP-expanded block footprint.

        Each placed block is treated as occupying:
          x-axis: [bx .. bx + bw + GAP)
          z-axis: [bz .. bz + bd + GAP)

        Flush contact (new pallet starts exactly at bx+bw+GAP or bz+bd+GAP)
        evaluates as  x < bx+bw+GAP → x < x → False  → no overlap.
        This guarantees exactly GAP mm of clear space between all neighbours.
        """
        g = self.gap
        for (bx, by, bz, bd, bw, bh, *_) in self.blocks:
            if (x     < bx + bw + g and
                x + w > bx          and
                z     < bz + bd + g and
                z + d > bz):
                return True
        return False
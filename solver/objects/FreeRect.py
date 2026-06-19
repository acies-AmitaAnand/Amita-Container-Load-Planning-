
from __future__ import annotations
from dataclasses import dataclass


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

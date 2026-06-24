
from __future__ import annotations
from typing import List, Tuple

from objects.Dimension import Dimension

# ---------------------------------------------------------------------------
# Orientation helper
# ---------------------------------------------------------------------------

def orientations(dim: Dimension) -> List[Tuple[int, int, int, str]]:
    """Returns (eff_depth, eff_width, height, label) for each valid upright rotation."""
    d, w, h = dim.depth, dim.width, dim.height
    if d == w:
        return [(d, w, h, "FRONT_FACING")]
    return [
        (d, w, h, "FRONT_FACING"),
        (w, d, h, "SIDE_FACING_LEFT"),
    ]

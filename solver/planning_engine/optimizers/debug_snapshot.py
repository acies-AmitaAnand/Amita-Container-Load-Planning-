
# planning_engine/optimizers/debug_snapshot.py

import json, os
from datetime import datetime

from objects.Pallet import Pallet

def snapshot(packer, container, pallet=None, label=""):
    """
    Dump current free rects + placed pallets to a file.
    React can read this as a normal container JSON — free rects
    render as ghost boxes, placed pallets render normally.
    Call after every place_pallet() during a debug run.
    """
    free_as_pallets = [{
            "candidatePalletId": f"FREE_{i}",
            "dimensions": {"depth": r.d, "width": r.w, "height": 50},
            "position": {
                "x": r.x, "y": 0, "z": r.z,
                "orientation": "FRONT_FACING",
                "effectiveWidth": r.w,
                "effectiveDepth": r.d,
                "effectiveHeight": 50,
            },
            "skuName": f"free {r.w}x{r.d}",
            "color": "#00000022",   # transparent ghost
            "weightIn_kg": 0,
            "isPartialPallet": False,
            "fillPct": 0,
        }
        for i, r in enumerate(packer.free)
    ]

    payload = {
        **container.model_dump(),
        "pallets": [p.model_dump() for p in container.pallets] + free_as_pallets,
        "debug": {
            "skuName": label,
            "step": len(container.pallets),
            "free_rect_count": len(packer.free),
            "current_pallet": pallet.candidatePalletId if pallet else None,
            "timestamp": datetime.utcnow().isoformat(),
        }
    }

    os.makedirs("debug_snapshots", exist_ok=True)
    step = len(container.pallets)
    fname = f"debug_snapshots/step_{step:04d}_{label}.json"
    with open(fname, "w") as f:
        json.dump(payload, f, indent=2, default=str)
    return fname
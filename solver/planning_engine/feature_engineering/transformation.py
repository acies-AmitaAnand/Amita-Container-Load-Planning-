"""
Feature Engineering
===================
Actions:
  - create_pallet_features(shipment_demand_df, sku_master_df, pallet_master_df)
  - breakdown_into_pallets(shipment_candidate_df)
  - group_pallets_by_lane(pallets, lane_master_df)
  - sort_pallets_for_loading(pallets)
"""

from __future__ import annotations
import math
import hashlib
from datetime import datetime
from typing import List, Tuple, Dict
import pandas as pd

from objects.Pallet import Pallet
from objects.Dimension import Dimension
from objects.Position import Position
from objects.ShipmentGroup import ShipmentGroup


# ── Color palette for SKUs ────────────────────────────────────────────────────
_SKU_COLORS = [
    "#4CAF50", "#2196F3", "#FF9800", "#E91E63", "#9C27B0",
    "#00BCD4", "#FF5722", "#607D8B", "#795548", "#FFC107",
    "#3F51B5", "#8BC34A", "#F44336", "#009688", "#FFEB3B",
]

def _sku_color(sku_id: str) -> str:
    idx = int(hashlib.md5(sku_id.encode()).hexdigest(), 16) % len(_SKU_COLORS)
    return _SKU_COLORS[idx]


# ── Action 1: Create pallet features on the demand dataframe ─────────────────

def create_pallet_features(
    shipment_demand_df: pd.DataFrame,
    sku_pallet_df: pd.DataFrame,           # columns from load_equipment_metadata or pallet_master
) -> pd.DataFrame:
    """
    Merges pallet/UOM master into shipment demand and computes:
      - required_pallets, full_pallets, remaining_units, partial_fill_pct
    Returns enriched shipment_candidate_df.
    """
    # Merge pallet dimensions onto demand rows
    candidate = shipment_demand_df.copy()

    # Columns expected from pallet_master: sku_id, unit_count_in_pallet,
    # pallet_height_mm, pallet_width_mm, pallet_length_mm,
    # pallet_weight_in_kg, item_weight_in_kg
    if "unit_count_in_pallet" not in candidate.columns:
        candidate = candidate.merge(
            sku_pallet_df[[
                "sku_id", "unit_count_in_pallet",
                "pallet_height_mm", "pallet_width_mm", "pallet_length_mm",
                "pallet_weight_in_kg", "item_weight_in_kg",
            ]],
            on="sku_id",
            how="left",
        )


    ### Filter for the ones that are divisible
    candidate = (
        candidate
        [
            candidate[
                "unit_count_in_pallet"
            ]
            > 0
        ]
    )

    # Compute pallet breakdown
    candidate["required_pallets"] = (
        candidate["planned_quantity"] / candidate["unit_count_in_pallet"]
    ).apply(math.ceil)

    candidate["full_pallets"] = (
        candidate["planned_quantity"] // candidate["unit_count_in_pallet"]
    ).astype(int)

    candidate["remaining_units"] = (
        candidate["planned_quantity"] % candidate["unit_count_in_pallet"]
    ).astype(int)

    candidate["partial_fill_pct"] = candidate.apply(
        lambda r: (r["remaining_units"] / r["unit_count_in_pallet"])
        if r["remaining_units"] > 0 else 0.0,
        axis=1,
    )

    return candidate


# ── Action 2: Break enriched demand rows into individual Pallet objects ───────

def breakdown_into_pallets(shipment_candidate_df: pd.DataFrame) -> List[Pallet]:
    """
    Explodes each demand row into N Pallet domain objects
    (full pallets + optional partial pallet).
    """
    pallets: List[Pallet] = []
    pallet_counter: Dict[str, int] = {}

    service_level_map = {"GOLD": 3, "SILVER": 2, "BRONZE": 1, "STANDARD": 1}

    for _, row in shipment_candidate_df.iterrows():
        base_id = f"{row['shipment_id']}_{row['sku_id']}"
        pallet_counter.setdefault(base_id, 0)

        dims = Dimension(
            depth=int(row["pallet_length_mm"]),
            width=int(row["pallet_width_mm"]),
            height=int(row["pallet_height_mm"]),
        )
        weight_per_pallet = (
            row["pallet_weight_in_kg"]
            + row["unit_count_in_pallet"] * row["item_weight_in_kg"]
        )
        service_level_val = service_level_map.get(
            str(row.get("service_level", "STANDARD")).upper(), 1
        )
        est_date = (
            pd.to_datetime(row["estimated_delivery_date"])
            if "estimated_delivery_date" in row else datetime.utcnow()
        )

        color = _sku_color(str(row["sku_id"]))
        temperature_req = str(row.get("temperature_requirement", "ambient") or "ambient").lower()
        special = str(row.get("special_handling", "") or "").lower()

        def _make_pallet(seq: int, is_partial: bool, fill_pct: float, units: int) -> Pallet:
            pallet_counter[base_id] += 1
            pid = f"PLT_{row['shipment_id']}_{row['sku_id']}_{pallet_counter[base_id]:04d}"
            w = weight_per_pallet * fill_pct if is_partial else weight_per_pallet
            return Pallet(
                candidatePalletId=pid,
                shipmentId=str(row["shipment_id"]),
                skuId=str(row["sku_id"]),
                orderLineId=str(row["order_line_id"]),
                originLocationId=str(row["origin_location_id"]),
                destinationLocationId=str(row["destination_location_id"]),
                estimatedDeliveryDate=est_date,
                dimensions=dims,
                skuName=str(row.get("sku_name", pid)),
                color=color,
                weightIn_kg=round(w, 2),
                priority=int(row.get("priority", 0)),
                serviceLevel=service_level_val,
                unitsLoaded=units,
                isPartialPallet=is_partial,
                fillPct=fill_pct,
                unloadSequence=int(row.get("unload_sequence_preference", 0)),
                temperatureRequirement=temperature_req,
                isFragile="fragile" in special,
                isHazmat="hazmat" in special,
            )

        # Full pallets
        for i in range(int(row.get("full_pallets", 0))):
            pallets.append(_make_pallet(i, False, 1.0, int(row["unit_count_in_pallet"])))

        # Partial pallet
        if int(row.get("remaining_units", 0)) > 0:
            fill = row["partial_fill_pct"] if row["partial_fill_pct"] > 0 else (
                row["remaining_units"] / row["unit_count_in_pallet"]
            )
            pallets.append(_make_pallet(
                int(row.get("full_pallets", 0)),
                True,
                round(fill, 4),
                int(row["remaining_units"]),
            ))

    return pallets


# ── Action 3: Group pallets by shipment lane ──────────────────────────────────

def group_pallets_by_lane(
    pallets: List[Pallet],
    lane_master_df: pd.DataFrame | None = None,
) -> List[ShipmentGroup]:
    """
    Groups pallets by (origin, destination) only — date is NOT part of the key.
    Each group = one lane. Pallets inside are sorted by date so the container
    loop can advance day-by-day (oldest date first, then next, etc.).
    Groups themselves are sorted by their earliest delivery date so the most
    urgent lane gets a container first.
    """
    from collections import defaultdict
 
    bucket: Dict[Tuple, List[Pallet]] = defaultdict(list)
    for p in pallets:
        bucket[(p.originLocationId, p.destinationLocationId)].append(p)
 
    groups: List[ShipmentGroup] = []
    for (origin, dest), pallet_list in bucket.items():
        # Sort pallets inside the lane: oldest date first, then priority/service/weight
        sorted_lane = sort_pallets_for_loading(pallet_list)
        earliest    = sorted_lane[0].estimatedDeliveryDate
        groups.append(ShipmentGroup(
            groupId=f"GRP_{origin}_{dest}".replace(" ", "_"),
            originLocationId=origin,
            destinationLocationId=dest,
            deliveryDateWindow=earliest.strftime("%Y-%m-%d"),
            pallets=sorted_lane,
            estimatedDeliveryDate=earliest,
        ))

    # Most urgent lane (earliest delivery date) gets a container first
    groups.sort(key=lambda g: g.estimatedDeliveryDate)
    return groups


# ── Action 4: Sort pallets for optimal loading sequence ───────────────────────

def sort_pallets_for_loading(pallets: List[Pallet], lifo: bool = True) -> List[Pallet]:
    """
    Sort order:
      1. destinationStop ASC  (multi-drop: last destination loaded first for LIFO)
      2. priority DESC
      3. serviceLevel DESC
      4. estimatedDeliveryDate ASC
      5. full pallet before partial (isPartialPallet ASC)
      6. heavier pallets first (better CoG)

    When LIFO is enabled, pallets for the last stop are loaded first
    (they will be unloaded last = deepest in container).
    """
    # Determine stop ordering: reverse for LIFO
    dest_order_sign = -1 if lifo else 1

    return sorted(
        pallets,
        key=lambda p: (
            dest_order_sign * p.destinationStop,   # LIFO: last stop loads first
            -p.priority,
            -p.serviceLevel,
            p.estimatedDeliveryDate,
            int(p.isPartialPallet),
            -p.weightIn_kg,
        ),
    )

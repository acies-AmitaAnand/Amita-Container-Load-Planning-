# planning_engine/scheduler.py
# ─────────────────────────────────────────────────────────────────────────────
# Multi-day rolling container scheduler.
#
# Concepts
# ────────
#   Day 0   = today (planning date). We DO NOT ship on day 0.
#   Day 1   = first shipment day.
#   horizon = how many days forward to plan (default 7).
#
#   Container pool
#     M containers are available total.
#     Each container is "occupied" for F days after it departs.
#     On day D, containers that departed on day ≤ D-F are free again.
#     Default: M=10, F=1 → a container departing day 1 is free again day 2.
#
#   Overflow rule (as specified)
#     Day 1 leftovers are fed into day 2 BEFORE day 2's own demand.
#     Concretely: pending pallets from day D are prepended to day D+1's list.
#
# Output
# ──────
#   DayResult  — containers packed + unallocated pallets for one day.
#   ScheduleResult — list of DayResult across the full horizon.
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Dict, List

import pandas as pd

from objects.Pallet import Pallet
from objects.Container import Container
from planning_engine.feature_engineering.transformation import (
    create_pallet_features,
    breakdown_into_pallets,
    group_pallets_by_lane,
    sort_pallets_for_loading,
)


from objects.ContainerFleetOptimizationResult import ContainerFleetOptimizationResult
from planning_engine.placement_engine.placement import load_equipment_to_container_spec, open_new_container, optimize_container_fleet


# ── Result types ──────────────────────────────────────────────────────────────

@dataclass
class DayResult:
    day:               int                              # 1-based (day 1, 2, …)
    plan_date:         date                             # calendar date
    containers_used:   int
    containers_available: int                           # pool available this day
    loaded_pallets:    int
    unallocated_pallets: List[Pallet] = field(default_factory=list)
    container_results: List[ContainerFleetOptimizationResult] = field(default_factory=list)


@dataclass
class ScheduleResult:
    planning_date: date
    horizon_days:  int
    total_containers: int
    container_free_after_days: int
    days: List[DayResult] = field(default_factory=list)

    @property
    def total_loaded(self) -> int:
        return sum(d.loaded_pallets for d in self.days)

    @property
    def total_unallocated(self) -> int:
        return sum(len(d.unallocated_pallets) for d in self.days)


# ── Scheduler ─────────────────────────────────────────────────────────────────

def plan_rolling_window(
    shipment_demand_df:       pd.DataFrame,
    sku_uom_df:               pd.DataFrame,       # matches API caller name
    load_equipment_metadata_df: pd.DataFrame,
    planning_date:            date | None = None,
    horizon_days:             int = 7,
    total_containers:         int = 10,
    container_free_after_days: int = 1,
    preferred_equipment_type: str = "CONTAINER",
    lifo:                     bool = True,
) -> ScheduleResult:
    """
    Plan container loading across a rolling horizon.

    Args:
        shipment_demand_df:        Raw demand dataframe (all dates).
        sku_pallet_df:             SKU/pallet master.
        load_equipment_metadata_df: Container spec table.
        planning_date:             Day 0. Defaults to today.
        horizon_days:              How many days to plan ahead (default 7).
        total_containers:          Total container fleet size (default 10).
        container_free_after_days: Days until a used container is available again (default 1).
        preferred_equipment_type:  Equipment type filter.
        lifo:                      Load order.

    Returns:
        ScheduleResult with one DayResult per day in the horizon.
    """
    if planning_date is None:
        planning_date = date.today()

    # ── Equipment spec (same for all days) ───────────────────────────────────
    mask   = load_equipment_metadata_df["equipment_type"].str.upper() == preferred_equipment_type.upper()
    eq_df  = load_equipment_metadata_df[mask]
    eq_row = eq_df.iloc[0] if len(eq_df) else load_equipment_metadata_df.iloc[0]
    equip  = load_equipment_to_container_spec(eq_row)


    # ── Build all pallets from the full demand ────────────────────────────────
    candidate_df = create_pallet_features(shipment_demand_df=shipment_demand_df, sku_pallet_df=sku_uom_df)
    all_pallets  = breakdown_into_pallets(shipment_candidate_df=candidate_df)

    # ── Bucket pallets by estimated_delivery_date ─────────────────────────────
    # date string → list of Pallet
    by_date: Dict[str, List[Pallet]] = {}
    for p in all_pallets:
        dk = p.estimatedDeliveryDate.strftime("%Y-%m-%d")
        by_date.setdefault(dk, []).append(p)

    # ── Rolling simulation ────────────────────────────────────────────────────
    # Track which day each container becomes free again.
    # container_free_on[i] = the first day index (1-based) container i is available.
    container_free_on = [1] * total_containers   # all free on day 1

    result = ScheduleResult(
        planning_date=planning_date,
        horizon_days=horizon_days,
        total_containers=total_containers,
        container_free_after_days=container_free_after_days,
    )

    # Overflow from previous day — prepended to next day's pallet list.
    overflow: List[Pallet] = []
    groups = group_pallets_by_lane(remaining)
    
    for day_idx in range(1, horizon_days + 1):
        plan_date = planning_date + timedelta(days=day_idx)
        date_key  = plan_date.strftime("%Y-%m-%d")

        # Pallets for today: overflow first (day D-1 leftovers), then today's demand.
        today_demand = by_date.get(date_key, [])
        pallets_to_load = sort_pallets_for_loading(overflow + today_demand, lifo=lifo)
        overflow = []   # reset; new overflow set at end of day

        # How many containers are free today?
        free_today = sum(1 for f in container_free_on if f <= day_idx)

        if not pallets_to_load or free_today == 0:
            result.days.append(DayResult(
                day=day_idx, plan_date=plan_date,
                containers_used=0, containers_available=free_today,
                loaded_pallets=0, unallocated_pallets=pallets_to_load,
            ))
            overflow = pallets_to_load   # carry everything forward
            continue

        # ── Fill containers for today ─────────────────────────────────────────
        containers_opened = 0
        day_loaded:    List[Pallet] = []
        day_results:   List[ContainerFleetOptimizationResult] = []
        remaining      = list(pallets_to_load)
        container_seq  = 1

        while remaining and containers_opened < free_today:
            container = open_new_container(container_spec=equip, container_idx=container_seq, group=_make_group(plan_date=plan_date))
            
            
            
            cr        = optimize_container_fleet(equipment_spec=container, group=groups[0], lifo=True, max_containers=1).containerResults[0]

            if cr.loadedPallets:
                # Compute utilization now that the container load is final
                from planning_engine.metrics.utilization import compute_utilization
                util, rem_cap = compute_utilization(container, cr.pendingPallets)
                cr.utilization      = util
                cr.remainingCapacity = rem_cap
                # Update summary fields
                container.summary.totalPallets     = len(cr.loadedPallets)
                container.summary.totalWeightIn_kg = round(container.usedWeightIn_kg, 2)
                container.summary.totalVolumeIn_m3 = round(container.usedVolume_m3, 4)
                # Mark this container slot as busy for F days
                _occupy_container(free_on=container_free_on, current_day=day_idx, free_after=container_free_after_days)
                day_loaded.extend(cr.loadedPallets)
                day_results.append(cr)
                remaining       = cr.pendingPallets
                containers_opened += 1
                container_seq   += 1
            else:
                break   # nothing fits — stop opening containers

        overflow = remaining   # unloaded pallets carry forward to day+1

        result.days.append(DayResult(
            day=day_idx,
            plan_date=plan_date,
            containers_used=containers_opened,
            containers_available=free_today,
            loaded_pallets=len(day_loaded),
            unallocated_pallets=list(remaining),
            container_results=day_results,
        ))

    return result


# ── Internal helpers ──────────────────────────────────────────────────────────

def _occupy_container(
    free_on: list[int], current_day: int, free_after: int
) -> None:
    """Mark the first available container slot as busy until current_day + free_after."""
    for i, f in enumerate(free_on):
        if f <= current_day:
            free_on[i] = current_day + free_after  # available after F days
            return


def _make_group(plan_date: date):
    """Lightweight ShipmentGroup stub for open_new_container."""
    from objects.ShipmentGroup import ShipmentGroup
    return ShipmentGroup(
        groupId=f"SCHED_{plan_date.isoformat()}",
        originLocationId="SCHED",
        destinationLocationId="SCHED",
        deliveryDateWindow=plan_date.strftime("%Y-%m-%d"),
        pallets=[],
        estimatedDeliveryDate=plan_date,
    )
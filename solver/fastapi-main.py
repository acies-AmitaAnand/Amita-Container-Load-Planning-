# app.py
# ─────────────────────────────────────────────────────────────────────────────
# FastAPI server.
#
# Routes
# ──────
#   GET    /api/{table}          list rows (paginated)
#   GET    /api/{table}/{id}     single row
#   POST   /api/{table}          insert row
#   PATCH  /api/{table}/{id}     update fields
#   DELETE /api/{table}/{id}     soft delete
#   POST   /api/plan             run multi-day optimizer
#   GET    /api/plan/config      return current default config
#
# Run: uvicorn app:app --reload --port 8000
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations
from datetime import date
from typing import Any

import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database.crud import ALLOWED_TABLES, delete_row, get_row, insert_row, list_rows, update_row
from planning_engine.scheduler import ScheduleResult, plan_rolling_window

app = FastAPI(title="Shipment Planner API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── CRUD — all 6 tables via a single parameterised path ───────────────────────

def _validate_table(table: str) -> None:
    if table not in ALLOWED_TABLES:
        raise HTTPException(status_code=404, detail=f"Unknown table: {table!r}")


@app.get("/api/{table}")
def api_list(
    table: str,
    limit:  int = Query(default=500, le=2000),
    offset: int = Query(default=0, ge=0),
):
    _validate_table(table)
    return list_rows(table, limit=limit, offset=offset)


@app.get("/api/{table}/{row_id}")
def api_get(table: str, row_id: int):
    _validate_table(table)
    row = get_row(table, row_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Row not found")
    return row


@app.post("/api/{table}", status_code=201)
def api_insert(table: str, body: dict[str, Any]):
    _validate_table(table)
    return insert_row(table, body)


@app.patch("/api/{table}/{row_id}")
def api_update(table: str, row_id: int, body: dict[str, Any]):
    _validate_table(table)
    row = update_row(table, row_id, body)
    if row is None:
        raise HTTPException(status_code=404, detail="Row not found")
    return row


@app.delete("/api/{table}/{row_id}", status_code=204)
def api_delete(table: str, row_id: int):
    _validate_table(table)
    ok = delete_row(table, row_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Row not found")


# ── Multi-day planner ─────────────────────────────────────────────────────────

class PlanRequest(BaseModel):
    planning_date:             date | None = None   # defaults to today in scheduler
    horizon_days:              int = 7
    total_containers:          int = 10
    container_free_after_days: int = 1
    preferred_equipment_type:  str = "CONTAINER"
    lifo:                      bool = True


@app.get("/api/plan/config")
def plan_config():
    """Return the default planning parameters for the UI config panel."""
    return PlanRequest().model_dump()


@app.post("/api/plan")
def api_plan(req: PlanRequest) -> dict:
    """
    Pull all input data from NeonDB and run the multi-day rolling scheduler.
    Returns a serialisable summary of the schedule result.
    """
    # ── Pull all input tables from DB ─────────────────────────────────────────
    demand_rows   = list_rows("shipment_demand",   limit=10_000)
    sku_rows      = list_rows("sku_pallet_master", limit=10_000)
    equip_rows    = list_rows("load_equipment",    limit=100)

    if not demand_rows:
        raise HTTPException(status_code=400, detail="No shipment demand records in database")
    if not sku_rows:
        raise HTTPException(status_code=400, detail="No SKU/pallet master records in database")
    if not equip_rows:
        raise HTTPException(status_code=400, detail="No load equipment records in database")

    demand_df = pd.DataFrame(demand_rows)
    sku_df    = pd.DataFrame(sku_rows)
    equip_df  = pd.DataFrame(equip_rows)

    # ── Run scheduler ─────────────────────────────────────────────────────────
    result: ScheduleResult = plan_rolling_window(
        shipment_demand_df=demand_df,
        sku_pallet_df=sku_df,
        load_equipment_metadata_df=equip_df,
        planning_date=req.planning_date,
        horizon_days=req.horizon_days,
        total_containers=req.total_containers,
        container_free_after_days=req.container_free_after_days,
        preferred_equipment_type=req.preferred_equipment_type,
        lifo=req.lifo,
    )

    # ── Serialise ─────────────────────────────────────────────────────────────
    return _serialise_schedule(result)


def _serialise_schedule(r: ScheduleResult) -> dict:
    return {
        "planning_date":             r.planning_date.isoformat(),
        "horizon_days":              r.horizon_days,
        "total_containers":          r.total_containers,
        "container_free_after_days": r.container_free_after_days,
        "total_loaded_pallets":      r.total_loaded,
        "total_unallocated_pallets": r.total_unallocated,
        "days": [
            {
                "day":                   d.day,
                "plan_date":             d.plan_date.isoformat(),
                "containers_available":  d.containers_available,
                "containers_used":       d.containers_used,
                "loaded_pallets":        d.loaded_pallets,
                "unallocated_pallets":   len(d.unallocated_pallets),
                # Per-container detail for React visualiser
                "containers": [
                    {
                        "containerId":   cr.container.containerId,
                        "loadedPallets": len(cr.loadedPallets),
                        "weightUtil":    cr.utilization.weightUtilization_pct if cr.utilization else 0,
                        "volumeUtil":    cr.utilization.volumeUtilization_pct if cr.utilization else 0,
                        "floorUtil":     cr.utilization.floorAreaUtilization_pct if cr.utilization else 0,
                        "pendingCount":  len(cr.pendingPallets),
                    }
                    for cr in d.container_results
                ],
            }
            for d in r.days
        ],
    }
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
import json
from typing import Any

import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database.crud import ALLOWED_TABLES, delete_row, get_row, insert_row, list_rows, update_row
from planning_engine.scheduler import ScheduleResult, plan_rolling_window
from planning_engine.placement_engine.placement import run_full_optimization, run_full_optimization_daily
from planning_engine.export_results import export_container_json
from utils import CustomJSONEncoder

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


@app.get("/api/metadata/plan/config")
def plan_config():
    """Return the default planning parameters for the UI config panel."""
    return PlanRequest().model_dump()


@app.post("/api/plan/schedule")
def api_plan(req: PlanRequest) -> dict:
    """
    Pull all input data from NeonDB and run the multi-day rolling scheduler.
    Returns a serialisable summary of the schedule result.
    """
    # ── Pull all input tables from DB ─────────────────────────────────────────
    demand_rows   = list_rows("sample_shipment_plans",   limit=10_000)
    sku_uom_df      = list_rows("sku_unit_of_measure", limit=10_000)
    equip_rows    = list_rows("load_equipment_metadata",    limit=100)

    if not demand_rows:
        raise HTTPException(status_code=400, detail="No shipment demand records in database")
    if not sku_uom_df:
        raise HTTPException(status_code=400, detail="No SKU/pallet master records in database")
    if not equip_rows:
        raise HTTPException(status_code=400, detail="No load equipment records in database")

    demand_df = pd.DataFrame(demand_rows)
    sku_uom_df = pd.DataFrame(sku_uom_df)
    equip_df  = pd.DataFrame(equip_rows)

    # FE
    sku_uom_df = pd.concat(
        [
            sku_uom_df,
            sku_uom_df['pallet_dimensions'].apply(pd.Series)
        ],
        axis=1
    )

    # File filter:
    demand_df['estimated_delivery_date'] = pd.to_datetime(demand_df["estimated_delivery_date"], errors="coerce")

    sku_uom_column_mapper = {x:x for x in sku_uom_df.columns}
    sku_uom_column_mapper['height_mm'] = 'pallet_height_mm'
    sku_uom_column_mapper['width_mm'] = 'pallet_width_mm'
    sku_uom_column_mapper['length_mm'] = 'pallet_length_mm'
    sku_uom_df.rename(columns=sku_uom_column_mapper, inplace=True)

    # ── Run scheduler ─────────────────────────────────────────────────────────
    result = run_full_optimization_daily(
        shipment_demand_df=demand_df,
        sku_pallet_df=sku_uom_df,
        load_equipment_metadata_df=equip_df,
        lane_master_df=None,
        preferred_equipment_type=req.preferred_equipment_type,
        fleet_limit=req.total_containers,
        lifo=req.lifo,
        planning_date=req.planning_date,
        horizon_days=req.horizon_days,
        total_containers=req.total_containers,
        container_free_after_days=req.container_free_after_days,
    )
    
    return export_container_json(fleet_result=result, out_dir="./output")



def _serialise_schedule(r: ScheduleResult) -> dict:
    import json, os
    from utils.CustomJSONEncoder import CustomJSONEncoder
 
    os.makedirs("output", exist_ok=True)
 
    days_out = []
    for d in r.days:
        containers_out = []
        for cr in d.container_results:
            util = cr.utilization
            entry = {
                "containerId":   cr.container.containerId,
                "loadedPallets": len(cr.loadedPallets),
                "weightUtil":    util.weightUtilization_pct if util else 0,
                "volumeUtil":    util.volumeUtilization_pct if util else 0,
                "floorUtil":     util.floorAreaUtilization_pct if util else 0,
                "pendingCount":  len(cr.pendingPallets),
            }
            containers_out.append(entry)
 
            # ── Export full container JSON for React visualiser ───────────────
            fname = f"output/{cr.container.containerId}.json"
            with open(fname, "w") as fh:
                json.dump(cr.container, fh, cls=CustomJSONEncoder, indent=2)
 
        days_out.append({
            "day":                   d.day,
            "plan_date":             d.plan_date.isoformat(),
            "containers_available":  d.containers_available,
            "containers_used":       d.containers_used,
            "loaded_pallets":        d.loaded_pallets,
            "unallocated_pallets":   len(d.unallocated_pallets),
            "containers":            containers_out,
        })
 
    return {
        "planning_date":             r.planning_date.isoformat(),
        "horizon_days":              r.horizon_days,
        "total_containers":          r.total_containers,
        "container_free_after_days": r.container_free_after_days,
        "total_loaded_pallets":      r.total_loaded,
        "total_unallocated_pallets": r.total_unallocated,
        "days":                      days_out,
    }
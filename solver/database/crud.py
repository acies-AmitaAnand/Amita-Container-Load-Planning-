# database/crud.py
# ─────────────────────────────────────────────────────────────────────────────
# Generic CRUD that works for all 6 tables.
# Every public function takes a table name string — the router validates
# the name against ALLOWED_TABLES before calling here so there's no
# SQL injection risk from the table name parameter.
# ─────────────────────────────────────────────────────────────────────────────

from typing import Any
from database.connection import get_conn

# Whitelist — only these table names may be passed to any function here.
ALLOWED_TABLES = {
    "item_master",
    "lane_master",
    "load_equipment_metadata",
    "location",
    "shipment_plans",
    "sku_unit_of_measure",
    "transport_asset",
}


def _check(table: str) -> None:
    if table not in ALLOWED_TABLES:
        raise ValueError(f"Unknown table: {table!r}")


# ── Read ──────────────────────────────────────────────────────────────────────

def list_rows(table: str, limit: int = 500, offset: int = 0) -> list[dict]:
    _check(table)
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            f"SELECT * FROM inventory_management.public.{table} "
            f"LIMIT %s OFFSET %s",
            (limit, offset),
        )
        return [dict(r) for r in cur.fetchall()]


def get_row(table: str, row_id: int) -> dict | None:
    _check(table)
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            f"SELECT * FROM inventory_management.public.{table} WHERE id = %s AND is_deleted = FALSE",
            (row_id,),
        )
        row = cur.fetchone()
        return dict(row) if row else None


# ── Write ─────────────────────────────────────────────────────────────────────

def insert_row(table: str, data: dict[str, Any]) -> dict:
    _check(table)
    # Strip id and is_deleted — always auto-assigned
    data = {k: v for k, v in data.items() if k not in ("id", "is_deleted")}
    cols   = ", ".join(data.keys())
    values = ", ".join(["%s"] * len(data))
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO inventory_management.public.{table} ({cols}) VALUES ({values}) RETURNING *",
            list(data.values()),
        )
        return dict(cur.fetchone())


def update_row(table: str, row_id: int, data: dict[str, Any]) -> dict | None:
    _check(table)
    # Only update supplied fields; never allow overwriting id or is_deleted
    data = {k: v for k, v in data.items() if k not in ("id", "is_deleted")}
    if not data:
        return get_row(table, row_id)
    assignments = ", ".join(f"{k} = %s" for k in data.keys())
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            f"UPDATE inventory_management.public.{table} SET {assignments} WHERE id = %s AND is_deleted = FALSE RETURNING *",
            [*data.values(), row_id],
        )
        row = cur.fetchone()
        return dict(row) if row else None


def delete_row(table: str, row_id: int) -> bool:
    """Soft delete — sets is_deleted = TRUE, never removes the row."""
    _check(table)
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            f"delete inventory_management.public.{table} where id = %s",
            (row_id,),
        )
        return cur.rowcount > 0
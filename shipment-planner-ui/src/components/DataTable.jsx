// components/DataTable.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Generic editable table for all 6 input tables.
// Inline cell edit → PATCH /api/{table}/{id}
// New row form   → POST  /api/{table}
// Delete button  → DELETE /api/{table}/{id}   (soft delete)
//
// Props
//   table   — one of the 6 table name strings
//   title   — display heading
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:8000/api";

// Columns to show per table (all others hidden — still editable in row detail)
const DISPLAY_COLS = {
  shipment_demand:   ["order_line_id","sku_id","estimated_delivery_date","origin_location_id","destination_location_id","planned_quantity","priority","service_level"],
  sku_pallet_master: ["sku_id","sku_name","unit_count_in_pallet","pallet_length_mm","pallet_width_mm","pallet_height_mm","pallet_weight_in_kg","item_weight_in_kg"],
  lane_master:       ["lane_id","lane_name","origin_location_id","destination_location_id","distance_km","estimated_transit_hours","is_active"],
  load_equipment:    ["equipment_id","equipment_name","equipment_type","internal_length_mm","internal_width_mm","internal_height_mm","max_payload_weight_kg"],
  location:          ["location_id","location_name","location_type","city","country","dock_count","temperature_capability"],
  transport_asset:   ["transport_asset_id","asset_name","asset_type","max_weight_kg","supports_refrigeration","current_status"],
};

const EDITABLE_SKIP = new Set(["id","created_at","is_deleted"]);

export default function DataTable({ table, title }) {
  const [rows,       setRows]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [editCell,   setEditCell]   = useState(null);   // { rowId, col }
  const [editValue,  setEditValue]  = useState("");
  const [newRow,     setNewRow]     = useState(null);   // {} when form open
  const [saving,     setSaving]     = useState(false);

  const cols = DISPLAY_COLS[table] || [];

  // ── Fetch ────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/${table}?limit=500`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRows(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [table]);

  useEffect(() => { load(); }, [load]);

  // ── Inline edit ──────────────────────────────────────────────────────────
  const startEdit = (rowId, col, current) => {
    setEditCell({ rowId, col });
    setEditValue(current ?? "");
  };

  const commitEdit = async () => {
    if (!editCell) return;
    const { rowId, col } = editCell;
    setSaving(true);
    try {
      const res = await fetch(`${API}/${table}/${rowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [col]: editValue }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json();
      setRows((prev) => prev.map((r) => (r.id === rowId ? updated : r)));
    } catch (e) {
      alert(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
      setEditCell(null);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const deleteRow = async (rowId) => {
    if (!confirm("Delete this row?")) return;
    try {
      const res = await fetch(`${API}/${table}/${rowId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
      setRows((prev) => prev.filter((r) => r.id !== rowId));
    } catch (e) {
      alert(`Delete failed: ${e.message}`);
    }
  };

  // ── Add row ──────────────────────────────────────────────────────────────
  const submitNew = async () => {
    if (!newRow) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/${table}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRow),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created = await res.json();
      setRows((prev) => [created, ...prev]);
      setNewRow(null);
    } catch (e) {
      alert(`Insert failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) return <div style={S.loading}>Loading {title}…</div>;
  if (error)   return <div style={S.error}>Error: {error} <button onClick={load}>Retry</button></div>;

  return (
    <div style={S.root}>
      <div style={S.toolbar}>
        <h2 style={S.title}>{title} <span style={S.count}>({rows.length})</span></h2>
        <div style={S.actions}>
          <button style={S.btnSecondary} onClick={load}>↻ Refresh</button>
          <button style={S.btnPrimary}   onClick={() => setNewRow({})}>+ Add row</button>
        </div>
      </div>

      {/* ── New row form ───────────────────────────────────────────────── */}
      {newRow !== null && (
        <div style={S.newRowForm}>
          <div style={S.newRowTitle}>New row</div>
          <div style={S.newRowFields}>
            {cols.map((col) => (
              <label key={col} style={S.field}>
                <span style={S.fieldLabel}>{col}</span>
                <input
                  style={S.fieldInput}
                  value={newRow[col] ?? ""}
                  onChange={(e) => setNewRow((r) => ({ ...r, [col]: e.target.value }))}
                  placeholder={col}
                />
              </label>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button style={S.btnPrimary}    disabled={saving} onClick={submitNew}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button style={S.btnSecondary}  onClick={() => setNewRow(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              {cols.map((col) => (
                <th key={col} style={S.th}>{col}</th>
              ))}
              <th style={S.th} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} style={S.tr}>
                {cols.map((col) => {
                  const isEditing = editCell?.rowId === row.id && editCell?.col === col;
                  const editable  = !EDITABLE_SKIP.has(col);
                  return (
                    <td
                      key={col}
                      style={{ ...S.td, cursor: editable ? "pointer" : "default" }}
                      onClick={() => editable && !isEditing && startEdit(row.id, col, row[col])}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          style={S.inlineInput}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") setEditCell(null);
                          }}
                        />
                      ) : (
                        <span title={editable ? "Click to edit" : undefined}>
                          {formatCell(row[col])}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td style={{ ...S.td, textAlign: "right" }}>
                  <button style={S.deleteBtn} onClick={() => deleteRow(row.id)}>✕</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={cols.length + 1} style={S.empty}>No records.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCell(v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "✓" : "✗";
  return String(v);
}

const S = {
  root:        { display: "flex", flexDirection: "column", height: "100%", padding: "20px 24px", background: "#f9fafb" },
  toolbar:     { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title:       { margin: 0, fontSize: 20, fontWeight: 700, color: "#0b1224" },
  count:       { fontSize: 14, color: "#6b7280", fontWeight: 400 },
  actions:     { display: "flex", gap: 8 },
  btnPrimary:  { padding: "7px 16px", background: "#1d9e75", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 },
  btnSecondary:{ padding: "7px 16px", background: "#e5e7eb", color: "#374151", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  deleteBtn:   { background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 14, padding: "2px 6px" },
  tableWrap:   { flex: 1, overflowY: "auto", overflowX: "auto", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" },
  table:       { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th:          { position: "sticky", top: 0, background: "#0b1224", color: "#fff", padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" },
  tr:          { borderBottom: "1px solid #f1f3f5" },
  td:          { padding: "8px 12px", color: "#374151", whiteSpace: "nowrap", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" },
  inlineInput: { width: "100%", fontSize: 13, padding: "3px 6px", border: "2px solid #1d9e75", borderRadius: 4, outline: "none" },
  empty:       { textAlign: "center", padding: 32, color: "#9ca3af" },
  loading:     { padding: 32, color: "#6b7280" },
  error:       { padding: 32, color: "#dc2626" },
  newRowForm:  { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 16 },
  newRowTitle: { fontWeight: 700, fontSize: 14, color: "#0b1224", marginBottom: 12 },
  newRowFields:{ display: "flex", flexWrap: "wrap", gap: 12 },
  field:       { display: "flex", flexDirection: "column", gap: 4, minWidth: 180 },
  fieldLabel:  { fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" },
  fieldInput:  { fontSize: 13, padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 6, outline: "none" },
};
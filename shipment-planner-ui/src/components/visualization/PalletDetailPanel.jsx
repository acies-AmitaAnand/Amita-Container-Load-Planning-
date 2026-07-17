// =====================================================
// PalletDetailPanel.jsx
//
// Bottom-half panel for the Container Visualization page.
// Shows a sortable pallet table plus a detail card for the
// currently selected pallet (click a row, or click a pallet
// in the 3D scene and pass its id down as `selectedPalletId`).
//
// Props
//   payload          — the full container JSON from placement_engine.py
//   selectedPalletId — candidatePalletId of the pallet to highlight (optional)
//   onSelectPallet   — callback(candidatePalletId) when a row is clicked
// =====================================================

import React, { useState, useMemo } from "react";

const MM_TO_FT = 0.00328084;
const KG_TO_LB = 2.20462;

const fmt = (n, d = 1) => (typeof n === "number" ? n.toFixed(d) : "—");
const ft  = (mm) => (mm * MM_TO_FT).toFixed(2);

// ── Center of gravity ────────────────────────────────────────────────────────
// CoG for a single pallet (container-relative mm), and fleet-wide weighted CoG.

function palletCoG(p) {
  const eff = p.position;
  return {
    x: p.position.x + (eff.effectiveWidth  ?? p.dimensions.width)  / 2,
    y: (eff.effectiveHeight ?? p.dimensions.height) / 2,
    z: p.position.z + (eff.effectiveDepth  ?? p.dimensions.depth)  / 2,
  };
}

function fleetCoG(pallets) {
  const totalWeight = pallets.reduce((s, p) => s + (p.weightIn_kg || 0), 0);
  if (totalWeight === 0) return { x: 0, y: 0, z: 0, totalWeight: 0 };
  const sum = pallets.reduce(
    (acc, p) => {
      const c = palletCoG(p);
      const w = p.weightIn_kg || 0;
      return { x: acc.x + c.x * w, y: acc.y + c.y * w, z: acc.z + c.z * w };
    },
    { x: 0, y: 0, z: 0 }
  );
  return {
    x: sum.x / totalWeight,
    y: sum.y / totalWeight,
    z: sum.z / totalWeight,
    totalWeight,
  };
}

// ── Small presentational pieces ───────────────────────────────────────────────

function MetricChip({ label, value, accent }) {
  return (
    <div style={styles.chip}>
      <div style={styles.chipLabel}>{label}</div>
      <div style={{ ...styles.chipValue, color: accent || "#1f2937" }}>{value}</div>
    </div>
  );
}

function SortHeader({ field, label, sortField, sortDir, onSort, align }) {
  const active = sortField === field;
  return (
    <th
      onClick={() => onSort(field)}
      style={{
        ...styles.th,
        textAlign: align || "left",
        cursor: "pointer",
        color: active ? "#1d9e75" : "#6b7280",
      }}
    >
      {label}{active ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
    </th>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PalletDetailPanel({ payload, selectedPalletId, onSelectPallet }) {
  const pallets = payload.pallets || [];
  const [internalSelected, setInternalSelected] = useState(selectedPalletId || null);
  const [sortField, setSortField] = useState("label");
  const [sortDir, setSortDir]     = useState("asc");
  const [filterText, setFilterText] = useState("");

  const selectedId = selectedPalletId ?? internalSelected;

  const handleSelect = (id) => {
    setInternalSelected(id);
    onSelectPallet?.(id);
  };

  const handleSort = (field) => {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    let list = pallets;
    if (q) {
      list = list.filter(
        (p) =>
          (p.label || "").toLowerCase().includes(q) ||
          (p.skuId || "").toLowerCase().includes(q) ||
          (p.shipmentId || "").toLowerCase().includes(q)
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = sortAccessor(a, sortField);
      const bv = sortAccessor(b, sortField);
      if (av < bv) return -1 * dir;
      if (av > bv) return  1 * dir;
      return 0;
    });
  }, [pallets, filterText, sortField, sortDir]);

  const selectedPallet = pallets.find((p) => p.candidatePalletId === selectedId) || null;
  const fleet = useMemo(() => fleetCoG(pallets), [pallets]);

  const internalWidth = payload.internalWidth;
  const internalDepth = payload.internalDepth;
  const cogOffsetXPct = internalWidth ? ((fleet.x - internalWidth / 2) / internalWidth) * 100 : 0;
  const cogOffsetZPct = internalDepth ? ((fleet.z - internalDepth / 2) / internalDepth) * 100 : 0;
  const cogThreshold  = payload.loadingRules?.centerGravityThreshold ?? 15;
  const cogWithinLimit =
    Math.abs(cogOffsetXPct) <= cogThreshold && Math.abs(cogOffsetZPct) <= cogThreshold;

  return (
    <div style={styles.panel}>
      {/* ── Fleet-wide summary strip ───────────────────────────────────────── */}
      <div style={styles.summaryStrip}>
        <MetricChip label="Loaded pallets" value={payload.utilization?.loadedPallets ?? pallets.length} />
        <MetricChip label="Pending pallets" value={payload.pendingPalletCount ?? "—"} />
        <MetricChip
          label="Weight util."
          value={`${fmt(payload.utilization?.weightUtilization_pct)}%`}
          accent={utilColor(payload.utilization?.weightUtilization_pct)}
        />
        <MetricChip
          label="Volume util."
          value={`${fmt(payload.utilization?.volumeUtilization_pct)}%`}
          accent={utilColor(payload.utilization?.volumeUtilization_pct)}
        />
        <MetricChip
          label="Floor util."
          value={`${fmt(payload.utilization?.floorAreaUtilization_pct)}%`}
          accent={utilColor(payload.utilization?.floorAreaUtilization_pct)}
        />
        <MetricChip
          label="Fleet CoG (X / Z offset)"
          value={`${fmt(cogOffsetXPct, 1)}% / ${fmt(cogOffsetZPct, 1)}%`}
          accent={cogWithinLimit ? "#1d9e75" : "#dc2626"}
        />
        {payload.axleLoads?.map((al) => (
          <MetricChip
            key={al.axleId}
            label={`Axle ${al.axleId}`}
            value={`${fmt(al.currentLoad_kg, 0)} / ${fmt(al.maxLoad_kg, 0)} kg`}
            accent={al.isOverloaded ? "#dc2626" : "#1d9e75"}
          />
        ))}
      </div>

      <div style={styles.body}>
        {/* ── Pallet table ───────────────────────────────────────────────── */}
        <div style={styles.tableSection}>
          <div style={styles.tableHeader}>
            <h3 style={styles.sectionTitle}>Loaded pallets ({filtered.length})</h3>
            <input
              type="text"
              placeholder="Filter by SKU, label, shipment…"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              style={styles.filterInput}
            />
          </div>

          <div style={styles.tableScroll}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <SortHeader field="label"      label="SKU"        sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader field="orderLineId"          label="Order line" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader field="candidatePalletId"          label="Pallet Id" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader field="estimatedDeliveryDate" label="Est. delivery" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader field="x"           label="X (mm)"     sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                  <SortHeader field="z"           label="Z (mm)"     sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                  <SortHeader field="weightIn_kg" label="Weight (kg)" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                  <SortHeader field="height"      label="Height (mm)" sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                  <SortHeader field="fillPct"     label="Fill %"     sortField={sortField} sortDir={sortDir} onSort={handleSort} align="right" />
                  <SortHeader field="orientation" label="Orientation" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const isSelected = p.candidatePalletId === selectedId;
                  return (
                    <tr
                      key={p.candidatePalletId}
                      onClick={() => handleSelect(p.candidatePalletId)}
                      style={{
                        ...styles.tr,
                        background: isSelected ? "#eef9f4" : "transparent",
                        borderLeft: isSelected ? "3px solid #1d9e75" : "3px solid transparent",
                      }}
                    >
                      <td style={styles.td}>
                        <span style={{ ...styles.swatch, background: p.color }} />
                        {p.label || p.skuId}
                        {p.isPartialPallet && <span style={styles.partialTag}>partial</span>}
                      </td>
                      <td style={styles.td}>{p.orderLineId || "—"}</td>
                      <td style={styles.td}>{p.candidatePalletId || "—"}</td>
                      <td style={styles.td}>{p.estimatedDeliveryDate?.slice(0, 10) || "—"}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>{p.position.x}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>{p.position.z}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>{fmt(p.weightIn_kg, 1)}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>
                        {p.position.effectiveHeight ?? p.dimensions.height}
                      </td>
                      <td style={{ ...styles.td, textAlign: "right" }}>{fmt(p.fillPct * 100, 0)}%</td>
                      <td style={styles.td}>{shortOrient(p.position.orientation)}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={styles.emptyRow}>No pallets match this filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Selected pallet detail card ──────────────────────────────────── */}
        <div style={styles.detailSection}>
          <h3 style={styles.sectionTitle}>Pallet detail</h3>
          {!selectedPallet ? (
            <div style={styles.emptyDetail}>Select a pallet from the table to see its full detail.</div>
          ) : (
            <PalletDetailCard pallet={selectedPallet} payload={payload} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Selected pallet detail card ───────────────────────────────────────────────

function PalletDetailCard({ pallet, payload }) {
  const cog = palletCoG(pallet);
  const eff = pallet.position;

  return (
    <div style={styles.detailCard}>
      <div style={styles.detailHeaderRow}>
        <span style={{ ...styles.swatch, width: 14, height: 14, marginRight: 8, background: pallet.color }} />
        <div>
          <div style={styles.detailTitle}>{pallet.label || pallet.skuId}</div>
          <div style={styles.detailSubtitle}>{pallet.candidatePalletId}</div>
        </div>
      </div>
      <DetailGroup title="Product detail">
        <DetailRow k="SKU"        v={pallet.skuId} />
        <DetailRow k="Order Line"        v={pallet.orderLineId              || "—"} />
        <DetailRow k="Pallet ID"            v={pallet.candidatePalletId         || "—"} />
        <DetailRow k="Origin"            v={pallet.originLocationId         || "—"} />
        <DetailRow k="Destination"       v={pallet.destinationLocationId    || "—"} />
        <DetailRow k="Actual delivery"   v={pallet.actualDeliveryDate       || "—"} />
        <DetailRow k="Est. delivery"     v={pallet.estimatedDeliveryDate    || "—"} />
        <DetailRow k="Max transit (days)" v={pallet.maxTransitTimeInDays   ?? "—"} />
        <DetailRow k="Shipment"   v={pallet.shipmentId} />
        <DetailRow k="Priority"   v={pallet.priority} />
        <DetailRow k="Pallet type" v={pallet.isPartialPallet ? `Partial (${fmt(pallet.fillPct * 100, 1)}% full)` : "Full"} />
        <DetailRow k="Unload sequence" v={pallet.unloadSequence} />
      </DetailGroup>

      <DetailGroup title="Position (container coordinates)">
        <DetailRow k="X — width axis"  v={`${pallet.position.x} mm  (${ft(pallet.position.x)} ft)`} />
        <DetailRow k="Y — height"      v={`${pallet.position.y} mm`} />
        <DetailRow k="Z — depth axis"  v={`${pallet.position.z} mm  (${ft(pallet.position.z)} ft)`} />
        <DetailRow k="Orientation"     v={pallet.position.orientation} />
      </DetailGroup>

      <DetailGroup title="Weight & dimensions">
        <DetailRow k="Weight"           v={`${fmt(pallet.weightIn_kg, 2)} kg  (${fmt(pallet.weightIn_kg * KG_TO_LB, 1)} lb)`} />
        <DetailRow k="Footprint (W×D×H)" v={`${eff.effectiveWidth} × ${eff.effectiveDepth} × ${eff.effectiveHeight} mm`} />
        <DetailRow k="Raw dimensions"    v={`${pallet.dimensions.width} × ${pallet.dimensions.depth} × ${pallet.dimensions.height} mm`} />
      </DetailGroup>

      <DetailGroup title="Center of gravity & placement metrics">
        <DetailRow k="Pallet CoG (x,y,z)" v={`${fmt(cog.x, 0)}, ${fmt(cog.y, 0)}, ${fmt(cog.z, 0)} mm`} />
        <DetailRow
          k="Offset from container centre-width"
          v={`${fmt(((cog.x - payload.internalWidth / 2) / payload.internalWidth) * 100, 1)}%`}
        />
        <DetailRow
          k="Offset from container centre-depth"
          v={`${fmt(((cog.z - payload.internalDepth / 2) / payload.internalDepth) * 100, 1)}%`}
        />
      </DetailGroup>

      <DetailGroup title="Other SKU metrics">
        <DetailRow k="Volume" v={`${fmt((eff.effectiveWidth * eff.effectiveDepth * eff.effectiveHeight) / 1e9, 4)} m³`} />
        <DetailRow k="Floor area" v={`${fmt((eff.effectiveWidth * eff.effectiveDepth) / 1e6, 3)} m²`} />
        <DetailRow k="Density" v={`${fmt(pallet.weightIn_kg / ((eff.effectiveWidth * eff.effectiveDepth * eff.effectiveHeight) / 1e9), 1)} kg/m³`} />
      </DetailGroup>
    </div>
  );
}

function DetailGroup({ title, children }) {
  return (
    <div style={styles.detailGroup}>
      <div style={styles.detailGroupTitle}>{title}</div>
      {children}
    </div>
  );
}

function DetailRow({ k, v }) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailKey}>{k}</span>
      <span style={styles.detailValue}>{v}</span>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function sortAccessor(p, field) {
  switch (field) {
    case "orderLineId":           return p.orderLineId || "";
    case "estimatedDeliveryDate": return p.estimatedDeliveryDate || "";
    case "x":      return p.position.x;
    case "z":      return p.position.z;
    case "height": return p.position.effectiveHeight ?? p.dimensions.height;
    case "orientation": return p.position.orientation;
    case "weightIn_kg":
    case "fillPct": return p[field];
    default: return (p.label || p.skuId || "").toLowerCase();
  }
}

function shortOrient(o) {
  const map = {
    FRONT_FACING: "Front",
    SIDE_FACING_LEFT: "Side-L",
    SIDE_FACING_RIGHT: "Side-R",
    REAR_FACING: "Rear",
    TOP_UP: "Top-up",
    DOOR_ACCESS: "Door",
  };
  return map[o] || o;
}

function utilColor(pct) {
  if (pct == null) return "#1f2937";
  if (pct >= 90) return "#dc2626";
  if (pct >= 70) return "#d97706";
  return "#1d9e75";
}

// ── Styles (matches the dark navy / gold sidebar of the host app) ─────────────

const styles = {
  panel: {
    background: "#ffffff",
    borderTop: "1px solid #e5e7eb",
    fontFamily: "'Inter', -apple-system, sans-serif",
    color: "#1f2937",
  },
  summaryStrip: {
    display: "flex",
    flexWrap: "wrap",
    gap: 0,
    background: "#ffffff",
    border: "1px solid #000000",
    padding: "14px 20px",
  },
  chip: {
    padding: "0 20px",
    borderRight: "1px solid rgba(255,255,255,0.08)",
  },
  chipLabel: {
    fontSize: 11,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: 3,
  },
  chipValue: {
    fontSize: 16,
    fontWeight: 700,
  },
  body: {
    display: "flex",
    minHeight: 380,
  },
  tableSection: {
    flex: "1.6 1 0",
    borderRight: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
  },
  tableHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 18px 10px",
  },
  sectionTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 700,
    color: "#000000",
  },
  filterInput: {
    fontSize: 12,
    padding: "6px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    width: 220,
    outline: "none",
  },
  tableScroll: {
    flex: 1,
    overflowY: "auto",
    maxHeight: 360,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12.5,
  },
  th: {
    position: "sticky",
    top: 0,
    background: "#f9fafb",
    padding: "8px 14px",
    fontWeight: 600,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    borderBottom: "1px solid #e5e7eb",
    userSelect: "none",
  },
  tr: {
    cursor: "pointer",
    borderBottom: "1px solid #f1f3f5",
    transition: "background 0.1s",
  },
  td: {
    padding: "8px 14px",
    color: "#374151",
    whiteSpace: "nowrap",
  },
  swatch: {
    display: "inline-block",
    width: 10,
    height: 10,
    borderRadius: 3,
    marginRight: 8,
    verticalAlign: "middle",
  },
  partialTag: {
    marginLeft: 8,
    fontSize: 10,
    background: "#fef3c7",
    color: "#92400e",
    padding: "1px 6px",
    borderRadius: 4,
    fontWeight: 600,
  },
  emptyRow: {
    textAlign: "center",
    padding: "30px 0",
    color: "#9ca3af",
    fontSize: 13,
  },
  detailSection: {
    flex: "1 1 0",
    padding: "14px 18px",
    overflowY: "auto",
    maxHeight: 380,
  },
  emptyDetail: {
    color: "#9ca3af",
    fontSize: 13,
    marginTop: 12,
  },
  detailCard: {
    marginTop: 4,
  },
  detailHeaderRow: {
    display: "flex",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 12,
    borderBottom: "1px solid #f1f3f5",
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#000000",
  },
  detailSubtitle: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
    wordBreak: "break-all",
  },
  detailGroup: {
    marginBottom: 14,
  },
  detailGroupTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#1d9e75",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: 6,
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "4px 0",
    fontSize: 12.5,
    borderBottom: "1px dashed #f1f3f5",
  },
  detailKey: {
    color: "#6b7280",
  },
  detailValue: {
    color: "#1f2937",
    fontWeight: 600,
    textAlign: "right",
  },
};
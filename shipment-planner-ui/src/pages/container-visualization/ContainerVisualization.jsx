import ContainerSimulator from "../../components/visualization/ContainerSimulator";

import { useState, useMemo, useCallback } from "react";

// ── Read + parse all containers from localStorage ─────────────────────────────

function loadAllContainers() {
  const containers = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key.startsWith("res_")) continue;
    try {
      const payload = JSON.parse(localStorage.getItem(key));
      containers.push(payload);
    } catch {
      // skip malformed entries
    }
  }
  return containers;
}

// ── Build hierarchy from flat container list ──────────────────────────────────
// routeId format: "GRP_<origin>_<dest>_<date>"
// We extract date and lane from routeId.

function parseRouteId(routeId = "") {
  // e.g. "GRP_151_0720_2026-07-07"
  const match = routeId.match(/^GRP_(.+)_(\d{4}-\d{2}-\d{2})$/);
  if (match) return { lane: `GRP_${match[1]}`, date: match[2] };
  // fallback: no date embedded — use deliveryDateWindow from summary if available
  return { lane: routeId, date: null };
}

function buildHierarchy(containers) {
  // { date → { lane → [container payload] } }
  const tree = {};
  for (const c of containers) {
    const routeId = c.summary?.routeId || "";
    const { lane, date } = parseRouteId(routeId);
    const dk = date || c.summary?.deliveryDateWindow || "Unknown date";
    if (!tree[dk]) tree[dk] = {};
    if (!tree[dk][lane]) tree[dk][lane] = [];
    tree[dk][lane].push(c);
  }
  return tree;
}

// ── Metric helpers ────────────────────────────────────────────────────────────

function rollupMetrics(containers) {
  const n = containers.length;
  if (n === 0) return null;

  const totalLoaded  = containers.reduce((s, c) => s + (c.utilization?.loadedPallets ?? 0), 0);
  const totalPending = containers.reduce((s, c) => s + (c.pendingPalletCount ?? 0), 0);
  const avgWeight    = containers.reduce((s, c) => s + (c.utilization?.weightUtilization_pct ?? 0), 0) / n;
  const avgVolume    = containers.reduce((s, c) => s + (c.utilization?.volumeUtilization_pct ?? 0), 0) / n;
  const avgFloor     = containers.reduce((s, c) => s + (c.utilization?.floorAreaUtilization_pct ?? 0), 0) / n;

  // Fleet CoG: weighted average across all loaded pallets
  let totalWeight = 0, wx = 0, wz = 0;
  for (const c of containers) {
    for (const p of (c.pallets || [])) {
      const w   = p.weightIn_kg || 0;
      const ew  = p.position?.effectiveWidth  || p.dimensions?.width  || 0;
      const ed  = p.position?.effectiveDepth  || p.dimensions?.depth  || 0;
      const cx  = (p.position?.x || 0) + ew / 2;
      const cz  = (p.position?.z || 0) + ed / 2;
      totalWeight += w;
      wx += cx * w;
      wz += cz * w;
    }
  }
  const iW = containers[0]?.internalWidth  || 2352;
  const iD = containers[0]?.internalDepth  || 11836;
  const cogX = totalWeight > 0 ? (wx / totalWeight - iW / 2) / iW * 100 : 0;
  const cogZ = totalWeight > 0 ? (wz / totalWeight - iD / 2) / iD * 100 : 0;

  return { n, totalLoaded, totalPending, avgWeight, avgVolume, avgFloor, cogX, cogZ };
}

const fmt  = (n, d = 1) => (typeof n === "number" ? n.toFixed(d) : "—");
const pct  = (n)        => `${fmt(n)}%`;
const utilColor = (p)   => p >= 90 ? "#dc2626" : p >= 60 ? "#d97706" : "#1d9e75";

// ── Shared UI atoms ───────────────────────────────────────────────────────────

function MetricRow({ label, value, color }) {
  return (
    <div style={S.metricRow}>
      <span style={S.metricLabel}>{label}</span>
      <span style={{ ...S.metricValue, color: color || "#1f2937" }}>{value}</span>
    </div>
  );
}

function MetricsGrid({ m, threshold = 15 }) {
  if (!m) return <div style={S.noData}>No data</div>;
  const cogOk = Math.abs(m.cogX) <= threshold && Math.abs(m.cogZ) <= threshold;
  return (
    <div style={S.metricsGrid}>
      <MetricRow label="Containers"      value={m.n} />
      <MetricRow label="Loaded pallets"  value={m.totalLoaded}  color="#1d9e75" />
      <MetricRow label="Pending pallets" value={m.totalPending} color={m.totalPending > 0 ? "#d97706" : "#1d9e75"} />
      <MetricRow label="Weight util."    value={pct(m.avgWeight)} color={utilColor(m.avgWeight)} />
      <MetricRow label="Volume util."    value={pct(m.avgVolume)} color={utilColor(m.avgVolume)} />
      <MetricRow label="Floor util."     value={pct(m.avgFloor)}  color={utilColor(m.avgFloor)} />
      <MetricRow label="Fleet CoG (X/Z)" value={`${fmt(m.cogX, 1)}% / ${fmt(m.cogZ, 1)}%`}
                 color={cogOk ? "#1d9e75" : "#dc2626"} />
    </div>
  );
}

function Breadcrumb({ crumbs, onNavigate }) {
  return (
    <div style={S.breadcrumb}>
      {crumbs.map((c, i) => (
        <span key={i}>
          {i > 0 && <span style={S.breadcrumbSep}>›</span>}
          <span
            style={{ ...S.breadcrumbItem, ...(i === crumbs.length - 1 ? S.breadcrumbActive : S.breadcrumbLink) }}
            onClick={() => i < crumbs.length - 1 && onNavigate(i)}
          >
            {c}
          </span>
        </span>
      ))}
    </div>
  );
}

// ── Step 1: All dates ─────────────────────────────────────────────────────────

function Step1Dates({ tree, onSelectDate }) {
  const dates = Object.keys(tree).sort();
  return (
    <div style={S.stepRoot}>
      <div style={S.stepHeader}>
        <div style={S.stepTitle}>Optimization Summary</div>
        <div style={S.stepSubtitle}>{dates.length} shipping date{dates.length !== 1 ? "s" : ""} planned</div>
      </div>
      <div style={S.cardGrid}>
        {dates.map((dk) => {
          const allContainers = Object.values(tree[dk]).flat();
          const m = rollupMetrics(allContainers);
          const laneCount = Object.keys(tree[dk]).length;
          return (
            <div key={dk} style={S.card} onClick={() => onSelectDate(dk)}>
              <div style={S.cardHeader}>
                <span style={S.cardTitle}>{dk}</span>
                <span style={S.cardBadge}>{laneCount} lane{laneCount !== 1 ? "s" : ""}</span>
              </div>
              <MetricsGrid m={m} />
              <div style={S.cardFooter}>View lanes →</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 2: Lanes for selected date ───────────────────────────────────────────

function Step2Lanes({ tree, date, onSelectLane }) {
  const lanes = Object.keys(tree[date] || {}).sort();
  return (
    <div style={S.stepRoot}>
      <div style={S.stepHeader}>
        <div style={S.stepTitle}>Routes — {date}</div>
        <div style={S.stepSubtitle}>{lanes.length} lane{lanes.length !== 1 ? "s" : ""}</div>
      </div>
      <div style={S.cardGrid}>
        {lanes.map((lane) => {
          const containers = tree[date][lane];
          const m = rollupMetrics(containers);
          const origin = containers[0]?.summary?.origin || "—";
          const dest   = (containers[0]?.summary?.destinationInSequence || [])[0] || "—";
          return (
            <div key={lane} style={S.card} onClick={() => onSelectLane(lane)}>
              <div style={S.cardHeader}>
                <span style={S.cardTitle}>{origin} → {dest}</span>
                <span style={S.cardBadge}>{containers.length} container{containers.length !== 1 ? "s" : ""}</span>
              </div>
              <div style={S.laneId}>{lane}</div>
              <MetricsGrid m={m} />
              <div style={S.cardFooter}>View containers →</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 3: Containers for selected lane ─────────────────────────────────────

function Step3Containers({ containers, date, lane, onSelectContainer }) {
  return (
    <div style={S.stepRoot}>
      <div style={S.stepHeader}>
        <div style={S.stepTitle}>Containers — {lane.replace("GRP_", "").replace(/_/g, " → ")}</div>
        <div style={S.stepSubtitle}>{date} · {containers.length} container{containers.length !== 1 ? "s" : ""}</div>
      </div>
      <div style={S.containerList}>
        {containers.map((c, idx) => {
          const u = c.utilization;
          return (
            <div key={c.containerId} style={S.containerCard} onClick={() => onSelectContainer(c)}>
              <div style={S.containerCardLeft}>
                <div style={S.containerCardNum}>#{idx + 1}</div>
                <div>
                  <div style={S.containerCardId}>{c.containerId}</div>
                  <div style={S.containerCardType}>{c.containerType}</div>
                </div>
              </div>
              <div style={S.containerCardMetrics}>
                <UtilBar label="Weight" pct={u?.weightUtilization_pct}  />
                <UtilBar label="Volume" pct={u?.volumeUtilization_pct}  />
                <UtilBar label="Floor"  pct={u?.floorAreaUtilization_pct} />
              </div>
              <div style={S.containerCardRight}>
                <div style={S.containerCardStat}>
                  <span style={{ color: "#1d9e75", fontWeight: 700 }}>{u?.loadedPallets ?? "—"}</span>
                  <span style={S.containerCardStatLabel}> loaded</span>
                </div>
                <div style={S.containerCardStat}>
                  <span style={{ color: "#d97706", fontWeight: 700 }}>{c.pendingPalletCount ?? 0}</span>
                  <span style={S.containerCardStatLabel}> pending</span>
                </div>
                <div style={S.cardFooter}>View 3D →</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UtilBar({ label, pct: value }) {
  const p = value ?? 0;
  return (
    <div style={S.utilBar}>
      <span style={S.utilLabel}>{label}</span>
      <div style={S.utilTrack}>
        <div style={{ ...S.utilFill, width: `${Math.min(p, 100)}%`, background: utilColor(p) }} />
      </div>
      <span style={{ ...S.utilPct, color: utilColor(p) }}>{fmt(p, 0)}%</span>
    </div>
  );
}

// ── Step 4: 3D view ───────────────────────────────────────────────────────────

function Step4View({ payload }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <ContainerSimulator payload={payload} />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ContainerVisualization() {
  const [step,      setStep]      = useState(1);
  const [selDate,   setSelDate]   = useState(null);
  const [selLane,   setSelLane]   = useState(null);
  const [selContainer, setSelContainer] = useState(null);

  const containers = useMemo(() => loadAllContainers(), []);
  const tree       = useMemo(() => buildHierarchy(containers), [containers]);

  const crumbs = ["All dates"];
  if (selDate) crumbs.push(selDate);
  if (selLane) crumbs.push(selLane.replace("GRP_", "").replace(/_/g, " → "));
  if (selContainer) crumbs.push(selContainer.containerId);

  const navigateTo = (crumbIdx) => {
    if (crumbIdx === 0) { setStep(1); setSelDate(null); setSelLane(null); setSelContainer(null); }
    if (crumbIdx === 1) { setStep(2); setSelLane(null); setSelContainer(null); }
    if (crumbIdx === 2) { setStep(3); setSelContainer(null); }
  };

  if (containers.length === 0) {
    return (
      <div style={S.empty}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚛</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#0b1224", marginBottom: 8 }}>No optimization results</div>
        <div style={{ fontSize: 14, color: "#6b7280" }}>
          Run the optimizer from <b>Parameter Admin</b> to generate container plans.
        </div>
      </div>
    );
  }

  return (
    <div style={S.root}>
      {/* Breadcrumb — hidden on step 4 to give 3D view full space */}
      {step < 4 && (
        <div style={S.breadcrumbBar}>
          <Breadcrumb crumbs={crumbs} onNavigate={navigateTo} />
          <button style={S.refreshBtn} onClick={() => window.location.reload()}>↻ Refresh</button>
        </div>
      )}

      {step === 1 && (
        <Step1Dates tree={tree} onSelectDate={(dk) => { setSelDate(dk); setStep(2); }} />
      )}
      {step === 2 && (
        <Step2Lanes tree={tree} date={selDate}
          onSelectLane={(lane) => { setSelLane(lane); setStep(3); }} />
      )}
      {step === 3 && (
        <Step3Containers
          containers={tree[selDate][selLane]}
          date={selDate} lane={selLane}
          onSelectContainer={(c) => { setSelContainer(c); setStep(4); }}
        />
      )}
      {step === 4 && (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {/* Back breadcrumb for 3D view */}
          <div style={S.breadcrumbBar}>
            <Breadcrumb crumbs={crumbs} onNavigate={navigateTo} />
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Step4View payload={selContainer} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  root:         { display: "flex", flexDirection: "column", height: "100%", background: "#f9fafb", overflow: "hidden" },
  empty:        { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#6b7280" },
  breadcrumbBar:{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px", background: "#fff", borderBottom: "1px solid #e5e7eb", flexShrink: 0 },
  breadcrumb:   { display: "flex", alignItems: "center", gap: 4, fontSize: 13 },
  breadcrumbSep:{ color: "#9ca3af", margin: "0 4px" },
  breadcrumbItem:{ padding: "2px 6px", borderRadius: 4 },
  breadcrumbLink:{ color: "#1d9e75", cursor: "pointer", fontWeight: 600 },
  breadcrumbActive:{ color: "#0b1224", fontWeight: 700 },
  refreshBtn:   { fontSize: 13, padding: "5px 12px", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer", color: "#374151" },
  stepRoot:     { flex: 1, overflowY: "auto", padding: "20px 24px" },
  stepHeader:   { marginBottom: 20 },
  stepTitle:    { fontSize: 22, fontWeight: 700, color: "#0b1224" },
  stepSubtitle: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  // Card grid (steps 1 & 2)
  cardGrid:     { display: "flex", flexWrap: "wrap", gap: 16 },
  card:         { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, minWidth: 260, maxWidth: 320, cursor: "pointer", transition: "box-shadow 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  cardHeader:   { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  cardTitle:    { fontSize: 16, fontWeight: 700, color: "#0b1224" },
  cardBadge:    { fontSize: 11, background: "#f0fdf4", color: "#1d9e75", padding: "2px 8px", borderRadius: 10, fontWeight: 600 },
  cardFooter:   { marginTop: 12, fontSize: 12, color: "#1d9e75", fontWeight: 600, textAlign: "right" },
  laneId:       { fontSize: 11, color: "#9ca3af", marginBottom: 8, fontFamily: "monospace" },
  noData:       { fontSize: 12, color: "#9ca3af" },
  // Metrics grid
  metricsGrid:  { display: "flex", flexDirection: "column", gap: 4, borderTop: "1px solid #f1f3f5", paddingTop: 10 },
  metricRow:    { display: "flex", justifyContent: "space-between", fontSize: 12 },
  metricLabel:  { color: "#6b7280" },
  metricValue:  { fontWeight: 700 },
  // Container list (step 3)
  containerList:{ display: "flex", flexDirection: "column", gap: 12 },
  containerCard:{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16, transition: "box-shadow 0.15s" },
  containerCardLeft:  { display: "flex", alignItems: "center", gap: 12, minWidth: 220 },
  containerCardNum:   { width: 32, height: 32, borderRadius: 8, background: "#0b1224", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 },
  containerCardId:    { fontSize: 14, fontWeight: 700, color: "#0b1224" },
  containerCardType:  { fontSize: 11, color: "#9ca3af" },
  containerCardMetrics:{ display: "flex", flexDirection: "column", gap: 5, flex: 1 },
  containerCardRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, minWidth: 90 },
  containerCardStat:  { fontSize: 13 },
  containerCardStatLabel: { color: "#9ca3af", fontSize: 12 },
  // Util bar
  utilBar:   { display: "flex", alignItems: "center", gap: 6 },
  utilLabel: { fontSize: 11, color: "#9ca3af", width: 42 },
  utilTrack: { flex: 1, height: 6, background: "#f1f3f5", borderRadius: 3 },
  utilFill:  { height: "100%", borderRadius: 3, transition: "width 0.3s ease" },
  utilPct:   { fontSize: 11, fontWeight: 700, width: 32, textAlign: "right" },
};
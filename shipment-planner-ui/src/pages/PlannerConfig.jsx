// pages/PlannerConfig.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Configure and trigger the multi-day rolling container planner.
// Shows a day-by-day timeline of containers used, pallets loaded, overflow.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";

const API = "http://localhost:8000/api";

export default function PlannerConfig() {
  const [config,  setConfig]  = useState(null);   // loaded from /api/plan/config
  const [result,  setResult]  = useState(null);
  const [running, setRunning] = useState(false);
  const [error,   setError]   = useState(null);

  // Load default config on mount
  useEffect(() => {
    fetch(`${API}/plan/config`)
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig({ horizon_days: 7, total_containers: 10, container_free_after_days: 1, lifo: true }));
  }, []);

  const run = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const detail = await res.json();
        throw new Error(detail.detail || `HTTP ${res.status}`);
      }
      setResult(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  if (!config) return <div style={S.loading}>Loading config…</div>;

  return (
    <div style={S.root}>
      <h2 style={S.heading}>Multi-Day Container Planner</h2>

      {/* ── Config panel ─────────────────────────────────────────────────── */}
      <div style={S.configCard}>
        <h3 style={S.subheading}>Planning parameters</h3>
        <div style={S.configGrid}>
          <ConfigField
            label="Planning horizon (days)"
            hint="How many days ahead to plan"
            type="number" min={1} max={30}
            value={config.horizon_days}
            onChange={(v) => setConfig((c) => ({ ...c, horizon_days: +v }))}
          />
          <ConfigField
            label="Container fleet size"
            hint="Total containers available (M)"
            type="number" min={1} max={100}
            value={config.total_containers}
            onChange={(v) => setConfig((c) => ({ ...c, total_containers: +v }))}
          />
          <ConfigField
            label="Container free after (days)"
            hint="Days until a dispatched container is available again (F)"
            type="number" min={1} max={30}
            value={config.container_free_after_days}
            onChange={(v) => setConfig((c) => ({ ...c, container_free_after_days: +v }))}
          />
          <ConfigField
            label="Planning date (Day 0)"
            hint="Leave blank to use today"
            type="date"
            value={config.planning_date || ""}
            onChange={(v) => setConfig((c) => ({ ...c, planning_date: v || null }))}
          />
          <div style={S.fieldWrap}>
            <label style={S.label}>LIFO loading</label>
            <span style={S.hint}>Last-in first-out (back of truck fills first)</span>
            <input
              type="checkbox"
              checked={config.lifo}
              onChange={(e) => setConfig((c) => ({ ...c, lifo: e.target.checked }))}
              style={{ width: 18, height: 18, marginTop: 6, cursor: "pointer" }}
            />
          </div>
        </div>

        <button style={S.runBtn} onClick={run} disabled={running}>
          {running ? "Planning…" : "▶  Run planner"}
        </button>
        {error && <div style={S.error}>{error}</div>}
      </div>

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {result && <PlanResult result={result} />}
    </div>
  );
}

// ── Plan result timeline ──────────────────────────────────────────────────────

function PlanResult({ result }) {
  const maxContainers = result.total_containers;

  return (
    <div style={S.resultCard}>
      <div style={S.resultHeader}>
        <h3 style={S.subheading}>
          Plan: {result.planning_date} → +{result.horizon_days} days
        </h3>
        <div style={S.resultSummary}>
          <Chip label="Horizon" value={`${result.horizon_days} days`} />
          <Chip label="Fleet" value={`${result.total_containers} containers`} />
          <Chip label="Free after" value={`${result.container_free_after_days}d`} />
          <Chip label="Total loaded" value={result.total_loaded_pallets} accent="#1d9e75" />
          <Chip label="Total overflow" value={result.total_unallocated_pallets}
                accent={result.total_unallocated_pallets > 0 ? "#d97706" : "#1d9e75"} />
        </div>
      </div>

      {/* Day-by-day timeline */}
      <div style={S.timeline}>
        {result.days.map((day) => (
          <DayCard key={day.day} day={day} maxContainers={maxContainers} />
        ))}
      </div>
    </div>
  );
}

function DayCard({ day, maxContainers }) {
  const [open, setOpen] = useState(false);
  const fillPct = maxContainers > 0 ? (day.containers_used / maxContainers) * 100 : 0;
  const hasOverflow = day.unallocated_pallets > 0;

  return (
    <div style={{ ...S.dayCard, borderLeft: hasOverflow ? "4px solid #d97706" : "4px solid #1d9e75" }}>
      <div style={S.dayHeader} onClick={() => setOpen((o) => !o)}>
        <div>
          <span style={S.dayLabel}>Day {day.day}</span>
          <span style={S.dayDate}>{day.plan_date}</span>
        </div>
        <div style={S.dayStats}>
          <span style={S.stat}>
            <b>{day.containers_used}</b>/{day.containers_available} containers
          </span>
          <span style={S.stat}>
            <b style={{ color: "#1d9e75" }}>{day.loaded_pallets}</b> loaded
          </span>
          {hasOverflow && (
            <span style={{ ...S.stat, color: "#d97706" }}>
              <b>{day.unallocated_pallets}</b> overflow →
            </span>
          )}
          <span style={S.toggle}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Container utilization bar */}
      <div style={S.barTrack}>
        <div style={{ ...S.barFill, width: `${fillPct}%`,
          background: fillPct > 90 ? "#dc2626" : fillPct > 60 ? "#d97706" : "#1d9e75" }} />
      </div>

      {/* Expanded container list */}
      {open && day.containers.length > 0 && (
        <div style={S.containerList}>
          {day.containers.map((c, i) => (
            <div key={i} style={S.containerRow}>
              <span style={S.contId}>{c.containerId}</span>
              <UtilBar label="Weight" pct={c.weightUtil} />
              <UtilBar label="Volume" pct={c.volumeUtil} />
              <UtilBar label="Floor"  pct={c.floorUtil}  />
              <span style={S.palletsLoaded}>{c.loadedPallets} pallets</span>
            </div>
          ))}
        </div>
      )}

      {open && day.containers.length === 0 && (
        <div style={S.noContainers}>
          No containers dispatched this day
          {day.unallocated_pallets > 0 && ` — ${day.unallocated_pallets} pallets overflow to next day`}.
        </div>
      )}
    </div>
  );
}

function UtilBar({ label, pct }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
      <span style={{ color: "#9ca3af", width: 38 }}>{label}</span>
      <div style={{ width: 60, height: 6, background: "#e5e7eb", borderRadius: 3 }}>
        <div style={{
          width: `${Math.min(pct, 100)}%`, height: "100%", borderRadius: 3,
          background: pct > 90 ? "#dc2626" : pct > 60 ? "#d97706" : "#1d9e75",
        }} />
      </div>
      <span style={{ color: "#374151", width: 34 }}>{pct?.toFixed(0)}%</span>
    </div>
  );
}

function Chip({ label, value, accent }) {
  return (
    <div style={S.chip}>
      <div style={S.chipLabel}>{label}</div>
      <div style={{ ...S.chipValue, color: accent || "#0b1224" }}>{value}</div>
    </div>
  );
}

function ConfigField({ label, hint, value, onChange, type = "text", min, max }) {
  return (
    <div style={S.fieldWrap}>
      <label style={S.label}>{label}</label>
      <span style={S.hint}>{hint}</span>
      <input
        type={type} min={min} max={max}
        style={S.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  root:           { padding: "24px", overflowY: "auto", height: "100%", background: "#f9fafb" },
  heading:        { margin: "0 0 20px", fontSize: 22, fontWeight: 700, color: "#0b1224" },
  subheading:     { margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#0b1224" },
  configCard:     { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 20, marginBottom: 24 },
  configGrid:     { display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 20 },
  fieldWrap:      { display: "flex", flexDirection: "column", gap: 4, minWidth: 200 },
  label:          { fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.04em" },
  hint:           { fontSize: 11, color: "#9ca3af" },
  input:          { fontSize: 14, padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, outline: "none", width: "100%" },
  runBtn:         { padding: "10px 28px", background: "#0b1224", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 700 },
  error:          { marginTop: 12, color: "#dc2626", fontSize: 13 },
  loading:        { padding: 32, color: "#6b7280" },
  resultCard:     { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 20 },
  resultHeader:   { marginBottom: 16 },
  resultSummary:  { display: "flex", flexWrap: "wrap", gap: 16, marginTop: 8 },
  chip:           { minWidth: 100 },
  chipLabel:      { fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em" },
  chipValue:      { fontSize: 20, fontWeight: 700 },
  timeline:       { display: "flex", flexDirection: "column", gap: 10 },
  dayCard:        { border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" },
  dayHeader:      { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", cursor: "pointer", userSelect: "none" },
  dayLabel:       { fontSize: 15, fontWeight: 700, color: "#0b1224", marginRight: 10 },
  dayDate:        { fontSize: 12, color: "#6b7280" },
  dayStats:       { display: "flex", gap: 16, alignItems: "center" },
  stat:           { fontSize: 13, color: "#374151" },
  toggle:         { fontSize: 12, color: "#9ca3af" },
  barTrack:       { height: 4, background: "#f1f3f5" },
  barFill:        { height: "100%", transition: "width 0.4s ease" },
  containerList:  { padding: "12px 16px", borderTop: "1px solid #f1f3f5", display: "flex", flexDirection: "column", gap: 10 },
  containerRow:   { display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" },
  contId:         { fontSize: 12, fontWeight: 600, color: "#374151", minWidth: 180 },
  palletsLoaded:  { fontSize: 12, color: "#6b7280", marginLeft: "auto" },
  noContainers:   { padding: "12px 16px", fontSize: 13, color: "#9ca3af", borderTop: "1px solid #f1f3f5" },
};
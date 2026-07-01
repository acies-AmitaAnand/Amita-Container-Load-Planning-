// MultiContainerView.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Reads every localStorage key that starts with "res", parses each as a
// container JSON payload, and renders one tab per container.
// Passes the parsed payload as a prop to ContainerSimulator so that component
// never touches localStorage directly.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import ContainerSimulator from "../../components/visualization/ContainerSimulator";

function loadContainersFromStorage() {
  const entries = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key.startsWith("res")) continue;
    try {
      const payload = JSON.parse(localStorage.getItem(key));
      entries.push({ key, payload });
    } catch {
      console.warn(`MultiContainerView: could not parse localStorage key "${key}"`);
    }
  }
  // Sort by key name so tabs appear in a stable order
  entries.sort((a, b) => a.key.localeCompare(b.key));
  return entries;
}

function tabLabel(entry, index) {
  const c = entry.payload;
  const id = c.containerId || entry.key;
  const origin = c.summary?.origin || "";
  const dest   = (c.summary?.destinationInSequence || [])[0] || "";
  const route  = origin && dest ? ` · ${origin}→${dest}` : "";
  return `${id}${route}`;
}

export default function MultiContainerView() {
  const [containers, setContainers] = useState([]);
  const [activeIdx,  setActiveIdx]  = useState(0);

  useEffect(() => {
    const loaded = loadContainersFromStorage();
    setContainers(loaded);
    setActiveIdx(0);
  }, []);

  if (containers.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>🚛</div>
        <div style={styles.emptyTitle}>No containers loaded</div>
        <div style={styles.emptyBody}>
          Run the optimizer and ensure at least one result is saved to{" "}
          <code>localStorage</code> with a key starting with <code>res</code>.
        </div>
        <button style={styles.reloadBtn} onClick={() => setContainers(loadContainersFromStorage())}>
          Reload
        </button>
      </div>
    );
  }

  const active = containers[activeIdx];

  return (
    <div style={styles.root}>

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div style={styles.tabBar}>
        <div style={styles.tabScroll}>
          {containers.map((entry, idx) => {
            const isActive = idx === activeIdx;
            const util = entry.payload.utilization;
            const wtPct = util?.weightUtilization_pct ?? 0;
            return (
              <button
                key={entry.key}
                onClick={() => setActiveIdx(idx)}
                style={{
                  ...styles.tab,
                  ...(isActive ? styles.tabActive : styles.tabInactive),
                }}
              >
                <span style={styles.tabContainerId}>
                  {entry.payload.containerId || entry.key}
                </span>
                <span style={styles.tabMeta}>
                  {entry.payload.summary?.origin}
                  {" → "}
                  {(entry.payload.summary?.destinationInSequence || [])[0] || "—"}
                </span>
                <span style={{ ...styles.tabUtil, color: utilColor(wtPct) }}>
                  {wtPct.toFixed(0)}% wt
                </span>
              </button>
            );
          })}
        </div>

        <button
          style={styles.reloadTab}
          onClick={() => {
            const fresh = loadContainersFromStorage();
            setContainers(fresh);
            setActiveIdx(0);
          }}
          title="Reload from localStorage"
        >
          ↻
        </button>
      </div>

      {/* ── Active container ─────────────────────────────────────────────── */}
      <div style={styles.content}>
        <ContainerSimulator key={active.key} payload={active.payload} />
      </div>

    </div>
  );
}

function utilColor(pct) {
  if (pct >= 90) return "#dc2626";
  if (pct >= 70) return "#d97706";
  return "#1d9e75";
}

const styles = {
  root: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
  tabBar: {
    display: "flex",
    alignItems: "stretch",
    background: "#0b1224",
    borderBottom: "2px solid #1f2937",
    flexShrink: 0,
  },
  tabScroll: {
    display: "flex",
    overflowX: "auto",
    flex: 1,
  },
  tab: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    padding: "8px 16px",
    border: "none",
    cursor: "pointer",
    whiteSpace: "nowrap",
    borderRight: "1px solid #1f2937",
    transition: "background 0.15s",
  },
  tabActive: {
    background: "#1f2937",
    borderBottom: "2px solid #1d9e75",
  },
  tabInactive: {
    background: "transparent",
  },
  tabContainerId: {
    fontSize: 12,
    fontWeight: 700,
    color: "white",
    marginBottom: 2,
  },
  tabMeta: {
    fontSize: 11,
    color: "#9ca3af",
  },
  tabUtil: {
    fontSize: 11,
    fontWeight: 700,
    marginTop: 2,
  },
  reloadTab: {
    padding: "0 16px",
    background: "transparent",
    border: "none",
    color: "#9ca3af",
    fontSize: 18,
    cursor: "pointer",
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "#6b7280",
    gap: 12,
  },
  emptyIcon:  { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: 700, color: "#1f2937" },
  emptyBody:  { fontSize: 14, textAlign: "center", maxWidth: 400, lineHeight: 1.6 },
  reloadBtn: {
    marginTop: 8,
    padding: "8px 20px",
    background: "#1d9e75",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
  },
};


import { useEffect, useMemo, useState } from "react";
import MultiContainerView from "./MultiContainerView";

function loadSummary() {
  try {
    return JSON.parse(localStorage.getItem("optimization_summary")) || { containers_by_day: [] };
  } catch {
    return { containers_by_day: [] };
  }
}

function loadContainer(containerId) {
  const key = `res_${containerId}`;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  return { key, payload: JSON.parse(raw) };
}

export default function OptimizationResultsPage() {
  const summary = useMemo(() => loadSummary(), []);
  const [selectedLane, setSelectedLane] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedContainer, setSelectedContainer] = useState("");

  const lanes = [...new Set(summary.containers_by_day.map(x => x.groupId))];

  const dates = summary.containers_by_day.filter(x => x.groupId === selectedLane);

  const containers = summary.containers_by_day.filter(
    x => x.groupId === selectedLane && x.deliveryDate === selectedDate
  );

  useEffect(() => {
    if (lanes.length && !selectedLane) setSelectedLane(lanes[0]);
  }, [lanes]);

  useEffect(() => {
    if (dates.length) setSelectedDate(dates[0].deliveryDate);
  }, [selectedLane]);

  return (
    <div style={{padding:20}}>
      <h2>Optimization Summary</h2>

      <table border="1" cellPadding="6" style={{width:"100%",marginBottom:20}}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Lane</th>
            <th>Container</th>
            <th>Loaded</th>
            <th>Pending</th>
            <th>Weight %</th>
            <th>Volume %</th>
            <th>Floor %</th>
          </tr>
        </thead>
        <tbody>
        {summary.containers_by_day.map(r=>(
          <tr key={r.containerId}>
            <td>{r.deliveryDate}</td>
            <td>{r.groupId}</td>
            <td>{r.containerId}</td>
            <td>{r.loadedPallets}</td>
            <td>{r.pendingPallets}</td>
            <td>{r.weightUtil}</td>
            <td>{r.volumeUtil}</td>
            <td>{r.floorUtil}</td>
          </tr>
        ))}
        </tbody>
      </table>

      <h3>Step 1 - Lane</h3>
      <select value={selectedLane} onChange={e=>setSelectedLane(e.target.value)}>
        {lanes.map(l=><option key={l}>{l}</option>)}
      </select>

      <h3>Step 2 - Delivery Date</h3>
      <select value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}>
        {dates.map(d=><option key={d.containerId} value={d.deliveryDate}>{d.deliveryDate}</option>)}
      </select>

      <h3>Step 3 - Container</h3>
      <select value={selectedContainer} onChange={e=>setSelectedContainer(e.target.value)}>
        <option value="">Select Container</option>
        {containers.map(c=><option key={c.containerId} value={c.containerId}>{c.containerId}</option>)}
      </select>

      {selectedContainer && (
        <div style={{marginTop:20}}>
          <MultiContainerView containerKey={`res_${selectedContainer}`} />
        </div>
      )}
    </div>
  );
}

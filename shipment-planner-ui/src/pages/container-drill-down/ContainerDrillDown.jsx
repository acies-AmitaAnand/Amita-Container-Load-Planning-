import React, { useState, useMemo } from "react";
import "./ContainerDrillDown.css";

const INITIAL_DRILLDOWN_DATA = [
  // Chicago Corridor (ORD -> JFK)
  {
    id: "LOAD-1001",
    sourceLocation: "6037 - 0030 Chicago Regional DC",
    toLocation: "6010 - 0030 New York Metro Hub",
    transMode: "TRUCK_CH_53FT",
    equipmentId: "Lane_From_CHI_NY_5301",
    dispatchDate: "02-Aug-26",
    loadNumber: 1,
    totalNoPallets: 25.0,
    partialPallets: 0.0,
    loadApproval: true,
    shipmentNumber: "SHP-8801",
    manualLoad: "No",
    deliveryDate: "03-Aug-2026",
    utilizedTruckAreaSqM: 34.45,
    palletAreaUtilizationPct: 92.71,
    utilizedWeightPct: 88.4,
  },
  {
    id: "LOAD-1002",
    sourceLocation: "6037 - 0030 Chicago Regional DC",
    toLocation: "6010 - 0030 New York Metro Hub",
    transMode: "TRUCK_CH_53FT",
    equipmentId: "Lane_From_CHI_NY_5301",
    dispatchDate: "02-Aug-26",
    loadNumber: 2,
    totalNoPallets: 23.0,
    partialPallets: 0.0,
    loadApproval: false,
    shipmentNumber: "SHP-8802",
    manualLoad: "No",
    deliveryDate: "03-Aug-2026",
    utilizedTruckAreaSqM: 30.92,
    palletAreaUtilizationPct: 49.86,
    utilizedWeightPct: 76.2,
  },
  {
    id: "LOAD-1003",
    sourceLocation: "6037 - 0030 Chicago Regional DC",
    toLocation: "6010 - 0030 New York Metro Hub",
    transMode: "TRUCK_CH_53FT",
    equipmentId: "Lane_From_CHI_NY_5301",
    dispatchDate: "03-Aug-26",
    loadNumber: 1,
    totalNoPallets: 23.0,
    partialPallets: 0.0,
    loadApproval: true,
    shipmentNumber: "SHP-8803",
    manualLoad: "No",
    deliveryDate: "04-Aug-2026",
    utilizedTruckAreaSqM: 30.53,
    palletAreaUtilizationPct: 78.15,
    utilizedWeightPct: 82.5,
  },
  {
    id: "LOAD-1004",
    sourceLocation: "6037 - 0030 Chicago Regional DC",
    toLocation: "6010 - 0030 New York Metro Hub",
    transMode: "TRUCK_CH_53FT",
    equipmentId: "Lane_From_CHI_NY_5301",
    dispatchDate: "04-Aug-26",
    loadNumber: 1,
    totalNoPallets: 24.0,
    partialPallets: 0.0,
    loadApproval: true,
    shipmentNumber: "SHP-8804",
    manualLoad: "No",
    deliveryDate: "05-Aug-2026",
    utilizedTruckAreaSqM: 31.8,
    palletAreaUtilizationPct: 85.58,
    utilizedWeightPct: 89.1,
  },
  {
    id: "LOAD-1005",
    sourceLocation: "6037 - 0030 Chicago Regional DC",
    toLocation: "6010 - 0030 New York Metro Hub",
    transMode: "TRUCK_CH_53FT",
    equipmentId: "Lane_From_CHI_NY_5301",
    dispatchDate: "06-Aug-26",
    loadNumber: 1,
    totalNoPallets: 25.0,
    partialPallets: 0.0,
    loadApproval: true,
    shipmentNumber: "SHP-8805",
    manualLoad: "No",
    deliveryDate: "07-Aug-2026",
    utilizedTruckAreaSqM: 33.19,
    palletAreaUtilizationPct: 89.31,
    utilizedWeightPct: 91.0,
  },

  // Chicago -> Dallas Corridor
  {
    id: "LOAD-1011",
    sourceLocation: "6037 - 0030 Chicago Regional DC",
    toLocation: "5022 - 0012 Dallas Express Depot",
    transMode: "REEFER_53FT",
    equipmentId: "Lane_From_CHI_DFW_5302",
    dispatchDate: "02-Aug-26",
    loadNumber: 1,
    totalNoPallets: 26.0,
    partialPallets: 0.0,
    loadApproval: true,
    shipmentNumber: "SHP-8811",
    manualLoad: "No",
    deliveryDate: "04-Aug-2026",
    utilizedTruckAreaSqM: 35.12,
    palletAreaUtilizationPct: 94.8,
    utilizedWeightPct: 92.1,
  },
  {
    id: "LOAD-1012",
    sourceLocation: "6037 - 0030 Chicago Regional DC",
    toLocation: "5022 - 0012 Dallas Express Depot",
    transMode: "REEFER_53FT",
    equipmentId: "Lane_From_CHI_DFW_5302",
    dispatchDate: "05-Aug-26",
    loadNumber: 1,
    totalNoPallets: 24.0,
    partialPallets: 0.0,
    loadApproval: true,
    shipmentNumber: "SHP-8812",
    manualLoad: "No",
    deliveryDate: "07-Aug-2026",
    utilizedTruckAreaSqM: 32.4,
    palletAreaUtilizationPct: 87.2,
    utilizedWeightPct: 88.5,
  },

  // Chicago -> Atlanta Corridor
  {
    id: "LOAD-1013",
    sourceLocation: "6037 - 0030 Chicago Regional DC",
    toLocation: "4015 - 0088 Atlanta Gateway DC",
    transMode: "TRUCK_CH_53FT",
    equipmentId: "Lane_From_CHI_ATL_5303",
    dispatchDate: "03-Aug-26",
    loadNumber: 1,
    totalNoPallets: 25.0,
    partialPallets: 0.0,
    loadApproval: true,
    shipmentNumber: "SHP-8813",
    manualLoad: "No",
    deliveryDate: "04-Aug-2026",
    utilizedTruckAreaSqM: 33.8,
    palletAreaUtilizationPct: 91.0,
    utilizedWeightPct: 89.9,
  },

  // Los Angeles -> Dallas Corridor
  {
    id: "LOAD-2001",
    sourceLocation: "7012 - 0045 Los Angeles Port DC",
    toLocation: "5022 - 0012 Dallas Express Depot",
    transMode: "REEFER_40FT",
    equipmentId: "Lane_From_LAX_DFW_4002",
    dispatchDate: "02-Aug-26",
    loadNumber: 1,
    totalNoPallets: 20.0,
    partialPallets: 0.0,
    loadApproval: true,
    shipmentNumber: "SHP-9001",
    manualLoad: "No",
    deliveryDate: "05-Aug-2026",
    utilizedTruckAreaSqM: 26.85,
    palletAreaUtilizationPct: 88.5,
    utilizedWeightPct: 91.2,
  },
  {
    id: "LOAD-2002",
    sourceLocation: "7012 - 0045 Los Angeles Port DC",
    toLocation: "5022 - 0012 Dallas Express Depot",
    transMode: "REEFER_40FT",
    equipmentId: "Lane_From_LAX_DFW_4002",
    dispatchDate: "05-Aug-26",
    loadNumber: 1,
    totalNoPallets: 22.0,
    partialPallets: 0.0,
    loadApproval: true,
    shipmentNumber: "SHP-9002",
    manualLoad: "No",
    deliveryDate: "08-Aug-2026",
    utilizedTruckAreaSqM: 28.9,
    palletAreaUtilizationPct: 94.2,
    utilizedWeightPct: 95.8,
  },

  // Los Angeles -> Seattle Corridor
  {
    id: "LOAD-2003",
    sourceLocation: "7012 - 0045 Los Angeles Port DC",
    toLocation: "9011 - 0023 Seattle Gateway DC",
    transMode: "TRUCK_CH_53FT",
    equipmentId: "Lane_From_LAX_SEA_5304",
    dispatchDate: "04-Aug-26",
    loadNumber: 1,
    totalNoPallets: 24.0,
    partialPallets: 0.0,
    loadApproval: true,
    shipmentNumber: "SHP-9003",
    manualLoad: "No",
    deliveryDate: "06-Aug-2026",
    utilizedTruckAreaSqM: 32.1,
    palletAreaUtilizationPct: 86.4,
    utilizedWeightPct: 87.0,
  },

  // Miami -> Atlanta Corridor
  {
    id: "LOAD-3001",
    sourceLocation: "8020 - 0015 Miami Distribution Hub",
    toLocation: "4015 - 0088 Atlanta Gateway DC",
    transMode: "TRUCK_CH_53FT",
    equipmentId: "Lane_From_MIA_ATL_5305",
    dispatchDate: "02-Aug-26",
    loadNumber: 1,
    totalNoPallets: 25.0,
    partialPallets: 0.0,
    loadApproval: true,
    shipmentNumber: "SHP-9501",
    manualLoad: "No",
    deliveryDate: "03-Aug-2026",
    utilizedTruckAreaSqM: 33.6,
    palletAreaUtilizationPct: 90.5,
    utilizedWeightPct: 89.0,
  },

  // Miami -> New York Corridor
  {
    id: "LOAD-3002",
    sourceLocation: "8020 - 0015 Miami Distribution Hub",
    toLocation: "6010 - 0030 New York Metro Hub",
    transMode: "REEFER_53FT",
    equipmentId: "Lane_From_MIA_NY_5306",
    dispatchDate: "06-Aug-26",
    loadNumber: 1,
    totalNoPallets: 23.0,
    partialPallets: 0.0,
    loadApproval: false,
    shipmentNumber: "SHP-9502",
    manualLoad: "No",
    deliveryDate: "08-Aug-2026",
    utilizedTruckAreaSqM: 30.1,
    palletAreaUtilizationPct: 81.2,
    utilizedWeightPct: 83.4,
  },
];

export default function ContainerDrillDown() {
  const [data, setData] = useState(INITIAL_DRILLDOWN_DATA);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Cascading Drill Down Filters
  const [selectedSource, setSelectedSource] = useState("ALL");
  const [selectedTo, setSelectedTo] = useState("ALL");
  const [selectedTransMode, setSelectedTransMode] = useState("ALL");
  const [selectedEquipment, setSelectedEquipment] = useState("ALL");
  const [selectedDispatchDate, setSelectedDispatchDate] = useState("ALL");

  const [approvalFilter, setApprovalFilter] = useState("ALL");
  const [minUtilFilter, setMinUtilFilter] = useState(0);
  const [groupConsecutive, setGroupConsecutive] = useState(true);
  const [sortField, setSortField] = useState("dispatchDate");
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedRowDetail, setSelectedRowDetail] = useState(null);

  // 1. Unique Sources available
  const availableSources = useMemo(() => {
    const set = new Set(data.map((item) => item.sourceLocation));
    return Array.from(set).sort();
  }, [data]);

  // 2. Cascading Destinations available (filtered by selectedSource)
  const availableToLocations = useMemo(() => {
    const filtered =
      selectedSource === "ALL"
        ? data
        : data.filter((item) => item.sourceLocation === selectedSource);
    const set = new Set(filtered.map((item) => item.toLocation));
    return Array.from(set).sort();
  }, [data, selectedSource]);

  // 3. Cascading Trans Modes available (filtered by selectedSource & selectedTo)
  const availableTransModes = useMemo(() => {
    const filtered = data.filter((item) => {
      if (selectedSource !== "ALL" && item.sourceLocation !== selectedSource)
        return false;
      if (selectedTo !== "ALL" && item.toLocation !== selectedTo)
        return false;
      return true;
    });
    const set = new Set(filtered.map((item) => item.transMode));
    return Array.from(set).sort();
  }, [data, selectedSource, selectedTo]);

  // 4. Cascading Equipment IDs available (filtered by Source, To, TransMode)
  const availableEquipments = useMemo(() => {
    const filtered = data.filter((item) => {
      if (selectedSource !== "ALL" && item.sourceLocation !== selectedSource)
        return false;
      if (selectedTo !== "ALL" && item.toLocation !== selectedTo)
        return false;
      if (
        selectedTransMode !== "ALL" &&
        item.transMode !== selectedTransMode
      )
        return false;
      return true;
    });
    const set = new Set(filtered.map((item) => item.equipmentId));
    return Array.from(set).sort();
  }, [data, selectedSource, selectedTo, selectedTransMode]);

  // 5. Cascading Dispatch Dates available (filtered by Source, To, TransMode, Equipment)
  const availableDispatchDates = useMemo(() => {
    const filtered = data.filter((item) => {
      if (selectedSource !== "ALL" && item.sourceLocation !== selectedSource)
        return false;
      if (selectedTo !== "ALL" && item.toLocation !== selectedTo)
        return false;
      if (
        selectedTransMode !== "ALL" &&
        item.transMode !== selectedTransMode
      )
        return false;
      if (
        selectedEquipment !== "ALL" &&
        item.equipmentId !== selectedEquipment
      )
        return false;
      return true;
    });
    const set = new Set(filtered.map((item) => item.dispatchDate));
    return Array.from(set).sort();
  }, [data, selectedSource, selectedTo, selectedTransMode, selectedEquipment]);

  // Handle Source Selection Change (Cascades down)
  const handleSourceChange = (e) => {
    const newSource = e.target.value;
    setSelectedSource(newSource);
    if (newSource !== "ALL") {
      const validDests = new Set(
        data
          .filter((item) => item.sourceLocation === newSource)
          .map((item) => item.toLocation)
      );
      if (!validDests.has(selectedTo)) {
        setSelectedTo("ALL");
      }
    }
  };

  // Handle Destination Selection Change
  const handleToChange = (e) => {
    setSelectedTo(e.target.value);
  };

  // Filtered & sorted data
  const filteredData = useMemo(() => {
    return data
      .filter((item) => {
        // Cascading Drill Down Filters
        if (selectedSource !== "ALL" && item.sourceLocation !== selectedSource)
          return false;
        if (selectedTo !== "ALL" && item.toLocation !== selectedTo)
          return false;
        if (
          selectedTransMode !== "ALL" &&
          item.transMode !== selectedTransMode
        )
          return false;
        if (
          selectedEquipment !== "ALL" &&
          item.equipmentId !== selectedEquipment
        )
          return false;
        if (
          selectedDispatchDate !== "ALL" &&
          item.dispatchDate !== selectedDispatchDate
        )
          return false;

        // General Filters
        if (approvalFilter === "APPROVED" && !item.loadApproval) return false;
        if (approvalFilter === "PENDING" && item.loadApproval) return false;
        if (item.palletAreaUtilizationPct < minUtilFilter) return false;

        if (search.trim()) {
          const q = search.toLowerCase();
          const match =
            item.sourceLocation.toLowerCase().includes(q) ||
            item.toLocation.toLowerCase().includes(q) ||
            item.transMode.toLowerCase().includes(q) ||
            item.equipmentId.toLowerCase().includes(q) ||
            item.dispatchDate.toLowerCase().includes(q) ||
            item.shipmentNumber.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [
    data,
    selectedSource,
    selectedTo,
    selectedEquipment,
    search,
    approvalFilter,
    minUtilFilter,
    sortField,
    sortAsc,
  ]);

  // Bulk actions
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredData.map((d) => d.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBulkApprove = (approveState) => {
    setData((prev) =>
      prev.map((item) =>
        selectedIds.has(item.id)
          ? { ...item, loadApproval: approveState }
          : item
      )
    );
  };

  const handleExportCSV = () => {
    const headers = [
      "Source Location",
      "To Location",
      "TransMode",
      "Equipment ID",
      "Dispatch Date",
      "Load Number",
      "Total No. Pallets",
      "Partial Pallets",
      "Load Approval",
      "Shipment Number",
      "Manual Load",
      "Delivery Date",
      "Utilized Truck Area Sq M",
      "Pallet Area Utilization %",
      "Utilized Weight %",
    ];

    const rows = filteredData.map((d) => [
      `"${d.sourceLocation}"`,
      `"${d.toLocation}"`,
      `"${d.transMode}"`,
      `"${d.equipmentId}"`,
      `"${d.dispatchDate}"`,
      d.loadNumber,
      d.totalNoPallets.toFixed(2),
      d.partialPallets.toFixed(2),
      d.loadApproval ? "Approved" : "Pending",
      `"${d.shipmentNumber}"`,
      `"${d.manualLoad}"`,
      `"${d.deliveryDate}"`,
      d.utilizedTruckAreaSqM.toFixed(2),
      `${d.palletAreaUtilizationPct.toFixed(2)}%`,
      `${d.utilizedWeightPct.toFixed(2)}%`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `container_drill_down_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sorting header helper
  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // KPI Calculations
  const totalLoads = filteredData.length;
  const approvedLoads = filteredData.filter((d) => d.loadApproval).length;
  const totalPallets = filteredData.reduce(
    (acc, d) => acc + d.totalNoPallets,
    0
  );
  const avgPalletUtil =
    totalLoads > 0
      ? (
          filteredData.reduce((acc, d) => acc + d.palletAreaUtilizationPct, 0) /
          totalLoads
        ).toFixed(2)
      : "0.00";
  const avgTruckArea =
    totalLoads > 0
      ? (
          filteredData.reduce((acc, d) => acc + d.utilizedTruckAreaSqM, 0) /
          totalLoads
        ).toFixed(2)
      : "0.00";

  let activeFilterCount = 0;
  if (selectedSource !== "ALL") activeFilterCount++;
  if (selectedTo !== "ALL") activeFilterCount++;
  if (selectedTransMode !== "ALL") activeFilterCount++;
  if (selectedEquipment !== "ALL") activeFilterCount++;
  if (selectedDispatchDate !== "ALL") activeFilterCount++;
  if (approvalFilter !== "ALL") activeFilterCount++;
  if (minUtilFilter > 0) activeFilterCount++;
  if (search.trim()) activeFilterCount++;

  const isAnyFilterActive = activeFilterCount > 0;

  const handleResetAllFilters = () => {
    setSelectedSource("ALL");
    setSelectedTo("ALL");
    setSelectedTransMode("ALL");
    setSelectedEquipment("ALL");
    setSelectedDispatchDate("ALL");
    setApprovalFilter("ALL");
    setMinUtilFilter(0);
    setSearch("");
    setSelectedIds(new Set());
  };

  return (
    <div className="cdd-root">
      {/* Header Banner */}
      <div className="cdd-header">
        <div>
          <h2>✦ Container Drill Down</h2>
          <p>
            Interactive location drill-down — select Source &amp; Destination to refine lane corridors, pallet counts &amp; equipment dispatch schedules.
          </p>
        </div>
        <div className="cdd-actions">
          <button className="cdd-btn export" onClick={handleExportCSV}>
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="cdd-kpi-grid">
        <div className="cdd-kpi-card">
          <span className="cdd-kpi-title">MATCHING CONTAINER LOADS</span>
          <div className="cdd-kpi-value">{totalLoads}</div>
          <span className="cdd-kpi-sub">Refined load records</span>
        </div>
        <div className="cdd-kpi-card">
          <span className="cdd-kpi-title">APPROVED LOADS</span>
          <div className="cdd-kpi-value" style={{ color: "#16a34a" }}>
            {approvedLoads}{" "}
            <span style={{ fontSize: 13, color: "#6b7280" }}>
              / {totalLoads}
            </span>
          </div>
          <span className="cdd-kpi-sub">
            {totalLoads > 0
              ? ((approvedLoads / totalLoads) * 100).toFixed(1)
              : 0}
            % approved
          </span>
        </div>
        <div className="cdd-kpi-card">
          <span className="cdd-kpi-title">TOTAL PALLETS SHIPPED</span>
          <div className="cdd-kpi-value">{totalPallets.toFixed(0)}</div>
          <span className="cdd-kpi-sub">Standard pallet units</span>
        </div>
        <div className="cdd-kpi-card">
          <span className="cdd-kpi-title">AVG PALLET AREA UTILIZATION</span>
          <div className="cdd-kpi-value" style={{ color: "#2563eb" }}>
            {avgPalletUtil}%
          </div>
          <span className="cdd-kpi-sub">Target &gt; 80%</span>
        </div>
        <div className="cdd-kpi-card">
          <span className="cdd-kpi-title">AVG TRUCK AREA UTILIZED</span>
          <div className="cdd-kpi-value">{avgTruckArea} m²</div>
          <span className="cdd-kpi-sub">Floor space occupied</span>
        </div>
      </div>

      {/* 📍 UNIFIED INTEGRATED DRILL-DOWN CONTROL PANEL */}
      <div className="cdd-unified-panel">
        <div className="cdd-panel-top">
          <div className="panel-title-group">
            <span className="panel-badge">DRILL-DOWN PIPELINE</span>
            <span className="panel-subtext">
              Sequential Filter Tower — Select Source ➔ Destination ➔ Equipment ➔ Approval ➔ Utilization
            </span>
          </div>
          {isAnyFilterActive && (
            <button className="cdd-reset-all-btn" onClick={handleResetAllFilters}>
              ✕ Reset All Filters ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Sequential Drill-Down Filter Controls */}
        <div className="cdd-steps-grid">
          {/* Source Location */}
          <div className="drilldown-step">
            <div className="step-content">
              <label>SOURCE LOCATION</label>
              <select value={selectedSource} onChange={handleSourceChange}>
                <option value="ALL">All Sources ({availableSources.length})</option>
                {availableSources.map((src) => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Destination Location */}
          <div className="drilldown-step">
            <div className="step-content">
              <label>TO LOCATION (REFINED)</label>
              <select value={selectedTo} onChange={handleToChange}>
                <option value="ALL">
                  All Destinations {selectedSource !== "ALL" ? `(${availableToLocations.length})` : ""}
                </option>
                {availableToLocations.map((dest) => (
                  <option key={dest} value={dest}>
                    {dest}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* TransMode */}
          <div className="drilldown-step">
            <div className="step-content">
              <label>TRANS MODE</label>
              <select
                value={selectedTransMode}
                onChange={(e) => setSelectedTransMode(e.target.value)}
              >
                <option value="ALL">All Modes ({availableTransModes.length})</option>
                {availableTransModes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Equipment ID */}
          <div className="drilldown-step">
            <div className="step-content">
              <label>EQUIPMENT ID</label>
              <select
                value={selectedEquipment}
                onChange={(e) => setSelectedEquipment(e.target.value)}
              >
                <option value="ALL">All Equipment ({availableEquipments.length})</option>
                {availableEquipments.map((eq) => (
                  <option key={eq} value={eq}>
                    {eq}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dispatch Date */}
          <div className="drilldown-step">
            <div className="step-content">
              <label>DISPATCH DATE</label>
              <select
                value={selectedDispatchDate}
                onChange={(e) => setSelectedDispatchDate(e.target.value)}
              >
                <option value="ALL">All Dates ({availableDispatchDates.length})</option>
                {availableDispatchDates.map((dt) => (
                  <option key={dt} value={dt}>
                    {dt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Load Approval Status */}
          <div className="drilldown-step">
            <div className="step-content">
              <label>LOAD APPROVAL STATUS</label>
              <select
                value={approvalFilter}
                onChange={(e) => setApprovalFilter(e.target.value)}
              >
                <option value="ALL">All Approval Statuses</option>
                <option value="APPROVED">✓ Approved Only</option>
                <option value="PENDING">⏳ Pending Only</option>
              </select>
            </div>
          </div>

          {/* Min Utilization % */}
          <div className="drilldown-step">
            <div className="step-content">
              <label>MIN AREA UTILIZATION %</label>
              <select
                value={minUtilFilter}
                onChange={(e) => setMinUtilFilter(Number(e.target.value))}
              >
                <option value={0}>All Utilization %</option>
                <option value={50}>&ge; 50% Area Util</option>
                <option value={70}>&ge; 70% Area Util</option>
                <option value={85}>&ge; 85% Area Util</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bottom Sub-Toolbar: Instant Search, Merge Cells & Selection Actions */}
        <div className="cdd-panel-bottom">
          <div className="cdd-search-box">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Instant search source, destination, shipment #, date..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && <button onClick={() => setSearch("")}>✕</button>}
          </div>

          <div className="cdd-bottom-options">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={groupConsecutive}
                onChange={(e) => setGroupConsecutive(e.target.checked)}
              />
              Merge Duplicate Lane Cells in Table
            </label>

            {selectedIds.size > 0 && (
              <div className="cdd-bulk-actions">
                <span>{selectedIds.size} selected</span>
                <button
                  className="approve-btn"
                  onClick={() => handleBulkApprove(true)}
                >
                  ✓ Approve
                </button>
                <button
                  className="reject-btn"
                  onClick={() => handleBulkApprove(false)}
                >
                  ✕ Reset
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="cdd-table-container">
        <table className="cdd-table">
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={
                    filteredData.length > 0 &&
                    selectedIds.size === filteredData.length
                  }
                  onChange={handleSelectAll}
                />
              </th>

              {/* Source Location with Header Drill Down Filter */}
              <th onClick={() => handleSort("sourceLocation")}>
                Source Location {sortField === "sourceLocation" ? (sortAsc ? "▲" : "▼") : ""}
              </th>

              {/* To Location with Header Drill Down Filter */}
              <th onClick={() => handleSort("toLocation")}>
                To Location {sortField === "toLocation" ? (sortAsc ? "▲" : "▼") : ""}
              </th>

              <th onClick={() => handleSort("transMode")}>
                TransMode {sortField === "transMode" ? (sortAsc ? "▲" : "▼") : ""}
              </th>
              <th onClick={() => handleSort("equipmentId")}>
                Equipment ID {sortField === "equipmentId" ? (sortAsc ? "▲" : "▼") : ""}
              </th>
              <th onClick={() => handleSort("dispatchDate")}>
                Dispatch Date {sortField === "dispatchDate" ? (sortAsc ? "▲" : "▼") : ""}
              </th>
              <th onClick={() => handleSort("loadNumber")}>
                Load Number {sortField === "loadNumber" ? (sortAsc ? "▲" : "▼") : ""}
              </th>
              <th
                onClick={() => handleSort("totalNoPallets")}
                style={{ fontStyle: "italic", fontWeight: 700 }}
              >
                Total No. Pallets {sortField === "totalNoPallets" ? (sortAsc ? "▲" : "▼") : ""}
              </th>
              <th onClick={() => handleSort("partialPallets")}>
                Partial Pallets {sortField === "partialPallets" ? (sortAsc ? "▲" : "▼") : ""}
              </th>
              {/* Highlighted Yellow Load Approval Header matching screenshot */}
              <th
                className="th-highlight"
                onClick={() => handleSort("loadApproval")}
              >
                Load Approval {sortField === "loadApproval" ? (sortAsc ? "▲" : "▼") : ""}
              </th>
              <th onClick={() => handleSort("shipmentNumber")}>
                Shipment Number {sortField === "shipmentNumber" ? (sortAsc ? "▲" : "▼") : ""}
              </th>
              <th
                onClick={() => handleSort("manualLoad")}
                style={{ fontStyle: "italic" }}
              >
                Manual Load... {sortField === "manualLoad" ? (sortAsc ? "▲" : "▼") : ""}
              </th>
              <th onClick={() => handleSort("deliveryDate")}>
                Delivery Date {sortField === "deliveryDate" ? (sortAsc ? "▲" : "▼") : ""}
              </th>
              <th onClick={() => handleSort("utilizedTruckAreaSqM")}>
                Utilized Truck Area Sq M {sortField === "utilizedTruckAreaSqM" ? (sortAsc ? "▲" : "▼") : ""}
              </th>
              <th onClick={() => handleSort("palletAreaUtilizationPct")}>
                Pallet Area Utilization % {sortField === "palletAreaUtilizationPct" ? (sortAsc ? "▲" : "▼") : ""}
              </th>
              <th onClick={() => handleSort("utilizedWeightPct")}>
                Utilized Weight % {sortField === "utilizedWeightPct" ? (sortAsc ? "▲" : "▼") : ""}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, idx) => {
              const isSelected = selectedIds.has(row.id);
              const isLowUtil = row.palletAreaUtilizationPct < 50;

              // Check for grouping repetition (if enabled)
              const prev = filteredData[idx - 1];
              const sameSource =
                groupConsecutive &&
                prev &&
                prev.sourceLocation === row.sourceLocation;
              const sameDest =
                groupConsecutive &&
                prev &&
                prev.toLocation === row.toLocation;
              const sameMode =
                groupConsecutive && prev && prev.transMode === row.transMode;
              const sameEquip =
                groupConsecutive &&
                prev &&
                prev.equipmentId === row.equipmentId;

              return (
                <tr
                  key={row.id}
                  className={`${isSelected ? "selected-row" : ""} ${
                    isLowUtil ? "low-util-row" : ""
                  }`}
                  onClick={() => setSelectedRowDetail(row)}
                >
                  <td
                    style={{ textAlign: "center" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectRow(row.id)}
                    />
                  </td>
                  <td className={sameSource ? "dim-cell" : "bold-cell"}>
                    {!sameSource ? row.sourceLocation : ""}
                  </td>
                  <td className={sameDest ? "dim-cell" : ""}>
                    {!sameDest ? row.toLocation : ""}
                  </td>
                  <td className={sameMode ? "dim-cell" : ""}>
                    {!sameMode ? row.transMode : ""}
                  </td>
                  <td className={sameEquip ? "dim-cell" : ""}>
                    {!sameEquip ? row.equipmentId : ""}
                  </td>
                  <td>{row.dispatchDate}</td>
                  <td style={{ textAlign: "center", fontWeight: 600 }}>
                    {row.loadNumber}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>
                    {row.totalNoPallets.toFixed(2)}
                  </td>
                  <td style={{ textAlign: "right", color: "#6b7280" }}>
                    {row.partialPallets.toFixed(2)}
                  </td>

                  {/* Highlighted Yellow Load Approval Cell matching screenshot */}
                  <td
                    className="td-highlight"
                    style={{ textAlign: "center" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      className="approval-checkbox"
                      checked={row.loadApproval}
                      onChange={() => handleToggleApproval(row.id)}
                    />
                  </td>

                  <td>{row.shipmentNumber || "—"}</td>
                  <td style={{ color: "#6b7280" }}>{row.manualLoad}</td>
                  <td>{row.deliveryDate}</td>
                  <td style={{ textAlign: "right", fontWeight: 500 }}>
                    {row.utilizedTruckAreaSqM.toFixed(2)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontWeight: 700,
                      color: isLowUtil
                        ? "#dc2626"
                        : row.palletAreaUtilizationPct >= 85
                        ? "#16a34a"
                        : "#2563eb",
                    }}
                  >
                    {row.palletAreaUtilizationPct.toFixed(2)}%
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    {row.utilizedWeightPct.toFixed(2)}%
                  </td>
                </tr>
              );
            })}

            {filteredData.length === 0 && (
              <tr>
                <td colSpan="16" className="no-results">
                  No container load records match current drill-down or search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Row Detail Modal */}
      {selectedRowDetail && (
        <div
          className="cdd-modal-backdrop"
          onClick={() => setSelectedRowDetail(null)}
        >
          <div className="cdd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cdd-modal-head">
              <h3>
                Load Details —{" "}
                {selectedRowDetail.shipmentNumber || selectedRowDetail.id}
              </h3>
              <button onClick={() => setSelectedRowDetail(null)}>✕</button>
            </div>
            <div className="cdd-modal-body">
              <div className="cdd-modal-grid">
                <div>
                  <label>Source Location:</label>
                  <span>{selectedRowDetail.sourceLocation}</span>
                </div>
                <div>
                  <label>Destination Location:</label>
                  <span>{selectedRowDetail.toLocation}</span>
                </div>
                <div>
                  <label>Transport Mode:</label>
                  <span>{selectedRowDetail.transMode}</span>
                </div>
                <div>
                  <label>Equipment ID:</label>
                  <span>{selectedRowDetail.equipmentId}</span>
                </div>
                <div>
                  <label>Dispatch Date:</label>
                  <span>{selectedRowDetail.dispatchDate}</span>
                </div>
                <div>
                  <label>Delivery Date:</label>
                  <span>{selectedRowDetail.deliveryDate}</span>
                </div>
                <div>
                  <label>Load Number:</label>
                  <span>{selectedRowDetail.loadNumber}</span>
                </div>
                <div>
                  <label>Total Pallets:</label>
                  <span>{selectedRowDetail.totalNoPallets.toFixed(2)}</span>
                </div>
                <div>
                  <label>Load Approval Status:</label>
                  <span
                    style={{
                      fontWeight: 700,
                      color: selectedRowDetail.loadApproval
                        ? "#16a34a"
                        : "#dc2626",
                    }}
                  >
                    {selectedRowDetail.loadApproval
                      ? "✓ Approved"
                      : "⏳ Pending Approval"}
                  </span>
                </div>
                <div>
                  <label>Pallet Area Utilization:</label>
                  <span style={{ fontWeight: 700, color: "#2563eb" }}>
                    {selectedRowDetail.palletAreaUtilizationPct}%
                  </span>
                </div>
                <div>
                  <label>Utilized Truck Area:</label>
                  <span>{selectedRowDetail.utilizedTruckAreaSqM} m²</span>
                </div>
                <div>
                  <label>Utilized Weight %:</label>
                  <span>{selectedRowDetail.utilizedWeightPct}%</span>
                </div>
              </div>

              <div className="cdd-modal-footer">
                <button
                  className="cdd-btn-toggle"
                  onClick={() => {
                    handleToggleApproval(selectedRowDetail.id);
                    setSelectedRowDetail((prev) => ({
                      ...prev,
                      loadApproval: !prev.loadApproval,
                    }));
                  }}
                >
                  {selectedRowDetail.loadApproval
                    ? "Mark as Pending"
                    : "Approve Load"}
                </button>
                <button
                  className="cdd-btn-close"
                  onClick={() => setSelectedRowDetail(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

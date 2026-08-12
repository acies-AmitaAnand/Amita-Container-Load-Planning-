import { useState } from "react";
import "./Dashboard.css";

import FilterBar from "./components/FilterBar";
import KPIGrid from "./components/KPIGrid";
import Funnel from "./components/Funnel";
import LaneTable from "./components/LaneTable";
import CarrierRank from "./components/CarrierRank";
import OperationsSection from "./components/OperationsSection";
import ActivityTimeline from "./components/ActivityTimeline";
import AlertsPanel from "./components/AlertsPanel";

export default function Dashboard() {
	const [searchQuery, setSearchQuery] = useState("");

	return (
		<div className="dashboard">
			{/* Top Bar Header matching HTML exact design */}
			<div className="db-header-bar">
				<div className="db-header-title">
					<h2>Freight &amp; Fleet Intelligence</h2>
					<span>Network performance and real-time operations at a glance</span>
				</div>
				<div className="db-header-right">
					<div className="db-search">
						<span>🔍</span>
						<input
							type="text"
							placeholder="Search shipments, lanes, carriers..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
					<button className="db-tbtn">☾</button>
					<button className="db-tbtn tour">◎ Tour</button>
					<button className="db-tbtn">🔔</button>
					<div className="db-avatar">
						<div className="circ">KV</div>
						<div className="who">
							Ops Director
							<small>VP · SUPPLY CHAIN</small>
						</div>
					</div>
				</div>
			</div>

			{/* Filters Bar matching HTML exact layout */}
			<FilterBar />

			{/* Live Sync Status Banner */}
			<div className="live-status">
				<span className="dot" />
				<span><b>LIVE</b> · Last sync 22s ago · 12,480 active shipments · 640 vehicles tracked</span>
			</div>

			{/* Section Lead */}
			<div className="section-lead">
				<h3>Global Overview</h3>
				<p>High-level metrics across all regions, lanes, and active carriers.</p>
			</div>

			{/* KPI Grid - 6 cards */}
			<KPIGrid />

			{/* Funnel Panel */}
			<Funnel />

			{/* Two Column Layout: Lane Performance & Top Carriers */}
			<div className="two-col">
				<LaneTable />
				<CarrierRank />
			</div>

			{/* OPERATIONS Section for Build Container Planning & Load Summary */}
			<OperationsSection />

			{/* Bottom Activity & Alerts */}
			<div className="bottom-panels">
				<div className="panel" style={{ margin: 0 }}>
					<div className="mini-title">Recent Network Activity</div>
					<ActivityTimeline />
				</div>
				<div className="panel" style={{ margin: 0 }}>
					<div className="mini-title">Active System Alerts</div>
					<AlertsPanel />
				</div>
			</div>
		</div>
	);
}

import { useState } from "react";

export default function Funnel() {
	const [mode, setMode] = useState("shipments");

	const funnelShipments = [
		{ label: "Orders Booked", sub: "184,500 units", main: "184,500", pct: "100%", fill: 1, type: "deep" },
		{ label: "Dispatched", sub: "planned & loaded", main: "173,430", pct: "94.0%", fill: 0.94, ghost: "11,070", type: "mid" },
		{ label: "In Transit", sub: "on-route", main: "162,120", pct: "87.9%", fill: 0.879, ghost: "held / delayed", type: "mid" },
		{ label: "Delivered On-Time", sub: "confirmed POD", main: "151,500", pct: "82.1%", fill: 0.821, late: "19,600 late", ghost: "exceptions", type: "mid" }
	];

	const funnelCost = [
		{ label: "Orders Booked", sub: "budgeted spend", main: "₹82.4L", pct: "100%", fill: 1, type: "deep" },
		{ label: "Dispatched", sub: "freight committed", main: "₹77.6L", pct: "94.2%", fill: 0.942, ghost: "₹4.8L", type: "mid" },
		{ label: "In Transit", sub: "in-flight spend", main: "₹74.9L", pct: "90.9%", fill: 0.909, ghost: "held", type: "mid" },
		{ label: "Delivered On-Time", sub: "settled invoicing", main: "₹69.1L", pct: "83.9%", fill: 0.839, late: "₹5.8L variance", ghost: "disputed", type: "mid" }
	];

	const currentData = mode === "shipments" ? funnelShipments : funnelCost;

	return (
		<div className="panel">
			<div className="panel-head">
				<div>
					<h3>Order-to-Delivery Flow</h3>
					<p>How shipments move from booking to confirmed delivery across the network.</p>
				</div>
				<div className="seg">
					<button
						className={mode === "shipments" ? "on" : ""}
						onClick={() => setMode("shipments")}
					>
						Shipments
					</button>
					<button
						className={mode === "cost" ? "on" : ""}
						onClick={() => setMode("cost")}
					>
						Cost
					</button>
				</div>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
				{currentData.map((row) => (
					<div className="funnel-row" key={row.label}>
						<div className="funnel-label">
							<div className="t">{row.label}</div>
							<div className="s">{row.sub}</div>
						</div>
						<div className="funnel-track">
							<div className={`bar ${row.type}`} style={{ flex: row.fill }}>
								{row.main}
								<span className="sub">{row.pct}</span>
							</div>
							{row.late && (
								<div className="bar light" style={{ flex: 0.106 }}>
									<span className="sub">{row.late}</span>
								</div>
							)}
							{row.ghost && (
								<div className="bar ghost" style={{ flex: 1 - row.fill - (row.late ? 0.106 : 0) }}>
									{row.ghost}
								</div>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

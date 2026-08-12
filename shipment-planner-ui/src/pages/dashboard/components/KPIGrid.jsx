const KPI_CARDS = [
	{ title: "On-Time Delivery (OTD)", ico: "⏱️", val: "92.4", u: "%", delta: "+2.4%", dir: "up", target: "Target 95%", state: "near", stateLbl: "NEAR TARGET" },
	{ title: "Cost per Shipment", ico: "💲", val: "₹1,284", delta: "-3.1%", dir: "up", target: "Target ₹1,200", state: "near", stateLbl: "NEAR TARGET" },
	{ title: "Fleet Utilization", ico: "🚚", val: "81.7", u: "%", delta: "+4.6%", dir: "up", target: "Target 80%", state: "on", stateLbl: "ON TARGET" },
	{ title: "Perfect Order Rate", ico: "✅", val: "96.2", u: "%", delta: "+1.2%", dir: "up", target: "Target 97%", state: "near", stateLbl: "NEAR TARGET" },
	{ title: "Avg Dwell Time", ico: "🕒", val: "3.4", u: "hrs", delta: "+0.6h", dir: "down", target: "Target 2.5 hrs", state: "below", stateLbl: "BELOW TARGET" },
	{ title: "Damage / Loss Rate", ico: "⚠️", val: "0.42", u: "%", delta: "-0.08%", dir: "up", target: "Target 0.30%", state: "below", stateLbl: "BELOW TARGET" }
];

export default function KPIGrid() {
	return (
		<div className="kpi-grid">
			{KPI_CARDS.map((kpi) => (
				<div className="kpi" key={kpi.title}>
					<div className="kpi-head">
						<span className="kpi-title">{kpi.title}</span>
						<span className="kpi-ico">{kpi.ico}</span>
					</div>
					<div className="kpi-val">
						{kpi.val}
						{kpi.u && <span className="u">{kpi.u}</span>}
					</div>
					<div className={`kpi-delta ${kpi.dir}`}>
						{kpi.dir === "up" ? "↗" : "↘"} {kpi.delta}
					</div>
					<div className="kpi-target">{kpi.target}</div>
					<span className={`badge ${kpi.state}`}>{kpi.stateLbl}</span>
				</div>
			))}
		</div>
	);
}

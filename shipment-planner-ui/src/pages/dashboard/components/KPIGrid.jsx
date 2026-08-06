import { kpis } from "../dashboardData";

function KPICard({ kpi }) {
	return (
		<div className="kpi">
			<span className={`badge ${kpi.state}`}>
				{kpi.stateLbl}
			</span>

			<div className="top">
				<div className="icon">
					{kpi.icon}
				</div>

				<div className="label">
					{kpi.label}
				</div>
			</div>

			<div className="value">
				{kpi.value}
				<small>{kpi.unit}</small>
			</div>

			<div className={`kpi-delta ${kpi.up ? "up" : "down"}`}>
				{kpi.up ? "↗" : "↘"} {kpi.delta}
			</div>

			<div className="kpi-target">
				{kpi.target}
			</div>
		</div>
	);
}

export default function KPIGrid() {
	return (
		<div className="kpi-grid">
			{kpis.map((kpi) => (
				<KPICard
					key={kpi.label}
					kpi={kpi}
				/>
			))}
		</div>
	);
}

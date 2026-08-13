import { useNavigate } from "react-router-dom";

export default function OperationsSection() {
	const navigate = useNavigate();

	return (
		<div className="ops-panel">
			<div className="panel-head" style={{ marginBottom: 0 }}>
				<div>
					<h3>✦ OPERATIONS · Container Load Planning</h3>
					<p>Build 3D container packing algorithms, optimize volume utilization, and review day load plans.</p>
				</div>
			</div>

			<div className="ops-grid">
				<div className="ops-card" onClick={() => navigate("/build-load-planning")}>
					<div className="ops-card-top">
						<div className="ops-icon">🔧</div>
						<div>
							<h4>Build Container Load Planning</h4>
							<p>Configure equipment rules, SKU dimensions, weight constraints &amp; run 3D container optimizer.</p>
						</div>
					</div>
					<div className="ops-btn">Launch Load Planner →</div>
				</div>

				<div className="ops-card" onClick={() => navigate("/optimized-day-planning")}>
					<div className="ops-card-top">
						<div className="ops-icon">🚛</div>
						<div>
							<h4>View Container Load Summary</h4>
							<p>Inspect optimized container load maps, axle weight balance, pallet counts &amp; 3D visualizations.</p>
						</div>
					</div>
					<div className="ops-btn">Open Load Summary →</div>
				</div>

				<div className="ops-card" onClick={() => navigate("/container-drill-down")}>
					<div className="ops-card-top">
						<div className="ops-icon">📊</div>
						<div>
							<h4>Container Drill Down</h4>
							<p>Interactive load table with dispatch schedules, pallet counts, area utilization, load approvals &amp; shipment details.</p>
						</div>
					</div>
					<div className="ops-btn">Open Drill Down Table →</div>
				</div>
			</div>
		</div>
	);
}

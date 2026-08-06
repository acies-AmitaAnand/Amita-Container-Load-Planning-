export default function AlertsPanel() {
	const alerts = [
		{
			icon: "🔴",
			text: "Delhi → Kolkata lane delay",
		},
		{
			icon: "🟠",
			text: "Vehicle capacity exceeded",
		},
		{
			icon: "🟢",
			text: "Bengaluru warehouse healthy",
		},
		{
			icon: "🟡",
			text: "3 shipments awaiting allocation",
		},
	];

	return (
		<div className="card">
			<div className="card-head">
				<h3>Alerts</h3>
			</div>

			<div className="alerts">
				{alerts.map((alert) => (
					<div className="alert-row" key={alert.text}>
						<span>{alert.icon}</span>
						<span>{alert.text}</span>
					</div>
				))}
			</div>
		</div>
	);
}

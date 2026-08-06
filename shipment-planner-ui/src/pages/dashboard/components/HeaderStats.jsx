export default function HeaderStats() {
	const stats = [
		{ icon: "📦", label: "Total Shipments", value: "6,420" },
		{ icon: "🚚", label: "Vehicles Active", value: "148" },
		{ icon: "📍", label: "Today's Deliveries", value: "512" },
		{ icon: "⚠", label: "Delayed", value: "18" },
	];

	return (
		<div className="header-stats">
			{stats.map((item) => (
				<div className="stat-card" key={item.label}>
					<div className="stat-icon">{item.icon}</div>

					<div>
						<div className="stat-value">{item.value}</div>
						<div className="stat-label">{item.label}</div>
					</div>
				</div>
			))}
		</div>
	);
}

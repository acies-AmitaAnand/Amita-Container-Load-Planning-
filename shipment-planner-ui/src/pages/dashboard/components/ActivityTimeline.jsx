export default function ActivityTimeline() {
	const activities = [
		{
			time: "09:20",
			title: "Shipment SHP-1024 dispatched",
			status: "success",
		},
		{
			time: "09:45",
			title: "Truck US-IL-4412 reached Chicago Hub",
			status: "info",
		},
		{
			time: "10:15",
			title: "Route optimization completed",
			status: "success",
		},
		{
			time: "11:05",
			title: "Shipment SHP-0988 delivered",
			status: "success",
		},
		{
			time: "11:30",
			title: "New shipment request received",
			status: "warning",
		},
	];

	return (
		<div className="card">
			<div className="card-head">
				<h3>Recent Activity</h3>
			</div>

			<div className="timeline">
				{activities.map((item) => (
					<div className="timeline-item" key={item.time + item.title}>
						<div className={`timeline-dot ${item.status}`} />

						<div className="timeline-content">
							<div className="timeline-title">{item.title}</div>
							<div className="timeline-time">{item.time}</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

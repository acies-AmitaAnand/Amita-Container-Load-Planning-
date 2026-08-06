import { useNavigate } from "react-router-dom";

export default function QuickActions() {
	const navigate = useNavigate();

	const actions = [
		// {
		// 	icon: "➕",
		// 	title: "Create Shipment",
		// 	path: "/shipment-plan",
		// },
		{
			icon: "🔧",
			title: "Build Container Load Planning",
			path: "/build-load-planning",
		},
		{
			icon: "🚛",
			title: "View Daily Load Planning",
			path: "/optimized-day-planning",
		},
		// {
		// 	icon: "📊",
		// 	title: "Generate Report",
		// 	path: "/", // TODO: Update when report page exists
		// },
	];

	return (
		<div className="card">
			<div className="card-head">
				<h3>Quick Actions</h3>
			</div>

			<div className="quick-actions">
				{actions.map((action) => (
					<button
						key={action.title}
						className="action-btn"
						onClick={() => navigate(action.path)}
					>
						<span>{action.icon}</span>
						<span>{action.title}</span>
					</button>
				))}
			</div>
		</div>
	);
}

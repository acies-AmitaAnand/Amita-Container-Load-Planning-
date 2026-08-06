import { Link, useLocation } from "react-router-dom";
import "./MainLayout.css";

const menus = [
	{
		category: "OVERVIEW",
		labels: [
			{ label: "Dashboard", path: "/", icon: "🏠" },
		],
	},
	{
		category: "DATA",
		labels: [
			{ label: "Shipment Demand", path: "/shipment-plan", icon: "📥" },
			{ label: "Item Master", path: "/item-master", icon: "📦" },
			{ label: "Location Master", path: "/location-master", icon: "🛣️" },
			{ label: "Route Master", path: "/lane-master", icon: "🧭" },
			{ label: "Transport Master", path: "/transport-master", icon: "🚚" },
		],
	},
	{
		category: "OPERATIONS",
		labels: [
			{
				label: "Build Container Load Planning",
				path: "/build-load-planning",
				icon: "🔧",
			},
			{
				label: "View Container Load Summary",
				path: "/optimized-day-planning",
				icon: "🚛",
			},
			// {
			// 	label: "Container Visualization",
			// 	path: "/all-container-visualization",
			// 	icon: "📦",
			// },
		],
	},
	{
		category: "CONFIGURATION",
		labels: [
			{
				label: "SKU UOM Configuration",
				path: "/sku-uom-configuration",
				icon: "⚙️",
			},
		],
	},
];

export default function Sidebar({ collapsed, onToggle }) {
	const location = useLocation();

	return (
		<aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
			<button
			className="sidebar-toggle"
			onClick={onToggle}
			>
			{collapsed ? "▶" : "◀"}
			</button>
			<div className="brand">
				<div className="logo">L</div>

			{!collapsed && (
			<div>
				<h1>
				Logist<span>IQ</span>
				</h1>
				<small>SHIPMENT PLANNER</small>
			</div>
			)}

			</div>

			<nav className="nav">
				{menus.map((group) => (
					<div className="nav-group" key={group.category}>
						{!collapsed && <h5>{group.category}</h5>}

						{group.labels.map((menu) => (
							<Link
								key={menu.path}
								to={menu.path}
								className={
									location.pathname === menu.path ? "active" : ""
								}
								title={collapsed ? menu.label : ""}
							>
								<span className="ic">{menu.icon}</span>

								{!collapsed && <span>{menu.label}</span>}
							</Link>
						))}
					</div>
				))}
			</nav>
		</aside>
	);
}

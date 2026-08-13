import { Link, useLocation } from "react-router-dom";
import "./MainLayout.css";

const menus = [
	{
		category: "NETWORK · CONTROL",
		labels: [
			{ label: "Global Overview", path: "/freight-intelligence?tab=overview", icon: "▦" },
			{ label: "Fleet Performance", path: "/freight-intelligence?tab=fleet", icon: "🚚" },
			{ label: "Shipment Tracking", path: "/freight-intelligence?tab=tracking", icon: "📦" },
			{ label: "Cost Intelligence", path: "/freight-intelligence?tab=cost", icon: "📈" },
			{ label: "Signals Board", path: "/freight-intelligence?tab=signals", icon: "⚡" },
		],
	},
	{
		category: "OPS · FIELD",
		labels: [
			{ label: "Control Tower", path: "/freight-intelligence?tab=control", icon: "🎧" },
			{ label: "Warehouse & Yard", path: "/freight-intelligence?tab=warehouse", icon: "🏭" },
			{ label: "Route Optimization", path: "/freight-intelligence?tab=routes", icon: "🧭" },
			{ label: "Carrier Scorecards", path: "/freight-intelligence?tab=carriers", icon: "📝" },
			{ label: "Exception Manager", path: "/freight-intelligence?tab=exceptions", icon: "⚠️" },
			{ label: "Sustainability", path: "/freight-intelligence?tab=sustainability", icon: "🌱" },
			{ label: "Demand Forecast", path: "/freight-intelligence?tab=forecast", icon: "🤖" },
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
			{
				label: "Container Drill Down",
				path: "/container-drill-down",
				icon: "📊",
			},
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
	const fullPath = location.pathname + location.search;

	const isMenuActive = (menuPath) => {
		if (menuPath.includes("?tab=overview")) {
			return fullPath === menuPath || (location.pathname === "/" && !location.search);
		}
		if (menuPath.includes("?")) {
			return fullPath === menuPath;
		}
		return location.pathname === menuPath;
	};

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
						<small>FREIGHT INTELLIGENCE</small>
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
								className={isMenuActive(menu.path) ? "active" : ""}
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

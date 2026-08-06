import { Link, useLocation } from "react-router-dom";

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
				label: "Parameter Admin",
				path: "/parameter-admin",
				icon: "🔧",
			},
			{
				label: "Optimization Planning Summary (Day)",
				path: "/optimized-day-planning",
				icon: "🚛",
			},
			{
				label: "All Container Visualization",
				path: "/all-container-visualization",
				icon: "📦",
			},
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

const EXPANDED_WIDTH = 260;
const COLLAPSED_WIDTH = 64;

export default function Sidebar({ collapsed, onToggle }) {
	const location = useLocation();

	return (
		<div
			style={{
				width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
				flexShrink: 0,
				background: "#111827",
				color: "white",
				padding: "20px 12px",
				height: "100vh",
				overflowY: "auto",
				overflowX: "hidden",
				transition: "width 0.2s ease",
				position: "relative",
			}}
		>
			<button
				onClick={onToggle}
				aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
				style={{
					position: "absolute",
					top: 16,
					right: collapsed ? "50%" : 12,
					transform: collapsed ? "translateX(50%)" : "none",
					background: "#1f2937",
					border: "none",
					color: "white",
					width: 28,
					height: 28,
					borderRadius: 6,
					cursor: "pointer",
					fontSize: 14,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				{collapsed ? "›" : "‹"}
			</button>

			<h2
				style={{
					fontSize: collapsed ? 0 : 20,
					opacity: collapsed ? 0 : 1,
					height: collapsed ? 0 : "auto",
					overflow: "hidden",
					transition: "opacity 0.15s ease",
					marginTop: collapsed ? 8 : 40,
					marginBottom: collapsed ? 0 : 12,
					whiteSpace: "nowrap",
				}}
			>
				Shipment Planner
			</h2>

			<hr
				style={{
					borderColor: "#374151",
					marginTop: collapsed ? 44 : 0,
				}}
			/>

			<nav style={{ marginTop: 12 }}>
				{menus.map((category) => (
					<div key={category.category}>
						{!collapsed && (
							<div
								style={{
									color: "#9CA3AF",
									fontSize: 11,
									fontWeight: 600,
									letterSpacing: 1,
									margin: "18px 8px 8px",
									textTransform: "uppercase",
								}}
							>
								{category.category}
							</div>
						)}

						{category.labels.map((menu) => {
							const isActive = location.pathname === menu.path;

							return (
								<Link
									key={menu.path}
									to={menu.path}
									title={collapsed ? menu.label : undefined}
									style={{
										display: "flex",
										alignItems: "center",
										gap: 10,
										padding: "10px 8px",
										marginBottom: 4,
										borderRadius: 6,
										color: "white",
										textDecoration: "none",
										background: isActive ? "#1f2937" : "transparent",
										whiteSpace: "nowrap",
										overflow: "hidden",
									}}
								>
									<span
										style={{
											width: 20,
											textAlign: "center",
											flexShrink: 0,
										}}
									>
										{menu.icon}
									</span>

									{!collapsed && (
										<span style={{ fontSize: 14 }}>
											{menu.label}
										</span>
									)}
								</Link>
							);
						})}
					</div>
				))}
			</nav>
		</div>
	);
}

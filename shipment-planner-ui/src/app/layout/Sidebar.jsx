
import {
	Link
} from "react-router-dom";

const menus = [

	{
		label: "Data Loading",
		path: "/data-loading"
	},

	{
		label: "UOM Configuration",
		path: "/uom-configuration"
	},

	{
		label: "Item Master",
		path: "/item-master"
	},

	{
		label: "Route View",
		path: "/route-view"
	},

	{
		label: "Container Visualization",
		path: "/container-visualization"
	},

	{
		label: "Parameter Admin",
		path: "/parameter-admin"
	}
];

export default function Sidebar() {

	return (

		<div
			style={{
				width: "260px",
				background: "#111827",
				color: "white",
				padding: "20px"
			}}
		>

			<h2>
				Shipment Planner
			</h2>

			<hr />

			{menus.map((menu) => (

				<div
					key={menu.path}
					style={{
						marginBottom: "15px"
					}}
				>

					<Link
						to={menu.path}

						style={{
							color: "white",
							textDecoration: "none"
						}}
					>

						{menu.label}

					</Link>

				</div>
			))}

		</div>
	);
}

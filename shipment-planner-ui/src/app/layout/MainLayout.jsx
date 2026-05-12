import {
	Outlet
} from "react-router-dom";

import Sidebar from "./Sidebar";

export default function MainLayout() {

	return (

		<div
			style={{
				display: "flex",
				height: "100vh"
			}}
		>

			<Sidebar />

			<div
				style={{
					flex: 1,
					padding: "20px",
					overflow: "auto",
					background: "#f3f4f6"
				}}
			>

				<Outlet />

			</div>

		</div>
	);
}

import {
	Outlet
} from "react-router-dom";

import Sidebar from "../../components/Sidebar";

export default function MainLayout() {

	return (

		<div
			style={{
				display: "flex",
				height: "100vh"
			}}
		>
			<div
				style={{
					flex: 1,
					padding: "20px",
					overflow: "auto",
					background: "#ffffff",
					color:"#000000",
				}}
			>

				<Outlet />

			</div>

		</div>
	);
}

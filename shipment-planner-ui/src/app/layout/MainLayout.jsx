import { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import "./MainLayout.css";

export default function MainLayout() {
	const [collapsed, setCollapsed] = useState(false);

	return (
		<div className="app-shell">
			<Sidebar
				collapsed={collapsed}
				onToggle={() => setCollapsed((prev) => !prev)}
			/>

			<div className="main-shell">
				<Outlet />
			</div>
		</div>
	);
}

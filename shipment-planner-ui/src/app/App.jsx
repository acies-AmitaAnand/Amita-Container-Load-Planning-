// App.jsx — wraps Sidebar + routed page content
import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "../components/Sidebar";


import MainLayout from "./layout/MainLayout";

import Dashboard from "../pages/dashboard/Dashboard";

import DataLoading from "../pages/data-loading/DataLoading";

import UOMConfiguration from "../pages/uom-config/UOMConfiguration";

import ItemMaster from "../pages/item-master/ItemMaster";

import RouteView from "../pages/route-view/RouteView";

// import ContainerVisualization from "../pages/container-visualization/ContainerVisualization";

import MultiContainerView from "../pages/container-visualization/MultiContainerView";

import ParameterAdmin from "../pages/parameter-admin/ParameterAdmin";


// ...other page imports

export default function App() {
	const [collapsed, setCollapsed] = useState(false);
    return (
        <div style={{ display: "flex", width: "100vw", height: "100vh", overflow: "hidden" }}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>

		<Routes>

			<Route
				path="/"
				element={<MainLayout />}
			>

				<Route
					index
					element={<Dashboard />}
				/>

				<Route
					path="data-loading"
					element={<DataLoading />}
				/>

				<Route
					path="uom-configuration"
					element={<UOMConfiguration />}
				/>

				<Route
					path="item-master"
					element={<ItemMaster />}
				/>

				<Route
					path="route-view"
					element={<RouteView />}
				/>
				<Route
					path="container-visualization"
					element={<MultiContainerView />}
				/>

				<Route
					path="parameter-admin"
					element={<ParameterAdmin />}
				/>

			</Route>

		</Routes>
        </div>
      </div>
  );
}
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

import PlannerConfig       from "../pages/PlannerConfig";

import DataTable           from "../components/DataTable";
// ...other page imports

export default function App() {
	const [collapsed, setCollapsed] = useState(false);
    return (
        <div style={{ display: "flex", width: "100vw", height: "100vh", overflow: "hidden" }}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>

		<Routes>
			<Route path="/data-loading"
				element={<DataTable table="shipment_demand"   title="Shipment Demand" />} />
			<Route path="/uom-configuration"
				element={<DataTable table="sku_pallet_master" title="SKU / Pallet Master" />} />
			<Route path="/item-master"
				element={<DataTable table="load_equipment"    title="Load Equipment" />} />
			<Route path="/route-view"
				element={<DataTable table="lane_master"       title="Lane Master" />} />
			<Route path="/container-visualization"
				element={<MultiContainerView />} />
			<Route path="/parameter-admin"
				element={<PlannerConfig />} />
			<Route
				path="container-visualization"
				element={<MultiContainerView />}
			/>

			<Route path="/parameter-admin"
            element={<PlannerConfig />} />

		</Routes>
        </div>
      </div>
  );
}
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

import ContainerVisualization from "../pages/container-visualization/ContainerVisualization";

import E from "../pages/container-visualization/MultiContainerView";

import OptimizationResultsPage from "../pages/container-visualization/OptimizationResultsPage";

import OptimizationVisualization2 from "../pages/container-visualization/OptimizationVisualization2";

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
			<Route path="/" />
			<Route path="/shipment-plan" element={<DataTable table="shipment_plans"   title="Shipment Demand" />} />
			<Route path="/sku-uom-configuration" element={<DataTable table="sku_unit_of_measure" title="SKU / Pallet Master" />} />
			<Route path="/item-master" element={<DataTable table="item_master"    title="Load Equipment" />} />
			<Route path="/location-master" element={<DataTable table="location"       title="Location Master" />} />
			<Route path="/lane-master" element={<DataTable table="lane_master"       title="Lane Master" />} />
			<Route path="/transport-master" element={<DataTable table="transport_asset"       title="Transport Master" />} />
			<Route path="/all-container-visualization" element={<MultiContainerView />}/>
			<Route path="/optimized-day-planning" element={<ContainerVisualization />} />
			<Route path="/parameter-admin" element={<PlannerConfig />} />

		</Routes>
        </div>
      </div>
  );
}
import { Routes, Route } from "react-router-dom";

import MainLayout from "./layout/MainLayout";
import Dashboard from "../pages/dashboard/Dashboard";
import FreightIntelligence from "../pages/freight-intelligence/FreightIntelligence";

import PlannerConfig from "../pages/PlannerConfig";
import ContainerVisualization from "../pages/container-visualization/ContainerVisualization";
import MultiContainerView from "../pages/container-visualization/MultiContainerView";

import DataTable from "../components/DataTable";

import ContainerDrillDown from "../pages/container-drill-down/ContainerDrillDown";

export default function App() {
	return (
		<Routes>
			<Route element={<MainLayout />}>
				<Route index element={<FreightIntelligence />} />
				<Route
					path="/freight-intelligence"
					element={<FreightIntelligence />}
				/>

				<Route
					path="/shipment-plan"
					element={<DataTable table="sample_shipment_plans" title="Shipment Demand" />}
				/>

				<Route
					path="/sku-uom-configuration"
					element={
						<DataTable
							table="sku_unit_of_measure"
							title="SKU / Pallet Master"
						/>
					}
				/>

				<Route
					path="/item-master"
					element={<DataTable table="item_master" title="Load Equipment" />}
				/>

				<Route
					path="/location-master"
					element={<DataTable table="location" title="Location Master" />}
				/>

				<Route
					path="/lane-master"
					element={<DataTable table="lane_master" title="Lane Master" />}
				/>

				<Route
					path="/transport-master"
					element={
						<DataTable
							table="transport_asset"
							title="Transport Master"
						/>
					}
				/>

				<Route
					path="/optimized-day-planning"
					element={<ContainerVisualization />}
				/>

				<Route
					path="/build-load-planning"
					element={<PlannerConfig />}
				/>

				<Route
					path="/container-drill-down"
					element={<ContainerDrillDown />}
				/>
			</Route>
		</Routes>
	);
}

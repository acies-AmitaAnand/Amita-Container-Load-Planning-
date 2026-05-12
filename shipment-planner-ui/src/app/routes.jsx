// import {
// Routes,
// Route,
// Link
// } from "react-router-dom";

// import Dashboard from "../pages/dashboard/Dashboard";

// import DataLoading from "../pages/data-loading/DataLoading";

// export default function RoutesConfig() {

// return (

// <div>

// {/* SIMPLE NAVBAR */}

// <div
// style={{
// display: "flex",
// gap: "20px",
// padding: "20px",
// background: "#111827"
// }}
// >

// <Link
// to="/"
// style={{ color: "white" }}
// >
// Dashboard
// </Link>

// <Link
// to="/data-loading"
// style={{ color: "white" }}
// >
// Data Loading
// </Link>

// </div>


// {/* ROUTES */}

// <Routes>

// <Route
// path="/"
// element={<Dashboard />}
// />

// <Route
// path="/data-loading"
// element={<DataLoading />}
// />

// </Routes>

// </div>
// );
// }


import {
	Routes,
	Route
} from "react-router-dom";

import MainLayout from "./layout/MainLayout";

import Dashboard from "../pages/dashboard/Dashboard";

import DataLoading from "../pages/data-loading/DataLoading";

import UOMConfiguration from "../pages/uom-config/UOMConfiguration";

import ItemMaster from "../pages/item-master/ItemMaster";

import RouteView from "../pages/route-view/RouteView";

import ContainerVisualization from "../pages/container-visualization/ContainerVisualization";

import ParameterAdmin from "../pages/parameter-admin/ParameterAdmin";

export default function RoutesConfig() {

	return (

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
					element={<ContainerVisualization />}
				/>

				<Route
					path="parameter-admin"
					element={<ParameterAdmin />}
				/>

			</Route>

		</Routes>
	);
}

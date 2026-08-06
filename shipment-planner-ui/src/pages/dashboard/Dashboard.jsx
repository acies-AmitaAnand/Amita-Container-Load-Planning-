import "./Dashboard.css";

import FilterBar from "./components/FilterBar";
import KPIGrid from "./components/KPIGrid";
import Funnel from "./components/Funnel";
import CarrierRank from "./components/CarrierRank";
import LaneTable from "./components/LaneTable";

export default function Dashboard() {
	return (
		<div className="dashboard">
			<FilterBar />

			<KPIGrid />

			<div className="panels">
				<Funnel />
				<CarrierRank />
			</div>

			<div
				className="panels"
				style={{
					marginTop: 16,
					gridTemplateColumns: "1fr",
				}}
			>
				<LaneTable />
			</div>
		</div>
	);
}

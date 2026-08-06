import "./Dashboard.css";

import HeaderStats from "./components/HeaderStats";
import FilterBar from "./components/FilterBar";
import KPIGrid from "./components/KPIGrid";
import Funnel from "./components/Funnel";
import CarrierRank from "./components/CarrierRank";
import LaneTable from "./components/LaneTable";
import ActivityTimeline from "./components/ActivityTimeline";
import AlertsPanel from "./components/AlertsPanel";
import QuickActions from "./components/QuickActions";

export default function Dashboard() {
	return (
		<div className="dashboard">

			<HeaderStats />

			<FilterBar />

			<KPIGrid />

			<div className="panels">
				<Funnel />
				<CarrierRank />
			</div>

			<LaneTable />

			<div className="bottom-panels">
				<ActivityTimeline />
				<AlertsPanel />
			</div>

			<QuickActions />

		</div>
	);
}

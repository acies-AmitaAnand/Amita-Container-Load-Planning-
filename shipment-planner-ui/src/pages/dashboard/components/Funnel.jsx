import { useState } from "react";
import { funnelShip } from "../dashboardData";

export default function Funnel() {
	const [mode, setMode] = useState("shipments");

	return (
		<div className="card">
			<div className="card-head">
				<h3>Order-to-Delivery Flow</h3>

				<div className="toggle">
					<button
						className={mode === "shipments" ? "on" : ""}
						onClick={() => setMode("shipments")}
					>
						Shipments
					</button>

					<button
						className={mode === "cost" ? "on" : ""}
						onClick={() => setMode("cost")}
					>
						Cost
					</button>
				</div>
			</div>

			<div className="funnel">
				{funnelShip.map(([label, value, width]) => (
					<div className="fstep" key={label}>
						<div className="fl">
							<span className="n">{label}</span>
							<span className="v">{value}</span>
						</div>

						<div className="fbar">
							<span style={{ width: `${width}%` }} />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

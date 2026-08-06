import { carriers } from "../dashboardData";

export default function CarrierRank() {
	return (
		<div className="card">
			<div className="card-head">
				<h3>Top Carriers by Volume</h3>
			</div>

			{carriers.map(([name, percent, volume], index) => (
				<div className="rank-item" key={name}>
					<div className="rank-num">{index + 1}</div>

					<div className="rank-body">
						<div className="n">{name}</div>

						<div className="rank-bar">
							<span style={{ width: `${percent}%` }} />
						</div>
					</div>

					<div className="rank-val">{volume}</div>
				</div>
			))}
		</div>
	);
}

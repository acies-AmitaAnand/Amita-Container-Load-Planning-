import { lanes } from "../dashboardData";

export default function LaneTable() {
	return (
		<div className="card">
			<div className="card-head">
				<h3>Lane Performance</h3>
			</div>

			<table>
				<thead>
					<tr>
						<th>Lane</th>
						<th className="num">Loads</th>
						<th className="num">On-Time %</th>
						<th className="num">Cost / km</th>
						<th>Status</th>
					</tr>
				</thead>

				<tbody>
					{lanes.map((lane) => (
						<tr key={lane[0]}>
							<td>{lane[0]}</td>
							<td className="num">{lane[1]}</td>
							<td className="num">{lane[2]}</td>
							<td className="num">{lane[3]}</td>

							<td>
								<span className={`pill ${lane[4]}`}>
									{lane[5]}
								</span>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

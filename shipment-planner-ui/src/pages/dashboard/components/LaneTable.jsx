export default function LaneTable() {
	const lanes = [
		["Chicago → Atlanta", "1,420", "94.1%", "$0.82", "g", "Healthy"],
		["New York → Chicago", "2,180", "88.7%", "$0.91", "a", "Watch"],
		["Los Angeles → Dallas", "980", "79.4%", "$1.04", "r", "At Risk"],
		["Dallas → Houston", "1,110", "96.3%", "$0.77", "g", "Healthy"],
		["Seattle → San Francisco", "640", "90.2%", "$0.88", "a", "Watch"],
	];

	return (
		<div className="panel" style={{ margin: 0 }}>
			<div className="mini-title">Lane Performance</div>
			<table className="db-table">
				<thead>
					<tr>
						<th>Lane</th>
						<th className="num">Loads</th>
						<th className="num">On-Time</th>
						<th className="num">Cost / km</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{lanes.map(([lane, loads, onTime, cost, pillType, status]) => (
						<tr key={lane}>
							<td><b>{lane}</b></td>
							<td className="num">{loads}</td>
							<td className="num">{onTime}</td>
							<td className="num">{cost}</td>
							<td>
								<span className={`pill ${pillType}`}>
									{status}
								</span>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

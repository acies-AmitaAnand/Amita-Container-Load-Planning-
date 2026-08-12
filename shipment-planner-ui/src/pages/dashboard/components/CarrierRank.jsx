export default function CarrierRank() {
	const carriers = [
		["In-house Fleet", 100, "48,200"],
		["FedEx Freight", 74, "35,600"],
		["JB Hunt Transport", 61, "29,400"],
		["XPO Logistics", 43, "20,700"],
		["Old Dominion Freight", 28, "13,500"],
	];

	return (
		<div className="panel" style={{ margin: 0 }}>
			<div className="mini-title">Top Carriers by Volume</div>
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

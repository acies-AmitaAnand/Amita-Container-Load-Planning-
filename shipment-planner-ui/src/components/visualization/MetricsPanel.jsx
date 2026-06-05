export default function MetricsPanel({
	metrics
}) {

	const items = [

		{
			label:
				"Cubic Utilization",
			value:
				`${metrics.cubicUtilization}%`
		},

		{
			label:
				"Weight Utilization",
			value:
				`${metrics.weightUtilization}%`
		},

		{
			label:
				"Floor Coverage",
			value:
				`${metrics.floorCoverage}%`
		},

		{
			label:
				"Avg Stack Height",
			value:
				metrics.avgStackHeight
		},

		{
			label:
				"Stack Density",
			value:
				metrics.stackDensity
		},

		{
			label:
				"Stability Index",
			value:
				metrics.stabilityIndex
		},

		{
			label:
				"Void Space Ratio",
			value:
				`${metrics.voidRatio}%`
		},

		{
			label:
				"Pallets per Truck",
			value:
				metrics.palletsPerTruck
		},

		{
			label:
				"Effective Utilization",
			value:
				`${metrics.utilizationScore}%`
		}
	];

	return (

		<div
			style={{
				background: "white",
				padding: "20px",
				borderLeft:
					"1px solid #d1d5db",
				overflowY: "auto"
			}}
		>

			<h2 style={{ color: "#000000" }}>
				Container Metrics
			</h2>

			<hr />

			{items.map((item) => (

				<div
					key={item.label}

					style={{
						color: "#000000",
						marginBottom: "18px"
					}}
				>

					<div
						style={{
							color: "#000000",
							fontWeight: "bold"
						}}
					>

						{item.label}

					</div>

					<div
						style={{
							color: "#2563eb",
							fontSize: "20px"
						}}
					>

						{item.value}

					</div>

				</div>
			))}

		</div>
	);
}

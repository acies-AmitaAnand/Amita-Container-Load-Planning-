import ContainerSimulator
from "../../components/visualization/ContainerSimulator";

export default function ContainerVisualization() {

	return (

		<div
			style={{
				display: "flex",
				height: "calc(100vh - 100px)"
			}}
		>

			{/* 3D VIEW */}

			<div
				style={{
					flex: 1
				}}
			>

				<ContainerSimulator />

			</div>
		</div>
	);
}

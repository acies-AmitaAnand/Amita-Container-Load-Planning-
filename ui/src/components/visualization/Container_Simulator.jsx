import React, {
	useState,
	useMemo
} from "react";

import {
	Canvas,
	useThree
} from "@react-three/fiber";

import {
	OrbitControls,
	Box,
	Html,
	Text,
	Line
} from "@react-three/drei";

import * as THREE from "three";


// =====================================================
// READ JSON FROM URL
// =====================================================


function getPayload() {

	const params = new URLSearchParams(
		window.location.search
	);

	const raw = params.get("data");

	if (!raw) {

		return {

			container: {
				length: 40,
				width: 8,
				height: 8
			},

			pallets: []
		};
	}

	return JSON.parse(raw);
}


// =====================================================
// Side measurement
// =====================================================

function MeasurementScales({ container }) {

	const elements = [];

	// =====================================================
	// FRONT + BACK LENGTH SCALES
	// =====================================================

	for (let i = 0; i <= container.length; i++) {

		const x =
			i - container.length / 2;

		// =========================================
		// FRONT SCALE
		// =========================================

		elements.push(

			<Line
				key={`front-line-${i}`}

				points={[
					[x, 0, container.width / 2 + 0.2],
					[x, 0, container.width / 2 + 0.5]
				]}

				color="black"
			/>
		);

		// =========================================
		// BACK SCALE
		// =========================================

		elements.push(

			<Line
				key={`back-line-${i}`}

				points={[
					[x, 0, -container.width / 2 - 0.2],
					[x, 0, -container.width / 2 - 0.5]
				]}

				color="black"
			/>
		);


		// =========================================
		// LABEL EVERY 5 FT
		// =========================================

		if (i % 5 === 0) {

			// FRONT LABEL

			elements.push(

				<Text
					key={`front-text-${i}`}

					position={[
						x,
						0,
						container.width / 2 + 1
					]}

					rotation={[
						-Math.PI / 2,
						0,
						0
					]}

					fontSize={0.35}

					color="black"

					anchorX="center"
					anchorY="middle"
				>

					{i} ft

				</Text>
			);


			// BACK LABEL

			elements.push(

				<Text
					key={`back-text-${i}`}

					position={[
						x,
						0,
						-container.width / 2 - 1
					]}

					rotation={[
						-Math.PI / 2,
						0,
						0
					]}

					fontSize={0.35}

					color="black"

					anchorX="center"
					anchorY="middle"
				>

					{i} ft

				</Text>
			);
		}
	}


	// =====================================================
	// LEFT + RIGHT WIDTH SCALES
	// =====================================================

	for (let i = 0; i <= container.width; i++) {

		const z =
			i - container.width / 2;

		// =========================================
		// LEFT SCALE
		// =========================================

		elements.push(

			<Line
				key={`left-line-${i}`}

				points={[
					[-container.length / 2 - 0.2, 0, z],
					[-container.length / 2 - 0.5, 0, z]
				]}

				color="black"
			/>
		);

		// =========================================
		// RIGHT SCALE
		// =========================================

		elements.push(

			<Line
				key={`right-line-${i}`}

				points={[
					[container.length / 2 + 0.2, 0, z],
					[container.length / 2 + 0.5, 0, z]
				]}

				color="black"
			/>
		);


		// =========================================
		// LABELS
		// =========================================

		// LEFT LABEL

		elements.push(

			<Text
				key={`left-text-${i}`}

				position={[
					-container.length / 2 - 1.2,
					0,
					z
				]}

				rotation={[
					-Math.PI / 2,
					0,
					0
				]}

				fontSize={0.35}

				color="black"

				anchorX="center"
				anchorY="middle"
			>

				{i} ft

			</Text>
		);


		// RIGHT LABEL

		elements.push(

			<Text
				key={`right-text-${i}`}

				position={[
					container.length / 2 + 1.2,
					0,
					z
				]}

				rotation={[
					-Math.PI / 2,
					0,
					0
				]}

				fontSize={0.35}

				color="black"

				anchorX="center"
				anchorY="middle"
			>

				{i} ft

			</Text>
		);
	}

	return <>{elements}</>;
}



// =====================================================
// FLOOR GRID
// =====================================================

function FloorGrid({ container }) {

	const tiles = [];

	for (let x = 0; x < container.length; x++) {

		for (let z = 0; z < container.width; z++) {

			tiles.push(

				<mesh
					key={`${x}-${z}`}
					position={[
						x - container.length / 2 + 0.5,
						-0.01,
						z - container.width / 2 + 0.5
					]}
				>

					<boxGeometry args={[1, 0.02, 1]} />

					<meshStandardMaterial
						color={
							(x + z) % 2 === 0
								? "#1e293b"
								: "#334155"
						}
					/>

				</mesh>
			);
		}
	}

	return <>{tiles}</>;
}


// =====================================================
// BOUNDARY BOX
// =====================================================

function BoundaryBox({ container }) {

	const points = [

		// bottom
		[-container.length / 2, 0, -container.width / 2],
		[container.length / 2, 0, -container.width / 2],
		[container.length / 2, 0, container.width / 2],
		[-container.length / 2, 0, container.width / 2],
		[-container.length / 2, 0, -container.width / 2],

		// top
		[-container.length / 2, container.height, -container.width / 2],
		[container.length / 2, container.height, -container.width / 2],
		[container.length / 2, container.height, container.width / 2],
		[-container.length / 2, container.height, container.width / 2],
		[-container.length / 2, container.height, -container.width / 2]
	];

	return (
		<>
			<Line
				points={points}
				color="#38bdf8"
				lineWidth={1}
			/>

			{/* verticals */}

			{[
				[-container.length / 2, -container.width / 2],
				[container.length / 2, -container.width / 2],
				[container.length / 2, container.width / 2],
				[-container.length / 2, container.width / 2]
			].map((p, idx) => (

				<Line
					key={idx}
					points={[
						[p[0], 0, p[1]],
						[p[0], container.height, p[1]]
					]}
					color="#38bdf8"
				/>
			))}
		</>
	);
}


// =====================================================
// CONTAINER WALLS
// =====================================================

function ContainerWalls({ container }) {

	const transparentMat =
		new THREE.MeshPhysicalMaterial({
			color: "#bfdbfe",
			transparent: true,
			opacity: 0.12,
			depthWrite: false,
			side: THREE.DoubleSide
		});

	return (
		<>

			{/* LEFT */}

			<mesh
				position={[
					0,
					container.height / 2,
					-container.width / 2
				]}
			>

				<boxGeometry args={[
					container.length,
					container.height,
					0.05
				]} />

				<primitive
					object={transparentMat}
					attach="material"
				/>

			</mesh>


			{/* RIGHT */}

			<mesh
				position={[
					0,
					container.height / 2,
					container.width / 2
				]}
			>

				<boxGeometry args={[
					container.length,
					container.height,
					0.05
				]} />

				<primitive
					object={transparentMat}
					attach="material"
				/>

			</mesh>


			{/* BACK */}

			<mesh
				position={[
					container.length / 2,
					container.height / 2,
					0
				]}
			>

				<boxGeometry args={[
					0.05,
					container.height,
					container.width
				]} />

				<primitive
					object={transparentMat}
					attach="material"
				/>

			</mesh>


			{/* FRONT */}

			<mesh
				position={[
					-container.length / 2,
					container.height / 2,
					0
				]}
			>

				<boxGeometry args={[
					0.2,
					container.height,
					container.width
				]} />

				<meshStandardMaterial
					color="#111827"
				/>

			</mesh>

		</>
	);
}


// =====================================================
// PALLET
// =====================================================

function Pallet({ pallet }) {

	const [hovered, setHovered] =
		useState(false);

	return (
		<group>

			<Box
				args={[
					pallet.depth,
					pallet.height,
					pallet.width
				]}

				position={[
					pallet.x,
					pallet.height / 2,
					pallet.z
				]}

				castShadow

				onPointerOver={() =>
					setHovered(true)
				}

				onPointerOut={() =>
					setHovered(false)
				}
			>

				<meshStandardMaterial
					color={pallet.color}
					transparent
					opacity={0.9}
				/>

			</Box>


			{/* LABEL */}

			<Text
				position={[
					pallet.x,
					pallet.height + 0.1,
					pallet.z
				]}

				fontSize={0.4}
				color="white"
				anchorX="center"
				anchorY="middle"
			>
				{pallet.label}
			</Text>


			{/* TOOLTIP */}

			{hovered && (

				<Html
					position={[
						pallet.x,
						pallet.height + 1,
						pallet.z
					]}
				>

					<div
						style={{
							background: "white",
							padding: "10px",
							borderRadius: "8px",
							width: "220px",
							boxShadow:
								"0px 4px 10px rgba(0,0,0,0.3)"
						}}

						dangerouslySetInnerHTML={{
							__html: pallet.tooltip_html
						}}
					/>

				</Html>
			)}

		</group>
	);
}


// =====================================================
// AXIS HELPER
// =====================================================

function AxisHelper() {

	return (
		<group position={[15, 0, 12]}>

			<Line
				points={[[0, 0, 0], [3, 0, 0]]}
				color="red"
			/>

			<Line
				points={[[0, 0, 0], [0, 3, 0]]}
				color="green"
			/>

			<Line
				points={[[0, 0, 0], [0, 0, 3]]}
				color="blue"
			/>

			<Text
				position={[3.3, 0, 0]}
				fontSize={0.4}
			>
				X
			</Text>

			<Text
				position={[0, 3.3, 0]}
				fontSize={0.4}
			>
				Y
			</Text>

			<Text
				position={[0, 0, 3.3]}
				fontSize={0.4}
			>
				Z
			</Text>

		</group>
	);
}


// =====================================================
// CAMERA CONTROLS
// =====================================================

function CameraController({
	viewMode
}) {

	const { camera } = useThree();

	useMemo(() => {

		if (viewMode === "top") {

			camera.position.set(0, 60, 0.1);

		} else if (
			viewMode === "side"
		) {

			camera.position.set(60, 10, 0);

		} else {

			camera.position.set(
				30,
				20,
				30
			);
		}

	}, [viewMode, camera]);

	return null;
}


// =====================================================
// MAIN APP
// =====================================================

export default function App() {

	const payload = getPayload();

	const container = payload.container;

	const pallets =
		payload.pallets || [];

	const [viewMode, setViewMode] =
		useState("iso");

	const [showBoundary,
		setShowBoundary] =
		useState(true);

	const [showGrid,
		setShowGrid] =
		useState(true);

	const totalWeight =
		pallets.reduce(
			(a, b) => a + (b.weight || 0),
			0
		);

	return (

		<div
			style={{
				display: "flex",
				width: "100vw",
				height: "100vh",
				background: "#e5e7eb"
			}}
		>

			{/* LEFT PANEL */}

			<div
				style={{
					flex: 1
				}}
			>

				<Canvas
					shadows
					camera={{
						position: [30, 20, 30],
						fov: 50
					}}
				>

					<ambientLight intensity={1} />

					<directionalLight
						position={[20, 20, 20]}
						intensity={1.5}
						castShadow
					/>

					<OrbitControls />

					<CameraController
						viewMode={viewMode}
					/>

					{showGrid &&
						<FloorGrid container={container} />
					}

					<ContainerWalls container={container} />

					{showBoundary &&
						<BoundaryBox container={container} />
					}

					{pallets.map(
						(pallet, idx) => (

						<Pallet
							key={idx}
							pallet={pallet}
						/>

					))}
                    <MeasurementScales container={container} />
					<AxisHelper />

				</Canvas>

			</div>


			{/* RIGHT PANEL */}

			<div
				style={{
					width: "340px",
					background: "#111827",
					color: "white",
					padding: "20px",
					overflowY: "auto"
				}}
			>

				<h2>
					Container / Container Viewer
				</h2>

				<hr />

				{/* DIMENSIONS */}

				<div>

					<h3>
						Container Dimensions
					</h3>

					<p>
						Length:
						{container.length} ft
					</p>

					<p>
						Width:
						{container.width} ft
					</p>

					<p>
						Height:
						{container.height} ft
					</p>

				</div>

				<hr />

				{/* CAMERA */}

				<div>

					<h3>
						Camera Views
					</h3>

					<button
						onClick={() =>
							setViewMode("side")
						}
					>
						Side View
					</button>

					<button
						onClick={() =>
							setViewMode("top")
						}
						style={{
							marginLeft: "10px"
						}}
					>
						Top View
					</button>

					<button
						onClick={() =>
							setViewMode("iso")
						}
						style={{
							marginLeft: "10px"
						}}
					>
						ISO View
					</button>

				</div>

				<hr />

				{/* DISPLAY */}

				<div>

					<h3>
						Display Options
					</h3>

					<label>

						<input
							type="checkbox"
							checked={showBoundary}
							onChange={() =>
								setShowBoundary(
									!showBoundary
								)
							}
						/>

						Show Boundary Box

					</label>

					<br />

					<label>

						<input
							type="checkbox"
							checked={showGrid}
							onChange={() =>
								setShowGrid(
									!showGrid
								)
							}
						/>

						Show Grid

					</label>

				</div>

				<hr />

				{/* LEGEND */}

				<div>

					<h3>
						Legend (Pallets)
					</h3>

					{pallets.map(
						(p, idx) => (

						<div
							key={idx}
							style={{
								display: "flex",
								alignItems: "center",
								marginBottom: "8px"
							}}
						>

							<div
								style={{
									width: "20px",
									height: "20px",
									background: p.color,
									marginRight: "10px"
								}}
							/>

							{p.label}

						</div>

					))}

				</div>

				<hr />

				{/* SUMMARY */}

				<div>

					<h3>
						Load Summary
					</h3>

					<p>
						Total Pallets:
						{pallets.length}
					</p>

					<p>
						Total Weight:
						{totalWeight} lbs
					</p>

				</div>

			</div>

		</div>
	);
}

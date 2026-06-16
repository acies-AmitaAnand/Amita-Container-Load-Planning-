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


import MetricsPanel
	from "../../components/visualization/MetricsPanel";

import {
	calculateMetrics
}
	from "../../components/visualization/utils/calculateMetrics";


import * as THREE from "three";

// =====================================================
// READ JSON FROM URL
// =====================================================


function getPayloadFromUrl() {

	// const params = new URLSearchParams(
	// window.location.search
	// );

	// const raw = params.get("data");

	const rawData = localStorage.getItem(`res`);
	console.log(rawData);

	if (!rawData) {

		return {

			depth: 16154,
			width: 2438,
			height: 2743,
			internalDepth: 16154,
			internalWidth: 2438,
			internalHeight: 2743,

			pallets: [
				{
					"palletId": "P1",
					"position": {
						"x": 0,
						"y": 0,
						"z": 1000
					},
					"dimensions": {
						"depth": 1200,
						"width": 1000,
						"height": 1500
					}, "weight": 200
				}
			]
		};
	}

	const data = JSON.parse(
		// decodeURIComponent(
			rawData
		// )
		)

	console.log(data);
	return data;
}

// =====================================================
// Side measurement
// =====================================================

function MeasurementScales({ container }) {

	const elements = [];

	// =====================================================
	// FRONT + BACK LENGTH SCALES
	// =====================================================

	for (let i = 0; i <= mmToFeetDisplay(container.depth); i++) {

		const x =
			i - mmToFeetDisplay(container.depth) / 2;

		// =========================================
		// FRONT SCALE
		// =========================================

		elements.push(

			<Line
				key={`front-line-${i}`}

				points={[
					[x, 0, mmToFeetDisplay(container.width) / 2 + 0.2],
					[x, 0, mmToFeetDisplay(container.width) / 2 + 0.5]
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
					[x, 0, -mmToFeetDisplay(container.width) / 2 - 0.2],
					[x, 0, -mmToFeetDisplay(container.width) / 2 - 0.5]
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
						mmToFeetDisplay(container.width) / 2 + 1
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
						-mmToFeetDisplay(container.width) / 2 - 1
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

	for (let i = 0; i <= mmToFeetDisplay(container.width); i++) {

		const z =
			i - mmToFeetDisplay(container.width) / 2;

		// =========================================
		// LEFT SCALE
		// =========================================

		elements.push(

			<Line
				key={`left-line-${i}`}

				points={[
					[-mmToFeetDisplay(container.depth) / 2 - 0.2, 0, z],
					[-mmToFeetDisplay(container.depth) / 2 - 0.5, 0, z]
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
					[mmToFeetDisplay(container.depth) / 2 + 0.2, 0, z],
					[mmToFeetDisplay(container.depth) / 2 + 0.5, 0, z]
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
					-mmToFeetDisplay(container.depth) / 2 - 1.2,
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
					mmToFeetDisplay(container.depth) / 2 + 1.2,
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

	for (let x = 0; x < mmToFeetDisplay(container.depth); x++) {

		for (let z = 0; z < mmToFeetDisplay(container.width); z++) {

			tiles.push(

				<mesh
					key={`${x}-${z}`}
					position={[
						x - mmToFeetDisplay(container.depth) / 2 + 0.5,
						-0.01,
						z - mmToFeetDisplay(container.width) / 2 + 0.5
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
		[-mmToFeetDisplay(container.depth) / 2, 0, -mmToFeetDisplay(container.width) / 2],
		[mmToFeetDisplay(container.depth) / 2, 0, -mmToFeetDisplay(container.width) / 2],
		[mmToFeetDisplay(container.depth) / 2, 0, mmToFeetDisplay(container.width) / 2],
		[-mmToFeetDisplay(container.depth) / 2, 0, mmToFeetDisplay(container.width) / 2],
		[-mmToFeetDisplay(container.depth) / 2, 0, -mmToFeetDisplay(container.width) / 2],

		// top
		[-mmToFeetDisplay(container.depth) / 2, mmToFeetDisplay(container.height), -mmToFeetDisplay(container.width) / 2],
		[mmToFeetDisplay(container.depth) / 2, mmToFeetDisplay(container.height), -mmToFeetDisplay(container.width) / 2],
		[mmToFeetDisplay(container.depth) / 2, mmToFeetDisplay(container.height), mmToFeetDisplay(container.width) / 2],
		[-mmToFeetDisplay(container.depth) / 2, mmToFeetDisplay(container.height), mmToFeetDisplay(container.width) / 2],
		[-mmToFeetDisplay(container.depth) / 2, mmToFeetDisplay(container.height), -mmToFeetDisplay(container.width) / 2]
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
				[-mmToFeetDisplay(container.depth) / 2, -mmToFeetDisplay(container.width) / 2],
				[mmToFeetDisplay(container.depth) / 2, -mmToFeetDisplay(container.width) / 2],
				[mmToFeetDisplay(container.depth) / 2, mmToFeetDisplay(container.width) / 2],
				[-mmToFeetDisplay(container.depth) / 2, mmToFeetDisplay(container.width) / 2]
			].map((p, idx) => (

				<Line
					key={idx}
					points={[
						[p[0], 0, p[1]],
						[p[0], mmToFeetDisplay(container.height), p[1]]
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
					mmToFeetDisplay(container.height) / 2,
					-mmToFeetDisplay(container.width) / 2
				]}
			>

				<boxGeometry args={[
					mmToFeetDisplay(container.depth),
					mmToFeetDisplay(container.height),
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
					mmToFeetDisplay(container.height) / 2,
					mmToFeetDisplay(container.width) / 2
				]}
			>

				<boxGeometry args={[
					mmToFeetDisplay(container.depth),
					mmToFeetDisplay(container.height),
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
					mmToFeetDisplay(container.depth) / 2,
					mmToFeetDisplay(container.height) / 2,
					0
				]}
			>

				<boxGeometry args={[
					0.05,
					mmToFeetDisplay(container.height),
					mmToFeetDisplay(container.width)
				]} />

				<primitive
					object={transparentMat}
					attach="material"
				/>

			</mesh>


			{/* FRONT */}

			<mesh
				position={[
					-mmToFeetDisplay(container.depth) / 2,
					mmToFeetDisplay(container.height) / 2,
					0
				]}
			>

				<boxGeometry args={[
					0.2,
					mmToFeetDisplay(container.height),
					mmToFeetDisplay(container.width)
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

// ─── FIXED: never round intermediate coordinates ───────────────────────────
const MM_TO_FEET = 0.00328084;
function mmToFeet(value) { return value * MM_TO_FEET; } // removed Math.round
function mmToFeetDisplay(value) { return Math.round(value * MM_TO_FEET); } // only for labels

// ─── FIXED: correct axis mapping ─────────────────────────────────────────────
function Pallet({ pallet, container }) {
	const [hovered, setHovered] = useState(false);

	// Optimizer space: x = width-axis (left/right), z = depth-axis (front/back)
	// Three.js space: x = left/right, z = front/back
	// Origin in optimizer: (0,0,0) = left-front corner of interior floor
	// Origin in Three.js: centre of container floor

	const palletX = mmToFeetDisplay(
		pallet.position.x // optimizer x = width offset from left wall
		+ pallet.dimensions.width / 2 // move to pallet centre (width axis)
		- container.internalWidth / 2 // shift origin to container centre
	);

	const palletZ = mmToFeetDisplay(
		pallet.position.z // optimizer z = depth offset from door
		+ pallet.dimensions.depth / 2 // move to pallet centre (depth axis)
		- container.internalDepth / 2 // shift origin to container centre
	);

	const palletY = mmToFeetDisplay(pallet.dimensions.height) / 2; // sits on floor (y=0)

	return (
		<group>
			<Box
				args={[
					mmToFeetDisplay(pallet.dimensions.width), // Three.js x = container width axis
					mmToFeetDisplay(pallet.dimensions.height), // Three.js y = up
					mmToFeetDisplay(pallet.dimensions.depth), // Three.js z = container depth axis
				]}
				position={[palletX, palletY, palletZ]}
				castShadow
				onPointerOver={() => setHovered(true)}
				onPointerOut={() => setHovered(false)}
			>
				<meshStandardMaterial color={pallet.color || "#4CAF50"} transparent opacity={0.9} />
			</Box>

			<Text
				position={[palletX, mmToFeetDisplay(pallet.dimensions.height) + 0.1, palletZ]}
				fontSize={0.4}
				color="white"
				anchorX="center"
				anchorY="middle"
			>
				{pallet.label}
			</Text>

			{hovered && (
				<Html position={[palletX, mmToFeetDisplay(pallet.dimensions.height) + 1, palletZ]}>
					<div style={{
						background: "white", padding: "10px", borderRadius: "8px",
						width: "220px", boxShadow: "0px 4px 10px rgba(0,0,0,0.3)"
					}}
						dangerouslySetInnerHTML={{ __html: pallet.tooltip_html || "" }}
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

export default function ContainerSimulator() {

	const payload = getPayloadFromUrl();
	// const payload = getPayload();

	// const payloads = getPayloadFromTable();
	console.log(payload);

	const container = payload;

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


	// =========================================
	// CALCULATE METRICS
	// =========================================

	const metrics =
		calculateMetrics(
			container,
			pallets
		);

	return (

		<div
			style={{
				display: "flex",
				width: "75w",
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
						position: [25, 20, 30],
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
								container={container}
							/>

						))}
					<MeasurementScales container={container} />
					<AxisHelper />

				</Canvas>

			</div>


			{/* RIGHT PANEL */}

			<div
				style={{
					width: "25vh",
					background: "#111827",
					color: "white",
					padding: "20px",
					overflowY: "auto"
				}}
			>

				<h2>
					Container Details
				</h2>

				<hr />

				{/* DIMENSIONS */}

				<div>

					<h3>
						Container Dimensions
					</h3>

					<p>
						Length:
						{mmToFeetDisplay(container.depth)} ft
					</p>

					<p>
						Width:
						{mmToFeetDisplay(container.width)} ft
					</p>

					<p>
						Height:
						{mmToFeetDisplay(container.height)} ft
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

				{/* METRICS */}

				<MetricsPanel
					metrics={metrics}
				/>


			</div>

		</div>
	);
}

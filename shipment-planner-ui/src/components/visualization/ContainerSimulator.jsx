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

			containerDepth: 16154,
			containerWidth: 2438,
			containerHeight: 2743,
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

	for (let i = 0; i <= mmToFeetDisplay(container.containerDepth); i++) {

		const x =
			i - mmToFeetDisplay(container.containerDepth) / 2;

		// =========================================
		// FRONT SCALE
		// =========================================

		elements.push(

			<Line
				key={`front-line-${i}`}

				points={[
					[x, 0, mmToFeetDisplay(container.containerWidth) / 2 + 0.2],
					[x, 0, mmToFeetDisplay(container.containerWidth) / 2 + 0.5]
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
					[x, 0, -mmToFeetDisplay(container.containerWidth) / 2 - 0.2],
					[x, 0, -mmToFeetDisplay(container.containerWidth) / 2 - 0.5]
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
						mmToFeetDisplay(container.containerWidth) / 2 + 1
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
						-mmToFeetDisplay(container.containerWidth) / 2 - 1
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

	for (let i = 0; i <= mmToFeetDisplay(container.containerWidth); i++) {

		const z =
			i - mmToFeetDisplay(container.containerWidth) / 2;

		// =========================================
		// LEFT SCALE
		// =========================================

		elements.push(

			<Line
				key={`left-line-${i}`}

				points={[
					[-mmToFeetDisplay(container.containerDepth) / 2 - 0.2, 0, z],
					[-mmToFeetDisplay(container.containerDepth) / 2 - 0.5, 0, z]
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
					[mmToFeetDisplay(container.containerDepth) / 2 + 0.2, 0, z],
					[mmToFeetDisplay(container.containerDepth) / 2 + 0.5, 0, z]
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
					-mmToFeetDisplay(container.containerDepth) / 2 - 1.2,
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
					mmToFeetDisplay(container.containerDepth) / 2 + 1.2,
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

	for (let x = 0; x < mmToFeetDisplay(container.containerDepth); x++) {

		for (let z = 0; z < mmToFeetDisplay(container.containerWidth); z++) {

			tiles.push(

				<mesh
					key={`${x}-${z}`}
					position={[
						x - mmToFeetDisplay(container.containerDepth) / 2 + 0.5,
						-0.01,
						z - mmToFeetDisplay(container.containerWidth) / 2 + 0.5
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
		[-mmToFeetDisplay(container.containerDepth) / 2, 0, -mmToFeetDisplay(container.containerWidth) / 2],
		[mmToFeetDisplay(container.containerDepth) / 2, 0, -mmToFeetDisplay(container.containerWidth) / 2],
		[mmToFeetDisplay(container.containerDepth) / 2, 0, mmToFeetDisplay(container.containerWidth) / 2],
		[-mmToFeetDisplay(container.containerDepth) / 2, 0, mmToFeetDisplay(container.containerWidth) / 2],
		[-mmToFeetDisplay(container.containerDepth) / 2, 0, -mmToFeetDisplay(container.containerWidth) / 2],

		// top
		[-mmToFeetDisplay(container.containerDepth) / 2, mmToFeetDisplay(container.containerHeight), -mmToFeetDisplay(container.containerWidth) / 2],
		[mmToFeetDisplay(container.containerDepth) / 2, mmToFeetDisplay(container.containerHeight), -mmToFeetDisplay(container.containerWidth) / 2],
		[mmToFeetDisplay(container.containerDepth) / 2, mmToFeetDisplay(container.containerHeight), mmToFeetDisplay(container.containerWidth) / 2],
		[-mmToFeetDisplay(container.containerDepth) / 2, mmToFeetDisplay(container.containerHeight), mmToFeetDisplay(container.containerWidth) / 2],
		[-mmToFeetDisplay(container.containerDepth) / 2, mmToFeetDisplay(container.containerHeight), -mmToFeetDisplay(container.containerWidth) / 2]
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
				[-mmToFeetDisplay(container.containerDepth) / 2, -mmToFeetDisplay(container.containerWidth) / 2],
				[mmToFeetDisplay(container.containerDepth) / 2, -mmToFeetDisplay(container.containerWidth) / 2],
				[mmToFeetDisplay(container.containerDepth) / 2, mmToFeetDisplay(container.containerWidth) / 2],
				[-mmToFeetDisplay(container.containerDepth) / 2, mmToFeetDisplay(container.containerWidth) / 2]
			].map((p, idx) => (

				<Line
					key={idx}
					points={[
						[p[0], 0, p[1]],
						[p[0], mmToFeetDisplay(container.containerHeight), p[1]]
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
					mmToFeetDisplay(container.containerHeight) / 2,
					-mmToFeetDisplay(container.containerWidth) / 2
				]}
			>

				<boxGeometry args={[
					mmToFeetDisplay(container.containerDepth),
					mmToFeetDisplay(container.containerHeight),
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
					mmToFeetDisplay(container.containerHeight) / 2,
					mmToFeetDisplay(container.containerWidth) / 2
				]}
			>

				<boxGeometry args={[
					mmToFeetDisplay(container.containerDepth),
					mmToFeetDisplay(container.containerHeight),
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
					mmToFeetDisplay(container.containerDepth) / 2,
					mmToFeetDisplay(container.containerHeight) / 2,
					0
				]}
			>

				<boxGeometry args={[
					0.05,
					mmToFeetDisplay(container.containerHeight),
					mmToFeetDisplay(container.containerWidth)
				]} />

				<primitive
					object={transparentMat}
					attach="material"
				/>

			</mesh>


			{/* FRONT */}

			<mesh
				position={[
					-mmToFeetDisplay(container.containerDepth) / 2,
					mmToFeetDisplay(container.containerHeight) / 2,
					0
				]}
			>

				<boxGeometry args={[
					0.2,
					mmToFeetDisplay(container.containerHeight),
					mmToFeetDisplay(container.containerWidth)
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


// Raw conversion — no rounding (rounding causes visible gaps at seams)
function ft(mm) {
  return mm * MM_TO_FEET;
}


// ── Helper: darken a hex colour for hover state ───────────────────────────────
function darkenColor(hex, amount = 40) {
	const clamp = (v) => Math.max(0, Math.min(255, v));
	const raw = hex.replace("#", "");
	const r = clamp(parseInt(raw.slice(0, 2), 16) - amount);
	const g = clamp(parseInt(raw.slice(2, 4), 16) - amount);
	const b = clamp(parseInt(raw.slice(4, 6), 16) - amount);
	return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function mmToFeet(value) { return value * MM_TO_FEET; } // removed Math.round
function mmToFeetDisplay(value) { return Math.round(value * MM_TO_FEET); } // only for labels

// ─── FIXED: correct axis mapping ─────────────────────────────────────────────

function Pallet({ pallet, container }) {
	const [hovered, setHovered] = useState(false);

	const pos = pallet.position;

	// Use effective dims written by the Python placement engine.
	// These already account for orientation (SIDE_FACING_LEFT swaps depth↔width).
	// Fall back to raw dimensions only if the JSON pre-dates this fix.
	const effWidth  = pos.effectiveWidth  > 0 ? pos.effectiveWidth  : pallet.dimensions.width;
	const effDepth  = pos.effectiveDepth  > 0 ? pos.effectiveDepth  : pallet.dimensions.depth;
	const effHeight = pos.effectiveHeight > 0 ? pos.effectiveHeight : pallet.dimensions.height;

	// ── Three.js world-space position ──────────────────────────────────────────
	// pos.x and pos.z are corner offsets (left-front = 0,0 in optimizer space).
	// Shift by half the effective footprint to get centre, then re-centre on
	// the container's midpoint.
	const threeX = ft(pos.z + effDepth  / 2 - container.internalDepth  / 2);  // ← z→X
	const threeZ = ft(pos.x + effWidth  / 2 - container.internalWidth  / 2);  // ← x→Z
	const threeY = ft(effHeight / 2); // floor is y=0, pallet centre is half its height

	const baseColor   = pallet.color || "#4CAF50";
	const activeColor = hovered ? darkenColor(baseColor, 45) : baseColor;

	return (
		<group>
		{/* ── Pallet box ───────────────────────────────────────────────────── */}
		<Box
			args={[
			ft(effWidth),   // x-axis  (left ↔ right)
			ft(effHeight),  // y-axis  (floor ↔ ceiling)
			ft(effDepth),   // z-axis  (door ↔ back)
			]}
			position={[threeX, threeY, threeZ]}
			castShadow
			onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
			onPointerOut={(e)  => { e.stopPropagation(); setHovered(false); }}
		>
			<meshStandardMaterial
			color={activeColor}
			transparent
			opacity={hovered ? 1.0 : 0.88}
			emissive={hovered ? activeColor : "#000000"}
			emissiveIntensity={hovered ? 0.15 : 0}
			/>
		</Box>

		{/* ── SKU label on top face ─────────────────────────────────────────── */}
		<Text
			position={[threeX, ft(effHeight) + 0.08, threeZ]}
			fontSize={0.35}
			color="white"
			anchorX="center"
			anchorY="middle"
			outlineWidth={0.02}
			outlineColor="#000000"
		>
			{pallet.label || pallet.skuId}
		</Text>

		{/* ── Hover tooltip ────────────────────────────────────────────────── */}
		{hovered && (
			<Html
			position={[threeX, ft(effHeight) + 6, threeZ]}
			center
			style={{ pointerEvents: "none" }}
			>
			<div style={{
				background: "white",
				border: "1px solid #e5e7eb",
				padding: "10px 12px",
				borderRadius: "8px",
				minWidth: "200px",
				boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
				fontSize: "12px",
				lineHeight: "1.6",
				color: "#111827",
			}}>
				{pallet.tooltip_html ? (
				<div dangerouslySetInnerHTML={{ __html: pallet.tooltip_html }} />
				) : (
				<>
					<div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>
					{pallet.label || pallet.skuId}
					</div>
					<div>SKU: {pallet.skuId}</div>
					<div>Shipment: {pallet.shipmentId}</div>
					<div>
					Dims (W×D×H): {pallet.dimensions.width}×{pallet.dimensions.depth}×{pallet.dimensions.height} mm
					</div>
					{pallet.weightIn_kg > 0 && (
					<div>Weight: {pallet.weightIn_kg} kg</div>
					)}
					<div style={{ marginTop: 4, color: "#6b7280", fontSize: 11 }}>
					Pos: x={pos.x}, z={pos.z} | {pos.orientation}
					</div>
				</>
				)}
			</div>
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
						{mmToFeetDisplay(container.containerDepth)} ft
					</p>

					<p>
						Width:
						{mmToFeetDisplay(container.containerWidth)} ft
					</p>

					<p>
						Height:
						{mmToFeetDisplay(container.containerHeight)} ft
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

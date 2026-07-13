import React, { useState, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Box, Html, Text, Line } from "@react-three/drei";
import * as THREE from "three";

// =====================================================
// COORDINATE CONTRACT
// =====================================================
//
// Container walls / grid draw: long axis (depth) → Three.js X
// narrow axis (width) → Three.js Z
// height → Three.js Y
//
// Python optimizer stores:
// pos.z = depth offset from door (long axis)
// pos.x = width offset from left (narrow axis)
// pos.effectiveDepth = footprint on long axis
// pos.effectiveWidth = footprint on narrow axis
//
// Therefore in React:
// threeX = ft(pos.z + effDepth/2 − internalDepth/2) ← DEPTH → X
// threeZ = ft(pos.x + effWidth/2 − internalWidth/2) ← WIDTH → Z
// Box args = [ ft(effDepth), ft(effHeight), ft(effWidth) ]
// X-size Y-size Z-size

// =====================================================
// HELPERS
// =====================================================

const MM_TO_FEET = 0.00328084;

function ft(mm) { return mm * MM_TO_FEET; } // raw — no rounding, use for all geometry

function mmToFeetDisplay(value) { return Math.round(value * MM_TO_FEET); } // labels only

function darkenColor(hex, amount = 45) {
	const clamp = (v) => Math.max(0, Math.min(255, v));
	const raw = hex.replace("#", "");
	const r = clamp(parseInt(raw.slice(0, 2), 16) - amount);
	const g = clamp(parseInt(raw.slice(2, 4), 16) - amount);
	const b = clamp(parseInt(raw.slice(4, 6), 16) - amount);
	return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
}

// =====================================================
// READ JSON FROM LOCALSTORAGE
// =====================================================

function getPayloadFromUrl() {
	const rawData = localStorage.getItem("res");
	if (!rawData) {
		return {
			containerDepth: 12191, containerWidth: 2438, containerHeight: 2591,
			internalDepth: 11836, internalWidth: 2352, internalHeight: 2391,
			pallets: [{
				candidatePalletId: "P1", shipmentId: "S1", skuId: "SKU001",
				originLocationId: "A", destinationLocationId: "B",
				estimatedDeliveryDate: "2026-01-01",
				dimensions: { depth: 1219, width: 1016, height: 1622 },
				position: { x: 0, y: 0, z: 0, orientation: "FRONT_FACING",
					effectiveWidth: 1016, effectiveDepth: 1219, effectiveHeight: 1622 },
				label: "SKU001", color: "#4CAF50", weightIn_kg: 500,
			}],
		};
	}
	return JSON.parse(rawData);
}

// =====================================================
// MEASUREMENT SCALES
// =====================================================

function MeasurementScales({ container }) {
	const elements = [];
	const halfD = mmToFeetDisplay(container.containerDepth) / 2;
	const halfW = mmToFeetDisplay(container.containerWidth) / 2;

	// Depth scale (along X axis, front and back edges)
	for (let i = 0; i <= mmToFeetDisplay(container.containerDepth); i++) {
		const x = i - halfD;
		elements.push(
			<Line key={`fl-${i}`} points={[[x,0,halfW+0.2],[x,0,halfW+0.5]]} color="black" />,
			<Line key={`bl-${i}`} points={[[x,0,-halfW-0.2],[x,0,-halfW-0.5]]} color="black" />,
		);
		if (i % 5 === 0) {
			elements.push(
				<Text key={`ft-${i}`} position={[x,0,halfW+1]} rotation={[-Math.PI/2,0,0]}
					fontSize={0.35} color="black" anchorX="center" anchorY="middle">{i} ft</Text>,
				<Text key={`bt-${i}`} position={[x,0,-halfW-1]} rotation={[-Math.PI/2,0,0]}
					fontSize={0.35} color="black" anchorX="center" anchorY="middle">{i} ft</Text>,
			);
		}
	}

	// Width scale (along Z axis, left and right edges)
	for (let i = 0; i <= mmToFeetDisplay(container.containerWidth); i++) {
		const z = i - halfW;
		elements.push(
			<Line key={`ll-${i}`} points={[[-halfD-0.2,0,z],[-halfD-0.5,0,z]]} color="black" />,
			<Line key={`rl-${i}`} points={[[halfD+0.2,0,z],[halfD+0.5,0,z]]} color="black" />,
			<Text key={`lt-${i}`} position={[-halfD-1.2,0,z]} rotation={[-Math.PI/2,0,0]}
				fontSize={0.35} color="black" anchorX="center" anchorY="middle">{i} ft</Text>,
			<Text key={`rt-${i}`} position={[halfD+1.2,0,z]} rotation={[-Math.PI/2,0,0]}
				fontSize={0.35} color="black" anchorX="center" anchorY="middle">{i} ft</Text>,
		);
	}
	return <>{elements}</>;
}

// =====================================================
// FLOOR GRID
// =====================================================

function FloorGrid({ container }) {
	const tiles = [];
	const dFt = mmToFeetDisplay(container.containerDepth);
	const wFt = mmToFeetDisplay(container.containerWidth);
	for (let x = 0; x < dFt; x++) {
		for (let z = 0; z < wFt; z++) {
			tiles.push(
				<mesh key={`${x}-${z}`} position={[x - dFt/2 + 0.5, -0.01, z - wFt/2 + 0.5]}>
					<boxGeometry args={[1, 0.02, 1]} />
					<meshStandardMaterial color={(x+z)%2===0 ? "#1e293b" : "#334155"} />
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
	const hD = mmToFeetDisplay(container.containerDepth) / 2;
	const hW = mmToFeetDisplay(container.containerWidth) / 2;
	const H = mmToFeetDisplay(container.containerHeight);

	const bottom = [
		[-hD,0,-hW],[hD,0,-hW],[hD,0,hW],[-hD,0,hW],[-hD,0,-hW],
	];
	const top = [
		[-hD,H,-hW],[hD,H,-hW],[hD,H,hW],[-hD,H,hW],[-hD,H,-hW],
	];
	const verticals = [[-hD,-hW],[hD,-hW],[hD,hW],[-hD,hW]];

	return (
		<>
			<Line points={bottom} color="#38bdf8" lineWidth={1} />
			<Line points={top} color="#38bdf8" lineWidth={1} />
			{verticals.map(([px,pz],i) => (
				<Line key={i} points={[[px,0,pz],[px,H,pz]]} color="#38bdf8" />
			))}
		</>
	);
}

// =====================================================
// CONTAINER WALLS
// =====================================================

function ContainerWalls({ container }) {
	const hD = ft(container.containerDepth) / 2;
	const hW = ft(container.containerWidth) / 2;
	const H = ft(container.containerHeight);
	const hH = H / 2;

	const glassMat = new THREE.MeshPhysicalMaterial({
		color: "#bfdbfe", transparent: true, opacity: 0.12,
		depthWrite: false, side: THREE.DoubleSide,
	});

	return (
		<>
			{/* front wall (door side, solid) */}
			<mesh position={[-hD, hH, 0]}>
				<boxGeometry args={[0.2, H, ft(container.containerWidth)]} />
				<meshStandardMaterial color="#111827" />
			</mesh>
			{/* back wall */}
			<mesh position={[hD, hH, 0]}>
				<boxGeometry args={[0.05, H, ft(container.containerWidth)]} />
				<primitive object={glassMat} attach="material" />
			</mesh>
			{/* left wall */}
			<mesh position={[0, hH, -hW]}>
				<boxGeometry args={[ft(container.containerDepth), H, 0.05]} />
				<primitive object={glassMat} attach="material" />
			</mesh>
			{/* right wall */}
			<mesh position={[0, hH, hW]}>
				<boxGeometry args={[ft(container.containerDepth), H, 0.05]} />
				<primitive object={glassMat} attach="material" />
			</mesh>
		</>
	);
}

// =====================================================
// PALLET — CORRECTED AXIS MAPPING
// =====================================================

function Pallet({ pallet, container, isSelected, onSelect }) {
	const [hovered, setHovered] = useState(false);
	const pos = pallet.position;

	// Use effective dims from Python (accounts for orientation swap).
	// Fallback to raw dims if JSON is old.
	const effWidth = (pos.effectiveWidth > 0) ? pos.effectiveWidth : pallet.dimensions.width;
	const effDepth = (pos.effectiveDepth > 0) ? pos.effectiveDepth : pallet.dimensions.depth;
	const effHeight = (pos.effectiveHeight > 0) ? pos.effectiveHeight : pallet.dimensions.height;

	// DEPTH → X (long axis of container is Three.js X)
	const threeX = ft(pos.z + effDepth / 2 - container.internalDepth / 2);
	// WIDTH → Z (narrow axis of container is Three.js Z)
	const threeZ = ft(pos.x + effWidth / 2 - container.internalWidth / 2);
	// HEIGHT → Y (floor = 0)
	const threeY = ft(effHeight / 2);

	const baseColor = pallet.color || "#4CAF50";
	const activeColor = (hovered || isSelected) ? darkenColor(baseColor) : baseColor;

	return (
		<group>
			<Box
				args={[ft(effDepth), ft(effHeight), ft(effWidth)]}
				position={[threeX, threeY, threeZ]}
				castShadow
				onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
				onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
				onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
			>
				<meshStandardMaterial
					color={activeColor}
					transparent
					opacity={hovered || isSelected ? 1.0 : 0.88}
					emissive={isSelected ? "#1d9e75" : (hovered ? activeColor : "#000000")}
					emissiveIntensity={isSelected ? 0.35 : (hovered ? 0.18 : 0)}
				/>
			</Box>

			<Text
				position={[threeX, ft(effHeight) + 0.08, threeZ]}
				fontSize={0.35} color="white"
				anchorX="center" anchorY="middle"
				outlineWidth={0.02} outlineColor="#000000"
			>
				{pallet.label || pallet.skuId || "PLT"}
			</Text>

			{hovered && (
				<Html position={[threeX, ft(effHeight) + 1.4, threeZ]} center style={{ pointerEvents:"none" }}>
					<div style={{
						background:"white", border:"1px solid #e5e7eb", padding:"10px 12px",
						borderRadius:"8px", minWidth:"210px",
						boxShadow:"0 4px 12px rgba(0,0,0,0.25)",
						fontSize:"12px", lineHeight:"1.6", color:"#111827",
					}}>
						{pallet.tooltip_html
							? <div dangerouslySetInnerHTML={{ __html: pallet.tooltip_html }} />
							: <>
								<div style={{ fontWeight:600, marginBottom:4, fontSize:13 }}>
									{pallet.label || pallet.skuId}
								</div>
								<div>SKU: {pallet.skuId}</div>
								<div>Shipment: {pallet.shipmentId}</div>
								<div>W×D×H: {pallet.dimensions.width}×{pallet.dimensions.depth}×{pallet.dimensions.height} mm</div>
								{pallet.weightIn_kg > 0 && <div>Weight: {pallet.weightIn_kg} kg</div>}
								<div style={{ marginTop:4, color:"#6b7280", fontSize:11 }}>
									pos x={pos.x} z={pos.z} | {pos.orientation}
								</div>
								</>
						}
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
		<group position={[22, 0, 6]}>
			<Line points={[[0,0,0],[3,0,0]]} color="red" />
			<Line points={[[0,0,0],[0,3,0]]} color="green" />
			<Line points={[[0,0,0],[0,0,3]]} color="blue" />
			<Text position={[3.4,0,0]} fontSize={0.4}>X (depth)</Text>
			<Text position={[0,3.4,0]} fontSize={0.4}>Y (height)</Text>
			<Text position={[0,0,3.4]} fontSize={0.4}>Z (width)</Text>
		</group>
	);
}

// =====================================================
// CAMERA CONTROLLER
// =====================================================

function CameraController({ viewMode }) {
	const { camera } = useThree();
	useMemo(() => {
		if (viewMode === "top") camera.position.set(0, 60, 0.1);
		else if (viewMode === "side") camera.position.set(60, 10, 0);
		else if (viewMode === "front") camera.position.set(0, 10, 30);
		else camera.position.set(30, 20, 20);
	}, [viewMode, camera]);
	return null;
}

// =====================================================
// MAIN APP
// =====================================================

import PalletDetailPanel from "../../components/visualization/PalletDetailPanel";


export default function ContainerSimulator({key, payload}) {
	const container = payload;
	const pallets = payload.pallets || [];

	const [viewMode, setViewMode] = useState("iso");
	const [selectedPalletId, setSelectedPalletId] = useState(null);
	const [showBoundary, setShowBoundary] = useState(true);
	const [showGrid, setShowGrid] = useState(true);

	const totalWeight = pallets.reduce((a, b) => a + (b.weightIn_kg || b.weight || 0), 0);


	const skuLegend = useMemo(() => {

		const legend = new Map();

		pallets.forEach((pallet) => {

			const sku =
				pallet.skuId || pallet.label;

			if (!legend.has(sku)) {

				legend.set(sku, {
					skuId: sku,
					label: pallet.label || sku,
					color: pallet.color || "#4CAF50"
				});

			}

		});

		return Array.from(legend.values());

	}, [pallets]);


	return (
		<div style={{ display:"flex", flexDirection:"column", width:"100%", height:"100vh", background:"#e5e7eb" }}>

		<div style={{ display:"flex", flex: "1 1 60%", minHeight: 0 }}>

			{/* ── 3D CANVAS ── */}
			<div style={{ flex: 1 }}>
				<Canvas shadows camera={{ position:[30,20,15], fov:50 }}>
					<ambientLight intensity={0.8} />
					<directionalLight position={[20,30,10]} intensity={1.5} castShadow />
					<OrbitControls />
					<CameraController viewMode={viewMode} />

					{showGrid && <FloorGrid container={container} />}
					<ContainerWalls container={container} />
					{showBoundary && <BoundaryBox container={container} />}

					{pallets.map((pallet, idx) => (
						<Pallet
							key={pallet.candidatePalletId || idx}
							pallet={pallet}
							container={container}
							isSelected={pallet.candidatePalletId === selectedPalletId}
							onSelect={() => setSelectedPalletId(pallet.candidatePalletId)}
						/>
					))}

					<MeasurementScales container={container} />
					<AxisHelper />
				</Canvas>
			</div>


			{/* ── RIGHT PANEL ── */}
			<div style={{
				width:"280px", background:"#ffffff", color:"#000000",
				padding:"20px", overflowY:"auto", flexShrink:0,
			}}>
				<h2 style={{ margin:"0 0 12px" }}>Container Details</h2>
				<hr style={{ borderColor:"#374151" }} />

				<h3 style={{ marginBottom:6 }}>Dimensions</h3>
				<p style={{ margin:"2px 0" }}>Length: {mmToFeetDisplay(container.containerDepth)} ft</p>
				<p style={{ margin:"2px 0" }}>Width: {mmToFeetDisplay(container.containerWidth)} ft</p>
				<p style={{ margin:"2px 0" }}>Height: {mmToFeetDisplay(container.containerHeight)} ft</p>

				<hr style={{ borderColor:"#374151", margin:"12px 0" }} />

				<h3 style={{ marginBottom:6 }}>Camera</h3>
				{["iso","top","side","front"].map(v => (
					<button key={v} onClick={() => setViewMode(v)}
						style={{
							marginRight:6, marginBottom:6, padding:"4px 10px",
							background: viewMode===v ? "#3b82f6" : "#374151",
							color:"white", border:"none", borderRadius:4, cursor:"pointer",
							textTransform:"capitalize",
						}}>
						{v}
					</button>
				))}

				<hr style={{ borderColor:"#374151", margin:"12px 0" }} />

				<h3 style={{ marginBottom:6 }}>Display</h3>
				<label style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
					<input type="checkbox" checked={showBoundary}
						onChange={() => setShowBoundary(!showBoundary)} />
					Boundary box
				</label>
				<label style={{ display:"flex", alignItems:"center", gap:8 }}>
					<input type="checkbox" checked={showGrid}
						onChange={() => setShowGrid(!showGrid)} />
					Floor grid
				</label>

				<hr style={{ borderColor:"#374151", margin:"12px 0" }} />

				<h3 style={{ marginBottom: 6 }}>Legend</h3>
				<div
					style={{
						maxHeight: 200,
						overflowY: "auto"
					}}
				>

					{skuLegend.map((item) => (

						<div
							key={item.skuId}
							style={{
								display: "flex",
								alignItems: "center",
								marginBottom: 6
							}}
						>

							<div
								style={{
									width: 16,
									height: 16,
									background: item.color,
									borderRadius: 2,
									marginRight: 8,
									flexShrink: 0
								}}
							/>

							<span
								style={{
									fontSize: 12
								}}
							>
								{item.label}
							</span>

						</div>

					))}

				</div>

				<hr style={{ borderColor:"#374151", margin:"12px 0" }} />

				<h3 style={{ marginBottom:6 }}>Load Summary</h3>
				<p style={{ margin:"2px 0" }}>Total pallets: {pallets.length}</p>
				<p style={{ margin:"2px 0" }}>Total weight: {totalWeight.toFixed(1)} kg</p>
				{container.utilization && <>
					<p style={{ margin:"2px 0" }}>
						Weight util: {container.utilization.weightUtilization_pct?.toFixed(1)}%
					</p>
					<p style={{ margin:"2px 0" }}>
						Volume util: {container.utilization.volumeUtilization_pct?.toFixed(1)}%
					</p>
				</>}
			</div>
		</div>

			{/* ── BOTTOM: PALLET DETAIL PANEL ── */}
			<div style={{ flex: "1 1 40%", minHeight: 0, overflowY: "auto" }}>
				<PalletDetailPanel
					payload={container}
					selectedPalletId={selectedPalletId}
					onSelectPallet={setSelectedPalletId}
				/>
			</div>
		</div>
	);
}

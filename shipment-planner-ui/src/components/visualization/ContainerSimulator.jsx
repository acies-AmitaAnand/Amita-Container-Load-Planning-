import React, { useState, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Box, Html, Text, Line } from "@react-three/drei";
import MetricsPanel from "../../components/visualization/MetricsPanel";
import { calculateMetrics, extractMetrics } from "../../components/visualization/utils/calculateMetrics";
import * as THREE from "three";

// =====================================================
// READ JSON FROM URL
// =====================================================

function getPayloadFromUrl() {
  const rawData = localStorage.getItem(`res`);
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
          palletId: "P1",
          position: { x: 0, y: 0, z: 1000 },
          dimensions: { depth: 1200, width: 1000, height: 1500 },
          weight: 200,
        },
      ],
    };
  }
  return JSON.parse(rawData);
}

// Display helper — only for label text, never for geometry
function mmToFeetDisplay(mm) {
  return (mm * 0.00328084).toFixed(1);
}

// =====================================================
// MEASUREMENT SCALES
// =====================================================

function MeasurementScales({ container }) {
  const elements = [];
  const D = container.containerDepth;
  const W = container.containerWidth;
  // ponytail: tick every 610mm (≈2ft). Upgrade to prop if spacing needs to be configurable.
  const tickStep = 610;

  for (let mm = 0; mm <= (D+tickStep); mm += tickStep) {
    const x = mm - D / 2;
    elements.push(
      <Line key={`fl-${mm}`} points={[[x, 0, W / 2 + 60], [x, 0, W / 2 + 150]]} color="black" />,
      <Line key={`bl-${mm}`} points={[[x, 0, -W / 2 - 60], [x, 0, -W / 2 - 150]]} color="black" />
    );
    // label every ticks
    // if ((mm / tickStep) % 1 === 0) {
	const label = `${mmToFeetDisplay(mm)} ft`;
	elements.push(
	<Text key={`ft-${mm}`} position={[x, 0, W / 2 + 300]} rotation={[-Math.PI / 2, 0, 0]} fontSize={120} color="black" anchorX="center" anchorY="middle">{label}</Text>,
	<Text key={`bt-${mm}`} position={[x, 0, -W / 2 - 300]} rotation={[-Math.PI / 2, 0, 0]} fontSize={120} color="black" anchorX="center" anchorY="middle">{label}</Text>
	);
  }

  for (let mm = 0; mm <= (W+tickStep); mm += tickStep) {
    const z = mm - W / 2;
    elements.push(
      <Line key={`ll-${mm}`} points={[[-D / 2 - 60, 0, z], [-D / 2 - 150, 0, z]]} color="black" />,
      <Line key={`rl-${mm}`} points={[[D / 2 + 60, 0, z], [D / 2 + 150, 0, z]]} color="black" />
    );
    const label = `${mmToFeetDisplay(mm)} ft`;
    elements.push(
      <Text key={`lt-${mm}`} position={[-D / 2 - 400, 0, z]} rotation={[-Math.PI / 2, 0, 0]} fontSize={120} color="black" anchorX="center" anchorY="middle">{label}</Text>,
      <Text key={`rt-${mm}`} position={[D / 2 + 400, 0, z]} rotation={[-Math.PI / 2, 0, 0]} fontSize={120} color="black" anchorX="center" anchorY="middle">{label}</Text>
    );
  }

  return <>{elements}</>;
}

// =====================================================
// FLOOR GRID
// =====================================================

function FloorGrid({ container }) {
  const D = container.containerDepth;
  const W = container.containerWidth;
  // ponytail: 610mm tiles. At very large containers this is many meshes; upgrade to a shader grid if perf degrades.
  const tileSize = 610;
  const cols = Math.ceil(D / tileSize);
  const rows = Math.ceil(W / tileSize);
  const tiles = [];

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      tiles.push(
        <mesh key={`${c}-${r}`} position={[c * tileSize - D / 2 + tileSize / 2, -10, r * tileSize - W / 2 + tileSize / 2]}>
          <boxGeometry args={[tileSize, 20, tileSize]} />
          <meshStandardMaterial color={(c + r) % 2 === 0 ? "#1e293b" : "#334155"} />
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
  const D = container.containerDepth;
  const W = container.containerWidth;
  const H = container.containerHeight;

  const bottom = [
    [-D/2, 0, -W/2], [D/2, 0, -W/2], [D/2, 0, W/2], [-D/2, 0, W/2], [-D/2, 0, -W/2],
  ];
  const top = [
    [-D/2, H, -W/2], [D/2, H, -W/2], [D/2, H, W/2], [-D/2, H, W/2], [-D/2, H, -W/2],
  ];
  const verticals = [
    [[-D/2, 0, -W/2], [-D/2, H, -W/2]],
    [[D/2,  0, -W/2], [D/2,  H, -W/2]],
    [[D/2,  0,  W/2], [D/2,  H,  W/2]],
    [[-D/2, 0,  W/2], [-D/2, H,  W/2]],
  ];

  return (
    <>
      <Line points={bottom} color="#38bdf8" lineWidth={1} />
      <Line points={top} color="#38bdf8" lineWidth={1} />
      {verticals.map((pts, i) => <Line key={i} points={pts} color="#38bdf8" />)}
    </>
  );
}

// =====================================================
// CONTAINER WALLS
// =====================================================

function ContainerWalls({ container }) {
  const D = container.containerDepth;
  const W = container.containerWidth;
  const H = container.containerHeight;

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: "#bfdbfe", transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide,
  });

  return (
    <>
      {/* left wall */}
      <mesh position={[0, H / 2, -W / 2]}>
        <boxGeometry args={[D, H, 20]} />
        <primitive object={glassMat} attach="material" />
      </mesh>
      {/* right wall */}
      <mesh position={[0, H / 2, W / 2]}>
        <boxGeometry args={[D, H, 20]} />
        <primitive object={glassMat} attach="material" />
      </mesh>
      {/* back wall */}
      <mesh position={[D / 2, H / 2, 0]}>
        <boxGeometry args={[20, H, W]} />
        <primitive object={glassMat} attach="material" />
      </mesh>
      {/* front door post (opaque) */}
      <mesh position={[-D / 2, H / 2, 0]}>
        <boxGeometry args={[60, H, W]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
    </>
  );
}

// =====================================================
// PALLET
// =====================================================

function darkenColor(hex, amount = 40) {
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const raw = hex.replace("#", "");
  const r = clamp(parseInt(raw.slice(0, 2), 16) - amount);
  const g = clamp(parseInt(raw.slice(2, 4), 16) - amount);
  const b = clamp(parseInt(raw.slice(4, 6), 16) - amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function Pallet({ pallet, container }) {
  const [hovered, setHovered] = useState(false);
  const pos = pallet.position;

  const effWidth  = pos.effectiveWidth  > 0 ? pos.effectiveWidth  : pallet.dimensions.width;
  const effDepth  = pos.effectiveDepth  > 0 ? pos.effectiveDepth  : pallet.dimensions.depth;
  const effHeight = pos.effectiveHeight > 0 ? pos.effectiveHeight : pallet.dimensions.height;

  // pos.x / pos.z are corner offsets in mm (same unit as container.internal*).
  // Box is centre-anchored, so shift by half the pallet footprint, then re-centre on container.
  const threeX = pos.z + effDepth  / 2 - container.internalDepth  / 2;
  const threeZ = pos.x + effWidth  / 2 - container.internalWidth  / 2;
  const threeY = effHeight / 2; // floor = y:0, centre = half height

  const baseColor   = pallet.color || "#4CAF50";
  const activeColor = hovered ? darkenColor(baseColor, 45) : baseColor;

  return (
    <group>
      <Box
        args={[effDepth, effHeight, effWidth]}
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

      <Text position={[threeX, effHeight + 30, threeZ]} fontSize={120} color="white" anchorX="center" anchorY="middle" outlineWidth={8} outlineColor="#000000">
        {pallet.label || pallet.skuId}
      </Text>

      {hovered && (
        <Html position={[threeX, effHeight + 1800, threeZ]} center style={{ pointerEvents: "none" }}>
          <div style={{ background: "white", border: "1px solid #e5e7eb", padding: "10px 12px", borderRadius: "8px", minWidth: "200px", boxShadow: "0 4px 12px rgba(0,0,0,0.25)", fontSize: "12px", lineHeight: "1.6", color: "#111827" }}>
            {pallet.tooltip_html ? (
              <div dangerouslySetInnerHTML={{ __html: pallet.tooltip_html }} />
            ) : (
              <>
                <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>{pallet.label || pallet.skuId}</div>
                <div>SKU: {pallet.skuId}</div>
                <div>Shipment: {pallet.shipmentId}</div>
                <div>Dims (W×D×H): {pallet.dimensions.width}×{pallet.dimensions.depth}×{pallet.dimensions.height} mm</div>
                {pallet.weightIn_kg > 0 && <div>Weight: {pallet.weightIn_kg} kg</div>}
                <div style={{ marginTop: 4, color: "#6b7280", fontSize: 11 }}>Pos: x={pos.x}, z={pos.z} | {pos.orientation}</div>
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

function AxisHelper({ container }) {
  // place axis outside the container corner
  const ox = -container.containerDepth / 2;
  const oz = container.containerWidth / 2;
  const len = 2000; // 2 m arms

  return (
    <group position={[ox-500, -500, oz]}>
      <Line points={[[0,0,0],[len,0,0]]} color="red" />
      <Line points={[[0,0,0],[0,len,0]]} color="green" />
      <Line points={[[0,0,0],[0,0,len]]} color="blue" />
      <Text position={[len+200,0,0]} color='black' fontSize={200}>Depth (X)</Text>
      <Text position={[0,len+200,0]} color='black' fontSize={200}>Height (Y)</Text>
      <Text position={[0,0,len+200]} color='black' fontSize={200}>Width (Z)</Text>
    </group>
  );
}

// =====================================================
// CAMERA CONTROLLER
// =====================================================

function CameraController({ viewMode, container }) {
  const { camera } = useThree();
  const D = container.containerDepth;
  const W = container.containerWidth;
  const H = container.containerHeight;

  useMemo(() => {
    if (viewMode === "top")  camera.position.set(0, D * 1.5, 1);
    else if (viewMode === "side") camera.position.set(0, D*0.5,  D*1.2);
    else camera.position.set(D * 0.8, H * 1.2, W * 1.2); // iso
  }, [viewMode, camera, D, W, H]);

  return null;
}

// =====================================================
// MAIN APP
// =====================================================

export default function ContainerSimulator() {
  const payload   = getPayloadFromUrl();
  const container = payload;
  const pallets   = payload.pallets || [];

  const [viewMode,      setViewMode]      = useState("iso");
  const [showBoundary,  setShowBoundary]  = useState(true);
  const [showGrid,      setShowGrid]      = useState(true);

  const totalWeight = pallets.reduce((a, b) => a + (b.weight || 0), 0);
  const metrics = extractMetrics(container);
  // Camera sits back far enough to see the whole container in mm-space
  const camDist = container.containerDepth;

  return (
    <div style={{ display: "flex", width: "75vw", height: "100vh", background: "#e5e7eb" }}>

      {/* 3-D VIEWPORT */}
      <div style={{ flex: 1 }}>
        <Canvas shadows camera={{ position: [camDist * 0.8, camDist * 0.5, camDist * 0.8], fov: 50, near: 1, far: camDist * 10 }}>
          <ambientLight intensity={1} />
          <directionalLight position={[camDist, camDist, camDist]} intensity={1.5} castShadow />
          <OrbitControls />
          <CameraController viewMode={viewMode} container={container} />
          {showGrid    && <FloorGrid      container={container} />}
          {showBoundary && <BoundaryBox   container={container} />}
          <ContainerWalls container={container} />
          {pallets.map((pallet, idx) => <Pallet key={idx} pallet={pallet} container={container} />)}
          <MeasurementScales container={container} />
          <AxisHelper container={container} />
        </Canvas>
      </div>

      {/* SIDE PANEL */}
      <div style={{ width: "25vh", background: "#111827", color: "white", padding: "20px", overflowY: "auto" }}>
        <h2>Container Details</h2>
        <hr />

        <div>
          <h3>Container Dimensions</h3>
          <p>Length: {mmToFeetDisplay(container.containerDepth)} ft</p>
          <p>Width:  {mmToFeetDisplay(container.containerWidth)} ft</p>
          <p>Height: {mmToFeetDisplay(container.containerHeight)} ft</p>
        </div>
        <hr />

        <div>
          <h3>Camera Views</h3>
          <button onClick={() => setViewMode("side")}>Side View</button>
          <button onClick={() => setViewMode("top")} style={{ marginLeft: "10px" }}>Top View</button>
          <button onClick={() => setViewMode("iso")} style={{ marginLeft: "10px" }}>ISO View</button>
        </div>
        <hr />

        <div>
          <h3>Display Options</h3>
          <label><input type="checkbox" checked={showBoundary} onChange={() => setShowBoundary(!showBoundary)} /> Show Boundary Box</label>
          <br />
          <label><input type="checkbox" checked={showGrid}     onChange={() => setShowGrid(!showGrid)}         /> Show Grid</label>
        </div>
        <hr />

        <div>
          <h3>Legend (Pallets)</h3>
          {pallets.map((p, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ width: "20px", height: "20px", background: p.color, marginRight: "10px" }} />
              {p.label}
            </div>
          ))}
        </div>
        <hr />

        <div>
          <h3>Load Summary</h3>
          <p>Total Pallets: {pallets.length}</p>
          <p>Total Weight: {totalWeight} lbs</p>
        </div>

        <MetricsPanel metrics={metrics} />
      </div>
    </div>
  );
}
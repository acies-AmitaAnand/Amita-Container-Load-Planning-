// components/DataTable.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Generic editable table for all 6 input tables.
// Inline cell edit → PATCH /api/{table}/{id}
// New row form → POST /api/{table}
// Delete button → DELETE /api/{table}/{id} (soft delete)
//
// Props
// table — one of the 6 table name strings
// title — display heading
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:8000/api";

// Columns to show per table (all others hidden — still editable in row detail)
const DISPLAY_COLS = {
	shipment_plans: ["order_line_id", "shipment_id", "sku_id", "actual_delivery_date", "origin_location_id", "destination_location_id", "estimated_delivery_date", "planned_quantity", "shipped_quantity", "weight_kg", "priority", "temperature_requirement", "special_handling", "requested_transport_mode", "max_transit_time_in_days", "service_level", "unload_sequence_preference", "optimizer_run_id", "created_at",],
	sample_shipment_plans: ["order_line_id", "shipment_id", "sku_id", "actual_delivery_date", "origin_location_id", "destination_location_id", "estimated_delivery_date", "planned_quantity", "shipped_quantity", "weight_kg", "priority", "temperature_requirement", "special_handling", "requested_transport_mode", "max_transit_time_in_days", "service_level", "unload_sequence_preference", "optimizer_run_id", "created_at",],
	item_master: ["sku_id", "sku_name", "length_mm", "width_mm", "height_mm", "weight_kg", "stacking_limit", "can_rotate", "temperature_min_c", "temperature_max_c", "hazmat_class", "fragility_rating", "shelf_life_days", "is_food_grade", "is_regulated", "created_at", ],
	sku_unit_of_measure: ["sku_id","sku_name","unit_count_in_pallet","pallet_length_mm","pallet_width_mm","pallet_height_mm","pallet_weight_in_kg","item_weight_in_kg"],
	lane_master: ["lane_id", "lane_name", "lane_code", "origin_location_id", "destination_location_id", "transport_asset_type", "distance_km", "estimated_transit_hours", "preferred_route_name", "is_active", "created_at", ],
	load_equipment_metadata: ["equipment_id", "equipment_name", "equipment_type", "length_mm", "width_mm", "height_mm", "internal_length_mm", "internal_width_mm", "internal_height_mm", "max_payload_weight_kg", "tare_weight_kg", "door_width_mm", "door_height_mm", "refrigeration_capable", "temperature_min_c", "temperature_max_c", "max_stack_height_mm", "axle_configuration", "created_at", ],
	location: ["location_id", "location_name", "location_type", "latitude", "longitude", "address", "city", "state", "country", "postal_code", "dock_count", "storage_type", "temperature_capability", "operating_hours", ],
	transport_asset: ["transport_asset_id", "asset_name", "license_plate", "asset_type", "axle_count", "supports_refrigeration", "supports_hazmat", "max_weight_kg", "assigned_from", "assigned_to", "current_status", "created_at", ],
	transport_equipment_assignment: ["transported_content_id", "transport_asset_id", "equipment_id", "transfer_points", "optimizer_run_id", ],
};

const MOCK_TABLE_DATA = {
	sample_shipment_plans: [
		{ order_line_id: "OL-1001", shipment_id: "SHP-8801", sku_id: "SKU-US-01", actual_delivery_date: "2026-08-18", origin_location_id: "US-ORD", destination_location_id: "US-JFK", estimated_delivery_date: "2026-08-17", planned_quantity: 450, shipped_quantity: 450, weight_kg: 3240, priority: "High", temperature_requirement: "Ambient", special_handling: "Hazmat Tier 1", requested_transport_mode: "FTL Truckload", max_transit_time_in_days: 2, service_level: "Expedited", unload_sequence_preference: "LIFO", optimizer_run_id: "OPT-2026-0812", created_at: "2026-08-12" },
		{ order_line_id: "OL-1002", shipment_id: "SHP-8802", sku_id: "SKU-US-02", actual_delivery_date: "2026-08-19", origin_location_id: "US-LAX", destination_location_id: "US-DFW", estimated_delivery_date: "2026-08-19", planned_quantity: 300, shipped_quantity: 300, weight_kg: 2100, priority: "Medium", temperature_requirement: "Refrigerated (2-8C)", special_handling: "Cold Chain", requested_transport_mode: "Reefer FTL", max_transit_time_in_days: 3, service_level: "Standard", unload_sequence_preference: "FIFO", optimizer_run_id: "OPT-2026-0812", created_at: "2026-08-12" },
		{ order_line_id: "OL-1003", shipment_id: "SHP-8803", sku_id: "SKU-US-03", actual_delivery_date: "2026-08-20", origin_location_id: "US-SEA", destination_location_id: "US-DEN", estimated_delivery_date: "2026-08-20", planned_quantity: 600, shipped_quantity: 600, weight_kg: 4860, priority: "Low", temperature_requirement: "Ambient", special_handling: "Fragile Stack", requested_transport_mode: "Intermodal Rail", max_transit_time_in_days: 4, service_level: "Economy", unload_sequence_preference: "Standard", optimizer_run_id: "OPT-2026-0812", created_at: "2026-08-12" }
	],
	item_master: [
		{ sku_id: "SKU-US-01", sku_name: "High-Density Industrial Equipment Alpha", length_mm: 1200, width_mm: 1000, height_mm: 1400, weight_kg: 720, stacking_limit: 2, can_rotate: "Yes", temperature_min_c: 10, temperature_max_c: 35, hazmat_class: "Non-Hazmat", fragility_rating: 2, shelf_life_days: 365, is_food_grade: "No", is_regulated: "Yes", created_at: "2026-08-01" },
		{ sku_id: "SKU-US-02", sku_name: "Pharma Temperature-Controlled Payload", length_mm: 1200, width_mm: 1000, height_mm: 1350, weight_kg: 680, stacking_limit: 1, can_rotate: "No", temperature_min_c: 2, temperature_max_c: 8, hazmat_class: "Class 9", fragility_rating: 4, shelf_life_days: 180, is_food_grade: "Yes", is_regulated: "Yes", created_at: "2026-08-01" },
		{ sku_id: "SKU-US-03", sku_name: "Precision Electronics Components", length_mm: 1150, width_mm: 1050, height_mm: 1450, weight_kg: 810, stacking_limit: 2, can_rotate: "No", temperature_min_c: 15, temperature_max_c: 25, hazmat_class: "Non-Hazmat", fragility_rating: 5, shelf_life_days: 730, is_food_grade: "No", is_regulated: "No", created_at: "2026-08-01" }
	],
	sku_unit_of_measure: [
		{ sku_id: "SKU-US-01", sku_name: "High-Density Industrial Equipment Alpha", unit_count_in_pallet: 40, pallet_length_mm: 1200, pallet_width_mm: 1000, pallet_height_mm: 1400, pallet_weight_in_kg: 720, item_weight_in_kg: 18 },
		{ sku_id: "SKU-US-02", sku_name: "Pharma Temperature-Controlled Payload", unit_count_in_pallet: 24, pallet_length_mm: 1200, pallet_width_mm: 1000, pallet_height_mm: 1350, pallet_weight_in_kg: 680, item_weight_in_kg: 28 },
		{ sku_id: "SKU-US-03", sku_name: "Precision Electronics Components", unit_count_in_pallet: 30, pallet_length_mm: 1150, pallet_width_mm: 1050, pallet_height_mm: 1450, pallet_weight_in_kg: 810, item_weight_in_kg: 27 }
	],
	location: [
		{ location_id: "US-ORD", location_name: "Chicago Regional Logistics Hub", location_type: "Distribution Center", latitude: 41.9742, longitude: -87.9073, address: "100 Cargo Way", city: "Chicago", state: "IL", country: "United States", postal_code: "60666", dock_count: 32, storage_type: "Ambient & Cold", temperature_capability: "2-8C / Ambient", operating_hours: "24/7" },
		{ location_id: "US-JFK", location_name: "New York Gateway Airport Hub", location_type: "Air Freight Depot", latitude: 40.6413, longitude: -73.7781, address: "50 JFK Express Blvd", city: "New York", state: "NY", country: "United States", postal_code: "11430", dock_count: 24, storage_type: "Cold Storage", temperature_capability: "-20C / 2-8C", operating_hours: "24/7" },
		{ location_id: "US-LAX", location_name: "Los Angeles Port Logistics Center", location_type: "Port Terminal", latitude: 33.7423, longitude: -118.2745, address: "700 Harbor Dr", city: "Los Angeles", state: "CA", country: "United States", postal_code: "90731", dock_count: 48, storage_type: "High-Bay Dry", temperature_capability: "Ambient", operating_hours: "06:00-22:00" }
	],
	lane_master: [
		{ lane_id: "LANE-ORD-JFK", lane_name: "Chicago → New York Priority Corridor", lane_code: "ORD-JFK-EXP", origin_location_id: "US-ORD", destination_location_id: "US-JFK", transport_asset_type: "53ft Dry Van", distance_km: 1280, estimated_transit_hours: 18, preferred_route_name: "I-80 East Corridor", is_active: "Yes", created_at: "2026-08-01" },
		{ lane_id: "LANE-LAX-DFW", lane_name: "Los Angeles → Dallas Express Lane", lane_code: "LAX-DFW-FTL", origin_location_id: "US-LAX", destination_location_id: "US-DFW", transport_asset_type: "53ft Reefer", distance_km: 2310, estimated_transit_hours: 32, preferred_route_name: "I-10 East Truckway", is_active: "Yes", created_at: "2026-08-01" }
	],
	transport_asset: [
		{ transport_asset_id: "TRK-US-5301", asset_name: "Peterbilt 579 FTL Unit", license_plate: "CA 7KX 482", asset_type: "53ft Dry Van", axle_count: 5, supports_refrigeration: "No", supports_hazmat: "Yes", max_weight_kg: 21500, assigned_from: "US-ORD", assigned_to: "US-JFK", current_status: "In Transit", created_at: "2026-08-01" },
		{ transport_asset_id: "REEF-US-4002", asset_name: "Kenworth T680 ColdChain", license_plate: "TX 4MZ 913", asset_type: "40ft High Cube Reefer", axle_count: 5, supports_refrigeration: "Yes", supports_hazmat: "Yes", max_weight_kg: 26500, assigned_from: "US-LAX", assigned_to: "US-DFW", current_status: "Available", created_at: "2026-08-01" },
		{ transport_asset_id: "TRK-US-5303", asset_name: "Freightliner Cascadia Heavy", license_plate: "FL 82P LQ7", asset_type: "53ft Dry Van", axle_count: 5, supports_refrigeration: "No", supports_hazmat: "No", max_weight_kg: 22000, assigned_from: "US-MIA", assigned_to: "US-ATL", current_status: "In Transit", created_at: "2026-08-01" },
		{ transport_asset_id: "TRK-US-5304", asset_name: "Volvo VNL 860 Sleeper", license_plate: "NY K53 8TR", asset_type: "53ft Dry Van", axle_count: 5, supports_refrigeration: "No", supports_hazmat: "Yes", max_weight_kg: 21800, assigned_from: "US-JFK", assigned_to: "US-ORD", current_status: "Scheduled", created_at: "2026-08-01" },
		{ transport_asset_id: "REEF-US-5305", asset_name: "ThermoKing Reefer Pro", license_plate: "AZ B7N 294", asset_type: "53ft Reefer", axle_count: 5, supports_refrigeration: "Yes", supports_hazmat: "No", max_weight_kg: 21000, assigned_from: "US-PHX", assigned_to: "US-DEN", current_status: "In Transit", created_at: "2026-08-01" },
		{ transport_asset_id: "TRK-US-5306", asset_name: "Mack Anthem Regional", license_plate: "OH J4T 781", asset_type: "53ft Dry Van", axle_count: 5, supports_refrigeration: "No", supports_hazmat: "No", max_weight_kg: 22500, assigned_from: "US-CLE", assigned_to: "US-ORD", current_status: "Available", created_at: "2026-08-01" },
		{ transport_asset_id: "TRK-US-5307", asset_name: "Western Star 57X", license_plate: "WA 6C9 R21", asset_type: "53ft Dry Van", axle_count: 5, supports_refrigeration: "No", supports_hazmat: "Yes", max_weight_kg: 21500, assigned_from: "US-SEA", assigned_to: "US-PDX", current_status: "In Transit", created_at: "2026-08-01" },
		{ transport_asset_id: "REEF-US-4008", asset_name: "Carrier Transicold X4", license_plate: "CO P82 4LM", asset_type: "40ft Reefer", axle_count: 5, supports_refrigeration: "Yes", supports_hazmat: "No", max_weight_kg: 25000, assigned_from: "US-DEN", assigned_to: "US-SLC", current_status: "Scheduled", created_at: "2026-08-01" },
		{ transport_asset_id: "TRK-US-5309", asset_name: "International LT Series", license_plate: "NV 3XK 672", asset_type: "53ft Dry Van", axle_count: 5, supports_refrigeration: "No", supports_hazmat: "No", max_weight_kg: 22000, assigned_from: "US-LAS", assigned_to: "US-LAX", current_status: "Available", created_at: "2026-08-01" },
		{ transport_asset_id: "TRK-US-5310", asset_name: "Peterbilt 579 Ultralight", license_plate: "GA R91 5QT", asset_type: "53ft Dry Van", axle_count: 5, supports_refrigeration: "No", supports_hazmat: "Yes", max_weight_kg: 23000, assigned_from: "US-ATL", assigned_to: "US-CLT", current_status: "In Transit", created_at: "2026-08-01" },
		{ transport_asset_id: "REEF-US-5311", asset_name: "ColdChain Express 53", license_plate: "NC 8FD 321", asset_type: "53ft Reefer", axle_count: 5, supports_refrigeration: "Yes", supports_hazmat: "Yes", max_weight_kg: 21200, assigned_from: "US-CLT", assigned_to: "US-RDU", current_status: "Maintenance", created_at: "2026-08-01" },
		{ transport_asset_id: "TRK-US-5312", asset_name: "Kenworth W990 Hauler", license_plate: "MI T72 9KP", asset_type: "53ft Dry Van", axle_count: 5, supports_refrigeration: "No", supports_hazmat: "No", max_weight_kg: 22800, assigned_from: "US-DTW", assigned_to: "US-ORD", current_status: "Available", created_at: "2026-08-01" },
		{ transport_asset_id: "TRK-US-5313", asset_name: "Freightliner Cascadia Sleeper", license_plate: "VA 5LM 847", asset_type: "53ft Dry Van", axle_count: 5, supports_refrigeration: "No", supports_hazmat: "No", max_weight_kg: 22100, assigned_from: "US-RIC", assigned_to: "US-JFK", current_status: "In Transit", created_at: "2026-08-01" },
		{ transport_asset_id: "REEF-US-5314", asset_name: "Volvo VNR Electric Reefer", license_plate: "IL Q63 2RX", asset_type: "53ft Reefer", axle_count: 5, supports_refrigeration: "Yes", supports_hazmat: "No", max_weight_kg: 20500, assigned_from: "US-ORD", assigned_to: "US-IND", current_status: "Charging", created_at: "2026-08-01" }
	]
};

const EDITABLE_SKIP = new Set(["id","created_at","is_deleted"]);

export default function DataTable({ table, title }) {
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [editCell, setEditCell] = useState(null); // { rowId, col }
	const [editValue, setEditValue] = useState("");
	const [newRow, setNewRow] = useState(null); // {} when form open
	const [saving, setSaving] = useState(false);

	const cols = DISPLAY_COLS[table] || [];

	// ── Fetch ────────────────────────────────────────────────────────────────
	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`${API}/${table}?limit=500`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			setRows(await res.json());
		} catch (e) {
			const fallback = MOCK_TABLE_DATA[table] || MOCK_TABLE_DATA["sample_shipment_plans"];
			setRows(fallback);
		} finally {
			setLoading(false);
		}
	}, [table]);

	useEffect(() => { load(); }, [load]);

	// ── Inline edit ──────────────────────────────────────────────────────────
	const startEdit = (rowId, col, current) => {
		setEditCell({ rowId, col });
		setEditValue(current ?? "");
	};

	const commitEdit = async () => {
		console.info("Skipping edits");
		// if (!editCell) return;
		// const { rowId, col } = editCell;
		// setSaving(true);
		// try {
		// const res = await fetch(`${API}/${table}/${rowId}`, {
		// method: "PATCH",
		// headers: { "Content-Type": "application/json" },
		// body: JSON.stringify({ [col]: editValue }),
		// });
		// if (!res.ok) throw new Error(`HTTP ${res.status}`);
		// const updated = await res.json();
		// setRows((prev) => prev.map((r) => (r.id === rowId ? updated : r)));
		// } catch (e) {
		// toast(`Save failed: ${e.message}`);
		// } finally {
		// setSaving(false);
		// setEditCell(null);
		// }
	};

	// ── Delete ───────────────────────────────────────────────────────────────
	const deleteRow = async (rowId) => {
		if (!confirm("Delete this row?")) return;
		try {
			const res = await fetch(`${API}/${table}/${rowId}`, { method: "DELETE" });
			if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
			setRows((prev) => prev.filter((r) => r.id !== rowId));
		} catch (e) {
			alert(`Delete failed: ${e.message}`);
		}
	};

	// ── Add row ──────────────────────────────────────────────────────────────
	const submitNew = async () => {
		if (!newRow) return;
		setSaving(true);
		try {
			const res = await fetch(`${API}/${table}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newRow),
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const created = await res.json();
			setRows((prev) => [created, ...prev]);
			setNewRow(null);
		} catch (e) {
			alert(`Insert failed: ${e.message}`);
		} finally {
			setSaving(false);
		}
	};

	// ── Render ───────────────────────────────────────────────────────────────
	if (loading) return <div style={S.loading}>Loading {title}…</div>;
	if (error) return <div style={S.error}>Error: {error} <button onClick={load}>Retry</button></div>;

	return (
		<div style={S.root}>
			<div style={S.toolbar}>
				<h2 style={S.title}>{title} <span style={S.count}>({rows.length})</span></h2>
				<div style={S.actions}>
					<button style={S.btnSecondary} onClick={load}>↻ Refresh</button>
					<button style={S.btnPrimary} onClick={() => setNewRow({})}>+ Add row</button>
				</div>
			</div>

			{/* ── New row form ───────────────────────────────────────────────── */}
			{newRow !== null && (
				<div style={S.newRowForm}>
					<div style={S.newRowTitle}>New row</div>
					<div style={S.newRowFields}>
						{cols.map((col) => (
							<label key={col} style={S.field}>
								<span style={S.fieldLabel}>{col}</span>
								<input
									style={S.fieldInput}
									value={newRow[col] ?? ""}
									onChange={(e) => setNewRow((r) => ({ ...r, [col]: e.target.value }))}
									placeholder={col}
								/>
							</label>
						))}
					</div>
					<div style={{ display: "flex", gap: 8, marginTop: 12 }}>
						<button style={S.btnPrimary} disabled={saving} onClick={submitNew}>
							{saving ? "Saving…" : "Save"}
						</button>
						<button style={S.btnSecondary} onClick={() => setNewRow(null)}>Cancel</button>
					</div>
				</div>
			)}

			{/* ── Table ─────────────────────────────────────────────────────── */}
			<div style={S.tableWrap}>
				<div style={S.tableInner}>
					<table style={S.table}>
						<thead>
							<tr>
								{cols.map((col) => (
									<th key={col} style={S.th}>{col}</th>
								))}
								<th style={S.th} />
							</tr>
						</thead>
						<tbody>
							{rows.map((row) => (
								<tr key={row.id} style={S.tr}>
									{cols.map((col) => {
										const isEditing = editCell?.rowId === row.id && editCell?.col === col;
										const editable = !EDITABLE_SKIP.has(col);
										return (
											<td
												key={col}
												style={{ ...S.td, cursor: editable ? "pointer" : "default" }}
												// onClick={() => editable && !isEditing && startEdit(row.id, col, row[col])}
											>
												{isEditing ? (
													<input
														autoFocus
														style={S.inlineInput}
														value={editValue}
														onChange={(e) => setEditValue(e.target.value)}
														onBlur={commitEdit}
														onKeyDown={(e) => {
															if (e.key === "Enter") commitEdit();
															if (e.key === "Escape") setEditCell(null);
														}}
													/>
												) : (
													<span title={editable ? "Click to edit" : undefined}>
														{/* {formatCell(row[col])} */}
                            {String(formatCell(row[col])).substring(0,10)}
													</span>
												)}
											</td>
										);
									})}
									<td style={{ ...S.td, textAlign: "right" }}>
										<button style={S.deleteBtn} onClick={() => deleteRow(row.id)}>✕</button>
									</td>
								</tr>
							))}
							{rows.length === 0 && (
								<tr><td colSpan={cols.length + 1} style={S.empty}>No records.</td></tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}

function formatCell(v) {
	if (v === null || v === undefined) return "—";
	if (typeof v === "boolean") return v ? "✓" : "✗";
	return String(v);
}
const S = {
	root: {
		display: "flex",
		flexDirection: "column",
		width: "100%",
		maxWidth: "100%",
		minWidth: 0,
		height: "100%",
		overflow: "hidden",
	},

	toolbar: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		flexWrap: "wrap",
		gap: 12,
		marginBottom: 20,
	},

	title: {
		margin: 0,
		fontSize: 24,
		fontWeight: 700,
		color: "var(--ink)",
	},

	count: {
		fontSize: 14,
		color: "var(--ink-mute)",
		fontWeight: 500,
	},

	actions: {
		display: "flex",
		gap: 10,
		flexWrap: "wrap",
	},

	btnPrimary: {
		padding: "10px 18px",
		background: "var(--blue)",
		color: "#fff",
		border: "none",
		borderRadius: "var(--radius)",
		cursor: "pointer",
		fontSize: 13,
		fontWeight: 600,
		transition: ".15s",
	},

	btnSecondary: {
		padding: "10px 18px",
		background: "#fff",
		color: "var(--ink-soft)",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius)",
		cursor: "pointer",
		fontSize: 13,
		fontWeight: 600,
	},

	deleteBtn: {
		background: "transparent",
		border: "none",
		color: "#dc2626",
		cursor: "pointer",
		fontSize: 16,
		padding: "4px 8px",
	},

	tableWrap: {
		flex: 1,
		width: "100%",
			overflowX: "auto",
		overflowY: "auto",
		border: "1px solid var(--border)",
		borderRadius: "var(--radius)",
		background: "#fff",
		boxShadow: "0 2px 8px rgba(15,28,51,.05)",
	},

	table: {
		width: "max-content",
		minWidth: "100%",
		borderCollapse: "collapse",
		tableLayout: "auto",
		fontSize: 13,
	},

		tableInner: {
			display: "inline-block",
			minWidth: "100%",
		},

	th: {
		position: "sticky",
		top: 0,
		zIndex: 2,
			width: 160,
			maxWidth: 160,
		background: "var(--blue-deep)",
		color: "#fff",
		padding: "12px 14px",
		textAlign: "left",
		whiteSpace: "nowrap",
		fontSize: 11,
		fontWeight: 700,
		letterSpacing: ".04em",
		textTransform: "uppercase",
		borderBottom: "1px solid rgba(255,255,255,.08)",
	},

	tr: {
		borderBottom: "1px solid #eef2f7",
	},

	td: {
		padding: "10px 14px",
		color: "var(--ink-soft)",
		whiteSpace: "nowrap",
			width: 160,
			maxWidth: 160,
		overflow: "hidden",
		textOverflow: "ellipsis",
		borderBottom: "1px solid #eef2f7",
		background: "#fff",
	},

	inlineInput: {
		width: "100%",
		fontSize: 13,
		padding: "6px 8px",

		border: "2px solid var(--blue)",
		borderRadius: 6,

		outline: "none",
	},

	empty: {
		textAlign: "center",
		padding: 40,
		color: "var(--ink-mute)",
	},

	loading: {
		padding: 32,
		color: "var(--ink-mute)",
	},

	error: {
		padding: 32,
		color: "#dc2626",
	},

	newRowForm: {
		background: "#fff",

		border: "1px solid var(--border)",
		borderRadius: "var(--radius)",

		padding: 20,

		marginBottom: 20,

		boxShadow: "0 2px 8px rgba(15,28,51,.05)",
	},

	newRowTitle: {
		fontWeight: 700,
		fontSize: 16,
		color: "var(--ink)",
		marginBottom: 16,
	},

	newRowFields: {
		display: "grid",
		gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
		gap: 16,
	},

	field: {
		display: "flex",
		flexDirection: "column",
		gap: 6,
	},

	fieldLabel: {
		fontSize: 11,
		color: "var(--ink-mute)",
		fontWeight: 700,
		textTransform: "uppercase",
		letterSpacing: ".04em",
	},

	fieldInput: {
		fontSize: 13,

		padding: "10px 12px",

		border: "1px solid var(--border)",
		borderRadius: "var(--radius)",

		outline: "none",

		background: "#fff",
	},
};

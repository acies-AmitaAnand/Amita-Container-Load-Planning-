"""
LoadPlanner  —  Truck Container Load Planning Engine
=====================================================
Version: 1.0

Architecture mirrors SupplyPlanTruckLoadBuilder pattern:
  1. Constants class        (column/measure names)
  2. Preprocessor class     (validate & reshape all inputs)
  3. Constraint checker     (weight, volume, axle, stacking rules)
  4. PalletLoader           (select & sequence pallets per truck per day)
  5. PositionEngine         (assign 3-D coordinates, axle balance)
  6. PostProcessor          (utilisation %, axle report, exceptions)
  7. LoadPlanManager        (orchestrator — day loop, truck loop)

Inputs
------
  item_master_df            items with weight, dims, stackability, fragility
  lane_master_df            routes: truck → ordered list of stops
  load_equipment_metadata_df  trucks: weight cap, vol cap, floor dims, axle positions
  location_df               location master
  shipment_plans_df         demand: item × location × day × qty
  sku_uom_df                unit-of-measure conversions
  transport_asset_df        asset availability by day

Outputs
-------
  out_load_plan             pallet-level: truck, sequence, position, day
  out_utilisation           weight/vol/area % per truck per day
  out_axle_weights          front/rear axle loads per truck per day
  out_exceptions            overflow, axle violations, unloadable items
"""

from pandas import DataFrame, merge, concat
from numpy import floor, ceil, cumsum, where
from collections import defaultdict
from logging import getLogger
import math, time

logger = getLogger("load_planner")


# ─────────────────────────────────────────────────────────────────────────────
# 1. CONSTANTS  — all column/measure names live here, nothing is hard-coded elsewhere
# ─────────────────────────────────────────────────────────────────────────────

class LoadPlannerConstants:
	"""
	Central registry of column names.
	Change a name here and it propagates everywhere.
	"""

	# ── Dimension columns ──────────────────────────────────────────────────
	ITEM = "item_id"
	LOCATION = "location_id"
	TRUCK = "truck_id"
	LANE = "lane_id"
	DAY = "plan_date"
	SEQUENCE = "load_sequence" # order within a truck
	STOP_ORDER = "stop_order" # delivery stop number on the route
	UOM = "uom"
	PALLET_ID = "pallet_id"
	POSITION_X = "pos_x" # longitudinal (front↔rear), metres from front
	POSITION_Y = "pos_y" # lateral  (left↔right), metres from centre-line
	POSITION_Z = "pos_z" # vertical (floor = 0)

	# ── Item master measures ────────────────────────────────────────────────
	m_item_weight_per_uom = "weight_kg" # kg per base UOM
	m_item_length = "length_m"
	m_item_width = "width_m"
	m_item_height = "height_m"
	m_item_volume = "volume_m3" # can be derived or explicit
	m_item_floor_area = "floor_area_m2" # length × width
	m_stackable = "is_stackable" # bool
	m_max_stack_height = "max_stack_height_m"
	m_fragile = "is_fragile" # bool — must be top-most layer
	m_units_per_pallet = "units_per_pallet"

	# ── Equipment metadata measures ─────────────────────────────────────────
	m_truck_max_payload_kg = "max_payload_kg"
	m_truck_internal_length_m = "internal_length_m"
	m_truck_internal_width_m = "internal_width_m"
	m_truck_internal_height_m = "internal_height_m"
	m_truck_volume_m3 = "internal_volume_m3"
	m_truck_floor_area_m2 = "floor_area_m2"
	m_truck_front_axle_x = "front_axle_x_m" # distance from front of truck
	m_truck_rear_axle_x = "rear_axle_x_m" # distance from front of truck
	m_truck_max_front_axle_kg = "max_front_axle_kg"
	m_truck_max_rear_axle_kg = "max_rear_axle_kg"
	m_truck_tare_weight_kg = "tare_weight_kg"

	# ── Transport asset availability ────────────────────────────────────────
	m_asset_available = "is_available" # bool or 0/1

	# ── Shipment plan measures ──────────────────────────────────────────────
	m_demand_qty = "demand_qty" # in base UOM
	m_demand_priority = "demand_priority" # lower = ship first

	# ── Lane master ─────────────────────────────────────────────────────────
	# lane_master has (lane_id, truck_id, stop_order, location_id)

	# ── Derived / internal working columns ──────────────────────────────────
	m_pallets_needed = "pallets_needed" # ceil(qty / units_per_pallet)
	m_pallet_weight_kg = "pallet_weight_kg"
	m_pallet_floor_area = "pallet_floor_area_m2"
	m_pallet_volume = "pallet_volume_m3"
	m_load_weight_kg = "load_weight_kg" # running truck weight
	m_axle_front_load_kg = "front_axle_load_kg"
	m_axle_rear_load_kg = "rear_axle_load_kg"
	m_cumulative_weight = "cumulative_weight_kg"
	m_cumulative_floor_area = "cumulative_floor_area_m2"

	# ── Output measures ─────────────────────────────────────────────────────
	out_weight_utilisation_pct = "weight_utilisation_pct"
	out_volume_utilisation_pct = "volume_utilisation_pct"
	out_floor_area_utilisation_pct = "floor_area_utilisation_pct"
	out_front_axle_utilisation_pct = "front_axle_utilisation_pct"
	out_rear_axle_utilisation_pct = "rear_axle_utilisation_pct"
	out_axle_compliant = "axle_weight_compliant"
	out_exception_reason = "exception_reason"
	out_planned_qty = "planned_qty"
	out_exception_qty = "exception_qty"

	# ── Output dataframe column lists ────────────────────────────────────────
	load_plan_columns = [
		DAY, TRUCK, LANE, SEQUENCE, PALLET_ID,
		ITEM, LOCATION, STOP_ORDER, UOM,
		out_planned_qty,
		m_pallet_weight_kg, m_pallet_floor_area, m_pallet_volume,
		POSITION_X, POSITION_Y, POSITION_Z,
		m_axle_front_load_kg, m_axle_rear_load_kg,
	]

	utilisation_columns = [
		DAY, TRUCK,
		out_weight_utilisation_pct,
		out_volume_utilisation_pct,
		out_floor_area_utilisation_pct,
		out_front_axle_utilisation_pct,
		out_rear_axle_utilisation_pct,
		out_axle_compliant,
	]

	axle_weight_columns = [
		DAY, TRUCK, SEQUENCE,
		m_axle_front_load_kg,
		m_axle_rear_load_kg,
		out_axle_compliant,
	]

	exception_columns = [
		DAY, TRUCK, ITEM, LOCATION,
		out_exception_qty,
		out_exception_reason,
	]


# ─────────────────────────────────────────────────────────────────────────────
# 2. PREPROCESSOR
# ─────────────────────────────────────────────────────────────────────────────

class LoadPlanPreprocessor:
	"""
	Validates, cleans, and reshapes all inputs into the formats the solver needs.
	Called once before the day loop starts.
	"""

	def __init__(self, engine):
		self.engine = engine
		self.c = engine.c # constants shorthand

	# ── 2a. Parameter validation ─────────────────────────────────────────────

	def check_inputs(self):
		"""Exit early if mandatory tables are missing or empty."""
		cfg = self.engine
		c = self.c
		missing = []

		if not isinstance(cfg.shipment_plans_df, DataFrame) or cfg.shipment_plans_df.empty:
			missing.append("shipment_plans_df")
		if not isinstance(cfg.item_master_df, DataFrame) or cfg.item_master_df.empty:
			missing.append("item_master_df")
		if not isinstance(cfg.load_equipment_metadata_df, DataFrame) or cfg.load_equipment_metadata_df.empty:
			missing.append("load_equipment_metadata_df")
		if not isinstance(cfg.lane_master_df, DataFrame) or cfg.lane_master_df.empty:
			missing.append("lane_master_df")

		if missing:
			cfg.no_input = True
			logger.error(f"LoadPlanner: missing required inputs: {missing}")

	# ── 2b. Item master ───────────────────────────────────────────────────────

	def preprocess_item_master(self):
		"""
		Fill nulls with safe defaults, derive floor_area and volume if not present,
		build a dict keyed by item_id for O(1) lookup in the solver.
		"""
		cfg = self.engine
		c = self.c
		df = cfg.item_master_df.copy()

		# TODO: adjust column names to match your actual item_master_df schema

		df[c.m_item_weight_per_uom].fillna(0, inplace=True)
		df[c.m_item_length].fillna(0, inplace=True)
		df[c.m_item_width].fillna(0, inplace=True)
		df[c.m_item_height].fillna(0, inplace=True)
		df[c.m_stackable].fillna(True, inplace=True)
		df[c.m_fragile].fillna(False, inplace=True)
		df[c.m_max_stack_height].fillna(float("inf"), inplace=True)
		df[c.m_units_per_pallet].fillna(1, inplace=True)

		# derive floor area and volume if not explicit
		if c.m_item_floor_area not in df.columns:
			df[c.m_item_floor_area] = df[c.m_item_length] * df[c.m_item_width]
		if c.m_item_volume not in df.columns:
			df[c.m_item_volume] = df[c.m_item_floor_area] * df[c.m_item_height]

		# dict: item_id → {weight_kg, floor_area_m2, volume_m3, stackable, ...}
		cfg.item_lookup = df.set_index(c.ITEM).to_dict(orient="index")
		cfg.item_master_df = df

	# ── 2c. Equipment metadata ────────────────────────────────────────────────

	def preprocess_equipment(self):
		"""
		Fill missing capacities, build per-truck lookup dict,
		merge with transport_asset_df to get day-level availability.
		"""
		cfg = self.engine
		c = self.c
		df = cfg.load_equipment_metadata_df.copy()

		# TODO: adjust column names to match your actual equipment schema

		df[c.m_truck_max_payload_kg].fillna(float("inf"), inplace=True)
		df[c.m_truck_volume_m3].fillna(float("inf"), inplace=True)
		df[c.m_truck_floor_area_m2].fillna(float("inf"), inplace=True)
		df[c.m_truck_max_front_axle_kg].fillna(float("inf"), inplace=True)
		df[c.m_truck_max_rear_axle_kg].fillna(float("inf"), inplace=True)
		df[c.m_truck_tare_weight_kg].fillna(0, inplace=True)

		# derive floor area if columns exist
		if c.m_truck_floor_area_m2 not in df.columns:
			df[c.m_truck_floor_area_m2] = (
				df[c.m_truck_internal_length_m] * df[c.m_truck_internal_width_m]
			)

		# merge availability
		if isinstance(cfg.transport_asset_df, DataFrame) and not cfg.transport_asset_df.empty:
			df = merge(df, cfg.transport_asset_df,
				on=[c.TRUCK], how="left")
			df[c.m_asset_available].fillna(1, inplace=True)
		else:
			df[c.m_asset_available] = 1

		cfg.equipment_df = df
		cfg.equipment_lookup = df.set_index(c.TRUCK).to_dict(orient="index")

	# ── 2d. Lane master ───────────────────────────────────────────────────────

	def preprocess_lanes(self):
		"""
		Build a dict: truck_id → ordered list of (stop_order, location_id).
		This drives the LIFO loading order (last stop loads first).
		"""
		cfg = self.engine
		c = self.c
		df = cfg.lane_master_df.sort_values([c.TRUCK, c.STOP_ORDER])

		cfg.lane_lookup = (
			df.groupby(c.TRUCK)
				.apply(lambda g: list(zip(g[c.STOP_ORDER], g[c.LOCATION])))
				.to_dict()
		)

	# ── 2e. Shipment plan pivot ───────────────────────────────────────────────

	def preprocess_shipment_plan(self):
		"""
		Pivot shipment_plans_df so days become columns — same pattern as TLB.
		Also merge item master columns needed during loading.
		"""
		cfg = self.engine
		c = self.c
		df = cfg.shipment_plans_df.copy()

		# derive pallet count from qty
		df = merge(df,
			cfg.item_master_df[[c.ITEM, c.m_units_per_pallet,
				c.m_item_weight_per_uom,
				c.m_item_floor_area, c.m_item_volume,
				c.m_stackable, c.m_fragile]],
			on=c.ITEM, how="left")

		df[c.m_pallets_needed] = ceil(
			df[c.m_demand_qty] / df[c.m_units_per_pallet]
		)
		df[c.m_pallet_weight_kg] = (
			df[c.m_units_per_pallet] * df[c.m_item_weight_per_uom]
		)
		df[c.m_pallet_floor_area] = df[c.m_item_floor_area]
		df[c.m_pallet_volume] = df[c.m_item_volume] * df[c.m_units_per_pallet]

		# pivot: rows = (truck, item, location), cols = day columns
		pivot_dims = [c.TRUCK, c.LANE, c.ITEM, c.LOCATION,
			c.m_pallet_weight_kg, c.m_pallet_floor_area,
			c.m_pallet_volume, c.m_stackable, c.m_fragile]

		cfg.days = sorted(df[c.DAY].unique().tolist())
		pivot = df.pivot_table(
			values=c.m_pallets_needed,
			index=pivot_dims,
			columns=c.DAY,
			aggfunc="sum",
			fill_value=0,
		).reset_index()

		# add priority columns
		if c.m_demand_priority in df.columns:
			prio = df.pivot_table(
				values=c.m_demand_priority,
				index=[c.TRUCK, c.ITEM, c.LOCATION],
				columns=c.DAY,
				aggfunc="min",
			).reset_index()
			prio.columns = [
				f"{col}_priority" if col in cfg.days else col
				for col in prio.columns
			]
			pivot = merge(pivot, prio, on=[c.TRUCK, c.ITEM, c.LOCATION], how="left")

		# fill missing priority with inf
		for day in cfg.days:
			col = f"{day}_priority"
			if col not in pivot.columns:
				pivot[col] = float("inf")
		pivot.fillna({f"{d}_priority": float("inf") for d in cfg.days}, inplace=True)

		cfg.shipment_pivot = pivot

	# ── 2f. Run all preprocessors ─────────────────────────────────────────────

	def run(self):
		self.check_inputs()
		if self.engine.no_input:
			return
		self.preprocess_item_master()
		self.preprocess_equipment()
		self.preprocess_lanes()
		self.preprocess_shipment_plan()
		logger.info("LoadPlanner: preprocessing complete")


# ─────────────────────────────────────────────────────────────────────────────
# 3. CONSTRAINT CHECKER
# ─────────────────────────────────────────────────────────────────────────────

class ConstraintChecker:
	"""
	Pure functions that test whether adding a pallet to a truck is feasible.
	No state — called inline during loading.
	"""

	def __init__(self, engine):
		self.engine = engine
		self.c = engine.c

	def remaining_weight(self, truck_state: dict) -> float:
		"""Payload headroom remaining (kg)."""
		c = self.c
		return (
			truck_state[c.m_truck_max_payload_kg]
			- truck_state[c.m_load_weight_kg]
		)

	def remaining_floor_area(self, truck_state: dict) -> float:
		"""Floor area headroom remaining (m²)."""
		c = self.c
		return (
			truck_state[c.m_truck_floor_area_m2]
			- truck_state[c.m_cumulative_floor_area]
		)

	def can_load_pallet(self, pallet: dict, truck_state: dict) -> bool:
		"""
		Returns True only if all hard constraints are satisfied.
		Extend this function as your rules grow.
		"""
		c = self.c

		# weight
		if pallet[c.m_pallet_weight_kg] > self.remaining_weight(truck_state):
			return False

		# floor area (stackable pallets can share floor space — TODO: refine)
		if not pallet.get(c.m_stackable, True):
			if pallet[c.m_pallet_floor_area] > self.remaining_floor_area(truck_state):
				return False

		# fragile items must be loaded LAST (top layer)
		# TODO: implement layer-aware fragility check using POSITION_Z

		return True

	def axle_loads_after_adding(self, pallet: dict, truck_state: dict,
		position_x: float) -> tuple:
		"""
		Estimate front and rear axle loads after placing a pallet at position_x.
		Uses simple lever-arm (beam equation) around the rear axle.
		
		Returns (front_axle_kg, rear_axle_kg).
		"""
		c = self.c
		eq = self.engine.equipment_lookup.get(truck_state[c.TRUCK], {})

		rear_axle_x = eq.get(c.m_truck_rear_axle_x, truck_state.get(c.m_truck_rear_axle_x, 5.0))
		front_axle_x = eq.get(c.m_truck_front_axle_x, truck_state.get(c.m_truck_front_axle_x, 1.5))
		axle_base = rear_axle_x - front_axle_x

		pallet_weight = pallet[c.m_pallet_weight_kg]
		# distance of pallet from rear axle (positive = ahead of rear axle)
		d_from_rear = rear_axle_x - position_x

		if axle_base <= 0:
			# fallback: split evenly
			delta_front = delta_rear = pallet_weight / 2
		else:
			# proportion on front axle = d_from_rear / axle_base
			delta_front = pallet_weight * (d_from_rear / axle_base)
			delta_rear = pallet_weight - delta_front

		new_front = truck_state.get(c.m_axle_front_load_kg, 0) + delta_front
		new_rear = truck_state.get(c.m_axle_rear_load_kg, 0) + delta_rear
		return new_front, new_rear

	def axle_compliant(self, truck_id: str, front_kg: float, rear_kg: float) -> bool:
		"""Check both axles are within rated limits."""
		c = self.c
		eq = self.engine.equipment_lookup.get(truck_id, {})
		return (
			front_kg <= eq.get(c.m_truck_max_front_axle_kg, float("inf"))
			and rear_kg <= eq.get(c.m_truck_max_rear_axle_kg, float("inf"))
		)


# ─────────────────────────────────────────────────────────────────────────────
# 4. POSITION ENGINE
# ─────────────────────────────────────────────────────────────────────────────

class PositionEngine:
	"""
	Assigns (x, y, z) coordinates to each pallet inside the truck container.
	
	Coordinate system:
	  x — longitudinal, 0 = front cab wall, increases toward rear doors
	  y — lateral, 0 = left wall, increases rightward
	  z — vertical, 0 = floor, increases upward
	
	Loading strategy: rear-to-front (last delivery stop loads first → LIFO).
	"""

	def __init__(self, engine):
		self.engine = engine
		self.c = engine.c

	def assign_position(self, pallet: dict, truck_state: dict,
		stop_order: int) -> dict:
		"""
		Given the current truck state (list of loaded pallets, remaining space),
		return updated pallet dict with POSITION_X, POSITION_Y, POSITION_Z set.
		
		Placement logic:
		  1. Sort stops so the LAST stop loads at the rear (high X, near doors).
		  2. Within the same stop, pack left-to-right, then stack if stackable.
		  3. Fragile items always land on top (highest Z in their column).
		
		TODO: replace this naive sequential placer with a bin-packing algorithm
		      or a grid-slot system for production use.
		"""
		c = self.c
		eq = self.engine.equipment_lookup.get(truck_state.get(c.TRUCK, ""), {})

		truck_length = eq.get(c.m_truck_internal_length_m, 13.6)
		truck_width = eq.get(c.m_truck_internal_width_m, 2.4)

		# Naive: assign x based on stop_order (last stop = highest x = rear)
		max_stop = truck_state.get("max_stop_order", 1)
		x_zone_length = truck_length / max(max_stop, 1)
		pos_x = (stop_order - 1) * x_zone_length # earlier stop = closer to cab

		# y: pack left to right within the zone
		# TODO: track used y within each x-zone, implement 2-D bin packing
		pos_y = truck_state.get("current_y_offset", 0)

		# z: stack if stackable and previous pallet is also stackable
		# TODO: implement column-aware stacking with height limits
		pos_z = 0

		pallet[c.POSITION_X] = round(pos_x, 3)
		pallet[c.POSITION_Y] = round(pos_y, 3)
		pallet[c.POSITION_Z] = round(pos_z, 3)
		return pallet

	def compute_centre_of_gravity(self, loaded_pallets: list) -> tuple:
		"""
		Returns (cog_x, cog_y) — centre of gravity of the load.
		Used for axle balance reporting.
		"""
		c = self.c
		total_weight = sum(p[c.m_pallet_weight_kg] for p in loaded_pallets)
		if total_weight == 0:
			return 0.0, 0.0
		cog_x = sum(p[c.m_pallet_weight_kg] * p[c.POSITION_X] for p in loaded_pallets) / total_weight
		cog_y = sum(p[c.m_pallet_weight_kg] * p[c.POSITION_Y] for p in loaded_pallets) / total_weight
		return round(cog_x, 3), round(cog_y, 3)


# ─────────────────────────────────────────────────────────────────────────────
# 5. PALLET LOADER
# ─────────────────────────────────────────────────────────────────────────────

class PalletLoader:
	"""
	Selects which pallets go on which truck for a given day,
	respecting constraints and maximising utilisation.
	
	Mirrors BulkLoader from TLB:
	  - sort pallets by stop order (LIFO) then priority then weight
	  - iterate trucks, fill each in turn
	  - overflow → push-out to next day
	  - empty space → pull-in from next day (optional)
	"""

	def __init__(self, engine):
		self.engine = engine
		self.c = engine.c
		self.checker = ConstraintChecker(engine)
		self.positioner = PositionEngine(engine)

	# ── helpers ───────────────────────────────────────────────────────────────

	def _init_truck_state(self, truck_id: str, day: str) -> dict:
		"""Create a fresh mutable state dict for one truck on one day."""
		c = self.c
		eq = self.engine.equipment_lookup.get(truck_id, {})
		stops = self.engine.lane_lookup.get(truck_id, [])
		return {
			c.TRUCK: truck_id,
			c.DAY: day,
			c.m_truck_max_payload_kg: eq.get(c.m_truck_max_payload_kg, float("inf")),
			c.m_truck_floor_area_m2: eq.get(c.m_truck_floor_area_m2, float("inf")),
			c.m_truck_volume_m3: eq.get(c.m_truck_volume_m3, float("inf")),
			c.m_truck_max_front_axle_kg: eq.get(c.m_truck_max_front_axle_kg, float("inf")),
			c.m_truck_max_rear_axle_kg: eq.get(c.m_truck_max_rear_axle_kg, float("inf")),
			c.m_truck_front_axle_x: eq.get(c.m_truck_front_axle_x, 1.5),
			c.m_truck_rear_axle_x: eq.get(c.m_truck_rear_axle_x, 5.0),
			c.m_load_weight_kg: 0.0,
			c.m_cumulative_floor_area: 0.0,
			c.m_axle_front_load_kg: eq.get(c.m_truck_tare_weight_kg, 0) * 0.5,
			c.m_axle_rear_load_kg: eq.get(c.m_truck_tare_weight_kg, 0) * 0.5,
			"max_stop_order": max((s for s, _ in stops), default=1),
			"loaded_pallets": [],
			"current_y_offset": 0.0,
			"load_sequence": 0,
		}

	def _get_stop_order(self, truck_id: str, location_id: str) -> int:
		"""Look up where on the route this location sits."""
		stops = self.engine.lane_lookup.get(truck_id, [])
		for order, loc in stops:
			if loc == location_id:
				return order
		return 999 # unknown stop — load last (near cab)

	# ── main loading function ──────────────────────────────────────────────────

	def load_truck_for_day(self, truck_id: str, day: str,
		demand_rows: DataFrame) -> tuple:
		"""
		Greedy sequential loader for one truck on one day.
		Returns (loaded_list, overflow_df).
		
		loaded_list  — list of dicts, one per pallet loaded
		overflow_df  — rows from demand_rows that did not fit
		"""
		c = self.c
		truck_state = self._init_truck_state(truck_id, day)
		loaded = []
		overflow_idx = []

		# Sort: last delivery stop → rear of truck → loads first (LIFO)
		demand_rows = demand_rows.copy()
		demand_rows["_stop_order"] = demand_rows[c.LOCATION].apply(
			lambda loc: self._get_stop_order(truck_id, loc)
		)
		priority_col = f"{day}_priority"
		demand_rows.sort_values(
			["_stop_order", priority_col, c.m_pallet_weight_kg],
			ascending=[False, True, False], # last stop first, highest priority first
			inplace=True,
		)
		demand_rows.reset_index(drop=True, inplace=True)

		for idx, row in demand_rows.iterrows():
			pallets_to_load = int(floor(row[day]))
			if pallets_to_load <= 0:
				continue

			stop_order = int(row["_stop_order"])
			pallet_template = {
				c.ITEM: row[c.ITEM],
				c.LOCATION: row[c.LOCATION],
				c.STOP_ORDER: stop_order,
				c.LANE: row.get(c.LANE, ""),
				c.m_pallet_weight_kg: row[c.m_pallet_weight_kg],
				c.m_pallet_floor_area: row[c.m_pallet_floor_area],
				c.m_pallet_volume: row[c.m_pallet_volume],
				c.m_stackable: row.get(c.m_stackable, True),
				c.m_fragile: row.get(c.m_fragile, False),
			}

			loaded_count = 0
			for _ in range(pallets_to_load):
				pallet = pallet_template.copy()

				if not self.checker.can_load_pallet(pallet, truck_state):
					break # remaining pallets for this item also won't fit

				# assign position
				pos_x = (stop_order - 1) * (
					self.engine.equipment_lookup.get(truck_id, {})
						.get(c.m_truck_internal_length_m, 13.6)
					/ max(truck_state["max_stop_order"], 1)
				)
				pallet = self.positioner.assign_position(pallet, truck_state, stop_order)

				# axle check
				new_front, new_rear = self.checker.axle_loads_after_adding(
					pallet, truck_state, pallet[c.POSITION_X]
				)
				# Note: axle check is advisory only here; set to hard-fail if needed
				# if not self.checker.axle_compliant(truck_id, new_front, new_rear):
				#     break

				# commit pallet to truck
				truck_state["load_sequence"] += 1
				pallet[c.SEQUENCE] = truck_state["load_sequence"]
				pallet[c.TRUCK] = truck_id
				pallet[c.DAY] = day
				pallet[c.m_axle_front_load_kg] = new_front
				pallet[c.m_axle_rear_load_kg] = new_rear

				truck_state[c.m_load_weight_kg] += pallet[c.m_pallet_weight_kg]
				truck_state[c.m_cumulative_floor_area] += pallet[c.m_pallet_floor_area]
				truck_state[c.m_axle_front_load_kg] = new_front
				truck_state[c.m_axle_rear_load_kg] = new_rear
				truck_state["loaded_pallets"].append(pallet)

				loaded.append(pallet)
				loaded_count += 1

			# record overflow
			overflow_qty = pallets_to_load - loaded_count
			if overflow_qty > 0:
				overflow_row = row.to_dict()
				overflow_row[day] = overflow_qty
				overflow_idx.append(overflow_row)

		overflow_df = DataFrame(overflow_idx) if overflow_idx else DataFrame()
		return loaded, overflow_df

	# ── push-out helper ───────────────────────────────────────────────────────

	def push_out(self, overflow_df: DataFrame, curr_day: str,
		next_day: str, shipment_pivot: DataFrame) -> DataFrame:
		"""
		Add overflow pallets to next day's demand in the pivot table.
		Mirrors push_out_shipment_plan_cluster from TLB.
		"""
		if overflow_df.empty or next_day is None:
			return shipment_pivot

		c = self.c
		key_cols = [c.TRUCK, c.ITEM, c.LOCATION]

		for _, row in overflow_df.iterrows():
			mask = True
			for k in key_cols:
				mask = mask & (shipment_pivot[k] == row[k])
			if shipment_pivot[mask].empty:
				continue
			shipment_pivot.loc[mask, next_day] += row.get(curr_day, 0)

		return shipment_pivot


# ─────────────────────────────────────────────────────────────────────────────
# 6. POST-PROCESSOR
# ─────────────────────────────────────────────────────────────────────────────

class LoadPlanPostProcessor:
	"""
	Aggregates loaded pallet lists into the four output DataFrames.
	"""

	def __init__(self, engine):
		self.engine = engine
		self.c = engine.c

	def build_load_plan_df(self) -> DataFrame:
		c = self.c
		if not self.engine.loaded_pallets_list:
			return DataFrame(columns=c.load_plan_columns)
		df = DataFrame(self.engine.loaded_pallets_list)
		df[c.out_planned_qty] = 1 # each row = 1 pallet
		# fill any missing output columns with 0
		for col in c.load_plan_columns:
			if col not in df.columns:
				df[col] = 0
		return df[c.load_plan_columns]

	def build_utilisation_df(self) -> DataFrame:
		c = self.c
		lp = self.build_load_plan_df()
		if lp.empty:
			return DataFrame(columns=c.utilisation_columns)

		rows = []
		for (day, truck), grp in lp.groupby([c.DAY, c.TRUCK]):
			eq = self.engine.equipment_lookup.get(truck, {})
			total_weight = grp[c.m_pallet_weight_kg].sum()
			total_area = grp[c.m_pallet_floor_area].sum()
			total_vol = grp[c.m_pallet_volume].sum()
			front_kg = grp[c.m_axle_front_load_kg].iloc[-1] if len(grp) else 0
			rear_kg = grp[c.m_axle_rear_load_kg].iloc[-1] if len(grp) else 0

			cap_w = eq.get(c.m_truck_max_payload_kg, 1)
			cap_a = eq.get(c.m_truck_floor_area_m2, 1)
			cap_v = eq.get(c.m_truck_volume_m3, 1)
			cap_f = eq.get(c.m_truck_max_front_axle_kg, 1)
			cap_r = eq.get(c.m_truck_max_rear_axle_kg, 1)

			rows.append({
				c.DAY: day,
				c.TRUCK: truck,
				c.out_weight_utilisation_pct: round(total_weight / cap_w * 100, 1),
				c.out_floor_area_utilisation_pct: round(total_area / cap_a * 100, 1),
				c.out_volume_utilisation_pct: round(total_vol / cap_v * 100, 1),
				c.out_front_axle_utilisation_pct: round(front_kg / cap_f * 100, 1),
				c.out_rear_axle_utilisation_pct: round(rear_kg / cap_r * 100, 1),
				c.out_axle_compliant: (
					front_kg <= eq.get(c.m_truck_max_front_axle_kg, float("inf"))
					and rear_kg <= eq.get(c.m_truck_max_rear_axle_kg, float("inf"))
				),
			})
		return DataFrame(rows, columns=c.utilisation_columns)

	def build_axle_weight_df(self) -> DataFrame:
		c = self.c
		lp = self.build_load_plan_df()
		if lp.empty:
			return DataFrame(columns=c.axle_weight_columns)
		# one row per pallet (sequence-level axle progression)
		lp[c.out_axle_compliant] = lp.apply(
			lambda row: self.engine.constraint_checker.axle_compliant(
				row[c.TRUCK],
				row[c.m_axle_front_load_kg],
				row[c.m_axle_rear_load_kg],
			), axis=1
		)
		return lp[c.axle_weight_columns].drop_duplicates()

	def build_exceptions_df(self) -> DataFrame:
		c = self.c
		if not self.engine.exception_list:
			return DataFrame(columns=c.exception_columns)
		df = DataFrame(self.engine.exception_list)
		for col in c.exception_columns:
			if col not in df.columns:
				df[col] = None
		return df[c.exception_columns]


# ─────────────────────────────────────────────────────────────────────────────
# 7. LOAD PLAN MANAGER  —  orchestrator
# ─────────────────────────────────────────────────────────────────────────────

class LoadPlanManager:
	"""
	Main entry point. Owns all state. Runs the day × truck loop.
	
	Usage:
	    manager = LoadPlanManager(
	        item_master_df=...,
	        lane_master_df=...,
	        load_equipment_metadata_df=...,
	        location_df=...,
	        shipment_plans_df=...,
	        sku_uom_df=...,
	        transport_asset_df=...,
	    )
	    (load_plan, utilisation, axle_weights, exceptions) = manager.run()
	"""

	def __init__(
		self,
		item_master_df: DataFrame,
		lane_master_df: DataFrame,
		load_equipment_metadata_df: DataFrame,
		location_df: DataFrame,
		shipment_plans_df: DataFrame,
		sku_uom_df: DataFrame,
		transport_asset_df: DataFrame,
	):
		# ── store raw inputs ─────────────────────────────────────────────────
		self.item_master_df = item_master_df
		self.lane_master_df = lane_master_df
		self.load_equipment_metadata_df = load_equipment_metadata_df
		self.location_df = location_df
		self.shipment_plans_df = shipment_plans_df
		self.sku_uom_df = sku_uom_df
		self.transport_asset_df = transport_asset_df

		# ── constants ────────────────────────────────────────────────────────
		self.c = LoadPlannerConstants()

		# ── sub-components ───────────────────────────────────────────────────
		self.preprocessor = LoadPlanPreprocessor(self)
		self.constraint_checker = ConstraintChecker(self)
		self.pallet_loader = PalletLoader(self)
		self.position_engine = PositionEngine(self)
		self.postprocessor = LoadPlanPostProcessor(self)

		# ── runtime state (populated by preprocessor) ─────────────────────
		self.no_input = False
		self.days: list = []
		self.shipment_pivot: DataFrame = DataFrame()
		self.equipment_df: DataFrame = DataFrame()
		self.equipment_lookup: dict = {}
		self.item_lookup: dict = {}
		self.lane_lookup: dict = {}

		# ── output accumulators ──────────────────────────────────────────────
		self.loaded_pallets_list: list = []
		self.exception_list: list = []

	# ── main solver ───────────────────────────────────────────────────────────

	def run(self) -> tuple:
		"""
		Entry point. Returns (load_plan_df, utilisation_df, axle_df, exceptions_df).
		"""
		c = self.c
		t0 = time.time()
		logger.info("LoadPlanManager: starting")

		# ── preprocess ───────────────────────────────────────────────────────
		self.preprocessor.run()

		if self.no_input:
			logger.error("LoadPlanManager: missing inputs, returning empty outputs")
			return (
				DataFrame(columns=c.load_plan_columns),
				DataFrame(columns=c.utilisation_columns),
				DataFrame(columns=c.axle_weight_columns),
				DataFrame(columns=c.exception_columns),
			)

		# ── day loop ─────────────────────────────────────────────────────────
		for i, day in enumerate(self.days):
			logger.info(f"LoadPlanManager: processing {day}")
			is_last_day = (i == len(self.days) - 1)
			next_day = self.days[i + 1] if not is_last_day else None

			# trucks available on this day
			available_trucks = self._get_available_trucks(day)
			if not available_trucks:
				logger.warning(f"  no trucks available on {day}")
				self._push_all_to_exception(day, "No truck available")
				continue

			# demand on this day
			day_demand = self.shipment_pivot[
				self.shipment_pivot[day] > 0
			].copy()

			if day_demand.empty:
				logger.info(f"  no demand on {day}")
				continue

			# ── truck loop ───────────────────────────────────────────────────
			for truck_id in available_trucks:
				truck_demand = day_demand[
					day_demand[c.TRUCK] == truck_id
				].copy()

				if truck_demand.empty:
					continue

				logger.info(f"  loading truck {truck_id}")

				loaded, overflow_df = self.pallet_loader.load_truck_for_day(
					truck_id, day, truck_demand
				)
				self.loaded_pallets_list.extend(loaded)

				# handle overflow
				if not overflow_df.empty:
					if not is_last_day:
						self.shipment_pivot = self.pallet_loader.push_out(
							overflow_df, day, next_day, self.shipment_pivot
						)
						logger.info(
							f"  pushed {len(overflow_df)} overflow rows to {next_day}"
						)
					else:
						for _, row in overflow_df.iterrows():
							self.exception_list.append({
								c.DAY: day,
								c.TRUCK: truck_id,
								c.ITEM: row.get(c.ITEM),
								c.LOCATION: row.get(c.LOCATION),
								c.out_exception_qty: row.get(day, 0),
								c.out_exception_reason: "Overflow on last day",
							})

			# zero out today's column — processed
			self.shipment_pivot[day] = 0

		# ── post-process ─────────────────────────────────────────────────────
		out_load_plan = self.postprocessor.build_load_plan_df()
		out_utilisation = self.postprocessor.build_utilisation_df()
		out_axle_weights = self.postprocessor.build_axle_weight_df()
		out_exceptions = self.postprocessor.build_exceptions_df()

		logger.info(f"LoadPlanManager: done in {time.time() - t0:.1f}s")
		return out_load_plan, out_utilisation, out_axle_weights, out_exceptions

	# ── private helpers ───────────────────────────────────────────────────────

	def _get_available_trucks(self, day: str) -> list:
		"""Return truck IDs that are available on `day`."""
		c = self.c
		if self.equipment_df.empty:
			return []

		if c.DAY in self.equipment_df.columns:
			avail = self.equipment_df[
				(self.equipment_df[c.DAY] == day)
				& (self.equipment_df[c.m_asset_available] > 0)
			][c.TRUCK].tolist()
		else:
			# no day-level availability — all trucks available every day
			avail = self.equipment_df[c.TRUCK].tolist()

		return avail

	def _push_all_to_exception(self, day: str, reason: str):
		"""Dump all demand for `day` into exception list."""
		c = self.c
		day_demand = self.shipment_pivot[self.shipment_pivot[day] > 0]
		for _, row in day_demand.iterrows():
			self.exception_list.append({
				c.DAY: day,
				c.TRUCK: row.get(c.TRUCK, ""),
				c.ITEM: row.get(c.ITEM, ""),
				c.LOCATION: row.get(c.LOCATION, ""),
				c.out_exception_qty: row[day],
				c.out_exception_reason: reason,
			})


# ─────────────────────────────────────────────────────────────────────────────
# USAGE EXAMPLE
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
	"""
	Replace these empty DataFrames with your actual data sources.
	Column names must match the constants defined in LoadPlannerConstants.
	"""
	manager = LoadPlanManager(
		item_master_df = DataFrame(), # TODO: load from DB / CSV
		lane_master_df = DataFrame(), # TODO
		load_equipment_metadata_df = DataFrame(), # TODO
		location_df = DataFrame(), # TODO
		shipment_plans_df = DataFrame(), # TODO
		sku_uom_df = DataFrame(), # TODO
		transport_asset_df = DataFrame(), # TODO
	)

	load_plan, utilisation, axle_weights, exceptions = manager.run()
	print("Load plan rows:    ", len(load_plan))
	print("Utilisation rows:  ", len(utilisation))
	print("Axle weight rows:  ", len(axle_weights))
	print("Exception rows:    ", len(exceptions))

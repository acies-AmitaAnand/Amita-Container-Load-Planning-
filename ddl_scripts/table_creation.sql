-- drop schema public cascade;
-- create schema public;
-- use database inventory_management;
-- use schema public;
CREATE TABLE
    PUBLIC.item_master ( -- Data available
        sku_id BIGINT PRIMARY KEY, --ok
        sku_name TEXT NOT NULL, --ok
        length_mm NUMERIC(10, 2) NOT NULL DEFAULT 0, -- COMMENT 'In millimeter (mm)', --ok
        width_mm NUMERIC(10, 2) NOT NULL DEFAULT 0, -- COMMENT 'In millimeter (mm)', --ok
        height_mm NUMERIC(10, 2) NOT NULL DEFAULT 0, -- COMMENT 'In millimeter (mm)', --ok
        weight_kg NUMERIC(10, 3) NOT NULL DEFAULT 0, -- COMMENT 'In kilograms (kg)', --ok
        -- volume_mm3 BIGINT DEFAULT 0, -- COMMENT 'In cubic millimeter', --ok
        stacking_limit INTEGER DEFAULT 0, --ok
        can_rotate BOOLEAN DEFAULT TRUE, --ok
        temperature_min_c NUMERIC(10, 2) DEFAULT 20, -- COMMENT 'In Celsius', --ok
        temperature_max_c NUMERIC(10, 2) DEFAULT 60, -- COMMENT 'In Celsius', --ok
        hazmat_class INTEGER DEFAULT 0, --ok
        fragility_rating INTEGER DEFAULT 0, --ok
        shelf_life_days INTEGER DEFAULT 90, --ok
        is_food_grade BOOLEAN DEFAULT FALSE, --ok
        is_regulated BOOLEAN DEFAULT FALSE, --ok
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP --ok
    );

-- CREATE INDEX idx_item_master_hazmat
-- ON item_master(hazmat_class);
-- CREATE INDEX idx_item_master_temperature
-- ON item_master(temperature_min, temperature_max);
CREATE TABLE
    PUBLIC.shipment_plans (
        -- Needed
        order_line_id BIGSERIAL PRIMARY KEY, -- PK for (Shipment, SKU)
        shipment_id TEXT DEFAULT '', --?
        sku_id BIGINT NOT NULL, --ok
        actual_delivery_date DATE, --ok
        origin_location_id TEXT NOT NULL, --ok
        destination_location_id TEXT NOT NULL, --ok
        estimated_delivery_date DATE, --ok
        planned_quantity INTEGER NOT NULL,
        shipped_quantity INTEGER DEFAULT 0,
        weight_kg NUMERIC(12, 2) default 0,
        priority INTEGER DEFAULT 0,
        temperature_requirement BOOLEAN DEFAULT FALSE,
        special_handling BOOLEAN DEFAULT FALSE,
        requested_transport_mode TEXT DEFAULT 'TRUCK',
        max_transit_time_in_days INTEGER DEFAULT 1,
        service_level INTEGER DEFAULT 1,
        unload_sequence_preference INTEGER DEFAULT 0,
        optimizer_run_id BIGINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- CREATE INDEX idx_shipment_destination
-- ON shipment_plans(destination_id);
-- CREATE INDEX idx_shipment_priority
-- ON shipment_plans(priority);
CREATE INDEX idx_shipment_sku ON shipment_plans (sku_id);

CREATE TABLE
    PUBLIC.location (
        location_id TEXT PRIMARY KEY, --ok
        location_name TEXT, --ok
        location_type TEXT DEFAULT 'BUILDING', --ok
        latitude NUMERIC(10, 6) DEFAULT 0, --ok
        longitude NUMERIC(10, 6) DEFAULT 0, --ok
        address TEXT DEFAULT '', --ok
        city TEXT DEFAULT '', --ok
        state TEXT DEFAULT '', --ok
        country TEXT DEFAULT '', --ok
        postal_code TEXT DEFAULT '', --ok
        dock_count INTEGER DEFAULT 1, --ok
        storage_type TEXT DEFAULT '',
        temperature_capability BOOLEAN DEFAULT FALSE,
        operating_hours TEXT DEFAULT ''
    );

CREATE INDEX idx_location_geo ON location (latitude, longitude);

CREATE TABLE
    PUBLIC.transport_asset (
        transport_asset_id BIGSERIAL PRIMARY KEY,
        asset_name TEXT NOT NULL, -- TRUCK, SHIP
        asset_type TEXT NOT NULL DEFAULT 'TRACTOR', -- TRACTOR, VESSEL
        axle_count INTEGER default 4,
        supports_refrigeration BOOLEAN DEFAULT FALSE,
        supports_hazmat BOOLEAN DEFAULT FALSE,
        max_weight_kg NUMERIC(12, 3) default 40000,
        assigned_from TIMESTAMP DEFAULT NULL,
        assigned_to TIMESTAMP DEFAULT NULL,
        current_status TEXT DEFAULT 'AVAILABLE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        -- max_volume NUMERIC(12, 2) default 0,
        -- cost_per_km NUMERIC(12, 4) default , -- without load
        -- average_speed NUMERIC(10, 2), -- without load
        -- carbon_emission_factor NUMERIC(12, 4) -- without load
    );

CREATE TABLE
    PUBLIC.load_equipment_metadata (
        -- Consider the containers are unlimited
        equipment_id BIGINT PRIMARY KEY,
        equipment_name TEXT NOT NULL,
        equipment_type TEXT NOT NULL DEFAULT 'CONTAINER',
        length_mm NUMERIC(10, 2) DEFAULT 0, -- COMMENT 'In millimeter (mm)', -- Outer box
        width_mm NUMERIC(10, 2) DEFAULT 0, -- COMMENT 'In millimeter (mm)', -- Outer box
        height_mm NUMERIC(10, 2) DEFAULT 0, -- COMMENT 'In millimeter (mm)', -- Outer box
        internal_length_mm NUMERIC(10, 2) DEFAULT 0, -- COMMENT 'In millimeter (mm)',
        internal_width_mm NUMERIC(10, 2) DEFAULT 0, -- COMMENT 'In millimeter (mm)',
        internal_height_mm NUMERIC(10, 2) DEFAULT 0, -- COMMENT 'In millimeter (mm)',
        max_payload_weight_kg NUMERIC(12, 3) DEFAULT 0, -- COMMENT 'In kilograms (kg)',
        tare_weight_kg NUMERIC(12, 3) DEFAULT 0, -- COMMENT 'In kilograms (kg)',
        -- max_volume_mm3 BIGINT, -- COMMENT 'In Cubic millimeter',
        door_width_mm NUMERIC(10, 2) default 0, -- COMMENT 'In millimeter (mm)',
        door_height_mm NUMERIC(10, 2) default 0, -- COMMENT 'In millimeter (mm)',
        refrigeration_capable BOOLEAN DEFAULT FALSE,
        temperature_min_c NUMERIC(10, 2) DEFAULT 0,
        temperature_max_c NUMERIC(10, 2) DEFAULT 0,
        max_stack_height_mm NUMERIC(10, 2) DEFAULT 0,
        axle_configuration JSONB DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- CREATE INDEX idx_equipment_type
-- ON equipment_metadata(equipment_type);
CREATE TABLE
    PUBLIC.transport_equipment_assignment (
        transported_content_id BIGSERIAL PRIMARY KEY,
        transport_asset_id BIGINT NOT NULL,
        equipment_id BIGINT NOT NULL,
        transfer_points JSONB DEFAULT NULL,
        optimizer_run_id BIGINT DEFAULT NULL
    );

CREATE INDEX idx_transport_equipment_assignment ON transport_equipment_assignment (equipment_id);

CREATE TABLE
    PUBLIC.route_planned (
        route_id BIGINT PRIMARY KEY,
        transported_content_id BIGINT NOT NULL,
        leg_sequence JSONB DEFAULT NULL, -- location_id(s)
        origin_location_id BIGINT NOT NULL,
        destination_location_id BIGINT NOT NULL,
        distance_km NUMERIC(12, 2) DEFAULT 0,
        estimated_transit_time_in_days INTEGER DEFAULT NULL,
        planned_departure TIMESTAMP DEFAULT NULL,
        planned_arrival TIMESTAMP DEFAULT NULL,
        optimizer_run_id BIGINT DEFAULT NULL
    );

CREATE INDEX idx_route_origin_dest ON route_planned (origin_location_id, destination_location_id);

-- CREATE TABLE
-- PUBLIC.equipment_in_use (
-- equipment_in_use_id BIGINT PRIMARY KEY, -- equipment_content_id (Truck & Container?)
-- equipment_id BIGINT NOT NULL, -- Equipment planned to use
-- status TEXT,
-- assigned_route_id BIGINT,
-- departure_time TIMESTAMP,
-- capacity_used NUMERIC(12, 2),
-- total_weight NUMERIC(12, 2),
-- optimizer_run_id BIGINT,
-- shipment_date DATE,
-- estimated_arrival DATE
-- );
-- CREATE INDEX idx_equipment_status
-- ON equipment_in_use_container(status);

CREATE TABLE
    PUBLIC.handling_unit (
        handling_unit_id BIGINT PRIMARY KEY,
        equipment_id BIGINT,
        equipment_asset_id BIGINT,
        handling_unit_type TEXT DEFAULT 'PALLET',
        length_mm NUMERIC(10, 2),
        width_mm NUMERIC(10, 2),
        height_mm NUMERIC(10, 2),
        weight_kg NUMERIC(12, 3),
        max_supported_weight_kg NUMERIC(12, 3),
        label TEXT DEFAULT '',
        is_homogeneous BOOLEAN DEFAULT FALSE,
        optimizer_run_id BIGINT DEFAULT NULL
    );

CREATE INDEX idx_handling_equipment ON handling_unit (equipment_id);

CREATE TABLE
    PUBLIC.handling_unit_content (
        handling_unit_content_id BIGSERIAL PRIMARY KEY,
        handling_unit_id BIGINT NOT NULL,
        sku_id BIGINT NOT NULL,
        order_line_id BIGINT NOT NULL,
        actual_units INTEGER NOT NULL,
        total_weight NUMERIC(12, 2),
        is_stackable BOOLEAN DEFAULT TRUE,
        is_hazmat BOOLEAN DEFAULT FALSE,
        is_fragile BOOLEAN DEFAULT FALSE,
        optimizer_run_id BIGINT DEFAULT NULL
    );

CREATE INDEX idx_hu_content_handling ON handling_unit_content (handling_unit_id);

-- CREATE INDEX idx_hu_content_destination
-- ON handling_unit_content(destination_id);
CREATE TABLE
    PUBLIC.handling_unit_position (
        handling_unit_position_id BIGSERIAL PRIMARY KEY,
        equipment_id BIGINT NOT NULL, -- assigned_id
        handling_unit_id BIGINT NOT NULL,
        rotation_TYPE TEXT DEFAULT 'DEFAULT', -- COMMENT 'Options: (DEFAULT,  ROTATE_90 [SWAP_LENGTH_WIDTH], ROTATE_180 [STAND_ON_WIDTH], ROTATE_270 [STAND_ON_LENGTH], STAND_VERTICAL, INVERTED)',
        orientation_TYPE TEXT DEFAULT 'FRONT_FACING', -- COMMENT 'Options: FRONT_FACING, SIDE_FACING_LEFT, SIDE_FACING_RIGHT, REAR_FACING, TOP_UP, DOOR_ACCESS',
        position_x_mm NUMERIC(10, 2) DEFAULT 0,
        position_y_mm NUMERIC(10, 2) DEFAULT 0,
        position_z_mm NUMERIC(10, 2) DEFAULT 0,
        stop_sequence INTEGER DEFAULT -1,
        delivery_priority INTEGER DEFAULT 0,
        stack_number INTEGER DEFAULT 0,
        is_stacked BOOLEAN DEFAULT FALSE,
        stack_parent_id BIGINT DEFAULT -1,
        color TEXT DEFAULT '#ff000000',
        load_order INTEGER DEFAULT 0,
        unload_order INTEGER DEFAULT 0,
        axle_zone TEXT DEFAULT '',
        optimizer_run_id BIGINT DEFAULT NULL
    );

CREATE INDEX idx_hu_position_equipment ON handling_unit_position (equipment_id);

-- CREATE INDEX idx_hu_position_stop
-- ON handling_unit_position(stop_sequence);
CREATE TABLE
    PUBLIC.sku_unit_of_measure (
        sku_id BIGINT PRIMARY KEY,
        case_dimensions JSONB DEFAULT NULL,
        pallet_dimensions JSONB DEFAULT NULL,
        box_dimensions JSONB DEFAULT NULL,
        unit_count_in_case INTEGER DEFAULT 0,
        unit_count_in_pallet INTEGER DEFAULT 0,
        unit_count_in_box INTEGER DEFAULT 0,
        item_weight_in_kg float default 0,
        pallet_weight_in_kg float default 0
    );
CREATE TABLE
    PUBLIC.optimizer_run (
        optimizer_run_id BIGSERIAL PRIMARY KEY,
        optimizer_name TEXT DEFAULT '',
        optimization_goal TEXT DEFAULT '',
        execution_time_seconds NUMERIC(12, 2),
        optimization_score NUMERIC(12, 4),
        status TEXT DEFAULT 'YET TO START',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE
    public.lane_master (
        lane_id BIGSERIAL PRIMARY KEY,
        lane_name TEXT,
        lane_code TEXT UNIQUE,
        origin_location_id BIGINT NOT NULL,
        destination_location_id BIGINT NOT NULL,
        transport_asset_type TEXT NOT NULL DEFAULT 'TRACTOR', -- Needed asset type
        distance_km NUMERIC(12, 2) DEFAULT 0,
        estimated_transit_hours INTEGER DEFAULT 0,
        preferred_route_name TEXT DEFAULT '',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE
    public.lane_constraint (
        lane_constraint_id BIGSERIAL PRIMARY KEY,
        lane_id BIGINT NOT NULL,
        max_loaded_weight_kg NUMERIC(12, 2) DEFAULT 40000,
        max_loaded_height_mm INTEGER DEFAULT 4300,
        hazmat_allowed BOOLEAN DEFAULT TRUE,
        refrigeration_supported BOOLEAN DEFAULT TRUE,
        max_axle_weight_kg NUMERIC(12, 2) DEFAULT 30000,
        is_active BOOLEAN DEFAULT TRUE
    );

-- CREATE INDEX idx_optimizer_status
-- ON optimizer_run(status);
CREATE TABLE
    PUBLIC.parameter_admin (
        optimizer_run_id BIGSERIAL PRIMARY KEY,
        optimizer_name jsonb DEFAULT NULL
    );

--- Adding Comments
Comment on column PUBLIC.item_master.length_mm is 'In millimeter (mm)';

Comment on column PUBLIC.item_master.width_mm is 'In millimeter (mm)';

Comment on column PUBLIC.item_master.height_mm is 'In millimeter (mm)';

Comment on column PUBLIC.item_master.weight_kg is 'In kilograms (kg)';

-- Comment on column PUBLIC.item_master.volume_mm3 is 'In cubic millimeter';

Comment on column PUBLIC.item_master.temperature_min_c is 'In Celsius';

Comment on column PUBLIC.item_master.temperature_max_c is 'In Celsius';

Comment on column PUBLIC.handling_unit_position.position_x_mm is 'In millimeter (mm)';

Comment on column PUBLIC.handling_unit_position.position_y_mm is 'In millimeter (mm)';

Comment on column PUBLIC.handling_unit_position.position_z_mm is 'In millimeter (mm)';

Comment on column PUBLIC.load_equipment_metadata.length_mm is 'In millimeter (mm)';

Comment on column PUBLIC.load_equipment_metadata.width_mm is 'In millimeter (mm)';

Comment on column PUBLIC.load_equipment_metadata.height_mm is 'In millimeter (mm)';

Comment on column PUBLIC.load_equipment_metadata.internal_length_mm is 'In millimeter (mm)';

Comment on column PUBLIC.load_equipment_metadata.internal_width_mm is 'In millimeter (mm)';

Comment on column PUBLIC.load_equipment_metadata.internal_height_mm is 'In millimeter (mm)';

Comment on column PUBLIC.load_equipment_metadata.max_payload_weight_kg is 'In kilograms (kg)';

Comment on column PUBLIC.load_equipment_metadata.tare_weight_kg is 'In kilograms (kg)';

-- Comment on column PUBLIC.load_equipment_metadata.max_volume_mm3 is 'In Cubic millimeter';

Comment on column PUBLIC.load_equipment_metadata.door_width_mm is 'In millimeter (mm)';

Comment on column PUBLIC.load_equipment_metadata.door_height_mm is 'In millimeter (mm)';

Comment on column PUBLIC.handling_unit_position.rotation_TYPE is 'Options: (DEFAULT,  ROTATE_90 [SWAP_LENGTH_WIDTH], ROTATE_180 [STAND_ON_WIDTH], ROTATE_270 [STAND_ON_LENGTH], STAND_VERTICAL, INVERTED)';

Comment on column PUBLIC.handling_unit_position.orientation_TYPE is 'Options: FRONT_FACING, SIDE_FACING_LEFT, SIDE_FACING_RIGHT, REAR_FACING, TOP_UP, DOOR_ACCESS';
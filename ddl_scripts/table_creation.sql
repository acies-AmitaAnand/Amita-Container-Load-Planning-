-- use database inventory_management;

-- use schema public;

CREATE TABLE
    PUBLIC.item_master (
    sku_id BIGINT PRIMARY KEY,
    sku_name TEXT NOT NULL,
    length NUMERIC(10, 2) NOT NULL,
    width NUMERIC(10, 2) NOT NULL,
    height NUMERIC(10, 2) NOT NULL,
    weight NUMERIC(10, 2) NOT NULL,
    volume NUMERIC(12, 4),
    stacking_limit INTEGER DEFAULT 0,
    can_rotate BOOLEAN DEFAULT TRUE,
    temperature_min NUMERIC(10, 2),
    temperature_max NUMERIC(10, 2),
    hazmat_class INTEGER,
    fragility_rating INTEGER DEFAULT 0,
    shelf_life_days INTEGER,
    is_food_grade BOOLEAN DEFAULT FALSE,
    is_regulated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- CREATE INDEX idx_item_master_hazmat
-- ON item_master(hazmat_class);
-- CREATE INDEX idx_item_master_temperature
-- ON item_master(temperature_min, temperature_max);

CREATE TABLE
    PUBLIC.shipment_plans (
        order_line_id BIGINT PRIMARY KEY,
        shipment_id BIGINT NOT NULL,
        sku_id BIGINT NOT NULL,
        origin_id BIGINT,
        destination_id BIGINT NOT NULL,
        estimated_delivery_date DATE,
        actual_delivery_date DATE,
        planned_quantity INTEGER NOT NULL,
        shipped_quantity INTEGER DEFAULT 0,
        weight_in_kg NUMERIC(12, 2),
        priority INTEGER DEFAULT 0,
        temperature_requirement BOOLEAN DEFAULT FALSE,
        special_handling BOOLEAN DEFAULT FALSE,
        requested_transport_mode TEXT,
        max_transit_time_in_days INTEGER,
        service_level INTEGER,
        unload_sequence_preference INTEGER,
        optimizer_run_id BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX idx_shipment_destination
ON shipment_plans(destination_id);

-- CREATE INDEX idx_shipment_priority
-- ON shipment_plans(priority);

CREATE INDEX idx_shipment_sku
ON shipment_plans(sku_id);

CREATE TABLE
    PUBLIC.transport_mode_metadata (
        transport_mode_id BIGINT PRIMARY KEY,
        transport_type TEXT NOT NULL,
        transport_name TEXT NOT NULL,
        axle_count INTEGER,
        supports_refrigeration BOOLEAN DEFAULT FALSE,
        supports_hazmat BOOLEAN DEFAULT FALSE,
        max_weight NUMERIC(12, 2),
        max_volume NUMERIC(12, 2),
        cost_per_km NUMERIC(12, 4),
        average_speed NUMERIC(10, 2),
        carbon_emission_factor NUMERIC(12, 4)
    );

CREATE TABLE
    PUBLIC.location (
        location_id BIGINT PRIMARY KEY,
        location_type TEXT,
        latitude NUMERIC(10, 6),
        longitude NUMERIC(10, 6),
        location_name TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        country TEXT,
        postal_code TEXT,
        dock_count INTEGER DEFAULT 1,
        storage_type TEXT,
        temperature_capability BOOLEAN DEFAULT FALSE,
        operating_hours TEXT
    );

CREATE INDEX idx_location_geo
ON location(latitude, longitude);

CREATE TABLE
    PUBLIC.equipment_metadata (
        equipment_id BIGINT PRIMARY KEY,
        equipment_name TEXT NOT NULL,
        equipment_type TEXT NOT NULL,
        length NUMERIC(10, 2), -- Outer box
        width NUMERIC(10, 2), -- Outer box
        height NUMERIC(10, 2), -- Outer box
        internal_length NUMERIC(10, 2),
        internal_width NUMERIC(10, 2),
        internal_height NUMERIC(10, 2),
        max_payload_weight NUMERIC(12, 2),
        tare_weight NUMERIC(12, 2),
        max_volume NUMERIC(12, 2),
        unit TEXT,
        door_width NUMERIC(10, 2),
        door_height NUMERIC(10, 2),
        refrigeration_capable BOOLEAN DEFAULT FALSE,
        temperature_min NUMERIC(10, 2),
        temperature_max NUMERIC(10, 2),
        max_stack_height NUMERIC(10, 2),
        axle_configuration JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- CREATE INDEX idx_equipment_type
-- ON equipment_metadata(equipment_type);

CREATE TABLE
    PUBLIC.transported_content (
        transported_content_id BIGSERIAL PRIMARY KEY,
        transport_mode_id BIGINT NOT NULL,
        equipment_id BIGINT NOT NULL,
        transfer_points JSONB,
        optimizer_run_id BIGINT
    );

CREATE INDEX idx_transported_equipment
ON transported_content(equipment_id);

CREATE TABLE
    PUBLIC.route_planned (
        route_id BIGINT PRIMARY KEY,
        transportation_mode_id BIGINT NOT NULL,
        leg_sequence JSONB,
        origin_id BIGINT NOT NULL,
        destination_id BIGINT NOT NULL,
        distance_km NUMERIC(12, 2),
        estimated_transit_time_in_days INTEGER,
        planned_departure TIMESTAMP,
        planned_arrival TIMESTAMP,
        optimizer_run_id BIGINT
    );

CREATE INDEX idx_route_origin_dest
ON route_planned(origin_id, destination_id);

CREATE TABLE
    PUBLIC.equipment_in_use_container (
        equipment_mode_id BIGINT PRIMARY KEY,
        equipment_id BIGINT NOT NULL,
        status TEXT,
        assigned_route_id BIGINT,
        departure_time TIMESTAMP,
        capacity_used NUMERIC(12, 2),
        total_weight NUMERIC(12, 2),
        optimizer_run_id BIGINT,
        shipment_date DATE,
        estimated_arrival DATE
    );

-- CREATE INDEX idx_equipment_status
-- ON equipment_in_use_container(status);

CREATE TABLE
    PUBLIC.handling_unit (
        handling_unit_id BIGINT PRIMARY KEY,
        equipment_id BIGINT,
        handling_unit_type TEXT DEFAULT 'PALLET',
        length NUMERIC(10, 2),
        width NUMERIC(10, 2),
        height NUMERIC(10, 2),
        weight NUMERIC(12, 2),
        max_supported_weight NUMERIC(12, 2),
        label TEXT,
        is_homogeneous BOOLEAN DEFAULT FALSE,
        optimizer_run_id BIGINT
    );

CREATE INDEX idx_handling_equipment
ON handling_unit(equipment_id);

CREATE TABLE
    PUBLIC.handling_unit_content (
        handling_unit_content_id BIGSERIAL PRIMARY KEY,
        handling_unit_id BIGINT NOT NULL,
        sku_id BIGINT NOT NULL,
        shipment_id BIGINT NOT NULL,
        destination_id BIGINT NOT NULL,
        actual_units INTEGER NOT NULL,
        total_weight NUMERIC(12, 2),
        is_stackable BOOLEAN DEFAULT TRUE,
        is_hazmat BOOLEAN DEFAULT FALSE,
        is_fragile BOOLEAN DEFAULT FALSE,
        optimizer_run_id BIGINT
    );

CREATE INDEX idx_hu_content_handling
ON handling_unit_content(handling_unit_id);

-- CREATE INDEX idx_hu_content_destination
-- ON handling_unit_content(destination_id);

CREATE TABLE
    PUBLIC.handling_unit_position (
        handling_unit_position_id BIGSERIAL PRIMARY KEY,
        equipment_id BIGINT NOT NULL,
        handling_unit_id BIGINT NOT NULL,
        rotation TEXT,
        orientation TEXT,
        position_x NUMERIC(10, 2),
        position_y NUMERIC(10, 2),
        position_z NUMERIC(10, 2),
        stop_sequence INTEGER,
        delivery_priority INTEGER,
        stack_number INTEGER,
        is_stacked BOOLEAN DEFAULT FALSE,
        stack_parent_id BIGINT,
        color TEXT,
        load_order INTEGER,
        unload_order INTEGER,
        axle_zone TEXT,
        optimizer_run_id BIGINT
    );

CREATE INDEX idx_hu_position_equipment
ON handling_unit_position(equipment_id);

-- CREATE INDEX idx_hu_position_stop
-- ON handling_unit_position(stop_sequence);

CREATE TABLE
    PUBLIC.sku_unit_of_measure (
        sku_id BIGINT PRIMARY KEY,
        case_dimensions JSONB,
        pallet_dimensions JSONB,
        box_dimensions JSONB,
        unit_count_in_case INTEGER,
        unit_count_in_pallet INTEGER,
        unit_count_in_box INTEGER
    );

CREATE TABLE
    PUBLIC.optimizer_run (
        optimizer_run_id BIGINT PRIMARY KEY,
        optimizer_name TEXT,
        optimization_goal TEXT,
        execution_time_seconds NUMERIC(12, 2),
        optimization_score NUMERIC(12, 4),
        status TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- CREATE INDEX idx_optimizer_status
-- ON optimizer_run(status);
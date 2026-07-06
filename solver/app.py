from __future__ import annotations

import pandas as pd

from logging import getLogger

## Classes
import math
import pandas as pd

##
from planning_engine.placement_engine.placement import run_full_optimization
from planning_engine.export_results import export_container_json
from utils.measure_conversion import *

logger = getLogger("main application")
### NeonDB Connection
import database.helper as db_helper
db_conn = db_helper.create_connection()

## Loading Data
item_master_df = db_helper.fetch_data(sql="select * from inventory_management.public.item_master", connection=db_conn)
lane_master_df = db_helper.fetch_data(sql="select * from inventory_management.public.lane_master", connection=db_conn)
location_df = db_helper.fetch_data(sql="select * from inventory_management.public.location", connection=db_conn)

shipment_demand_df = db_helper.fetch_data(sql="select * from inventory_management.public.shipment_plans", connection=db_conn)
sku_uom_df = db_helper.fetch_data(sql="select * from inventory_management.public.sku_unit_of_measure", connection=db_conn)
load_equipment_metadata_df = db_helper.fetch_data(sql="select * from inventory_management.public.load_equipment_metadata", connection=db_conn)

transport_asset_df = db_helper.fetch_data(sql="select * from inventory_management.public.transport_asset", connection=db_conn)
sku_uom_df = pd.concat(
    [
        sku_uom_df,
        sku_uom_df['pallet_dimensions'].apply(pd.Series)
    ],
    axis=1
)

# File filter:
shipment_demand_df['estimated_delivery_date'] = pd.to_datetime(shipment_demand_df["estimated_delivery_date"], errors="coerce")
shipment_demand_df = shipment_demand_df[shipment_demand_df['estimated_delivery_date']>=pd.to_datetime('2026-04-10')]

sku_uom_column_mapper = {x:x for x in sku_uom_df.columns}
sku_uom_column_mapper['height_mm'] = 'pallet_height_mm'
sku_uom_column_mapper['width_mm'] = 'pallet_width_mm'
sku_uom_column_mapper['length_mm'] = 'pallet_length_mm'
sku_uom_df.rename(columns=sku_uom_column_mapper, inplace=True)

shipment_demand_df = shipment_demand_df[(shipment_demand_df['origin_location_id']=='151') & (shipment_demand_df['destination_location_id']=='0720')]


result = run_full_optimization(
    shipment_demand_df=shipment_demand_df,
    sku_pallet_df=sku_uom_df,
    load_equipment_metadata_df=load_equipment_metadata_df,
    lane_master_df=lane_master_df,
    preferred_equipment_type='CONTAINER',
    lifo=True,
    # optimizer="MAX_RECT_PACKER",
)

paths = export_container_json(fleet_result=result, out_dir="./output")

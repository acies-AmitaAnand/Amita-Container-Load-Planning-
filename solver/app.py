


import pandas as pd


from logging import getLogger

## Classes




from __future__ import annotations
import math
import pandas as pd

##
from planning_engine.reference.container_optimizer import run_full_optimization
from utils.measure_conversion import *

logger = getLogger("load_planner")
### NeonDB Connection
import database.helper as db_helper
db_conn = db_helper.create_connection()

## Loading Data
item_master_df = db_helper.fetch_data(sql="select * from inventory_management.public.item_master", connection=db_conn)
lane_master_df = db_helper.fetch_data(sql="select * from inventory_management.public.lane_master", connection=db_conn)
load_equipment_metadata_df = db_helper.fetch_data(sql="select * from inventory_management.public.load_equipment_metadata", connection=db_conn)
location_df = db_helper.fetch_data(sql="select * from inventory_management.public.location", connection=db_conn)
shipment_demand_df = db_helper.fetch_data(sql="select * from inventory_management.public.shipment_plans", connection=db_conn)
sku_uom_df = db_helper.fetch_data(sql="select * from inventory_management.public.sku_unit_of_measure", connection=db_conn)
transport_asset_df = db_helper.fetch_data(sql="select * from inventory_management.public.transport_asset", connection=db_conn)
sku_uom_df = pd.concat(
    [
        sku_uom_df,
        sku_uom_df['pallet_dimensions'].apply(pd.Series)
    ],
    axis=1
)

sku_uom_column_mapper = {x:x for x in sku_uom_df.columns}
sku_uom_column_mapper['height_mm'] = 'pallet_height_mm'
sku_uom_column_mapper['width_mm'] = 'pallet_width_mm'
sku_uom_column_mapper['length_mm'] = 'pallet_length_mm'
sku_uom_df.rename(columns=sku_uom_column_mapper, inplace=True)


result = run_full_optimization(
    shipment_demand_df=shipment_demand_df,
    sku_pallet_df=sku_uom_df,
    load_equipment_metadata_df=load_equipment_metadata_df,
    lane_master_df=lane_master_df,
    preferred_equipment_type='CONTAINER',
    optimizer="SKYLINE",
    fleet_limit=10,# Truck & Container limit               # 10 trucks total, all groups
    avg_pallets_per_container=20, # tune to your actual pallet density
    lifo=True,
)
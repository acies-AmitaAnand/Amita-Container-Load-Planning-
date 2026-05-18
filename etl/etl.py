import numpy as np
from sqlalchemy import create_engine
from dotenv import load_dotenv
import os
import pandas as pd


def load_csv(path):

    df = pd.read_csv(path)

    # standardize columns

    df.columns = [

        c.strip()
        .lower()
        .replace(" ", "_")
        .replace("-", "_")

        for c in df.columns
    ]

    return df


# ==========================================
# ITEM MASTER
# ==========================================

def transform_item_master(df):

    output = pd.DataFrame()

    output["sku_id"] = (
        df.index + 1
    )

    output["sku_name"] = (
        df["sku_name"]
        .fillna("")
    )

    output["length_mm"] = (
        df.get("length", 0)
        .fillna(0) * 25.4
    )

    output["width_mm"] = (
        df.get("width", 0)
        .fillna(0) * 25.4
    )

    output["height_mm"] = (
        df.get("height", 0)
        .fillna(0) * 25.4
    )

    output["weight_kg"] = (
        df.get("weight", 0)
        .fillna(0)
    )

    output["volume_mm3"] = (

        output["length_mm"] *

        output["width_mm"] *

        output["height_mm"]
    )

    output["temperature_min_c"] = 0

    output["temperature_max_c"] = 30

    output["hazmat_class"] = 0

    output["fragility_rating"] = 1

    output["shelf_life_days"] = 90

    output["is_food_grade"] = False

    output["is_regulated"] = False

    return output


# ==========================================
# SHIPMENT PLANS
# ==========================================

def transform_shipment_plans(df):

    output = pd.DataFrame()

    output["shipment_id"] = (
        df["shipment_id"]
        .astype(str)
    )

    output["sku_id"] = (
        df["sku_id"]
    )

    output["from_location_id"] = (
        df.get(
            "from_location",
            "WH_001"
        )
    )

    output["to_location_id"] = (
        df.get(
            "to_location",
            "STORE_001"
        )
    )

    output["planned_quantity"] = (
        df.get(
            "quantity",
            1
        )
    )

    output["weight_kg"] = (
        df.get(
            "weight_kg",
            0
        )
    )

    output["priority"] = (
        df.get(
            "priority",
            1
        )
    )

    output["requested_transport_mode"] = (
        "TRUCK"
    )

    output["temperature_requirement"] = False

    output["special_handling"] = False

    output["max_transit_time_in_days"] = 2

    output["service_level"] = 1

    return output


# ==========================================
# LOCATION
# ==========================================

def transform_locations(df):

    locations = []

    unique_locations = pd.concat([

        df["from_location_id"],

        df["to_location_id"]

    ]).drop_duplicates()

    for loc in unique_locations:

        locations.append({

            "location_id": loc,

            "location_name": loc,

            "location_type": "WAREHOUSE",

            "latitude": 0,

            "longitude": 0
        })

    return pd.DataFrame(locations)


load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL"
)

engine = create_engine(
    DATABASE_URL
)


# ==========================================
# LOAD FILES
# ==========================================

item_master_df = load_csv(
    "data/item master.csv"
)

shipment_df = load_csv(
    "data/shipment details.csv"
)

priority_df = load_csv(
    "data/shipment priority.csv"
)

route_df = load_csv(
    "data/route master.csv"
)

lane_df = load_csv(
    "data/lane transmode route.csv"
)

tlb_details_df = load_csv(
    "data/tlb output details.csv"
)

tlb_header_df = load_csv(
    "data/tlb output header2.csv"
)

# ==========================================
# TRANSFORM
# ==========================================

item_master = transform_item_master(
    item_master_df
)

shipment_plans = (
    transform_shipment_plans(
        shipment_df
    )
)

locations = transform_locations(
    shipment_plans
)

# ==========================================
# LOAD TO DATABASE
# ==========================================

item_master.to_sql(

    "item_master",

    engine,

    if_exists="append",

    index=False
)

shipment_plans.to_sql(

    "shipment_plans",

    engine,

    if_exists="append",

    index=False
)

locations.to_sql(

    "location",

    engine,

    if_exists="append",

    index=False
)

print(
    "ETL Completed Successfully"
)

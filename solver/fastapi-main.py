from typing import Optional

from fastapi import FastAPI, File, UploadFile
app = FastAPI(title='Inventory Management - Container Placement', version='0.0.1',debug=True)


@app.get("/")
async def root():
    return {"Message": "Hello"}


@app.post(path="/item_master", name="Item Master")
async def root(csv_file:Optional[UploadFile]):
    import pandas as pd
    from io import BytesIO
    columns_not_match = True
    if not csv_file.filename.endswith(".csv"):
        return {"Error": {"Message": "Upload `csv_file` with `.csv` extension"}}
    if csv_file is None:
        return {"Error": {"Message": "Upload `csv_file` argument with `Item Master` data having the following columns", "columnList": ["sku_id", "sku_name", "length_mm", "width_mm", "height_mm", "weight_kg", "stacking_limit", "can_rotate", "temperature_min_c", "temperature_max_c", "hazmat_class", "fragility_rating", "shelf_life_days", "is_food_grade", "is_regulated", "created_at", ]}}
    data = None
    required_columns = ["sku_id", "sku_name", "length_mm", "width_mm", "height_mm", "weight_kg", "stacking_limit", "can_rotate", "temperature_min_c", "temperature_max_c", "hazmat_class", "fragility_rating", "shelf_life_days", "is_food_grade", "is_regulated", "created_at", ]
    try:
        data = pd.read_csv(BytesIO(await csv_file.read()))
    except Exception as read_error:
        return {"Error": {"Message": "Error reading `csv_file` argument for `Item Master`", "error": f"{read_error}"}}
    missing_columns = set(required_columns) - set(data.columns.to_list())
    if len(missing_columns)>0:
        return {"Error": {"Message": "Upload `csv_file` argument with `Item Master` data having the following columns", "columnList": {tuple(required_columns)}, "missing columns": tuple(missing_columns)}}
    return {"Message": "Uploaded to Database"}




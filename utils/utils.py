

from functools import wraps
from time import time

import numpy as np
import pandas as pd


def timing(f):
    @wraps(f)
    def wrap(*args, **kw):
        ts = time()
        result = f(*args, **kw)
        te = time()
        print("func:%r took: %2.4f sec" % (f.__name__, te - ts))
        return result

    return wrap


def check_null(number):
    if isinstance(number, str):
        if str(number).lower() in {"nan", "none", "", "nat", "'none'"}:
            return True
    if isinstance(number, list):
        return len(number) == 0 or number is None
    if isinstance(number, dict):
        return len(number) == 0 or number is None
    if isinstance(number, np.ndarray):
        return len(number) == 0 or number is None
    if pd.isnull(number) or np.nan == number or number == None or pd.isna(number):
        return True
    return False


def coalesce(*args):
    for arg in args:
        if not check_null(arg):
            return arg
    return None


def get_or_default(row, key, default):
    return row[key] if (key in row and not check_null(row[key])) else default

def transform_table_to_json_for_dropdowns(
    dataframe: pd.DataFrame,
    key_column_name: str,
    value_column_name: str,
):
    try:
        if dataframe is None or not isinstance(dataframe, pd.DataFrame):
            return {}
        _columns_ = set(dataframe.columns.tolist())
        if dataframe.empty:
            return {}
        if key_column_name not in _columns_ or value_column_name not in _columns_:
            return {}
        return dataframe.groupby(key_column_name)[value_column_name].apply(list).to_dict()
    except Exception:
        return {}
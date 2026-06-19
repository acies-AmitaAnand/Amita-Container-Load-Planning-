import pandas as pd
    
def mm_to_cm(series):
    """
    Convert millimeters to centimeters.

    Input:
        Pandas Series

    Returns:
        Pandas Series
    """

    return series.astype(float) / 10

def calculate_volume_m3(
    length_mm,
    width_mm,
    height_mm
):
    """
    Calculate cubic meters from
    millimeter dimensions.

    Accepts Pandas Series.
    """

    return (
        length_mm.astype(float)
        * width_mm.astype(float)
        * height_mm.astype(float)
    ) / 1_000_000_000
    
def mm3_to_m3(volume_mm3):

    return volume_mm3.astype(float) / 1_000_000_000

def calculate_pallet_floor_area_m2(
    length_mm,
    width_mm
):
    return (
        length_mm * width_mm
    ) / 1_000_000

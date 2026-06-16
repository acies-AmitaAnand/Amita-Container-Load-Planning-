from utils.PydanticBaseModel import PydanticBaseModel


class UtilizationMetrics(PydanticBaseModel):
    weightUtilization_pct: float
    volumeUtilization_pct: float
    floorAreaUtilization_pct: float
    loadedPallets: int
    totalPallets: int
    usedWeightIn_kg: float
    usedVolumeIn_m3: float
    usedFloorAreaIn_m2: float
    maxWeightIn_kg: float
    maxVolumeIn_m3: float
    maxFloorAreaIn_m2: float
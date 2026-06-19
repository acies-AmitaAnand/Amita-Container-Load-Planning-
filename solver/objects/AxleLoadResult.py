from utils.PydanticBaseModel import PydanticBaseModel


class AxleLoadResult(PydanticBaseModel):
    axleId: str
    currentLoad_kg: float
    maxLoad_kg: float
    utilization_pct: float
    isOverloaded: bool

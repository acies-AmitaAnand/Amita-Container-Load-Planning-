from utils.PydanticBaseModel import PydanticBaseModel


class RemainingCapacity(PydanticBaseModel):
    remainingWeight_kg: float
    remainingVolume_m3: float
    remainingFloorArea_m2: float

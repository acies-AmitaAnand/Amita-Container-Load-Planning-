

from typing import List

from pydantic import Field
from utils.PydanticBaseModel import PydanticBaseModel



class Axle(PydanticBaseModel):
    axleId: str = Field(default='DEFAULT', description="Axle name")
    maxWeight: float = Field(default=30000.0, description="Max axle weight in kg")
    positionX: float = Field(
        default=1371.6, description="Axle longitudinal position from front in mm"
    )
    currentLoad: float = Field(default=0.0, description="Current axle load in kg")
    utilizationPct: float = 0

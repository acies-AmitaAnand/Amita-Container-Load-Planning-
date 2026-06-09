

from typing import List

from pydantic import Field
from utils.PydanticBaseModel import PydanticBaseModel



class Axle(PydanticBaseModel):
    axleId: str = Field(default='DEFAULT', description="Axle name")
    maxWeight: float = Field(default=30000, description="Maximum weight of axle in kilogram (kg)")
    positionX: float = Field(default=1371.6, description="Axle position from the front in millimeter (mm)")
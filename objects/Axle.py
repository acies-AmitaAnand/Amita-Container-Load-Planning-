

from typing import List

from pydantic import Field
from utils.PydanticBaseModel import PydanticBaseModel



class Axle(PydanticBaseModel):
    axleId: str = Field(default='DEFAULT', description="Axle name")
    maxWeightIn_kg: float = Field(default=30000, description="Maximum weight of axle in kilogram (kg)")
    positionXFromFrontIn_mm: float = Field(default=1371.6, description="Axle position from the front in millimeter (mm)")
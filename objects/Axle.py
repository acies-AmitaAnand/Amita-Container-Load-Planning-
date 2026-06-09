

from typing import List

from pydantic import Field
from utils.PydanticBaseModel import PydanticBaseModel



class Axle(PydanticBaseModel):
    axleId: str = Field(description="Axle name")
    maxWeight: float = Field(description="Maximum weight")
    positionX: float = Field(description="Axle position")
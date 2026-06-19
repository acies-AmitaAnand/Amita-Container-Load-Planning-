

from pydantic import Field

from utils.PydanticBaseModel import PydanticBaseModel


class Position(PydanticBaseModel):
    x: int = Field(default=-1, description="Width axis (left→right) in mm")   # Three.js x
    y: int = Field(default=-1, description="Height axis (floor→ceiling) in mm") # Three.js y  
    z: int = Field(default=-1, description="Depth axis (door→back) in mm")    # Three.js z
    orientation: str = Field(default='FRONT_FACING')
    
    # Effective placed dimensions after orientation is applied.
    # React MUST use these for Box args and centre-offset math, NOT pallet.dimensions.*
    effectiveWidth: int = Field(default=-1, description="Actual x-axis footprint in mm after rotation")
    effectiveDepth: int = Field(default=-1, description="Actual z-axis footprint in mm after rotation")
    effectiveHeight: int = Field(default=-1, description="Actual y-axis footprint in mm (unchanged)")

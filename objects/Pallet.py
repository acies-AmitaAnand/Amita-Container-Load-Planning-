

from pydantic import Field

from objects.Dimension import Dimension
from objects.Position import Position
from utils.PydanticBaseModel import PydanticBaseModel


class Pallet(PydanticBaseModel):
    dimensions: Dimension
    position: Position
    label: str = Field(default="", description="Label for displaying")
    color: str = Field(default="FF0000", description="Hex color code")
    weightIn_kg: float = Field(default=0, description="Weight of the pallet")
    floorArea_m2: float = Field(default=0, description="Floor occupancy in meter^2")
    volume_m3: float = Field(default=0, description="Volume of pallet in meter^3")

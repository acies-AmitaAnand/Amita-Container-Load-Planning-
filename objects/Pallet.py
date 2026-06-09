

from pydantic import Field

from objects.Dimension import Dimension
from objects.Position import Position
from utils.PydanticBaseModel import PydanticBaseModel


class Pallet(PydanticBaseModel):
    dimensions: Dimension
    position: Position
    label: str = Field(default="", description="Label for displaying")
    color: str = Field(default="FF0000", description="Hex color code")
    


from pydantic import Field

from utils.PydanticBaseModel import PydanticBaseModel


class Position(PydanticBaseModel):
    x: int = Field(description="Position `x` in millimeter")
    y: int = Field(description="Position `y` in millimeter")
    z: int = Field(description="Position `z` in millimeter")

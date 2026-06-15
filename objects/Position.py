

from pydantic import Field

from utils.PydanticBaseModel import PydanticBaseModel


class Position(PydanticBaseModel):
    x: int = Field(default=-1, description="Position `x` in millimeter")
    y: int = Field(default=-1, description="Position `y` in millimeter")
    z: int = Field(default=-1, description="Position `z` in millimeter")
    orientation: str = Field(default='FRONT_FACING', description='Options: `["FRONT_FACING", "SIDE_FACING_LEFT", "SIDE_FACING_RIGHT", "REAR_FACING", "TOP_UP", "DOOR_ACCESS"]')

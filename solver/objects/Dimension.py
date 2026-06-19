

from pydantic import Field

from utils.PydanticBaseModel import PydanticBaseModel


class Dimension(PydanticBaseModel):
    depth: int = Field(description="Dimension `depth` in millimeter")
    width: int = Field(description="Dimension `width` in millimeter")
    height: int = Field(description="Dimension `height` in millimeter")
    
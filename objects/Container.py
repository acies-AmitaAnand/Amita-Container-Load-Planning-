

from typing import List

from pydantic import Field
from objects.ContainerSummary import ContainerSummary
from objects.ContainerLoadingRules import ContainerLoadingRules
from utils.PydanticBaseModel import PydanticBaseModel

from objects.Axle import Axle
from objects.Pallet import Pallet


class Container(PydanticBaseModel):
	containerId: str = Field(default='2', description="Container ID. Example: CONT_001")
	containerType: str = Field(default='CONTAINER 40FT GP', description="Container type. Example: `53FT_DRY_VAN`") # "53FT_DRY_VAN"
	depth: float = Field(default=12192, description="Outer measure of `length` in mm")
	width: float = Field(default=2438, description="Outer measure of `width` in mm")
	height: float = Field(default=2591, description="Outer measure of `height` in mm")
	internal_depth: float = Field(default=12031, description="Internal length. Measurement in mm")
	internal_width: float = Field(default=2352, description="Internal width. Measurement in mm")
	internal_height: float = Field(default=2393, description="Internal height. Measurement in mm")
	maxPayloadWeight: float = Field(default=25000, description="Maximum payload weight. Measurement in kg")
	tareWeight: float = Field(default=0, description="Measurement in kg")
	maxVolume: float = Field(default=-1, description="Measurement in {m^3}") # 3816,
	unit: str = Field(default='mm', description="Unit of measure mm")
	door_width: float = Field(default=2280, description="Door width. Measurement in mm")
	door_height: float = Field(default=2340, description="Door height. Measurement in mm")
	axles: List[Axle] = Field(default=[Axle()], description="Container axle positions")
	pallets: List[Pallet]
	summary: ContainerSummary = ContainerSummary()
	loadingRules: ContainerLoadingRules = ContainerLoadingRules()

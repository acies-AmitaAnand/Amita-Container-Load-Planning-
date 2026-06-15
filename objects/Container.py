

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
	depth: float = Field(default=12191, description="Outer measure of `length` in mm")
	width: float = Field(default=2438, description="Outer measure of `width` in mm")
	height: float = Field(default=2591, description="Outer measure of `height` in mm")
	internalDepth: float = Field(default=11836, description="Internal length. Measurement in mm")
	internalWidth: float = Field(default=2352, description="Internal width. Measurement in mm")
	internalHeight: float = Field(default=2391, description="Internal height. Measurement in mm")
	maxPayloadWeightIn_kg: float = Field(default=25000, description="Maximum payload weight. Measurement in kg")
	tareWeightIn_kg: float = Field(default=0, description="Measurement in kg")

	currentVolume_m3: float = Field(default=0, description="Measurement in {m^3}") # 3816,
	unit: str = Field(default='mm', description="Unit of measure mm")
	doorWidth: float = Field(default=2352, description="Door width. Measurement in mm")
	doorHeight: float = Field(default=2391, description="Door height. Measurement in mm")
	axles: List[Axle] = Field(default=[Axle()], description="Container axle positions")
	pallets: List[Pallet]
	summary: ContainerSummary = ContainerSummary()
	loadingRules: ContainerLoadingRules = ContainerLoadingRules()

	maxFloorArea_m2: float = Field(default=0)
	maxVolume_m3: float = Field(default=0, description="Measurement in {m^3}") # 3816,

	# State management
	usedWeightIn_kg: float = 0
	usedFloorArea_m2: float = 0
	usedVolume_m3: float = 0
	currentDepthPosition_mm: int = 0
	currentWidthPosition_mm: int = 0
	currentRowDepth_mm: int = 0
	loadedPallets: int = 0

	def model_post_init(self, __context) -> None:

		self.maxFloorArea_m2 = (
			self.internalDepth
			*
			self.internalWidth
		) / 1_000_000

		self.maxVolume_m3 = (
			self.internalDepth
			*
			self.internalWidth
			*
			self.internalHeight
		) / 1_000_000_000

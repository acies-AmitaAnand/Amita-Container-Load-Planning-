

from typing import List

from pydantic import Field
from objects.ContainerSummary import ContainerSummary
from objects.ContrainerLoadingRules import ContainerLoadingRules
from utils.PydanticBaseModel import PydanticBaseModel

from objects.Axle import Axle
from objects.Pallet import Pallet


class Container(PydanticBaseModel):
    containerId: str =Field(description="Example: CONT_001")
    containerType: str = Field(description="Container type") # "53FT_DRY_VAN"
    length: float = Field(description="Measurement in mm") # 53, // ft
    width: float = Field(description="Measurement in mm") # 8 // ft
    height: float = Field(description="Measurement in mm") # 9 // ft
    maxPayloadWeight: float = Field(description="Measurement in kg") # 45000
    tareWeight: float = Field(description="Measurement in kg") # 15000,
    maxVolume: float = Field(description="Measurement in {m^3}") # 3816,
    unit: str = Field(default='mm', description="Unit of measure mm")
    axles: List[Axle] 
    summary: ContainerSummary
    pallets: List[Pallet]
    loadingRules: ContainerLoadingRules
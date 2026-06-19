

from datetime import datetime
import uuid

from pydantic import Field

from solver.objects.Dimension import Dimension
from solver.objects.Position import Position
from utils.PydanticBaseModel import PydanticBaseModel


class Pallet(PydanticBaseModel):
    candidatePalletId: str = Field(
        default_factory=lambda: f"PLT_{uuid.uuid4().hex[:8].upper()}"
    )
    shipmentId: str
    skuId: str
    originLocationId: str
    destinationLocationId: str
    estimatedDeliveryDate: datetime
    
    dimensions: Dimension
    position: Position = Field(default_factory=Position)

    label: str = Field(default="", description="Label for displaying")
    color: str = Field(default="#FF0000", description="Hex color code")
    weightIn_kg: float = Field(default=0, description="Weight of the pallet")
    floorArea_m2: float = Field(default=0, description="Floor occupancy in meter^2")
    volume_m3: float = Field(default=0, description="Volume of pallet in meter^3")

    priority: int = 0
    serviceLevel: int = 0
    unitsInPallet: int = 0
    isPartialPallet: bool = False
    fillPct: float = 1.0
    loadedToContainer: bool = False
    rejectionReason: str = ""

    unloadSequence: int = Field(default=0, description="LIFO unload order (1=first out)")
    destinationStop: int = Field(default=0, description="Multi-stop destination index")
    isFragile: bool = False
    isHazmat: bool = False
    temperatureRequirement: str = Field(default="ambient")

    def model_post_init(self, __context) -> None:
        d = self.dimensions
        self.floorArea_m2 = (d.depth * d.width) / 1_000_000
        self.volume_m3 = (d.depth * d.width * d.height) / 1_000_000_000

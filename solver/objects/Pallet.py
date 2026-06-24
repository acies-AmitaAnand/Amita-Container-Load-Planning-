

from datetime import datetime
import uuid

from pydantic import Field

from objects.Dimension import Dimension
from objects.Position import Position
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
    color: str = Field(default="#4CAF50", description="Hex color code")
    weightIn_kg: float = Field(default=0.0)
    floorArea_m2: float = Field(default=0.0)
    volume_m3: float = Field(default=0.0)
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
 



from datetime import datetime

from pydantic import Field

from objects.Dimension import Dimension
from objects.Position import Position
from utils.PydanticBaseModel import PydanticBaseModel


class Pallet(PydanticBaseModel):
    candidatePalletId: str
    shipmentId: str
    skuId: str
    originLocationId: str
    destinationLocationId: str
    estimatedDeliveryDate: datetime
    
    dimensions: Dimension
    position: Position = Position()
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

from datetime import datetime
from typing import List, Optional

from pydantic import Field

from objects.Pallet import Pallet
from utils.PydanticBaseModel import PydanticBaseModel


class ShipmentGroup(PydanticBaseModel):
    """Pallets grouped by origin + destination + delivery date window."""
    groupId: str
    originLocationId: str
    destinationLocationId: str
    deliveryDateWindow: str  # e.g. "2024-11-15"
    pallets: List[Pallet] = Field(default_factory=list)
    estimatedDeliveryDate: Optional[datetime] = None

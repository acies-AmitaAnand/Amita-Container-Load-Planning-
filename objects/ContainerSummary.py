

from typing import List

from pydantic import Field
from utils.PydanticBaseModel import PydanticBaseModel



class ContainerSummary(PydanticBaseModel):
    shipmentId: str = Field(description='Example: "SHIPMENT_1001",')
    routeId: str = Field(description='Example: "ROUTE_CHI_NY",')
    origin: str = Field(description='Example: "Chicago",')
    destinationInSequence: List[str] = Field(description='Example: ["New York"],')
    totalPallets: float = Field(description='Example: 6,')
    totalWeight: float = Field(description='Example: 11200,')
    totalVolume: float = Field(description='Example: 864')

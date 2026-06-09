

from typing import List

from pydantic import Field
from utils.PydanticBaseModel import PydanticBaseModel



class ContainerSummary(PydanticBaseModel):
    shipmentId: str = Field(description='Shipment ID. Example: "SHIPMENT_1001",')
    routeId: str = Field(description='Route ID. Example: "ROUTE_CHI_NY",')
    origin: str = Field(description='Origin location. Example: "Chicago",')
    destinationInSequence: List[str] = Field(description='Delivery Destinations in sequence. Example: ["New York"],')
    totalPallets: float = Field(default=0, description='Total pallets loaded in the container. Example: 6')
    totalWeight: float = Field(default=0, description='Total weight of units loaded in kg (kilogram). Example: 11200')
    totalVolume: float = Field(default=0, description='Total volume occupancy in {m^3} (meter cubic). Example: 864')



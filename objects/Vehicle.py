from typing import List

from objects.Axle import Axle
from objects.Container import Container
from utils.PydanticBaseModel import PydanticBaseModel


class Vehicle(PydanticBaseModel):
    vehicleId: str
    vehicleType: str
    maxGrossWeight_kg: float
    axles: List[Axle]
    containers: List[Container]
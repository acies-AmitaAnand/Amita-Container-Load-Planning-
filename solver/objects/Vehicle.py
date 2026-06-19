from typing import List

from solver.objects.Axle import Axle
from solver.objects.Container import Container
from utils.PydanticBaseModel import PydanticBaseModel


class Vehicle(PydanticBaseModel):
    vehicleId: str
    vehicleType: str
    maxGrossWeight_kg: float
    axles: List[Axle]
    containers: List[Container]
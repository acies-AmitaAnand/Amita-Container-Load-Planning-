from datetime import datetime
from typing import List
import uuid

from pydantic import Field

from objects.ContainerOptimizationResult import ContainerOptimizationResult
from objects.Pallet import Pallet
from utils.PydanticBaseModel import PydanticBaseModel

from objects.Container import Container


class ContainerFleetOptimizationResult(PydanticBaseModel):
    containerResults: List[ContainerOptimizationResult]
    unallocated_pallets: List[Pallet]
    total_pallets: int
    total_units: int = 0
    total_containers: int
    fleet_weight_utilization_pct: float
    fleet_volume_utilization_pct: float
    planning_date: datetime = Field(default_factory=datetime.utcnow)
    optimizer_run_id: str = Field(default_factory=lambda: uuid.uuid4().hex)
 

from typing import List
import uuid

from pydantic import Field

from solver.objects.AxleLoadResult import AxleLoadResult
from solver.objects.Pallet import Pallet
from solver.objects.RemainingCapacity import RemainingCapacity
from solver.objects.UtilizationMetrics import UtilizationMetrics
from utils.PydanticBaseModel import PydanticBaseModel

from solver.objects.Container import Container


class ContainerOptimizationResult(PydanticBaseModel):
    container: Container
    loadedPallets: List[Pallet]
    pendingPallets: List[Pallet]
    axleLoads: List[AxleLoadResult]
    utilization: UtilizationMetrics
    remainingCapacity: RemainingCapacity
    optimizer_run_id: str = Field(default_factory=lambda: uuid.uuid4().hex)

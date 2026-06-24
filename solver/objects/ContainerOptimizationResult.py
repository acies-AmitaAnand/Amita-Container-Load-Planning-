from typing import List, Optional
import uuid

from pydantic import Field

from objects.AxleLoadResult import AxleLoadResult
from objects.Pallet import Pallet
from objects.RemainingCapacity import RemainingCapacity
from objects.UtilizationMetrics import UtilizationMetrics
from utils.PydanticBaseModel import PydanticBaseModel

from objects.Container import Container


class ContainerOptimizationResult(PydanticBaseModel):
    container: Container
    loadedPallets: List[Pallet]
    pendingPallets: List[Pallet]
    axleLoads: List[AxleLoadResult]
    utilization: Optional[UtilizationMetrics] = None
    remainingCapacity: Optional[RemainingCapacity] = None
    optimizer_run_id: str = Field(default_factory=lambda: uuid.uuid4().hex)

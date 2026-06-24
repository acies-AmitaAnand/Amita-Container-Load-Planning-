
from datetime import datetime
import uuid

from pydantic import Field
from typing import Dict, List

from objects.ContainerFleetOptimizationResult import ContainerFleetOptimizationResult
from objects.GroupAllocation import GroupAllocation
from objects.Pallet import Pallet
from utils.PydanticBaseModel import PydanticBaseModel



class GlobalFleetResult(PydanticBaseModel):
    """Top-level result spanning all lane groups."""
    group_results: Dict[str, ContainerFleetOptimizationResult]  # groupId → result
    allocations: List[GroupAllocation]
    total_trucks_used: int
    fleet_limit: int
    total_pallets: int
    total_loaded_pallets: int
    total_unallocated_pallets: int
    unallocated_pallets: List[Pallet]   # pallets with no truck at all
    optimizer_run_id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    run_timestamp: datetime = Field(default_factory=datetime.utcnow)

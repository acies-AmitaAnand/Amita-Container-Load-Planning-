
from datetime import datetime
import uuid

from pydantic import field
from typing import Dict, List

from objects.ContainerFleetOptimizationResult import ContainerFleetOptimizationResult
from objects.GroupAllocation import GroupAllocation
from objects.Pallet import Pallet



class GlobalFleetResult:
    """Top-level result spanning all lane groups."""
    group_results: Dict[str, ContainerFleetOptimizationResult]  # groupId → result
    allocations: List[GroupAllocation]
    total_trucks_used: int
    fleet_limit: int
    total_pallets: int
    total_loaded_pallets: int
    total_unallocated_pallets: int
    unallocated_pallets: List[Pallet]   # pallets with no truck at all
    optimizer_run_id: str = field(default_factory=lambda: uuid.uuid4().hex)
    run_timestamp: datetime = field(default_factory=datetime.utcnow)

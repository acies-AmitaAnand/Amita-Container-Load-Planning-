from typing import List

from utils.PydanticBaseModel import PydanticBaseModel

from objects.Container import Container


class ContainerFleetOptimizationResult(PydanticBaseModel):

    containers: List[Container]
    unallocated_pallets: list
    total_pallets: int
    total_containers: int
from utils.PydanticBaseModel import PydanticBaseModel

from objects.Container import Container


class ContainerOptimizationResult(PydanticBaseModel):

    container: Container

    loadedPallets: list

    pendingPallets: list

    axleLoads: dict

    utilization: dict

    remainingCapacity: dict
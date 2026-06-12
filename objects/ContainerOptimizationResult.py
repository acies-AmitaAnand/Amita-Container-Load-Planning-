from dataclasses import dataclass

from objects.Container import Container


@dataclass
class ContainerOptimizationResult:

    container: Container

    loadedPallets: list

    pendingPallets: list

    axleLoads: dict

    utilization: dict

    remainingCapacity: dict
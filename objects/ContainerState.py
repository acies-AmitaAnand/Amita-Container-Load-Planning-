
from dataclasses import dataclass

@dataclass
class ContainerState:

    usedWeightIn_kg: float = 0
    usedFloorArea_m2: float = 0
    usedVolume_m3: float = 0
    currentDepthPosition_mm: int = 0
    currentWidthPosition_mm: int = 0
    currentRowDepth_mm: int = 0
    loadedPallets: int = 0
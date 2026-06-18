"""
Inventory Management - Container Loading Optimizer
Pydantic domain models for all logistics objects.
"""

from __future__ import annotations
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel as PydanticBaseModel, Field
import uuid


# ---------------------------------------------------------------------------
# Primitives
# ---------------------------------------------------------------------------

class Dimension(PydanticBaseModel):
    depth: int = Field(description="Dimension `depth` in millimeter")
    width: int = Field(description="Dimension `width` in millimeter")
    height: int = Field(description="Dimension `height` in millimeter")


class Position(PydanticBaseModel):
    x: int = Field(default=-1, description="Width axis offset from left wall in mm (Three.js x)")
    y: int = Field(default=-1, description="Height axis offset from floor in mm (Three.js y)")
    z: int = Field(default=-1, description="Depth axis offset from door in mm (Three.js z)")
    orientation: str = Field(
        default="FRONT_FACING",
        description='Options: ["FRONT_FACING","SIDE_FACING_LEFT","SIDE_FACING_RIGHT","REAR_FACING","TOP_UP","DOOR_ACCESS"]',
    )
    # Effective placed dimensions after orientation is applied.
    # React MUST use these for Box args and centre-offset math, NOT pallet.dimensions.*
    effectiveWidth: int = Field(default=-1, description="Actual x-axis footprint in mm after rotation")
    effectiveDepth: int = Field(default=-1, description="Actual z-axis footprint in mm after rotation")
    effectiveHeight: int = Field(default=-1, description="Actual y-axis footprint in mm (unchanged)")


class Axle(PydanticBaseModel):
    axleId: str = Field(default="DEFAULT", description="Axle identifier")
    maxWeight: float = Field(default=30000.0, description="Max axle weight in kg")
    positionX: float = Field(
        default=1371.6, description="Axle longitudinal position from front in mm"
    )
    currentLoad: float = Field(default=0.0, description="Current axle load in kg")


# ---------------------------------------------------------------------------
# Rules & Summaries
# ---------------------------------------------------------------------------

class ContainerLoadingRules(PydanticBaseModel):
    allowStacking: bool = Field(default=False)
    maxStackHeightIn_mm: float = Field(default=1.0)
    lifoEnabled: bool = Field(default=True)
    fragileSeparation: bool = Field(default=True)
    hazmatSegregation: bool = Field(default=True)
    centerGravityThreshold: float = Field(default=15.0)


class ContainerSummary(PydanticBaseModel):
    shipmentId: str = Field(default="")
    routeId: str = Field(default="")
    origin: str = Field(default="")
    destinationInSequence: List[str] = Field(default_factory=list)
    totalPallets: int = Field(default=0)
    totalWeightIn_kg: float = Field(default=0.0)
    totalVolumeIn_m3: float = Field(default=0.0)


# ---------------------------------------------------------------------------
# Pallet
# ---------------------------------------------------------------------------

class Pallet(PydanticBaseModel):
    candidatePalletId: str = Field(
        default_factory=lambda: f"PLT_{uuid.uuid4().hex[:8].upper()}"
    )
    shipmentId: str
    skuId: str
    originLocationId: str
    destinationLocationId: str
    estimatedDeliveryDate: datetime

    dimensions: Dimension
    position: Position = Field(default_factory=Position)
    label: str = Field(default="", description="Label for displaying")
    color: str = Field(default="#4CAF50", description="Hex color code")
    weightIn_kg: float = Field(default=0.0)
    floorArea_m2: float = Field(default=0.0)
    volume_m3: float = Field(default=0.0)
    priority: int = 0
    serviceLevel: int = 0
    unitsInPallet: int = 0
    isPartialPallet: bool = False
    fillPct: float = 1.0
    loadedToContainer: bool = False
    rejectionReason: str = ""
    unloadSequence: int = Field(default=0, description="LIFO unload order (1=first out)")
    destinationStop: int = Field(default=0, description="Multi-stop destination index")
    isFragile: bool = False
    isHazmat: bool = False
    temperatureRequirement: str = Field(default="ambient")

    def model_post_init(self, __context) -> None:
        d = self.dimensions
        self.floorArea_m2 = (d.depth * d.width) / 1_000_000
        self.volume_m3 = (d.depth * d.width * d.height) / 1_000_000_000


# ---------------------------------------------------------------------------
# Container
# ---------------------------------------------------------------------------

class Container(PydanticBaseModel):
    containerId: str = Field(default="CONT_001")
    containerType: str = Field(default="CONTAINER 40FT GP")
    depth: float = Field(default=12191)
    width: float = Field(default=2438)
    height: float = Field(default=2591)
    internalDepth: float = Field(default=11836)
    internalWidth: float = Field(default=2352)
    internalHeight: float = Field(default=2391)
    maxPayloadWeightIn_kg: float = Field(default=25000)
    tareWeightIn_kg: float = Field(default=0)
    currentVolume_m3: float = Field(default=0)
    unit: str = Field(default="mm")
    doorWidth: float = Field(default=2352)
    doorHeight: float = Field(default=2391)
    axles: List[Axle] = Field(default_factory=lambda: [Axle()])
    pallets: List[Pallet] = Field(default_factory=list)
    summary: ContainerSummary = Field(default_factory=ContainerSummary)
    loadingRules: ContainerLoadingRules = Field(default_factory=ContainerLoadingRules)
    maxFloorArea_m2: float = Field(default=0.0)
    maxVolume_m3: float = Field(default=0.0)
    refrigerationCapable: bool = False
    temperatureMin_c: Optional[float] = None
    temperatureMax_c: Optional[float] = None

    # State management
    usedWeightIn_kg: float = 0.0
    usedFloorArea_m2: float = 0.0
    usedVolume_m3: float = 0.0
    currentDepthPosition_mm: int = 0
    currentWidthPosition_mm: int = 0
    currentRowDepth_mm: int = 0
    loadedPallets: int = 0

    def model_post_init(self, __context) -> None:
        self.maxFloorArea_m2 = (self.internalDepth * self.internalWidth) / 1_000_000
        self.maxVolume_m3 = (
            self.internalDepth * self.internalWidth * self.internalHeight
        ) / 1_000_000_000


# ---------------------------------------------------------------------------
# Results
# ---------------------------------------------------------------------------

class AxleLoadResult(PydanticBaseModel):
    axleId: str
    currentLoad_kg: float
    maxLoad_kg: float
    utilization_pct: float
    isOverloaded: bool


class UtilizationMetrics(PydanticBaseModel):
    weightUtilization_pct: float
    volumeUtilization_pct: float
    floorAreaUtilization_pct: float
    loadedPallets: int
    totalPallets: int
    usedWeightIn_kg: float
    usedVolumeIn_m3: float
    usedFloorAreaIn_m2: float
    maxWeightIn_kg: float
    maxVolumeIn_m3: float
    maxFloorAreaIn_m2: float


class RemainingCapacity(PydanticBaseModel):
    remainingWeight_kg: float
    remainingVolume_m3: float
    remainingFloorArea_m2: float


class ContainerOptimizationResult(PydanticBaseModel):
    container: Container
    loadedPallets: List[Pallet]
    pendingPallets: List[Pallet]
    axleLoads: List[AxleLoadResult]
    utilization: UtilizationMetrics
    remainingCapacity: RemainingCapacity


class ContainerFleetOptimizationResult(PydanticBaseModel):
    containers: List[Container]
    containerResults: List[ContainerOptimizationResult]
    unallocated_pallets: List[Pallet]
    total_pallets: int
    total_containers: int
    fleet_weight_utilization_pct: float
    fleet_volume_utilization_pct: float
    planning_date: datetime = Field(default_factory=datetime.utcnow)
    optimizer_run_id: str = Field(default_factory=lambda: uuid.uuid4().hex)


# ---------------------------------------------------------------------------
# Lane & Shipment Group
# ---------------------------------------------------------------------------

class ShipmentGroup(PydanticBaseModel):
    """Pallets grouped by origin + destination + delivery date window."""
    groupId: str
    originLocationId: str
    destinationLocationId: str
    deliveryDateWindow: str  # e.g. "2024-11-15"
    pallets: List[Pallet] = Field(default_factory=list)
    estimatedDeliveryDate: Optional[datetime] = None
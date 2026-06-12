from datetime import datetime

from objects.Pallet import Pallet


class PalletCandidate(Pallet):
    candidatePalletId: str
    shipmentId: str
    skuId: str
    originLocationId: str
    destinationLocationId: str
    estimatedDeliveryDate: datetime
    priority: int = 0
    serviceLevel: int = 0
    unitsInPallet: int = 0
    isPartialPallet: bool = False
    fillPct: float = 1.0
    loadedToContainer: bool = False
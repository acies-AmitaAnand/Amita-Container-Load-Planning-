
# ---------------------------------------------------------------------------
# Axle load distribution
# ---------------------------------------------------------------------------

def _distribute_weight_to_axles(
    container: Container, pallet: Pallet, z_mm: int, depth_mm: int
) -> None:
    cog_z     = z_mm + depth_mm / 2
    total_len = container.internalDepth
    for axle in container.axles:
        factor = max(0.0, 1 - abs(cog_z - axle.positionX) / total_len)
        axle.currentLoad += pallet.weightIn_kg * factor


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

def compute_axle_loads(container: Container) -> List[AxleLoadResult]:
    return [
        AxleLoadResult(
            axleId=a.axleId,
            currentLoad_kg=round(a.currentLoad, 2),
            maxLoad_kg=a.maxWeight,
            utilization_pct=round(a.currentLoad / a.maxWeight * 100 if a.maxWeight else 0, 2),
            isOverloaded=a.currentLoad > a.maxWeight,
        )
        for a in container.axles
    ]


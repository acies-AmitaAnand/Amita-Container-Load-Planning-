export function calculateMetrics(container, pallets) {
	// =========================================
	// CONTAINER DIMENSIONS
	// =========================================

	const containerVolume = container.depth * container.width * container.height;

	const containerFloorArea = container.depth * container.width;

	const maxPayload = container.maxWeight || 40000;

	// =========================================
	// PALLET AGGREGATIONS
	// =========================================

	let totalVolume = 0;
	let totalWeight = 0;
	let totalFloorArea = 0;
	let weightedX = 0;
	let weightedZ = 0;
	let maxStackHeight = 0;

	pallets.forEach((p) => {
		const volume = p.depth * p.width * p.height;

		totalVolume += volume;
		totalWeight += p.weight || 0;
		totalFloorArea += p.depth * p.width;
		weightedX += p.x * (p.weight || 0);
		weightedZ += p.z * (p.weight || 0);
		if (p.height > maxStackHeight) {
			maxStackHeight = p.height;
		}
	});

	// =========================================
	// METRICS
	// =========================================

	const cubicUtilization = (totalVolume / containerVolume) * 100;

	const weightUtilization = (totalWeight / maxPayload) * 100;

	const floorCoverage = (totalFloorArea / containerFloorArea) * 100;

	const avgStackHeight =
		pallets.length > 0
			? pallets.reduce((a, b) => a + b.height, 0) / pallets.length
			: 0;

	const stackDensity = avgStackHeight / container.height;

	const centerGravityX = totalWeight > 0 ? weightedX / totalWeight : 0;

	const centerGravityZ = totalWeight > 0 ? weightedZ / totalWeight : 0;

	const cgDeviationFrontBack = Math.abs(centerGravityX);

	const cgDeviationLeftRight = Math.abs(centerGravityZ);

	const stabilityIndex =
		100 - (cgDeviationFrontBack + cgDeviationLeftRight) * 5;

	const voidVolume = containerVolume - totalVolume;

	const voidRatio = (voidVolume / containerVolume) * 100;

	const palletsPerContainer = pallets.length;

	const utilizationScore =
		cubicUtilization * 0.4 + weightUtilization * 0.4 + floorCoverage * 0.2;

	return {
		cubicUtilization: cubicUtilization.toFixed(2),
		weightUtilization: weightUtilization.toFixed(2),
		floorCoverage: floorCoverage.toFixed(2),
		avgStackHeight: avgStackHeight.toFixed(2),
		stackDensity: stackDensity.toFixed(2),
		centerGravityX: centerGravityX.toFixed(2),
		centerGravityZ: centerGravityZ.toFixed(2),
		stabilityIndex: stabilityIndex.toFixed(2),
		voidRatio: voidRatio.toFixed(2),
		palletsPerContainer,
		utilizationScore: utilizationScore.toFixed(2),
		totalWeight: totalWeight.toFixed(2),
		totalVolume: totalVolume.toFixed(2),
	};
}

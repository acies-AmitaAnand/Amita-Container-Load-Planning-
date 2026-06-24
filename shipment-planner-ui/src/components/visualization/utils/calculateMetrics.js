export function calculateMetrics(container, pallets) {
	// =========================================
	// CONTAINER DIMENSIONS
	// =========================================

	const containerVolume = container.depth * container.width * container.height;

	const containerFloorArea = container.depth * container.width;

	const maxPayload = container.maxPayloadWeightIn_kg || 40000;

	// =========================================
	// PALLET AGGREGATIONS
	// =========================================

	let currentVolume = 0;
	let currentWeight = 0;
	let currentFloorArea = 0;
	let weightedX = 0;
	let weightedZ = 0;
	let maxStackHeight = 0;

	pallets.forEach((p) => {
		const volume = p.position.effectiveDepth * p.position.effectiveWidth * p.position.effectiveHeight;

		currentVolume += volume;
		currentWeight += p.dimensions.weight || 0;
		currentFloorArea += p.position.effectiveDepth * p.position.effectiveWidth;
		weightedX += p.dimensions.x * (p.dimensions.weight || 0);
		weightedZ += p.dimensions.z * (p.dimensions.weight || 0);
		if (p.position.effectiveHeight > maxStackHeight) {
			maxStackHeight = p.position.effectiveHeight;
		}
	});

	// =========================================
	// METRICS
	// =========================================

	const cubicUtilization = (currentVolume / containerVolume) * 100;

	const weightUtilization = (currentWeight / maxPayload) * 100;

	const floorCoverage = (currentFloorArea / containerFloorArea) * 100;

	const avgStackHeight =
		pallets.length > 0
			? pallets.reduce((a, b) => a + b.height, 0) / pallets.length
			: 0;

	const stackDensity = avgStackHeight / container.height;

	const centerGravityX = currentWeight > 0 ? weightedX / currentWeight : 0;

	const centerGravityZ = currentWeight > 0 ? weightedZ / currentWeight : 0;

	const cgDeviationFrontBack = Math.abs(centerGravityX);

	const cgDeviationLeftRight = Math.abs(centerGravityZ);

	const stabilityIndex =
		100 - (cgDeviationFrontBack + cgDeviationLeftRight) * 5;

	const voidVolume = containerVolume - currentVolume;

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
		currentWeight: currentWeight.toFixed(2),
		currentVolume: currentVolume.toFixed(2),
	};
}


export function extractMetrics(container) {
	// =========================================
	// CONTAINER DIMENSIONS
	// =========================================

	const containerVolume = container.containerDepth * container.containerWidth * container.containerHeight;

	const containerFloorArea = container.containerDepth * container.containerWidth;

	const maxPayload = container.maxPayloadWeightIn_kg || 40000;
	const pallets = container.pallets;

	// =========================================
	// PALLET AGGREGATIONS
	// =========================================

	let currentVolume = 0;
	let currentWeight = 0;
	let currentFloorArea = 0;
	let weightedX = 0;
	let weightedZ = 0;
	let maxStackHeight = 0;

	pallets.forEach((p) => {
		const volume = p.position.effectiveDepth * p.position.effectiveWidth * p.position.effectiveHeight;

		currentVolume += volume;
		currentWeight += p.weightIn_kg || 0;
		currentFloorArea += p.position.effectiveDepth * p.position.effectiveWidth;
		weightedX += p.dimensions.x * (p.weightIn_kg || 0);
		weightedZ += p.dimensions.z * (p.weightIn_kg || 0);
		if (p.position.effectiveHeight > maxStackHeight) {
			maxStackHeight = p.position.effectiveHeight;
		}
	});

	// =========================================
	// METRICS
	// =========================================

	const cubicUtilization = (currentVolume / containerVolume) * 100;

	const weightUtilization = (currentWeight / maxPayload) * 100;

	const floorCoverage = (currentFloorArea / containerFloorArea) * 100;

	const avgStackHeight =
		pallets.length > 0
			? pallets.reduce((a, b) => a + b.dimensions.effectiveHeight, 0) / pallets.length
			: 0;

	const stackDensity = avgStackHeight / container.containerHeight;

	const centerGravityX = currentWeight > 0 ? weightedX / currentWeight : 0;

	const centerGravityZ = currentWeight > 0 ? weightedZ / currentWeight : 0;

	const cgDeviationFrontBack = Math.abs(centerGravityX);

	const cgDeviationLeftRight = Math.abs(centerGravityZ);

	const stabilityIndex =
		100 - (cgDeviationFrontBack + cgDeviationLeftRight) * 5;

	const voidVolume = containerVolume - currentVolume;

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
		consumedWeight: currentWeight.toFixed(2),
		consumedVolume: currentVolume.toFixed(2),
		totalMaxWeight: maxPayload.toFixed(2),
		totalMaxVolume: containerVolume.toFixed(2),
	};
}

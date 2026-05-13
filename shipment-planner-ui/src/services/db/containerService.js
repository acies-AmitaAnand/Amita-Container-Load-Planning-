import sql from "./neonClient";



// =====================================================
// READ DATABASE TABLES
// =====================================================

export function buildContainerInputs({
	containerMetadata,
	shipmentDetails,
	palletPositionMapping,
	loadingRules,
	routeDetails,
	transModeDetails
}) {

	// =========================================
	// GROUP PALLETS BY CONTAINER
	// =========================================

	const grouped = {};
	palletPositionMapping.forEach((row) => {

		const containerId =
			row.container_id;

		if (!grouped[containerId]) {
			grouped[containerId] = [];
		}

		grouped[containerId].push(row);
	});


	// =========================================
	// BUILD CONTAINER INPUTS
	// =========================================

	const outputs = [];

	Object.keys(grouped).forEach(
		(containerId) => {

			// =====================================
			// CONTAINER
			// =====================================

			const container =
				containerMetadata.find(
					(x) =>
						x.container_id ===
						containerId
				);

			// =====================================
			// RULES
			// =====================================

			const rules =
				loadingRules.find(
					(x) =>
						x.container_type ===
						container.container_type
				);

			// =====================================
			// ROUTE
			// =====================================

			const route =
				routeDetails.find(
					(x) =>
						x.route_id ===
						container.route_id
				);

			// =====================================
			// PALLETS
			// =====================================

			const pallets =
				grouped[containerId]
					.map((palletRow) => {

						const shipment =
							shipmentDetails.find(
								(x) =>
									x.pallet_id ===
									palletRow.pallet_id
							);

						return {

							palletId:
								palletRow.pallet_id,

							label:
								shipment.label,

							position: {

								x:
									palletRow.position_x,

								y:
									palletRow.position_y,

								z:
									palletRow.position_z
							},

							dimensions: {

								length:
									shipment.length,

								width:
									shipment.width,

								height:
									shipment.height
							},

							weight:
								shipment.weight,

							stackable:
								shipment.stackable,

							fragile:
								shipment.fragile,

							hazmat:
								shipment.hazmat,

							deliveryPriority:
								shipment.delivery_priority,

							stopSequence:
								shipment.stop_sequence,

							color:
								shipment.color,

							tooltipHtml:
								shipment.tooltip_html
						};
					});


			// =====================================
			// SUMMARY
			// =====================================

			const totalWeight =
				pallets.reduce(
					(a, b) =>
						a + (b.weight || 0),
					0
				);

			const totalVolume =
				pallets.reduce(
					(a, b) => {

						return (
							a +
							(
								b.dimensions.length *
								b.dimensions.width *
								b.dimensions.height
							)
						);

					}, 0);


			// =====================================
			// FINAL OUTPUT
			// =====================================

			outputs.push({

				container: {
					containerId: container.container_id,
					containerType: container.container_type,
					length: container.length,

					width:
						container.width,

					height:
						container.height,

					maxPayloadWeight:
						container.max_payload_weight,

					tareWeight:
						container.tare_weight,

					maxVolume:
						container.max_volume,

					unit:
						container.unit,

					axles:
						container.axles || []
				},

				loadingRules: {
					allowStacking:
						rules.allow_stacking,
					maxStackHeight:
						rules.max_stack_height,
					lifoEnabled:
						rules.lifo_enabled,
					fragileSeparation:
						rules.fragile_separation,
					hazmatSegregation:
						rules.hazmat_segregation,
					centerGravityThreshold:
						rules.cg_threshold
				},

				summary: {
					shipmentId: container.shipment_id,
					routeId: container.route_id,
					origin: route.origin,
					destinationInSequence: route.destination_sequence,
					totalPallets: pallets.length,
					totalWeight,
					totalVolume
				},
				pallets
			});
		});

	return outputs;
}

export async function getPayloadFromTable() {

	// =========================================
	// TEMP TABLE NAMES
	// =========================================

	const containerMetadataTable = 
		"tmp_container_metadata";

	const shipmentDetailsTable =
		"tmp_shipment_details";

	const palletPositionTable =
		"tmp_pallet_position_mapping";

	const loadingRulesTable =
		"tmp_loading_rules";

	const routeDetailsTable =
		"tmp_route_details";

	const transModeTable =
		"tmp_trans_mode_details";


	// =========================================
	// LOAD TABLES
	// =========================================

	const containerMetadata =
		await sql(`
			SELECT * FROM
			${sql(containerMetadataTable)}
		`);

	const shipmentDetails =
		await sql(`
			SELECT * FROM
			${sql(shipmentDetailsTable)}
		`);

	const palletPositionMapping =
		await sql(`
			SELECT * FROM
			${sql(palletPositionTable)}
		`);

	const loadingRules =
		await sql(`
			SELECT * FROM
			${sql(loadingRulesTable)}
		`);

	const routeDetails =
		await sql(`
			SELECT * FROM
			${sql(routeDetailsTable)}
		`);

	const transModeDetails =
		await sql(`
			SELECT * FROM
			${sql(transModeTable)}
		`);


	// =========================================
	// BUILD INPUTS
	// =========================================

	return buildContainerInputs({
		containerMetadata,
		shipmentDetails,
		palletPositionMapping,
		loadingRules,
		routeDetails,
		transModeDetails
	});
}

export const SIGNALS_DATA = [
  {
    id: 'S01',
    refCode: 'LOG-APAC-01',
    title: 'Container Buffer Deficit at APAC Hub',
    category: 'Container Load Planning',
    region: 'APAC',
    type: 'Risk',
    severity: 'critical',
    impact: '$1.2M SLA Breach Exposure',
    detail: '40ft High-Cube container safety buffer depleted by 34% at Shanghai/Singapore hub. Peak shipment volume threatens loading delays.',
    trigger: 'Sudden surge in export container bookings outstripping available empty box inventory at port depots.',
    rectification: 'Re-route 120 empty 40ft HC containers from regional storage yards and prioritize LIFO load sequencing.',
    ack: false
  },
  {
    id: 'S02',
    refCode: 'STK-EMEA-02',
    title: 'Port Congestion & Demurrage Risk',
    category: 'Port & Rail',
    region: 'EMEA',
    type: 'Risk',
    severity: 'critical',
    impact: '15d Transit Lag',
    detail: 'Rotterdam port congestion bottleneck extending intermodal rail pickup cycle by 15 days. Container detention fees accruing.',
    trigger: 'Crane maintenance backlog and customs inspection hold at Rotterdam container terminal.',
    rectification: 'Divert incoming ocean freight to Antwerp terminal and switch second-leg transport to scheduled FTL drayage.',
    ack: false
  },
  {
    id: 'S03',
    refCode: 'CAR-EMEA-03',
    title: 'Carrier Capacity Shortage & Spot Rate Spike',
    category: 'Fleet & Carriers',
    region: 'EMEA',
    type: 'Competitor',
    severity: 'warning',
    impact: '12% Freight Cost Surge',
    detail: 'Primary 3PL carrier capacity contracted by 18%. Spot market freight rates up 12% across EU East-West lanes.',
    trigger: 'Driver Hours of Service (HOS) restrictions and fuel surcharge adjustments across primary contracted carriers.',
    rectification: 'Activate secondary backhaul contracts with regional 3PL partners and lock in 30-day fixed volume commitments.',
    ack: false
  },
  {
    id: 'S04',
    refCode: 'LFO-AMER-04',
    title: 'Container LIFO Loading Constraint Violation',
    category: 'Container Load Planning',
    region: 'Americas',
    type: 'Risk',
    severity: 'warning',
    impact: '$450K Unloading Inefficiency',
    detail: 'Multi-stop drop-off order sequence violates Last-In-First-Out (LIFO) packing rules. High risk of extra handling at intermediate hubs.',
    trigger: 'Automated load planning algorithm detected weight distribution conflict forcing non-LIFO box placement.',
    rectification: 'Run 3D container stacking re-optimization to balance axle weight while preserving LIFO unloading order.',
    ack: false
  },
  {
    id: 'S05',
    refCode: 'REEF-US-05',
    title: 'Cold-Chain Temperature Excursion Alert',
    category: 'Fleet & Carriers',
    region: 'US Midwest',
    type: 'Risk',
    severity: 'critical',
    impact: '$800K Cargo Risk',
    detail: 'Reefer unit US-NY-8830 compressor telemetry recorded +4°C deviation on Chicago → Atlanta cold chain route.',
    trigger: 'IoT sensor continuous stream alerted temperature threshold breach for >45 minutes during transit.',
    rectification: 'Dispatch emergency refrigerated service truck to nearest rest stop for cargo transshipment.',
    ack: false
  },
  {
    id: 'S06',
    refCode: 'AXL-US-06',
    title: 'Axle Overweight Hazard on Heavy Freight',
    category: 'Container Load Planning',
    region: 'US South',
    type: 'Risk',
    severity: 'warning',
    impact: 'DOT Fines & Scale Delays',
    detail: 'Trailer load plan exceeds rear tandem axle limit by 1,400 lbs. DOT weigh-station violation predicted.',
    trigger: 'Dense heavy cargo positioned too far back in 53ft dry van container layout.',
    rectification: 'Shift 3 heavy pallets forward over kingpin before dispatch to equalize drive and tandem axle loads.',
    ack: false
  },
  {
    id: 'S07',
    refCode: 'CHAS-EMEA-07',
    title: 'Chassis Availability Shortage at Rail Ramp',
    category: 'Port & Rail',
    region: 'EMEA',
    type: 'Opportunity',
    severity: 'info',
    impact: '48h Yard Staging Delay',
    detail: 'Intermodal chassis pool at Duisburg rail ramp depleted. Inbound container grounding delayed.',
    trigger: 'High chassis dwell time caused by unreturned private chassis at regional distribution centers.',
    rectification: 'Deploy owned chassis fleet from nearby staging hub and institute 24-hour free-time detention policy.',
    ack: false
  },
  {
    id: 'S08',
    refCode: 'LANE-US-08',
    title: 'Lane Optimization & Intermodal Shift Opportunity',
    category: 'Transportation',
    region: 'US South',
    type: 'Opportunity',
    severity: 'info',
    impact: '$380K Annual Cost Savings',
    detail: 'Shifting Dallas → Houston volume from single-driver FTL to intermodal rail reduces cost by $0.18/mile.',
    trigger: 'Rail corridor expanded schedule frequency and guaranteed transit window matching FTL speed.',
    rectification: 'Transition 40% of recurring weekly loads to dedicated intermodal rail ramp service.',
    ack: false
  },
  {
    id: 'S09',
    refCode: 'PORT-APAC-09',
    title: 'Customs Clearance Backlog at Port',
    category: 'Port & Rail',
    region: 'APAC',
    type: 'Risk',
    severity: 'warning',
    impact: '10d Lead Time Extension',
    detail: 'Customs import inspection backlog at Singapore port causing 10-day release hold on containerized freight.',
    trigger: 'New tariff documentation verification requirements instituted at regional maritime customs.',
    rectification: 'Submit pre-clearance digital manifest data 72 hours prior to vessel arrival.',
    ack: false
  },
  {
    id: 'S10',
    refCode: 'EQUIP-AMER-10',
    title: 'Pallet Pooling & Volume Utilization Surplus',
    category: 'Container Load Planning',
    region: 'Americas',
    type: 'Opportunity',
    severity: 'info',
    impact: '$450K Space Efficiency',
    detail: '3D bin-packing algorithm increased average container volume utilization from 82% to 94%.',
    trigger: 'Implementation of multi-tier interlocking pallet stacking rules across cross-dock facilities.',
    rectification: 'Standardize 3D container load planner settings across all regional warehouses.',
    ack: false
  }
];

export const SIM_CONTENT = {
  demand: {
    title: 'Container Buffer Deficit Model: APAC Logistics',
    tag: '-34% Safety Stock Deficit',
    tagColor: '#dc2626',
    text: 'AI load planning model forecasts empty container shortage across Shanghai and Singapore hubs over the next 14 days.',
    pct: 84,
    barColor: '#dc2626',
    left: 'Container Yard Fill: 84%',
    right: 'Recommended Repositioning: +120 HC Units'
  },
  margin: {
    title: 'Demurrage & Storage Cost Exposure',
    tag: '$2.0M Penalty Exposure',
    tagColor: '#dc2626',
    text: 'Port congestion and extended staging dwell time generate compounding container detention fees across ocean terminals.',
    pct: 72,
    barColor: '#dc2626',
    left: 'Demurrage Risk Score: High',
    right: 'Action: Reroute to Antwerp Terminal'
  },
  stockout: {
    title: 'Equipment Deficit Probability Index',
    tag: 'High Risk (88%)',
    tagColor: '#ef4444',
    text: 'Memphis Hub container safety buffer fall below operating reorder threshold for US South export lanes.',
    pct: 88,
    barColor: '#ef4444',
    left: 'Estimated Equipment Deficit: 4 Days',
    right: 'Action: Dispatch Regional Drayage Transfer'
  },
  elasticity: {
    title: 'Freight Spot Rate Elasticity Model',
    tag: 'Rate Inflation: +12%',
    tagColor: '#2563eb',
    text: '3PL tender rejection rates on EU corridors drive linehaul spot rate surge across primary transport lanes.',
    pct: 62,
    barColor: '#2563eb',
    left: 'Carrier Acceptance Rate: 82%',
    right: 'Action: Lock Standby 30-Day Contract'
  }
};

export const PREDICTION_DETAILS = {
  stockout: {
    targetObject: '40ft High-Cube Containers (Memphis Hub)',
    targetDesc: 'Memphis Hub buffer depleted. Predicted equipment deficit in 4 days.',
    probability: '88%',
    why: [
      { strong: 'Buffer Depletion:', text: 'Memphis Hub container yard safety stock has fallen to 8% of baseline required equipment.' },
      { strong: 'Export Surge:', text: 'US South export volume outpaced empty box repositioning for 3 consecutive weeks.' },
      { strong: 'Turnaround Lag:', text: 'Average container turnaround cycle is 14 days versus the 4-day dispatch window.' }
    ],
    how: {
      model: 'Time-series LSTM equipment demand model cross-validated against port repositioning baseline.',
      inputs: 'Port bookings, container yard inventories, turnaround times, and vessel schedules.',
      modelKey: 'LSTM-CONTAINER-V2.4'
    },
    recommendations: [
      { tag: 'IMMEDIATE', tagColor: 'emerald', title: 'Emergency Container Repositioning', desc: 'Trigger an expedited transfer of 120 empty 40ft HC containers from regional storage yards to Memphis Hub.', steps: ['Confirm nearest yard has 120 empty boxes available', 'Issue expedited drayage transfer order to Memphis Hub', 'Prioritize rail flatcar movement over standard highway lane', 'Notify regional dispatch of equipment arrival ETA'] },
      { tag: 'MEDIUM-TERM', tagColor: 'blue', title: 'Dynamic Equipment Buffer Thresholds', desc: 'Raise reorder thresholds for high-volume export hubs to reflect US South seasonal surges.', steps: ['Recalculate container reorder points using 8-week trailing velocity', 'Update TMS equipment safety stock parameters', 'Validate against yard stacking height limits', 'Review thresholds bi-weekly during peak shipping season'] },
      { tag: 'STRATEGIC', tagColor: 'purple', title: 'Regional Chassis & Container Pool', desc: 'Establish a shared regional container leasing agreement to prevent single-hub shortages.', steps: ['Define fast-turnaround equipment criteria', 'Set rolling 4-week container buffer policy', 'Align with finance on equipment leasing overhead', 'Roll out shared container pool to APAC and EMEA hubs'] }
    ]
  },
  packaging: {
    targetObject: 'Rotterdam Terminal Freight Containers',
    targetDesc: 'Port crane lockout extending intermodal transit lag by 15 days.',
    probability: '76%',
    why: [
      { strong: 'Terminal Congestion:', text: 'Rotterdam container terminal operating at 98% yard capacity with crane maintenance backlog.' },
      { strong: 'Rail Ramp Bottleneck:', text: 'Intermodal rail grounding area has a 5-day staging delay.' },
      { strong: 'Detention Accrual:', text: 'Demurrage charges accruing at $150/container/day after free time expires.' }
    ],
    how: {
      model: 'Port disruption classifier (gradient-boosted trees) trained on AIS vessel tracking and terminal feeds.',
      inputs: 'Terminal congestion indices, vessel dwell times, rail ramp queue lengths, and drayage capacity.',
      modelKey: 'GBT-PORT-V1.9'
    },
    recommendations: [
      { tag: 'IMMEDIATE', tagColor: 'emerald', title: 'Divert Inbound Ocean Freight', desc: 'Re-route incoming ocean vessels to Antwerp terminal and switch second-leg transport to scheduled FTL drayage.', steps: ['Issue vessel re-routing request to ocean carrier', 'Confirm berth availability at Antwerp terminal', 'Book emergency FTL drayage fleet for inland haul', 'Notify regional consignees of updated delivery schedule'] },
      { tag: 'MEDIUM-TERM', tagColor: 'blue', title: 'Multi-Port Carrier Agreements', desc: 'Negotiate flexible port-of-entry routing clauses with ocean carriers to prevent terminal lockouts.', steps: ['Draft flexible port destination clauses', 'Negotiate rate parity across Rotterdam and Antwerp', 'Sign updated carrier service agreements', 'Implement dynamic port routing in TMS'] },
      { tag: 'STRATEGIC', tagColor: 'purple', title: 'Inland Container Depot (ICD) Network', desc: 'Build inland dry port staging network in Central Europe to decouple ocean terminal congestion from distribution centers.', steps: ['Map ocean terminal congestion bottlenecks', 'Identify and lease inland dry port container space', 'Establish rail shuttle corridors to inland hubs', 'Review port vulnerability metrics quarterly'] }
    ]
  },
  priceWar: {
    targetObject: 'EU East-West Corridor Freight Capacity',
    targetDesc: 'Carrier capacity contraction driving 12% spot rate spike.',
    probability: '92%',
    why: [
      { strong: 'Capacity Deficit:', text: 'Primary contracted 3PL carriers rejected 14% of tendered loads due to driver HOS limits.' },
      { strong: 'Spot Market Reliance:', text: 'Un-tendered freight moving to spot market at an 18% price premium.' },
      { strong: 'Cost Inflation:', text: 'Overall linehaul transportation cost per km increased by $0.14 across EU routes.' }
    ],
    how: {
      model: 'Freight spot rate forecasting model (log-log regression) blended with carrier acceptance rate classifier.',
      inputs: 'Tender rejection rates, diesel price indices, spot board listings, and lane historical rates.',
      modelKey: 'SPOT-RATE-V3.2'
    },
    recommendations: [
      { tag: 'IMMEDIATE', tagColor: 'emerald', title: 'Activate Standby Carrier Volume', desc: 'Dispatch volume to pre-qualified secondary 3PL carriers with fixed short-term contract rates.', steps: ['Activate secondary carrier contract agreements', 'Allocate 25% of lane volume to backup partners', 'Lock in fixed 30-day rate guarantees', 'Monitor tender acceptance rates daily'] },
      { tag: 'MEDIUM-TERM', tagColor: 'blue', title: 'Dynamic Mini-Bids for High-Volume Lanes', desc: 'Run targeted monthly mini-bids on volatile lanes to secure primary carrier capacity.', steps: ['Identify lanes with tender rejections > 10%', 'Issue 60-day mini-bids to regional carrier pool', 'Award primary status to top-performing carriers', 'Evaluate lane cost performance monthly'] },
      { tag: 'STRATEGIC', tagColor: 'purple', title: 'Dedicated Fleet Expansion', desc: 'Evaluate expanding in-house dedicated fleet to cover 50% of core trunkline freight.', steps: ['Model capital expenditure for dedicated tractor-trailers', 'Calculate breakeven vs spot market volatility', 'Build business case for fleet acquisition', 'Pilot dedicated fleet on top 3 lanes'] }
    ]
  },
  cannibalization: {
    targetObject: 'Multi-Stop Load Plan (US South Corridor)',
    targetDesc: 'Non-LIFO load sequence causing multi-drop unloading delay & axle overweight risk.',
    probability: '64%',
    why: [
      { strong: 'LIFO Rule Breach:', text: 'Drop 2 cargo is placed in front of Drop 1 cargo, requiring re-handling at first destination.' },
      { strong: 'Axle Weight Imbalance:', text: 'Heavy freight over tandem axle exceeds DOT maximum limit by 1,400 lbs.' },
      { strong: 'Handling Delay:', text: 'Extra cross-dock re-stacking adds 3.5 hours per intermediate stop.' }
    ],
    how: {
      model: '3D Container Bin-Packing & Axle Balance Optimizer using LIFO unloading constraints.',
      inputs: 'Box dimensions, weights, drop-off sequence, container internal specs, and DOT axle limits.',
      modelKey: 'LIFO-AXLE-V2.1'
    },
    recommendations: [
      { tag: 'IMMEDIATE', tagColor: 'emerald', title: 'Re-Sequence 3D Container Stacking Plan', desc: 'Re-run 3D load optimizer with strict LIFO rules and shift heavy pallets forward over the trailer kingpin.', steps: ['Re-generate 3D load pattern with strict LIFO enforcement', 'Rebalance pallet positioning to clear tandem axle limits', 'Issue updated 3D loading diagram to warehouse team', 'Verify scale weight before trailer dispatch'] },
      { tag: 'MEDIUM-TERM', tagColor: 'blue', title: 'Automated Solver LIFO Validation', desc: 'Enforce mandatory LIFO and axle weight compliance checks prior to releasing dispatch orders.', steps: ['Update load planning solver configuration', 'Set automated rejection rule for LIFO violations', 'Train dispatchers on 3D load pattern overrides', 'Audit multi-drop load compliance weekly'] }
    ]
  },
  brandA: {
    targetObject: 'Reefer Telemetry & Cold-Chain Transit (APAC)',
    targetDesc: 'Reefer compressor telemetry breach puts temperature-sensitive cargo at risk.',
    probability: '92%',
    why: [
      { strong: 'Telemetry Breach:', text: 'Cold-chain IoT sensor recorded continuous +4°C temperature drift over 45 minutes.' },
      { strong: 'Gen-Set Power Drop:', text: 'Auxiliary gen-set battery voltage fell below operating threshold.' }
    ],
    how: {
      model: 'Multi-variable XGBoost continuous IoT telemetry anomaly detector.',
      inputs: 'IoT temperature logs, gen-set battery telemetry, ambient temperature, and route duration.',
      modelKey: 'REEFER-IOT-V3.4'
    },
    recommendations: [
      { tag: 'IMMEDIATE', tagColor: 'emerald', title: 'Dispatch Emergency Cold-Chain Service Unit', desc: 'Route nearest mobile reefer repair unit to intercept truck at rest stop and inspect compressor.', steps: ['Identify driver current GPS location', 'Dispatch emergency mobile repair technician', 'Monitor live temperature telemetry every 5 minutes', 'Prepare backup reefer trailer for transshipment if needed'] }
    ]
  }
};

export const KPI_DICTIONARY = {
  'ON-TIME DELIVERY (OTD)': {
    title: 'ON-TIME DELIVERY (OTD)',
    icon: '⏱️',
    value: '92.4%',
    delta: '↗ +2.4%',
    deltaClass: 'up',
    target: 'Target 95%',
    badge: 'NEAR TARGET',
    badgeClass: 'near',
    definition: 'Measures the percentage of customer shipments delivered on or before the agreed Estimated Delivery Date (EDD) across all transportation modes and lanes.',
    formula: 'OTD (%) = (Number of Shipments Delivered On-Time / Total Shipments Delivered) × 100',
    formulaVars: [
      { name: 'Numerator', desc: 'Shipments where actual_delivery_date ≤ estimated_delivery_date' },
      { name: 'Denominator', desc: 'Total confirmed delivered shipments in selected time window' },
      { name: 'Exclusions', desc: 'Customer-requested delivery reschedules or force majeure holds' }
    ],
    trend: {
      summary: 'OTD improved +2.4% over the last 30 days due to 3D route optimization in Chicago and Atlanta hubs.',
      periodChange: '+2.4% vs previous 30d period',
      drivers: [
        { type: 'positive', text: 'Route Optimizer deployment reduced transit time variance on Chicago → Atlanta lane by 14%.' },
        { type: 'positive', text: 'In-house fleet priority dispatch improved SLA adherence for Tier-1 accounts.' },
        { type: 'negative', text: 'Winter storm congestion on Los Angeles → Dallas corridor caused 19,600 shipments to miss delivery windows.' }
      ]
    },
    lineage: {
      sourceSystems: ['SAP S/4HANA ERP (Orders)', 'LogistIQ Telematics / Driver App (POD)'],
      tables: ['sample_shipment_plans', 'lane_master'],
      syncFrequency: 'Real-time CDC (Debezium / Kafka event stream)',
      owner: 'Network Operations & Control Tower Team',
      pipelineStatus: 'Healthy (0 latency spikes, 99.98% SLA)'
    }
  },
  'COST PER SHIPMENT': {
    title: 'COST PER SHIPMENT',
    icon: '💲',
    value: '$18.6',
    delta: '↗ -3.1%',
    deltaClass: 'up',
    target: 'Target $17.5',
    badge: 'NEAR TARGET',
    badgeClass: 'near',
    definition: 'Calculates the average total freight transport cost incurred per completed shipment, including linehaul, fuel surcharges, and accessorial fees.',
    formula: 'Cost per Shipment ($) = Total Net Freight Spend ($) / Total Shipments Dispatched',
    formulaVars: [
      { name: 'Numerator', desc: 'Sum of linehaul spend + fuel surcharges + accessorial charges - freight credits' },
      { name: 'Denominator', desc: 'Total count of dispatched shipments in selected period' }
    ],
    trend: {
      summary: 'Cost per shipment dropped by $0.60 (-3.1%) following multi-stop load consolidation efforts.',
      periodChange: '-3.1% reduction ($18.6 vs $19.2 prior month)',
      drivers: [
        { type: 'positive', text: 'Increased multi-stop 3D load density reduced required trips by 6.2%.' },
        { type: 'negative', text: 'Detention charges at Atlanta DC added $0.45 per shipment overhead.' }
      ]
    },
    lineage: {
      sourceSystems: ['Carrier Invoice Settlement Engine', 'Freight Payment Audit System'],
      tables: ['sample_shipment_plans', 'transport_asset'],
      syncFrequency: 'Batch sync hourly from NeonDB',
      owner: 'Freight Procurement & Cost Accounting',
      pipelineStatus: 'Healthy (Last sync 12 mins ago)'
    }
  },
  'FLEET UTILIZATION': {
    title: 'FLEET UTILIZATION',
    icon: '🚚',
    value: '81%',
    delta: '↗ +4.6%',
    deltaClass: 'up',
    target: 'Target 80%',
    badge: 'ON TARGET',
    badgeClass: 'on',
    definition: 'Measures the percentage of total fleet operating capacity (active hours and volume capability) actively engaged in revenue-generating transit.',
    formula: 'Fleet Utilization (%) = (Active Operating Hours / Total Available Vehicle Hours) × 100',
    formulaVars: [
      { name: 'Numerator', desc: 'Total engine operating hours during active dispatch' },
      { name: 'Denominator', desc: 'Total fleet vehicles × 24 hours (excluding scheduled overhaul)' }
    ],
    trend: {
      summary: 'Fleet utilization crossed target to 81%, driven by higher container packing density and reduced idle dwell time.',
      periodChange: '+4.6% vs previous 30d period',
      drivers: [
        { type: 'positive', text: 'Dynamic load balancing across 40ft container fleet boosted utilization by +5.2%.' },
        { type: 'negative', text: 'Unscheduled maintenance on 34 vehicles temporarily capped maximum fleet availability.' }
      ]
    },
    lineage: {
      sourceSystems: ['Geotab Telematics GPS', 'LogistIQ Fleet Management System (FMS)'],
      tables: ['transport_asset', 'load_equipment_metadata'],
      syncFrequency: 'Real-time telemetry (30 sec ping)',
      owner: 'Fleet Asset Operations Team',
      pipelineStatus: 'Healthy (640 active pings)'
    }
  },
  'PERFECT ORDER RATE': {
    title: 'PERFECT ORDER RATE',
    icon: '✅',
    value: '96.2%',
    delta: '↗ +1.2%',
    deltaClass: 'up',
    target: 'Target 97%',
    badge: 'NEAR TARGET',
    badgeClass: 'near',
    definition: 'Measures the percentage of orders delivered complete, on-time, undamaged, and with accurate documentation.',
    formula: 'Perfect Order Rate (%) = (% On-Time) × (% Complete) × (% Damage-Free) × (% Invoice Accurate)',
    formulaVars: [
      { name: 'Components', desc: 'Compound accuracy metric across 4 operational milestones' }
    ],
    trend: {
      summary: 'Perfect order rate rose to 96.2%, supported by reduced damage claims in regional box trucks.',
      periodChange: '+1.2% gain month-over-month',
      drivers: [
        { type: 'positive', text: 'Automated digital POD capture eliminated billing documentation errors.' },
        { type: 'negative', text: 'Minor temperature excursions in cold chain reefer units prevented reaching 97% target.' }
      ]
    },
    lineage: {
      sourceSystems: ['ERP Order Management', 'Quality Inspection Mobile App'],
      tables: ['sample_shipment_plans', 'item_master'],
      syncFrequency: 'Real-time CDC',
      owner: 'Customer Service & Quality Assurance',
      pipelineStatus: 'Healthy'
    }
  },
  'AVG DWELL TIME': {
    title: 'AVG DWELL TIME',
    icon: '🕒',
    value: '3.4 hrs',
    delta: '↘ +0.6h',
    deltaClass: 'down',
    target: 'Target 2.5 hrs',
    badge: 'BELOW TARGET',
    badgeClass: 'below',
    definition: 'Tracks the average duration vehicles spend stationary inside warehouse yards and loading docks awaiting loading or unloading.',
    formula: 'Avg Dwell Time = Total Yard Dwell Hours / Total Gate-In Appointments',
    formulaVars: [
      { name: 'Numerator', desc: 'Sum of (Gate-Out Timestamp - Gate-In Timestamp)' },
      { name: 'Denominator', desc: 'Total vehicle gate check-ins' }
    ],
    trend: {
      summary: 'Dwell time rose to 3.4 hrs due to staging bottlenecks at Atlanta DC and dock scheduling overlaps.',
      periodChange: '+0.6h increase (above 2.5h target SLA)',
      drivers: [
        { type: 'negative', text: 'Peak morning dock appointment clustering caused 45-minute gate queues.' },
        { type: 'positive', text: 'Automated License Plate Recognition (ALPR) reduced gate check-in processing to <2 mins.' }
      ]
    },
    lineage: {
      sourceSystems: ['YMS (Yard Management System)', 'RFID Gate Sensor Logs'],
      tables: ['location', 'sample_shipment_plans'],
      syncFrequency: 'Real-time event trigger',
      owner: 'Warehouse & Yard Management Team',
      pipelineStatus: 'Healthy'
    }
  },
  'DAMAGE / LOSS RATE': {
    title: 'DAMAGE / LOSS RATE',
    icon: '⚠️',
    value: '0.42%',
    delta: '↗ -0.08%',
    deltaClass: 'up',
    target: 'Target 0.30%',
    badge: 'BELOW TARGET',
    badgeClass: 'below',
    definition: 'Calculates the ratio of goods damaged or lost during transit or yard handling relative to total units shipped.',
    formula: 'Damage/Loss Rate (%) = (Damaged or Lost Units / Total Shipped Units) × 100',
    formulaVars: [
      { name: 'Numerator', desc: 'Claims-approved damaged or missing product units' },
      { name: 'Denominator', desc: 'Total SKU units dispatched' }
    ],
    trend: {
      summary: 'Damage rate improved by -0.08% following updated pallet dunnage and corner-guard guidelines.',
      periodChange: '-0.08% reduction (0.42% vs 0.50% prior period)',
      drivers: [
        { type: 'positive', text: 'Implementation of air-bag dunnage on long-haul routes reduced carton crushing.' },
        { type: 'negative', text: 'LTL multi-stop handling still responsible for 62% of reported claims.' }
      ]
    },
    lineage: {
      sourceSystems: ['Claims & Insurance Database', 'WMS Returns Module'],
      tables: ['sample_shipment_plans', 'item_master'],
      syncFrequency: 'Daily batch sync at midnight',
      owner: 'Risk & Claims Operations',
      pipelineStatus: 'Healthy'
    }
  },
  'VEHICLE UPTIME': {
    title: 'VEHICLE UPTIME',
    icon: '🔧',
    value: '94.7%',
    delta: '↗ +1.1%',
    deltaClass: 'up',
    target: 'Target 95%',
    badge: 'NEAR TARGET',
    badgeClass: 'near',
    definition: 'Measures the proportion of total fleet vehicles fully operational and available for dispatch.',
    formula: 'Vehicle Uptime (%) = (Total Fleet Vehicles - Vehicles Out for Maintenance) / Total Fleet Vehicles × 100',
    formulaVars: [
      { name: 'Numerator', desc: 'Active operational vehicles ready for route dispatch' },
      { name: 'Denominator', desc: 'Total registered fleet count (640 vehicles)' }
    ],
    trend: {
      summary: 'Uptime reached 94.7%, nearing the 95% target after clearing preventative maintenance backlogs.',
      periodChange: '+1.1% increase in operational fleet availability',
      drivers: [
        { type: 'positive', text: 'Predictive telematics sensor alerts caught 14 transmission faults before breakdown.' },
        { type: 'negative', text: 'Spare part delays for reefer compressors held 8 vehicles in workshop.' }
      ]
    },
    lineage: {
      sourceSystems: ['Fleet Maintenance Management System (FMMS)', 'OBD-II Diagnostic Stream'],
      tables: ['transport_asset'],
      syncFrequency: 'Real-time telemetry',
      owner: 'Fleet Asset Maintenance Team',
      pipelineStatus: 'Healthy'
    }
  },
  'AVG KM PER VEHICLE / DAY': {
    title: 'AVG KM PER VEHICLE / DAY',
    icon: '🛣️',
    value: '312 km',
    delta: '↗ +3.2%',
    deltaClass: 'up',
    target: 'Target 300 km',
    badge: 'ON TARGET',
    badgeClass: 'on',
    definition: 'Tracks the average daily distance traveled per active vehicle, reflecting asset productivity.',
    formula: 'Avg Km / Day = Total Odometer Distance Traveled / Total Active Vehicles / Days',
    formulaVars: [
      { name: 'Numerator', desc: 'Sum of daily GPS distance across active fleet' },
      { name: 'Denominator', desc: 'Active vehicle count × days in period' }
    ],
    trend: {
      summary: 'Daily distance averaged 312 km, exceeding the 300 km benchmark due to relay driver scheduling.',
      periodChange: '+3.2% gain in daily asset mileage',
      drivers: [
        { type: 'positive', text: 'Driver swap-out relays on long-haul routes increased vehicle run hours by 2.2 hrs/day.' }
      ]
    },
    lineage: {
      sourceSystems: ['GPS Odometer Feed', 'Driver Electronic Logging Device (ELD)'],
      tables: ['transport_asset', 'lane_master'],
      syncFrequency: 'Real-time GPS ping',
      owner: 'Fleet Routing & Dispatch Ops',
      pipelineStatus: 'Healthy'
    }
  },
  'EMPTY MILES (DEADHEAD)': {
    title: 'EMPTY MILES (DEADHEAD)',
    icon: '↩️',
    value: '14.8%',
    delta: '↗ -1.9%',
    deltaClass: 'up',
    target: 'Target 12%',
    badge: 'NEAR TARGET',
    badgeClass: 'near',
    definition: 'Calculates the distance driven by fleet vehicles without cargo (repositioning trips) as a percentage of total miles.',
    formula: 'Empty Miles (%) = (Unloaded Travel Distance / Total Travel Distance) × 100',
    formulaVars: [
      { name: 'Numerator', desc: 'Kilometers driven with zero loaded payload' },
      { name: 'Denominator', desc: 'Total kilometers logged across all trips' }
    ],
    trend: {
      summary: 'Deadhead miles dropped -1.9% to 14.8% following backhaul matching algorithms.',
      periodChange: '-1.9% reduction in non-revenue mileage',
      drivers: [
        { type: 'positive', text: 'Backhaul matching engine paired 38 outbound deliveries with return supplier pickups.' }
      ]
    },
    lineage: {
      sourceSystems: ['Telematics Load Sensor', 'TMS Trip Dispatch Engine'],
      tables: ['transport_asset', 'sample_shipment_plans'],
      syncFrequency: 'Real-time telemetry',
      owner: 'Network Optimization Team',
      pipelineStatus: 'Healthy'
    }
  },
  'FUEL EFFICIENCY': {
    title: 'FUEL EFFICIENCY',
    icon: '⛽',
    value: '4.1 km/L',
    delta: '↘ -0.2',
    deltaClass: 'down',
    target: 'Target 4.5 km/L',
    badge: 'BELOW TARGET',
    badgeClass: 'below',
    definition: 'Measures the average fuel economy achieved by the heavy vehicle fleet in kilometers per liter of fuel consumed.',
    formula: 'Fuel Efficiency (km/L) = Total Distance Driven (km) / Total Fuel Consumed (Liters)',
    formulaVars: [
      { name: 'Numerator', desc: 'Total GPS distance logged' },
      { name: 'Denominator', desc: 'Fuel card transaction volume + CAN-bus fuel sensor reading' }
    ],
    trend: {
      summary: 'Fuel efficiency dropped to 4.1 km/L due to extended idling in yard traffic queues.',
      periodChange: '-0.2 km/L change vs previous month',
      drivers: [
        { type: 'negative', text: 'Excessive engine idling during dock delays consumed 4,200 L of unproductive fuel.' },
        { type: 'positive', text: 'Driver eco-coaching program improved cruise control usage on highway lanes.' }
      ]
    },
    lineage: {
      sourceSystems: ['CAN-bus Engine Diagnostics', 'Fuel Card Telemetry (Shell / IOCL)'],
      tables: ['transport_asset'],
      syncFrequency: 'Daily fuel card import & CAN-bus stream',
      owner: 'Fleet Asset & Energy Management',
      pipelineStatus: 'Healthy'
    }
  },
  'MAINTENANCE COST / KM': {
    title: 'MAINTENANCE COST / KM',
    icon: '🛠️',
    value: '$0.11',
    delta: '↘ +$0.01',
    deltaClass: 'down',
    target: 'Target $0.09',
    badge: 'BELOW TARGET',
    badgeClass: 'below',
    definition: 'Tracks repair and scheduled maintenance expenses divided by total distance operated.',
    formula: 'Maintenance Cost / Km = Total Work Order Costs ($) / Total Distance Driven (km)',
    formulaVars: [
      { name: 'Numerator', desc: 'Sum of parts, labor, external garage invoices' },
      { name: 'Denominator', desc: 'Total fleet kilometers driven' }
    ],
    trend: {
      summary: 'Maintenance cost increased $0.01/km due to aging tire replacements across 32ft multi-axle units.',
      periodChange: '+$0.01/km variance against $0.09 target',
      drivers: [
        { type: 'negative', text: 'Scheduled replacement of 120 drive tires across multi-axle fleet.' }
      ]
    },
    lineage: {
      sourceSystems: ['Garage Work Order System', 'ERP Asset Ledger'],
      tables: ['transport_asset'],
      syncFrequency: 'Weekly batch sync',
      owner: 'Fleet Workshop & Asset Maintenance',
      pipelineStatus: 'Healthy'
    }
  }
};

export function getKpiDetails(title, currentVal = '', target = '', badge = '', badgeClass = '') {
  if (KPI_DICTIONARY[title]) {
    return KPI_DICTIONARY[title];
  }
  
  const cleanTitle = title.toUpperCase();
  return {
    title: cleanTitle,
    icon: '📊',
    value: currentVal || '100%',
    delta: '↗ Active',
    deltaClass: 'up',
    target: target || 'Target Standard',
    badge: badge || 'OPTIMAL',
    badgeClass: badgeClass || 'on',
    definition: `Operational performance metric measuring ${title.toLowerCase()} across active logistics routes, warehouses, and fleet assets.`,
    formula: `${cleanTitle} = (Measured Metric Volume / Total Base Operational Units) × 100`,
    formulaVars: [
      { name: 'Numerator', desc: `Aggregated data count for ${title.toLowerCase()}` },
      { name: 'Denominator', desc: 'Total operational capacity or demand units in selected window' }
    ],
    trend: {
      summary: `${title} is tracking steadily against operational thresholds over the last 30-day window.`,
      periodChange: 'Stable operational cadence across network',
      drivers: [
        { type: 'positive', text: `Route optimization and DC load management supporting positive ${title.toLowerCase()} trends.` },
        { type: 'negative', text: 'External traffic and seasonal volume spikes monitored by Control Tower.' }
      ]
    },
    lineage: {
      sourceSystems: ['LogistIQ Core DB (NeonDB)', 'ERP System', 'IoT Telematics'],
      tables: ['sample_shipment_plans', 'transport_asset', 'location'],
      syncFrequency: 'Real-time CDC (15-min refresh)',
      owner: 'Supply Chain Operations & Control Tower',
      pipelineStatus: 'Healthy (100% data freshness)'
    }
  };
}

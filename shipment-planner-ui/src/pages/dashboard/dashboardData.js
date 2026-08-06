export const filters = [
	"Today",
	"This Week",
	"This Month",
	"Quarter",
	"All Lanes ▾",
	"All Carriers ▾",
];

export const kpis = [
	{
		icon: "◷",
		label: "On-Time Delivery (OTD)",
		value: "93.4",
		unit: "%",
		delta: "2.1%",
		up: true,
		target: "Target 95%",
		state: "a",
		stateLbl: "Near",
	},
	{
		icon: "₹",
		label: "Cost per Shipment",
		value: "1,284",
		unit: "",
		delta: "3.4%",
		up: false,
		target: "Target ₹1,200",
		state: "a",
		stateLbl: "Near",
	},
	{
		icon: "🚚",
		label: "Fleet Utilization",
		value: "81.7",
		unit: "%",
		delta: "4.6%",
		up: true,
		target: "Target 80%",
		state: "g",
		stateLbl: "On Track",
	},
	{
		icon: "✓",
		label: "Perfect Order Rate",
		value: "88.9",
		unit: "%",
		delta: "1.2%",
		up: true,
		target: "Target 92%",
		state: "a",
		stateLbl: "Near",
	},
	{
		icon: "◴",
		label: "Avg Dwell Time",
		value: "4.2",
		unit: "h",
		delta: "0.6h",
		up: false,
		target: "Target 3.5h",
		state: "r",
		stateLbl: "Below",
	},
	{
		icon: "⚠",
		label: "Damage / Loss Rate",
		value: "0.8",
		unit: "%",
		delta: "0.3%",
		up: false,
		target: "Target <1%",
		state: "g",
		stateLbl: "On Track",
	},
];

export const funnelShip = [
	["Orders Booked", "6,420", 100],
	["Dispatched", "6,050", 94],
	["In Transit", "5,880", 91.5],
	["Delivered On-Time", "5,494", 85.6],
];

export const carriers = [
	["In-house Fleet", 100, "48,200"],
	["BlueDart Logistics", 74, "35,600"],
	["TCI Freight", 61, "29,400"],
	["Delhivery 3PL", 43, "20,700"],
	["Gati Express", 28, "13,500"],
];

export const lanes = [
	["Chennai → Bengaluru", "1,420", "94.1%", "₹0.82", "g", "Healthy"],
	["Mumbai → Delhi", "2,180", "88.7%", "₹0.91", "a", "Watch"],
	["Delhi → Kolkata", "980", "79.4%", "₹1.04", "r", "At Risk"],
	["Pune → Hyderabad", "1,110", "96.3%", "₹0.77", "g", "Healthy"],
	["Ahmedabad → Jaipur", "640", "90.2%", "₹0.88", "a", "Watch"],
];

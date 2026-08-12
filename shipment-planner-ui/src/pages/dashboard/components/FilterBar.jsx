import { useState } from "react";

export default function FilterBar({ onFilterChange }) {
	const [activePeriod, setActivePeriod] = useState("30d");
	const [region, setRegion] = useState("ALL REGIONS");
	const [mode, setMode] = useState("ALL MODES");
	const [carrier, setCarrier] = useState("ALL");

	const handlePeriodChange = (val) => {
		setActivePeriod(val);
		if (onFilterChange) onFilterChange({ period: val, region, mode, carrier });
	};

	const handleRegionChange = (val) => {
		setRegion(val);
		if (onFilterChange) onFilterChange({ period: activePeriod, region: val, mode, carrier });
	};

	const handleModeChange = (val) => {
		setMode(val);
		if (onFilterChange) onFilterChange({ period: activePeriod, region, mode: val, carrier });
	};

	const handleCarrierChange = (val) => {
		setCarrier(val);
		if (onFilterChange) onFilterChange({ period: activePeriod, region, mode, carrier: val });
	};

	return (
		<div className="filters">
			<div className="filter">
				<label>PERIOD</label>
				<select value={activePeriod} onChange={(e) => handlePeriodChange(e.target.value)}>
					<option value="1d">Last 24 Hours</option>
					<option value="3d">Last 3 Days</option>
					<option value="7d">Last 7 Days</option>
					<option value="30d">Last 30 Days</option>
					<option value="90d">Last 90 Days</option>
					<option value="1y">Last 1 Year</option>
				</select>
			</div>
			
			<div className="filter">
				<label>REGION</label>
				<select value={region} onChange={(e) => handleRegionChange(e.target.value)}>
					<option value="ALL REGIONS">ALL REGIONS</option>
					<option value="US East">US East</option>
					<option value="US Midwest">US Midwest</option>
					<option value="US West">US West</option>
					<option value="US South">US South</option>
					<option value="APAC">APAC</option>
					<option value="EMEA">EMEA</option>
					<option value="Americas">Americas</option>
				</select>
			</div>

			<div className="filter">
				<label>MODE</label>
				<select value={mode} onChange={(e) => handleModeChange(e.target.value)}>
					<option value="ALL MODES">ALL MODES</option>
					<option value="Road (FTL)">Road (FTL)</option>
					<option value="Road (LTL)">Road (LTL)</option>
					<option value="Ocean">Ocean</option>
					<option value="Air">Air</option>
					<option value="Rail">Rail</option>
				</select>
			</div>

			<div className="filter">
				<label>CARRIER</label>
				<select value={carrier} onChange={(e) => handleCarrierChange(e.target.value)}>
					<option value="ALL">ALL CARRIERS</option>
					<option value="In-house Fleet">In-house Fleet</option>
					<option value="3PL Partners">3PL Partners</option>
					<option value="FedEx Freight">FedEx Freight</option>
					<option value="JB Hunt Transport">JB Hunt Transport</option>
					<option value="XPO Logistics">XPO Logistics</option>
					<option value="Old Dominion Freight">Old Dominion Freight</option>
				</select>
			</div>
		</div>
	);
}

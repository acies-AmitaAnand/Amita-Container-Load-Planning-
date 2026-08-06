import { useState } from "react";
import { filters } from "../dashboardData";

export default function FilterBar() {
	const [active, setActive] = useState(0);

	return (
		<div className="filters">
			{filters.map((filter, index) => (
				<button
					key={filter}
					className={`chip ${active === index ? "active" : ""}`}
					onClick={() => setActive(index)}
				>
					{filter}
				</button>
			))}
		</div>
	);
}

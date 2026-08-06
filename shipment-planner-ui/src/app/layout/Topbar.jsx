import "./MainLayout.css";

export default function Topbar() {
	return (
		<header className="topbar">
			<div>
				<h2>
					Freight & Fleet Dashboard
					<span>Network performance at a glance</span>
				</h2>
			</div>

			<div className="search">
				<span>⌕</span>
				<input
					type="text"
					placeholder="Search shipments, lanes, carriers…"
				/>
			</div>

			<button className="tb-btn" title="Download">
				⤓
			</button>

			<button className="tb-btn primary">
				＋ New Shipment
			</button>
		</header>
	);
}

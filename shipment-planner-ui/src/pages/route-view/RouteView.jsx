export default function RouteView() {

	return (

		<div>

			<h1>
				Route View
			</h1>

			<iframe
				title="maps"

				width="100%"
				height="600"

				src="https://www.google.com/maps/embed/v1/directions?key=YOUR_API_KEY&origin=Chicago&destination=NewYork"
			/>

		</div>
	);
}

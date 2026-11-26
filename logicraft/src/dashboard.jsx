import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import OrdersDashboard from './Orders.jsx'
import ShipmentsDashboard from './Shipments.jsx'
import WarehouseDashboard from './Warehouse.jsx'
import DriversDashboard from './Drivers.jsx'
import MessagesDashboard from './Messages.jsx'
import InvoicesDashboard from './Invoices.jsx'
import { sampleOrders } from './orderData.js'
import { sampleShipments } from './shipmentData.js'
import './dashboard.css'

const ORDERS_KEY = 'logicraft-orders-v1'
const SHIPMENTS_KEY = 'logicraft-shipments-v1'
const SETTINGS_KEY = 'logicraft-settings-v1'

function readList(key, fallback) {
	try {
		const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
		return Array.isArray(saved) ? saved : fallback
	} catch {
		return fallback
	}
}

function readSettings() {
	const defaults = { company: 'LogiCraft Logistics', timezone: 'America/Chicago', emailNotifications: true }
	try {
		const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null')
		return saved && typeof saved === 'object' && !Array.isArray(saved) ? { ...defaults, ...saved } : defaults
	} catch {
		return defaults
	}
}

const locationCoordinates = [
	['newark', [40.7357, -74.1724]], ['chicago', [41.8781, -87.6298]], ['joliet', [41.525, -88.0817]],
	['boston', [42.3601, -71.0589]], ['cambridge', [42.3736, -71.1097]], ['new york', [40.7128, -74.006]],
	['queens', [40.7282, -73.7949]], ['dallas', [32.7767, -96.797]], ['waco', [31.5493, -97.1467]],
	['austin', [30.2672, -97.7431]], ['seattle', [47.6062, -122.3321]], ['portland', [45.5231, -122.6765]],
	['philadelphia', [39.9526, -75.1652]], ['wilmington', [39.7447, -75.5466]], ['baltimore', [39.2904, -76.6122]],
]

function coordinatesFor(location) {
	const match = locationCoordinates.find(([place]) => location.toLowerCase().includes(place))
	return match?.[1] ?? null
}

function getTrackingShipments() {
	return readList(SHIPMENTS_KEY, sampleShipments).map((shipment) => {
		const originCoordinates = coordinatesFor(shipment.pickup)
		const destinationCoordinates = coordinatesFor(shipment.destination)
		const current = shipment.currentLocation || shipment.pickup
		const progressByStatus = { 'Ready for Pickup': 1, 'Picked Up': 2, 'In Transit': 3, 'Out for Delivery': 4, Delivered: 5, Delayed: 3, 'Failed Delivery': 4 }
		const driverPhones = {
			'Christina Kamberina': '+1 (312) 555-0184',
			'Daniel Brooks': '+1 (617) 555-0127',
			'Marcus Lee': '+1 (512) 555-0166',
			'Avery Chen': '+1 (206) 555-0141',
			'Nina Patel': '+1 (215) 555-0178',
		}

		return {
			id: shipment.tracking,
			order: shipment.orderId,
			origin: shipment.pickup,
			destination: shipment.destination,
			originCoordinates,
			currentCoordinates: coordinatesFor(current),
			destinationCoordinates,
			status: shipment.status,
			eta: shipment.eta,
			etaConfidence: shipment.etaConfidence,
			vehicle: shipment.vehicle.split(' · ')[0],
			vehicleType: shipment.vehicle.split(' · ')[1] ?? 'Vehicle',
			driver: shipment.driver,
			phone: driverPhones[shipment.driver] ?? 'Contact through Messages',
			location: current,
			current,
			progress: progressByStatus[shipment.status] ?? 0,
			updated: shipment.history?.[0]?.date ?? 'Recently',
			pickup: shipment.pickup,
			destinationFull: shipment.destination,
		}
	})
}

function getDashboardRows(shipments, orders) {
	return shipments.map((shipment) => {
		const order = orders.find((item) => item.id === shipment.orderId)
		const status = shipment.status === 'Delivered'
			? 'Completed'
			: shipment.status === 'Ready for Pickup'
				? 'Pending'
				: shipment.status === 'Delayed' || shipment.status === 'Failed Delivery'
					? 'Delayed'
					: 'On Delivery'
		const date = shipment.deliveryDate

		return {
			id: shipment.id,
			company: shipment.customer,
			category: order?.item ?? 'Freight',
			weight: order?.weight ? `${order.weight} lb` : '—',
			from: shipment.pickup,
			to: shipment.destination,
			date: date ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not scheduled',
			month: date ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '',
			status,
		}
	})
}

function pageFromHash() {
	const slug = window.location.hash.slice(1)
	return [...primaryItems, ...managementItems].find((item) => item.label.toLowerCase().replaceAll(' ', '-') === slug)?.label ?? 'Dashboard'
}

const primaryItems = [
	{ label: 'Dashboard', icon: 'dashboard' },
	{ label: 'Tracking', icon: 'tracking' },
	{ label: 'Orders', icon: 'orders' },
	{ label: 'Shipments', icon: 'shipments' },
	{ label: 'Warehouse', icon: 'warehouse' },
	{ label: 'Drivers', icon: 'drivers' },
	{ label: 'Messages', icon: 'messages' },
	{ label: 'Invoices & Billing', icon: 'billing' },
]

const managementItems = [
	{ label: 'Analytics', icon: 'analytics' },
	{ label: 'Settings', icon: 'settings' },
]

function NavIcon({ name }) {
	const common = {
		fill: 'none',
		stroke: 'currentColor',
		strokeWidth: 1.8,
		strokeLinecap: 'round',
		strokeLinejoin: 'round',
		viewBox: '0 0 24 24',
		'aria-hidden': true,
	}

	const shapes = {
		dashboard: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
		tracking: <><circle cx="6" cy="5" r="2" /><circle cx="18" cy="19" r="2" /><path d="M6 7v4a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3v0" /><path d="m15 5 3-2 3 2" /></>,
		orders: <><path d="M5 4.5h14v15H5z" /><path d="M8 8h8M8 12h8M8 16h5" /><path d="M9 4.5v-1h6v1" /></>,
		shipments: <><path d="M3 6h11v11H3z" /><path d="M14 10h4l3 3v4h-7z" /><circle cx="7.5" cy="19" r="2" /><circle cx="17.5" cy="19" r="2" /></>,
		warehouse: <><path d="m3 10 9-6 9 6v10H3z" /><path d="M8 20v-7h8v7M8 9h.01M12 9h.01M16 9h.01" /></>,
		drivers: <><rect x="4" y="3.5" width="16" height="17" rx="2" /><circle cx="12" cy="9" r="2.5" /><path d="M8 16.5a4 4 0 0 1 8 0" /></>,
		messages: <><path d="M4 5.5h16v12H9l-5 3z" /><path d="M8 10h8M8 14h5" /></>,
		billing: <><circle cx="12" cy="12" r="9" /><path d="M15 8.5c-.7-.7-1.7-1-3-1-1.7 0-2.8.8-2.8 2s1.1 1.8 2.8 2.2 2.8 1 2.8 2.2-1.1 2-2.8 2c-1.2 0-2.3-.4-3-1.1M12 6v12" /></>,
		analytics: <><path d="M4 19.5h16" /><path d="M6.5 16V11M12 16V5M17.5 16V8" /></>,
		settings: <><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" /><path d="m19 13.5 1.5 1.2-1.5 2.6-1.9-.6a7 7 0 0 1-1.5.9l-.4 2h-3l-.4-2a7 7 0 0 1-1.5-.9l-1.9.6-1.5-2.6 1.5-1.2a7 7 0 0 1 0-1.8l-1.5-1.2 1.5-2.6 1.9.6a7 7 0 0 1 1.5-.9l.4-2h3l.4 2a7 7 0 0 1 1.5.9l1.9-.6 1.5 2.6-1.5 1.2a7 7 0 0 1 0 1.8Z" transform="translate(-1 -1) scale(1.08)" /></>,
		help: <><path d="M4 13v-2a8 8 0 0 1 16 0v2" /><path d="M4 12h2.5a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4a1 1 0 0 1 1-1Zm16 0h-2.5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2H19a2 2 0 0 0 2-2v-4a1 1 0 0 0-1-1Z" /></>,
		logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 4h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" /></>,
	}

	return <svg {...common}>{shapes[name]}</svg>
}

function NavigationGroup({ title, items, activeLabel, onSelect }) {
	return (
		<section className="sidebar-group" aria-label={title}>
			<h2 className="sidebar-group-title">{title}</h2>
			<nav className="sidebar-nav">
				{items.map(({ label, icon }) => (
					<a
						className={`sidebar-link${label === activeLabel ? ' is-active' : ''}`}
						href={`#${label.toLowerCase().replaceAll(' ', '-')}`}
						onClick={(event) => { event.preventDefault(); onSelect(label) }}
						key={label}
						aria-current={label === activeLabel ? 'page' : undefined}
					>
						<span className="sidebar-link-icon"><NavIcon name={icon} /></span>
						<span>{label}</span>
					</a>
				))}
			</nav>
		</section>
	)
}

const trackingStatuses = ['Order Created', 'Ready for Pickup', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered']

let googleMapsPromise

function loadGoogleMaps(apiKey) {
	if (window.google?.maps) return Promise.resolve(window.google.maps)
	if (googleMapsPromise) return googleMapsPromise

	googleMapsPromise = new Promise((resolve, reject) => {
		const script = document.createElement('script')
		script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async`
		script.async = true
		script.onload = () => window.google?.maps ? resolve(window.google.maps) : reject(new Error('Google Maps did not initialize'))
		script.onerror = () => reject(new Error('Google Maps failed to load'))
		document.head.append(script)
	})

	return googleMapsPromise
}

function LeafletRouteMap({ shipment }) {
	const mapElement = useRef(null)
	const [mapMessage, setMapMessage] = useState('Loading road route...')

	useEffect(() => {
		if (!mapElement.current) return undefined
		let cancelled = false
		const map = L.map(mapElement.current, { scrollWheelZoom: false }).setView(shipment.currentCoordinates, 6)
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap contributors',
			maxZoom: 19,
		}).addTo(map)
		const markers = [
			[shipment.originCoordinates, 'Pickup', '#7544c8'],
			[shipment.currentCoordinates, 'Last recorded location', '#49a978'],
			[shipment.destinationCoordinates, 'Destination', '#df8a36'],
		]
		markers.forEach(([coordinates, title, color]) => L.circleMarker(coordinates, {
			radius: 7,
			color: '#fff',
			weight: 2,
			fillColor: color,
			fillOpacity: 1,
		}).bindTooltip(title).addTo(map))

		const [originLat, originLng] = shipment.originCoordinates
		const [destinationLat, destinationLng] = shipment.destinationCoordinates
		const routeUrl = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destinationLng},${destinationLat}?overview=full&geometries=geojson`
		fetch(routeUrl).then((response) => {
			if (!response.ok) throw new Error('Route service unavailable')
			return response.json()
		}).then((data) => {
			if (cancelled || data.code !== 'Ok' || !data.routes?.[0]) throw new Error('No route found')
			const route = L.geoJSON(data.routes[0].geometry, { style: { color: '#7544c8', weight: 5, opacity: 0.9 } }).addTo(map)
			map.fitBounds(route.getBounds().pad(0.12))
			setMapMessage('')
		}).catch(() => {
			if (!cancelled) setMapMessage('Road directions are temporarily unavailable; showing shipment locations.')
		})

		return () => {
			cancelled = true
			map.remove()
		}
	}, [shipment.id, shipment.currentCoordinates, shipment.destinationCoordinates, shipment.originCoordinates])

	if (!shipment.originCoordinates || !shipment.currentCoordinates || !shipment.destinationCoordinates) {
		return <div className="tracking-map"><div className="google-map-message" role="status">Map coordinates are unavailable for this address.</div></div>
	}

	return <div className="tracking-map" role="img" aria-label={`OpenStreetMap driving route from ${shipment.origin} to ${shipment.destination}`}><div className="leaflet-route-map" ref={mapElement} />{mapMessage && <div className="google-map-message" role="status">{mapMessage}</div>}<span className="map-location-note">Marker shows last recorded location</span></div>
}

function GoogleRouteMap({ shipment, apiKey }) {
	const mapElement = useRef(null)
	const [mapMessage, setMapMessage] = useState('Loading Google Maps...')

	useEffect(() => {
		let cancelled = false

		loadGoogleMaps(apiKey).then((maps) => {
			if (cancelled || !mapElement.current) return
			setMapMessage('Calculating driving route...')
			const map = new maps.Map(mapElement.current, {
				center: { lat: 39.5, lng: -98.35 },
				zoom: 5,
				mapTypeControl: false,
				streetViewControl: false,
				fullscreenControl: true,
				mapTypeId: maps.MapTypeId.ROADMAP,
				styles: [
					{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
					{ featureType: 'landscape', stylers: [{ color: '#f7f7f9' }] },
					{ featureType: 'water', stylers: [{ color: '#e8f3fa' }] },
					{ featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
					{ featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e5e1eb' }] },
				],
			})
			const directions = new maps.DirectionsRenderer({
				map,
				polylineOptions: { strokeColor: '#7544c8', strokeWeight: 5 },
			})
			new maps.DirectionsService().route({
				origin: shipment.origin,
				destination: shipment.destination,
				travelMode: maps.TravelMode.DRIVING,
			}).then((result) => {
				if (cancelled) return
				directions.setDirections(result)
				setMapMessage('')
			}).catch(() => {
				if (!cancelled) setMapMessage('Could not calculate a driving route for this shipment.')
			})
		}).catch(() => {
			if (!cancelled) setMapMessage('Google Maps failed to load. Check the API key and enabled APIs.')
		})

		return () => { cancelled = true }
	}, [apiKey, shipment.destination, shipment.origin])

	return (
		<div className="tracking-map" aria-label={`Google map route from ${shipment.origin} to ${shipment.destination}`}>
			<div className="google-route-map" ref={mapElement} />
			{mapMessage && <div className="google-map-message" role="status">{mapMessage}</div>}
		</div>
	)
}

function TrackingRouteMap({ shipment }) {
	const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
	return apiKey ? <GoogleRouteMap shipment={shipment} apiKey={apiKey} /> : <LeafletRouteMap shipment={shipment} />
}

function TrackingDashboard() {
	const trackingShipments = getTrackingShipments()
	const [query, setQuery] = useState('')
	const [status, setStatus] = useState('All')
	const [selectedId, setSelectedId] = useState(trackingShipments[0]?.id ?? '')
	const visibleShipments = trackingShipments.filter((shipment) => {
		const matchesQuery = `${shipment.id} ${shipment.order} ${shipment.destination} ${shipment.origin} ${shipment.driver}`.toLowerCase().includes(query.trim().toLowerCase())
		return matchesQuery && (status === 'All' || shipment.status === status)
	})
	const selected = visibleShipments.find((shipment) => shipment.id === selectedId) ?? visibleShipments[0]
	const statuses = ['All', ...new Set(trackingShipments.map((shipment) => shipment.status))]
	const counts = {
		active: trackingShipments.filter((shipment) => shipment.status !== 'Delivered').length,
		inTransit: trackingShipments.filter((shipment) => shipment.status === 'In Transit').length,
		delivered: trackingShipments.filter((shipment) => shipment.status === 'Delivered').length,
		delayed: trackingShipments.filter((shipment) => shipment.status === 'Delayed' || shipment.status === 'Failed Delivery').length,
	}

	return (
		<div className="tracking-workspace">
			<header className="tracking-page-header">
				<div><p className="tracking-eyebrow">LOGISTICS / LIVE OPERATIONS</p><h1>Shipment tracking</h1><p className="tracking-subtitle">Monitor every delivery, from pickup to destination.</p></div>
				<div className="tracking-live-indicator"><i /> Connected data <span>{trackingShipments.length} shipments</span></div>
			</header>

			<section className="tracking-summary" aria-label="Shipment overview">
				{[
					['Active shipments', counts.active, 'Currently on the road'],
					['In transit', counts.inTransit, 'Moving between hubs'],
					['Delivered', counts.delivered, 'Completed successfully'],
					['Delayed', counts.delayed, 'Needs attention'],
				].map(([label, value, note], index) => <article className="tracking-stat" key={label}><span className={`tracking-stat-mark mark-${index}`} /><span className="tracking-stat-label">{label}</span><strong>{value}</strong><small>{note}</small></article>)}
			</section>

			<section className="tracking-list-panel" aria-labelledby="tracking-list-title">
				<div className="tracking-list-heading"><div><h2 id="tracking-list-title">Shipments</h2><p>{visibleShipments.length} shipments found</p></div>
					<label className="tracking-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tracking or order ID" aria-label="Search tracking or order ID" /></label>
				</div>
				<div className="tracking-filter-row" role="group" aria-label="Filter shipments by status">
					{statuses.map((item) => <button type="button" key={item} className={status === item ? 'selected' : ''} onClick={() => setStatus(item)}>{item}<span>{item === 'All' ? trackingShipments.length : trackingShipments.filter((shipment) => shipment.status === item).length}</span></button>)}
				</div>
				<div className="tracking-table-scroll"><table className="tracking-table"><thead><tr><th>Tracking / Order ID</th><th>Destination</th><th>Status</th><th>ML-predicted ETA</th><th>Assigned vehicle</th><th><span className="sr-only">Details</span></th></tr></thead>
					<tbody>{visibleShipments.map((shipment) => <tr key={shipment.id} className={selected?.id === shipment.id ? 'is-selected' : ''}>
						<td><button className="tracking-row-select" type="button" onClick={() => setSelectedId(shipment.id)}><strong>{shipment.id}</strong><span>{shipment.order}</span></button></td>
						<td><strong>{shipment.destination}</strong><span>From {shipment.origin}</span></td>
						<td><span className={`tracking-status status-${shipment.status.toLowerCase().replaceAll(' ', '-')}`}><i />{shipment.status}</span></td>
						<td><strong>{shipment.eta}</strong><span>{shipment.etaConfidence} confidence</span></td>
						<td><strong>{shipment.vehicle}</strong><span>{shipment.vehicleType}</span></td>
						<td><button className="tracking-open-button" type="button" onClick={() => setSelectedId(shipment.id)} aria-label={`View ${shipment.id}`}>View <span aria-hidden="true">&#8594;</span></button></td>
					</tr>)}
					{visibleShipments.length === 0 && <tr><td className="tracking-no-results" colSpan="6">No shipments match this search or status filter.</td></tr>}</tbody>
				</table></div>
			</section>

			{selected && <section className="tracking-detail-panel" aria-labelledby="tracking-detail-title">
				<div className="tracking-detail-heading"><div><p className="tracking-eyebrow">SHIPMENT DETAILS</p><h2 id="tracking-detail-title">{selected.id}</h2></div><span className={`tracking-status status-${selected.status.toLowerCase().replaceAll(' ', '-')}`}><i />{selected.status}</span></div>
				<div className="tracking-detail-grid">
					<div className="tracking-detail-main">
						<TrackingRouteMap shipment={selected} />
						<div className="tracking-route-points"><div><span className="route-pin pickup-pin" /><small>Pickup</small><strong>{selected.pickup}</strong></div><span className="route-connector" /><div><span className="route-pin destination-pin" /><small>Destination</small><strong>{selected.destinationFull}</strong></div></div>
						<div className="tracking-progress-wrap"><div className="tracking-progress-heading"><h3>Delivery progress</h3><span>{Math.round((selected.progress / (trackingStatuses.length - 1)) * 100)}% complete</span></div><ol className="tracking-progress">{trackingStatuses.map((step, index) => <li key={step} className={index < selected.progress ? 'complete' : index === selected.progress ? 'current' : ''}><span className="progress-node">{index < selected.progress ? '✓' : String(index + 1).padStart(2, '0')}</span><span>{step}</span></li>)}</ol></div>
					</div>
					<aside className="tracking-detail-aside">
						<div className="tracking-eta-card"><span>ML-PREDICTED DELIVERY</span><strong>{selected.eta}</strong><small><i /> Prediction confidence: {selected.etaConfidence}</small></div>
						<div className="tracking-driver-card"><div className="tracking-card-title"><h3>Driver &amp; vehicle</h3><span className="driver-online"><i /> On route</span></div><div className="driver-profile"><span className="driver-avatar">{selected.driver.split(' ').map((part) => part[0]).join('')}</span><div><strong>{selected.driver}</strong><small>{selected.phone}</small></div></div><div className="driver-facts"><span>Vehicle<strong>{selected.vehicle}</strong></span><span>Type<strong>{selected.vehicleType}</strong></span></div></div>
						<div className="tracking-timeline-card"><div className="tracking-card-title"><h3>Status timeline</h3><span>Latest update · {selected.updated}</span></div><ol>{trackingStatuses.slice(0, selected.progress + 1).slice().reverse().map((step, index) => <li key={step} className={index === 0 ? 'timeline-latest' : ''}><i /><div><strong>{index === 0 && (selected.status === 'Delayed' || selected.status === 'Failed Delivery') ? selected.status : step}</strong><small>{index === 0 ? `${selected.location} · ${selected.updated}` : index === selected.progress ? `Pickup confirmed · ${selected.origin}` : 'Shipment milestone completed'}</small></div></li>)}</ol></div>
					</aside>
				</div>
			</section>}
		</div>
	)
}

function MetricCard({ icon, label, value, onViewData }) {
	return (
		<article className="metric-card">
			<div className="metric-heading">
				<span className="metric-icon"><NavIcon name={icon} /></span>
				<span className="metric-label">{label}</span>
				<button className="metric-more" type="button" onClick={onViewData} aria-label={`View ${label} data`} title="View related data">...</button>
			</div>
			<div className="metric-bottom">
				<strong className="metric-value">{value}</strong>
				<span className="metric-empty-note">Current records</span>
			</div>
		</article>
	)
}

function ShipmentsChart({ shipments }) {
	const now = new Date()
	const months = Array.from({ length: 7 }, (_, index) => {
		const date = new Date(now.getFullYear(), now.getMonth() - 6 + index, 1)
		return { date, label: date.toLocaleDateString('en-US', { month: 'short' }), count: 0 }
	})
	shipments.forEach((shipment) => {
		if (!shipment.deliveryDate) return
		const date = new Date(`${shipment.deliveryDate}T12:00:00`)
		const month = months.find((item) => item.date.getMonth() === date.getMonth() && item.date.getFullYear() === date.getFullYear())
		if (month) month.count += 1
	})
	const maxCount = Math.max(...months.map((month) => month.count), 1)
	const points = months.map((month, index) => `${74 + index * 83},${178 - (month.count / maxCount) * 132}`).join(' ')
	const ticks = [34, 82, 130, 178]
	const tickLabels = ticks.map((_, index) => Math.ceil((maxCount * (ticks.length - 1 - index)) / (ticks.length - 1)))

	return (
		<section className="dashboard-panel analytics-panel" aria-labelledby="analytics-title">
			<div className="panel-heading analytics-heading">
				<h2 id="analytics-title">Shipments Analytics</h2>
				<span className="panel-heading-divider" />
				<div className="chart-legend"><span><i className="legend-dot this-year" />Shipments by delivery month</span></div>
			</div>
			<div className="chart-wrap">
				<svg className="shipments-chart" viewBox="0 0 620 250" role="img" aria-label={`Shipment deliveries by month, ${shipments.length} total shipments`}>
					{ticks.map((y, index) => <g key={y}><line className="chart-gridline" x1="47" x2="610" y1={y} y2={y} /><text className="chart-axis-label" x="16" y={y + 4}>{tickLabels[index]}</text></g>)}
					<polyline className="chart-line this-year-line" points={points} />
					{months.map((month, index) => <circle key={`${month.label}-${index}`} className="chart-point" cx={74 + index * 83} cy={178 - (month.count / maxCount) * 132} r="3" />)}
					{months.map((month, index) => <text className="chart-month" key={`${month.label}-${index}`} x={74 + index * 83} y="216">{month.label}</text>)}
				</svg>
			</div>
		</section>
	)
}

function TrackingPanel({ shipment, onOpenTracking }) {
	return (
		<section className="dashboard-panel tracking-panel" aria-labelledby="tracking-title">
			<div className="panel-heading tracking-heading">
				<h2 id="tracking-title">Tracking History</h2>
				{shipment && <button className="tracking-open-link" type="button" onClick={onOpenTracking}>All tracking <span aria-hidden="true">→</span></button>}
			</div>
			{shipment ? (
				<>
					<div className="tracking-id-card">
						<span><small>Tracking ID</small><strong>{shipment.id}</strong></span>
						<span className="tracking-pill">{shipment.status}</span>
					</div>
					<ol className="tracking-timeline">
						<li className="timeline-stop current-stop"><span className="timeline-dot" /><span><small>Current Location</small><strong>{shipment.current}</strong></span></li>
						<li className="timeline-stop"><span className="timeline-dot" /><span><small>Pickup</small><strong>{shipment.origin}</strong></span></li>
						<li className="timeline-stop"><span className="timeline-dot" /><span><small>Destination</small><strong>{shipment.destination}</strong></span></li>
					</ol>
				</>
			) : <p className="panel-empty-state">No tracking data yet.</p>}
		</section>
	)
}

function LocationPanel({ shipments }) {
	const destinations = shipments.reduce((counts, shipment) => {
		const destination = shipment.destination.toLowerCase()
		const country = destination.includes('canada') ? 'canada' : destination.includes('mexico') ? 'mexico' : 'united-states'
		counts[country] += 1
		return counts
	}, { 'united-states': 0, canada: 0, mexico: 0, other: 0 })
	const total = shipments.length
	const percentages = Object.fromEntries(Object.entries(destinations).map(([country, count]) => [country, total ? Math.round((count / total) * 100) : 0]))
	let stop = 0
	const gradient = total
		? Object.entries(percentages).map(([country, percentage]) => {
			const start = stop
			stop += percentage
			return `var(--location-${country}) ${start}% ${stop}%`
		}).join(', ')
		: '#eeedf0 0 100%'

	return (
		<section className="dashboard-panel location-panel" aria-labelledby="location-title">
			<div className="panel-heading"><h2 id="location-title">Traffic by Location</h2></div>
			<div className={`location-chart${total ? '' : ' is-empty'}`} style={{ background: `conic-gradient(${gradient})` }} role="img" aria-label={`Shipment destinations by region, ${total} shipments`} />
			<ul className="location-legend">
				{[['united-states', 'United States'], ['canada', 'Canada'], ['mexico', 'Mexico'], ['other', 'Other']].map(([key, label]) => <li key={key}><i className={`location-dot ${key}`} /><span>{label}</span><strong>{percentages[key]}%</strong></li>)}
			</ul>
		</section>
	)
}

function ShipmentsTable({ shipmentRows }) {
	const [query, setQuery] = useState('')
	const [status, setStatus] = useState('All statuses')
	const [month, setMonth] = useState('All months')
	const filteredRows = shipmentRows.filter((row) => {
		const matchesQuery = `${row.id} ${row.company} ${row.category} ${row.from} ${row.to}`.toLowerCase().includes(query.toLowerCase())
		const matchesStatus = status === 'All statuses' || row.status === status
		const matchesMonth = month === 'All months' || row.month === month
		return matchesQuery && matchesStatus && matchesMonth
	})
	const months = [...new Set(shipmentRows.map((row) => row.month).filter(Boolean))]
	const hasFilters = query !== '' || status !== 'All statuses' || month !== 'All months'

	return (
		<section className="dashboard-panel shipments-panel" id="shipments-data" aria-labelledby="shipments-title" tabIndex={-1}>
			<div className="shipments-toolbar">
				<h2 id="shipments-title">Shipments Data</h2>
				<label className="shipment-search">
					<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>
					<input type="search" placeholder="Search id, company, etc" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search shipments" />
				</label>
				<label className="toolbar-select filter-select">
					<span className="select-prefix" aria-hidden="true">Filter</span>
					<select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter shipments by status">
						<option>All statuses</option><option>On Delivery</option><option>Pending</option><option>Completed</option><option>Delayed</option>
					</select>
				</label>
				<label className="toolbar-select date-select">
					<span className="select-prefix" aria-hidden="true">Date</span>
					<select value={month} onChange={(event) => setMonth(event.target.value)} aria-label="Select month">
						<option>All months</option>{months.map((item) => <option key={item}>{item}</option>)}
					</select>
				</label>
				{hasFilters && <button className="clear-filters-button" type="button" onClick={() => { setQuery(''); setStatus('All statuses'); setMonth('All months') }}>Clear filters</button>}
			</div>
			<div className="shipments-table-scroll">
				<table className="dashboard-shipments-table">
					<thead><tr><th>Shipping ID</th><th>Company</th><th>Product Category</th><th>Weight</th><th>Route</th><th>Date</th><th>Status</th></tr></thead>
					<tbody>
						{filteredRows.map((row, index) => (
							<tr key={`${row.id}-${row.date}-${index}`}>
								<td className="shipment-id">{row.id}</td><td>{row.company}</td><td>{row.category}</td><td>{row.weight}</td>
								<td><span className="route-from">{row.from}</span><span className="route-to">{row.to}</span></td><td>{row.date}</td>
								<td><span className={`shipment-status status-${row.status.toLowerCase().replace(' ', '-')}`}>{row.status}</span></td>
							</tr>
						))}
						{filteredRows.length === 0 && <tr><td className="empty-table" colSpan="7">{hasFilters ? 'No shipments match your filters.' : 'No shipment data yet.'}</td></tr>}
					</tbody>
				</table>
			</div>
		</section>
	)
}

function EmptyModule({ title, onBack }) {
	const icon = [...primaryItems, ...managementItems].find((item) => item.label === title)?.icon ?? 'dashboard'
	return (
		<section className="dashboard-panel module-empty" aria-live="polite">
			<span className="module-empty-icon"><NavIcon name={icon} /></span>
			<h1>{title}</h1>
			<p>No {title.toLowerCase()} data available yet.</p>
			<button type="button" onClick={onBack}>Back to Dashboard</button>
		</section>
	)
}

function AnalyticsWorkspace({ orders, shipments, shipmentRows }) {
	const delivered = shipments.filter((shipment) => shipment.status === 'Delivered').length
	const inProgress = shipments.filter((shipment) => ['Picked Up', 'In Transit', 'Out for Delivery', 'Delayed'].includes(shipment.status)).length
	const completionRate = shipments.length ? `${Math.round((delivered / shipments.length) * 100)}%` : '0%'

	return (
		<div className="dashboard-content analytics-workspace">
			<header className="dashboard-page-heading"><div><p className="dashboard-eyebrow">MANAGEMENT / PERFORMANCE</p><h1>Analytics</h1><p>Shipment activity and fulfillment performance across your operation.</p></div></header>
			<section className="metrics-grid analytics-metrics" aria-label="Operational performance">
				<MetricCard icon="orders" label="Orders" value={orders.length} onViewData={() => document.getElementById('analytics-shipments')?.scrollIntoView({ behavior: 'smooth' })} />
				<MetricCard icon="shipments" label="Shipments" value={shipments.length} onViewData={() => document.getElementById('analytics-shipments')?.scrollIntoView({ behavior: 'smooth' })} />
				<MetricCard icon="tracking" label="In progress" value={inProgress} onViewData={() => document.getElementById('analytics-shipments')?.scrollIntoView({ behavior: 'smooth' })} />
				<MetricCard icon="dashboard" label="Delivered" value={delivered} onViewData={() => document.getElementById('analytics-shipments')?.scrollIntoView({ behavior: 'smooth' })} />
				<article className="metric-card"><div className="metric-heading"><span className="metric-icon"><NavIcon name="analytics" /></span><span className="metric-label">Completion rate</span></div><div className="metric-bottom"><strong className="metric-value">{completionRate}</strong><span className="metric-empty-note">Delivered shipments</span></div></article>
			</section>
			<section className="insights-grid analytics-insights" aria-label="Shipment analytics">
				<ShipmentsChart shipments={shipments} />
				<LocationPanel shipments={shipments} />
			</section>
			<div id="analytics-shipments"><ShipmentsTable shipmentRows={shipmentRows} /></div>
		</div>
	)
}

function SettingsWorkspace({ settings, saveMessage, onSave }) {
	const [form, setForm] = useState(settings)
	const update = (event) => {
		const { name, value, checked, type } = event.target
		setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
	}

	return (
		<div className="dashboard-content settings-workspace">
			<header className="dashboard-page-heading"><div><p className="dashboard-eyebrow">MANAGEMENT / PREFERENCES</p><h1>Settings</h1><p>Manage your workspace details and notification preferences.</p></div></header>
			<section className="dashboard-panel settings-panel" aria-labelledby="settings-title">
				<div className="panel-heading"><h2 id="settings-title">Workspace preferences</h2></div>
				<form className="settings-form" onSubmit={(event) => { event.preventDefault(); onSave(form) }}>
					<label className="settings-field">Company name<input name="company" required value={form.company} onChange={update} /></label>
					<label className="settings-field">Time zone<select name="timezone" value={form.timezone} onChange={update}><option value="America/Los_Angeles">Pacific Time</option><option value="America/Denver">Mountain Time</option><option value="America/Chicago">Central Time</option><option value="America/New_York">Eastern Time</option><option value="UTC">UTC</option></select></label>
					<label className="settings-checkbox"><input type="checkbox" name="emailNotifications" checked={form.emailNotifications} onChange={update} /><span><strong>Email notifications</strong><small>Receive updates about shipment status changes.</small></span></label>
					<div className="settings-actions"><p role="status">{saveMessage}</p><button className="settings-save-button" type="submit">Save settings</button></div>
				</form>
			</section>
		</div>
	)
}

export default function Dashboard() {
	const [activePage, setActivePage] = useState(pageFromHash)
	const [showHelp, setShowHelp] = useState(false)
	const [settings, setSettings] = useState(readSettings)
	const [settingsMessage, setSettingsMessage] = useState('')
	const orders = readList(ORDERS_KEY, sampleOrders)
	const shipments = readList(SHIPMENTS_KEY, sampleShipments)
	const shipmentRows = getDashboardRows(shipments, orders)
	const trackingShipments = getTrackingShipments()
	const activeTracking = trackingShipments[0]
	const counts = {
		total: shipments.length,
		pending: orders.filter((order) => order.status === 'Pending').length,
		delivery: shipments.filter((shipment) => ['Picked Up', 'In Transit', 'Out for Delivery', 'Delayed'].includes(shipment.status)).length,
		completed: shipments.filter((shipment) => shipment.status === 'Delivered').length,
	}
	const navigatePage = (label) => {
		const slug = label.toLowerCase().replaceAll(' ', '-')
		window.history.pushState(null, '', label === 'Dashboard' ? '/dashboard' : `/dashboard#${slug}`)
		setActivePage(label)
	}
	const saveSettings = (nextSettings) => {
		try {
			localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings))
			setSettings(nextSettings)
			setSettingsMessage('Settings saved.')
		} catch {
			setSettingsMessage('Settings could not be saved in this browser.')
		}
	}

	useEffect(() => {
		const syncPage = () => setActivePage(pageFromHash())
		window.addEventListener('hashchange', syncPage)
		window.addEventListener('popstate', syncPage)
		return () => {
			window.removeEventListener('hashchange', syncPage)
			window.removeEventListener('popstate', syncPage)
		}
	}, [])

	return (
		<div className="dashboard-layout">
		<aside className="logicraft-sidebar" aria-label="Main sidebar">
			<a className="sidebar-brand" href="/" aria-label="Logicraft home">
				<span className="sidebar-brand-mark" aria-hidden="true"><span /></span>
				<span className="sidebar-brand-name">LOGICRAFT</span>
			</a>

			<div className="sidebar-groups">
				<NavigationGroup title="Main" items={primaryItems} activeLabel={activePage} onSelect={navigatePage} />
				<NavigationGroup title="Management" items={managementItems} activeLabel={activePage} onSelect={navigatePage} />
			</div>

			<footer className="sidebar-footer">
				<button className="sidebar-link sidebar-help-button" type="button" onClick={() => setShowHelp(true)}>
					<span className="sidebar-link-icon"><NavIcon name="help" /></span>
					<span>Help &amp; Support</span>
				</button>
				<div className="sidebar-profile">
					<span className="sidebar-avatar" aria-hidden="true">LC</span>
					<span className="sidebar-profile-label">User Profile</span>
					<button className="sidebar-logout" type="button" onClick={() => window.location.assign('/')} aria-label="Log out and return to home" title="Log out">
						<NavIcon name="logout" />
					</button>
				</div>
			</footer>
		</aside>
		<main className="dashboard-main">
			{activePage === 'Tracking' ? <TrackingDashboard /> : activePage === 'Orders' ? <OrdersDashboard /> : activePage === 'Shipments' ? <ShipmentsDashboard /> : activePage === 'Warehouse' ? <WarehouseDashboard /> : activePage === 'Drivers' ? <DriversDashboard /> : activePage === 'Messages' ? <MessagesDashboard /> : activePage === 'Invoices & Billing' ? <InvoicesDashboard /> : activePage === 'Analytics' ? <AnalyticsWorkspace orders={orders} shipments={shipments} shipmentRows={shipmentRows} /> : activePage === 'Settings' ? <SettingsWorkspace settings={settings} saveMessage={settingsMessage} onSave={saveSettings} /> : activePage === 'Dashboard' ? <div className="dashboard-content" id="dashboard-overview">
				<header className="dashboard-page-heading"><div><p className="dashboard-eyebrow">LOGICRAFT / OPERATIONS</p><h1>Dashboard</h1><p>Your orders, shipments, and delivery activity at a glance.</p></div><div className="dashboard-quick-actions"><button type="button" onClick={() => navigatePage('Orders')}>Manage orders</button><button type="button" onClick={() => navigatePage('Shipments')}>Manage shipments</button></div></header>
				<section className="metrics-grid" aria-label="Shipment overview">
					<MetricCard icon="shipments" label="Total Shipments" value={counts.total} onViewData={() => navigatePage('Shipments')} />
					<MetricCard icon="tracking" label="Pending Orders" value={counts.pending} onViewData={() => navigatePage('Orders')} />
					<MetricCard icon="warehouse" label="In Delivery" value={counts.delivery} onViewData={() => navigatePage('Tracking')} />
					<MetricCard icon="dashboard" label="Completed" value={counts.completed} onViewData={() => navigatePage('Shipments')} />
				</section>
				<section className="insights-grid" aria-label="Shipment insights">
					<ShipmentsChart shipments={shipments} />
					<TrackingPanel shipment={activeTracking} onOpenTracking={() => navigatePage('Tracking')} />
					<LocationPanel shipments={shipments} />
				</section>
				<ShipmentsTable shipmentRows={shipmentRows} />
			</div> : <EmptyModule title={activePage} onBack={() => navigatePage('Dashboard')} />}
		</main>
		{showHelp && <div className="dashboard-dialog-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setShowHelp(false) }}><section className="dashboard-help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title"><h2 id="help-title">Help &amp; Support</h2><p>Support details will be available here when they are configured.</p><button type="button" onClick={() => setShowHelp(false)}>Close</button></section></div>}
		</div>
	)
}

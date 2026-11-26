import { useEffect, useState } from 'react'
import { sampleOrders } from './orderData.js'
import { sampleShipments } from './shipmentData.js'

const DRIVERS_KEY = 'logicraft-drivers-v1'
const SHIPMENTS_KEY = 'logicraft-shipments-v1'
const ORDERS_KEY = 'logicraft-orders-v1'
const VEHICLES = ['VAN-204 · Box truck', 'VAN-118 · Cargo van', 'TRK-053 · Semi truck', 'VAN-092 · Box truck', 'VAN-311 · Refrigerated van']

const sampleDrivers = [
	{ id: 'DRV-032', name: 'Christina Kamberina', phone: '+1 (312) 555-0184', email: 'christina.k@logicraft.example', licenseNumber: 'IL-C4821-3904', licenseClass: 'Class A', licenseExpiry: '2028-04-18', availability: 'Available', vehicle: 'VAN-204 · Box truck', completedTrips: 86, onTimeRate: 96, rating: 4.9, tripHistory: [{ shipmentId: 'SHP-2026-08421', route: 'Newark, NJ → Chicago, IL', status: 'In Transit', date: 'Oct 01, 2026' }, { shipmentId: 'SHP-2026-08214', route: 'Detroit, MI → Cleveland, OH', status: 'Delivered', date: 'Sep 28, 2026' }, { shipmentId: 'SHP-2026-08183', route: 'Milwaukee, WI → Chicago, IL', status: 'Delivered', date: 'Sep 25, 2026' }] },
	{ id: 'DRV-018', name: 'Daniel Brooks', phone: '+1 (617) 555-0127', email: 'daniel.b@logicraft.example', licenseNumber: 'MA-B1377-8540', licenseClass: 'Class B', licenseExpiry: '2027-11-02', availability: 'Available', vehicle: 'VAN-118 · Cargo van', completedTrips: 54, onTimeRate: 93, rating: 4.8, tripHistory: [{ shipmentId: 'SHP-2026-07950', route: 'New York, NY → Boston, MA', status: 'Delivered', date: 'Sep 22, 2026' }, { shipmentId: 'SHP-2026-07881', route: 'Providence, RI → Boston, MA', status: 'Delivered', date: 'Sep 19, 2026' }] },
	{ id: 'DRV-053', name: 'Marcus Lee', phone: '+1 (512) 555-0166', email: 'marcus.lee@logicraft.example', licenseNumber: 'TX-A9012-1473', licenseClass: 'Class A', licenseExpiry: '2029-01-15', availability: 'Off Duty', vehicle: 'TRK-053 · Semi truck', completedTrips: 112, onTimeRate: 89, rating: 4.7, tripHistory: [{ shipmentId: 'SHP-2026-07718', route: 'Dallas, TX → Houston, TX', status: 'Delivered', date: 'Sep 17, 2026' }, { shipmentId: 'SHP-2026-07595', route: 'Austin, TX → San Antonio, TX', status: 'Delivered', date: 'Sep 12, 2026' }] },
	{ id: 'DRV-092', name: 'Avery Chen', phone: '+1 (206) 555-0141', email: 'avery.chen@logicraft.example', licenseNumber: 'WA-C2044-6218', licenseClass: 'Class C', licenseExpiry: '2028-08-30', availability: 'Available', vehicle: 'VAN-092 · Box truck', completedTrips: 68, onTimeRate: 98, rating: 5.0, tripHistory: [{ shipmentId: 'SHP-2026-08396', route: 'Portland, OR → Seattle, WA', status: 'Delivered', date: 'Oct 01, 2026' }, { shipmentId: 'SHP-2026-08220', route: 'Tacoma, WA → Seattle, WA', status: 'Delivered', date: 'Sep 27, 2026' }] },
	{ id: 'DRV-311', name: 'Nina Patel', phone: '+1 (215) 555-0178', email: 'nina.patel@logicraft.example', licenseNumber: 'PA-B6204-0351', licenseClass: 'Class B', licenseExpiry: '2027-06-21', availability: 'Available', vehicle: 'VAN-311 · Refrigerated van', completedTrips: 42, onTimeRate: 94, rating: 4.8, tripHistory: [{ shipmentId: 'SHP-2026-08111', route: 'Baltimore, MD → Philadelphia, PA', status: 'Delivered', date: 'Sep 24, 2026' }] },
]

function readList(key, fallback) {
	try {
		const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
		return Array.isArray(saved) ? saved : fallback
	} catch {
		return fallback
	}
}

function nowLabel() {
	return new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function DriverAvailability({ status }) {
	return <span className={`driver-availability driver-availability-${status.toLowerCase().replaceAll(' ', '-')}`}><i />{status}</span>
}

function DriverForm({ driver, onClose, onSave }) {
	const [form, setForm] = useState(() => driver ?? { name: '', phone: '', email: '', licenseNumber: '', licenseClass: 'Class B', licenseExpiry: '', availability: 'Available', vehicle: 'Unassigned' })
	const setValue = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))

	return (
		<div className="drivers-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
			<section className="drivers-modal" role="dialog" aria-modal="true" aria-labelledby="driver-form-title">
				<header className="drivers-modal-heading"><div><span className="drivers-kicker">FLEET / {driver ? 'PROFILE UPDATE' : 'NEW PROFILE'}</span><h2 id="driver-form-title">{driver ? 'Edit driver' : 'Add driver'}</h2></div><button className="drivers-icon-button" type="button" onClick={onClose} aria-label="Close driver form">×</button></header>
				<form onSubmit={(event) => { event.preventDefault(); onSave(form) }}>
					<div className="drivers-form-grid"><label className="drivers-field">Full name<input name="name" value={form.name} onChange={setValue} required placeholder="Driver name" /></label><label className="drivers-field">Phone<input name="phone" type="tel" value={form.phone} onChange={setValue} required placeholder="+1 (555) 000-0000" /></label><label className="drivers-field">Email<input name="email" type="email" value={form.email} onChange={setValue} placeholder="driver@example.com" /></label><label className="drivers-field">License number<input name="licenseNumber" value={form.licenseNumber} onChange={setValue} required placeholder="License ID" /></label><label className="drivers-field">License class<select name="licenseClass" value={form.licenseClass} onChange={setValue}><option>Class A</option><option>Class B</option><option>Class C</option></select></label><label className="drivers-field">License expiry<input name="licenseExpiry" type="date" value={form.licenseExpiry} onChange={setValue} required /></label><label className="drivers-field">Availability<select name="availability" value={form.availability} onChange={setValue}><option>Available</option><option>Off Duty</option></select></label><label className="drivers-field">Assigned vehicle<select name="vehicle" value={form.vehicle} onChange={setValue}><option>Unassigned</option>{VEHICLES.map((vehicle) => <option key={vehicle}>{vehicle}</option>)}</select></label></div>
					<footer className="drivers-form-actions"><button className="drivers-secondary-button" type="button" onClick={onClose}>Cancel</button><button className="drivers-primary-button" type="submit">{driver ? 'Save driver' : 'Add driver'}</button></footer>
				</form>
			</section>
		</div>
	)
}

export default function DriversDashboard() {
	const [drivers, setDrivers] = useState(() => readList(DRIVERS_KEY, sampleDrivers))
	const [shipments, setShipments] = useState(() => readList(SHIPMENTS_KEY, sampleShipments))
	const [selectedId, setSelectedId] = useState(() => readList(DRIVERS_KEY, sampleDrivers)[0]?.id ?? '')
	const [query, setQuery] = useState('')
	const [availabilityFilter, setAvailabilityFilter] = useState('All')
	const [formOpen, setFormOpen] = useState(false)
	const [editingDriver, setEditingDriver] = useState(null)
	const [assignmentShipment, setAssignmentShipment] = useState('')
	const [assignmentVehicle, setAssignmentVehicle] = useState('')

	useEffect(() => { try { localStorage.setItem(DRIVERS_KEY, JSON.stringify(drivers)) } catch {} }, [drivers])
	useEffect(() => { try { localStorage.setItem(SHIPMENTS_KEY, JSON.stringify(shipments)) } catch {} }, [shipments])

	const activeShipmentStatuses = ['Ready for Pickup', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delayed']
	const tripFor = (driver) => shipments.find((shipment) => shipment.driver === driver.name && activeShipmentStatuses.includes(shipment.status))
	const filteredDrivers = drivers.filter((driver) => {
		const status = tripFor(driver) ? 'On Trip' : driver.availability
		return `${driver.name} ${driver.phone} ${driver.email} ${driver.licenseNumber} ${driver.vehicle}`.toLowerCase().includes(query.trim().toLowerCase())
			&& (availabilityFilter === 'All' || (availabilityFilter === 'On Trip' ? Boolean(tripFor(driver)) : status === availabilityFilter))
	})
	const selectedDriver = filteredDrivers.find((driver) => driver.id === selectedId) ?? filteredDrivers[0]
	const activeDriverCount = drivers.filter((driver) => driver.availability === 'Available' && !tripFor(driver)).length
	const onTripCount = drivers.filter((driver) => Boolean(tripFor(driver))).length
	const completedTrips = drivers.reduce((sum, driver) => sum + driver.completedTrips, 0)
	const performance = Math.round(drivers.reduce((sum, driver) => sum + driver.onTimeRate, 0) / Math.max(drivers.length, 1))
	const currentTrip = selectedDriver ? tripFor(selectedDriver) : null
	const pastTrips = selectedDriver?.tripHistory.filter((trip) => trip.shipmentId !== currentTrip?.id) ?? []
	const assignableShipments = shipments.filter((shipment) => activeShipmentStatuses.includes(shipment.status))

	const saveDriver = (form) => {
		if (editingDriver) {
			setDrivers((current) => current.map((driver) => driver.id === editingDriver.id ? { ...driver, ...form } : driver))
			const linkedShipments = shipments.map((shipment) => shipment.driver === editingDriver.name ? { ...shipment, driver: form.name, vehicle: form.vehicle } : shipment)
			setShipments(linkedShipments)
			const orders = readList(ORDERS_KEY, sampleOrders)
			const updatedOrders = orders.map((order) => {
				const shipment = linkedShipments.find((item) => item.orderId === order.id && item.driver === form.name)
				return shipment ? { ...order, driver: form.name, vehicle: form.vehicle } : order
			})
			try { localStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders)) } catch {}
		} else {
			const driver = { ...form, id: `DRV-${String(Date.now()).slice(-3)}`, completedTrips: 0, onTimeRate: 100, rating: 5, tripHistory: [] }
			setDrivers((current) => [driver, ...current])
			setSelectedId(driver.id)
		}
		setFormOpen(false)
		setEditingDriver(null)
	}

	const assignShipment = (event) => {
		event.preventDefault()
		if (!selectedDriver || !assignmentShipment || selectedDriver.availability !== 'Available' || currentTrip) return
		const shipment = shipments.find((item) => item.id === assignmentShipment)
		if (!shipment) return
		const nextShipment = {
			...shipment,
			driver: selectedDriver.name,
			vehicle: assignmentVehicle || selectedDriver.vehicle || 'Unassigned',
			history: [{ status: 'Driver assignment updated', date: nowLabel(), location: `${selectedDriver.name} · ${assignmentVehicle || selectedDriver.vehicle}` }, ...(shipment.history ?? [])],
		}
		setShipments((current) => current.map((item) => item.id === shipment.id ? nextShipment : item))
		const orders = readList(ORDERS_KEY, sampleOrders)
		const updatedOrders = orders.map((order) => order.id === shipment.orderId ? { ...order, driver: nextShipment.driver, vehicle: nextShipment.vehicle, shipment: shipment.id, tracking: shipment.tracking, history: [{ label: 'Shipment assigned', date: nowLabel(), note: `${shipment.id} · ${nextShipment.driver} · ${nextShipment.vehicle}` }, ...(order.history ?? [])] } : order)
		try { localStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders)) } catch {}
		setDrivers((current) => current.map((driver) => driver.id === selectedDriver.id ? { ...driver, vehicle: nextShipment.vehicle } : driver))
		setAssignmentShipment('')
	}

	return (
		<div className="drivers-workspace">
			<header className="drivers-page-heading"><div><span className="drivers-kicker">OPERATIONS / FLEET DIRECTORY</span><h1>Drivers</h1><p>People, vehicles, and trips across your fleet.</p></div><button className="drivers-primary-button" type="button" onClick={() => { setEditingDriver(null); setFormOpen(true) }}><span aria-hidden="true">＋</span> Add driver</button></header>

			<section className="drivers-summary-grid" aria-label="Driver overview">
				{[
					['Total drivers', drivers.length, 'Profiles in the directory', 'total'],
					['Available', activeDriverCount, 'Ready for assignment', 'available'],
					['On trip', onTripCount, 'Currently on active shipments', 'trip'],
					['Completed trips', completedTrips, 'Across the driver team', 'completed'],
					['On-time performance', `${performance}%`, 'Average delivery rate', 'performance'],
				].map(([label, value, note, tone]) => <article className={`drivers-glass-card drivers-stat drivers-stat-${tone}`} key={tone}><span>{label}</span><strong>{value}</strong><small>{note}</small><i aria-hidden="true" /></article>)}
			</section>

			<div className="drivers-content-grid">
				<section className="drivers-glass-card drivers-list-panel" aria-labelledby="drivers-list-title">
					<div className="drivers-section-heading"><div><h2 id="drivers-list-title">Driver directory</h2><p>{filteredDrivers.length} of {drivers.length} drivers</p></div><span className="drivers-register-mark">FLEET ROSTER <b>/{String(filteredDrivers.length).padStart(2, '0')}</b></span></div>
					<div className="drivers-filters"><label className="drivers-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search driver, phone, license" aria-label="Search drivers" /></label><label className="drivers-filter-field"><span>Availability</span><select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)}><option>All</option><option>Available</option><option>On Trip</option><option>Off Duty</option></select></label></div>
					<div className="drivers-table-scroll"><table className="drivers-table"><thead><tr><th>Driver</th><th>Contact</th><th>License</th><th>Vehicle</th><th>Current trip</th><th>Status</th></tr></thead><tbody>
						{filteredDrivers.map((driver) => { const trip = tripFor(driver); return <tr key={driver.id} className={selectedDriver?.id === driver.id ? 'is-selected' : ''}><td><button type="button" className="driver-select-button" onClick={() => setSelectedId(driver.id)}><span className="driver-table-avatar">{driver.name.split(' ').map((part) => part[0]).join('')}</span><span><strong>{driver.name}</strong><small>{driver.id}</small></span></button></td><td><strong>{driver.phone}</strong><span>{driver.email}</span></td><td><strong>{driver.licenseClass}</strong><span>{driver.licenseNumber}</span></td><td><strong>{driver.vehicle}</strong></td><td><strong>{trip?.id ?? '—'}</strong><span>{trip ? `${trip.pickup.split(',')[0]} → ${trip.destination.split(',')[0]}` : 'No active trip'}</span></td><td><DriverAvailability status={trip ? 'On Trip' : driver.availability} /></td></tr> })}
						{filteredDrivers.length === 0 && <tr><td className="drivers-empty-row" colSpan="6">No drivers match these filters.</td></tr>}
					</tbody></table></div>
				</section>

				{selectedDriver ? <aside className="drivers-glass-card drivers-detail-panel" aria-labelledby="driver-detail-title">
					<div className="drivers-detail-heading"><span className="driver-detail-avatar">{selectedDriver.name.split(' ').map((part) => part[0]).join('')}</span><div><span className="drivers-kicker">DRIVER PROFILE / {selectedDriver.id}</span><h2 id="driver-detail-title">{selectedDriver.name}</h2><p>{selectedDriver.email}</p></div><button className="drivers-icon-button" type="button" onClick={() => { setEditingDriver(selectedDriver); setFormOpen(true) }} aria-label="Edit driver profile" title="Edit driver"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16.5-.8 4.3 4.3-.8L19.8 7.7a2.1 2.1 0 0 0-3-3L4 16.5Z" /><path d="m14.9 6.6 3 3" /></svg></button></div>
					<div className="drivers-profile-status"><DriverAvailability status={currentTrip ? 'On Trip' : selectedDriver.availability} /><span>{selectedDriver.completedTrips} completed trips</span></div>
					<div className="drivers-detail-section"><h3>Contact &amp; license</h3><div className="drivers-facts"><span>Phone<strong>{selectedDriver.phone}</strong></span><span>Email<strong>{selectedDriver.email}</strong></span><span>License<strong>{selectedDriver.licenseClass} · {selectedDriver.licenseNumber}</strong></span><span>Expires<strong>{new Date(`${selectedDriver.licenseExpiry}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong></span><span>Assigned vehicle<strong>{selectedDriver.vehicle}</strong></span></div></div>
					{currentTrip && <div className="drivers-current-trip"><span className="drivers-kicker">CURRENT TRIP</span><strong>{currentTrip.id} · {currentTrip.orderId}</strong><span>{currentTrip.pickup} → {currentTrip.destination}</span><span>Tracking {currentTrip.tracking} · {currentTrip.status}</span><span>ETA · {currentTrip.eta}</span></div>}
					<div className="drivers-performance"><div><h3>Performance</h3><strong>{selectedDriver.onTimeRate}% <small>on-time</small></strong></div><div className="drivers-performance-track"><i style={{ width: `${selectedDriver.onTimeRate}%` }} /></div><span>★ {selectedDriver.rating.toFixed(1)} driver rating · {selectedDriver.completedTrips} trips completed</span></div>
					<div className="drivers-assign-section"><h3>Assign shipment &amp; vehicle</h3><form onSubmit={assignShipment}><label className="drivers-field">Shipment<select disabled={selectedDriver.availability !== 'Available' || Boolean(currentTrip)} value={assignmentShipment} onChange={(event) => { const shipment = shipments.find((item) => item.id === event.target.value); setAssignmentShipment(event.target.value); setAssignmentVehicle(shipment?.vehicle && shipment.vehicle !== 'Not assigned' ? shipment.vehicle : selectedDriver.vehicle) }}><option value="">Choose an active shipment</option>{assignableShipments.map((shipment) => <option key={shipment.id} value={shipment.id}>{shipment.id} · {shipment.customer}</option>)}</select></label><label className="drivers-field">Vehicle<select disabled={selectedDriver.availability !== 'Available' || Boolean(currentTrip)} value={assignmentVehicle || selectedDriver.vehicle} onChange={(event) => setAssignmentVehicle(event.target.value)}>{VEHICLES.map((vehicle) => <option key={vehicle}>{vehicle}</option>)}</select></label><button className="drivers-secondary-button" type="submit" disabled={!assignmentShipment || selectedDriver.availability !== 'Available' || Boolean(currentTrip)}>Assign to trip</button></form>{(selectedDriver.availability !== 'Available' || currentTrip) && <p className="drivers-assignment-note">Only available drivers without an active trip can be assigned.</p>}</div>
					<div className="drivers-history-section"><div className="drivers-history-heading"><h3>Trip history</h3><span>{pastTrips.length + (currentTrip ? 1 : 0)} records</span></div><ol className="drivers-history">{currentTrip && <li className="is-current"><i /><div><strong>{currentTrip.id} · {currentTrip.status}</strong><span>{currentTrip.pickup} → {currentTrip.destination}</span></div><time>{currentTrip.deliveryDate}</time></li>}{pastTrips.map((trip, index) => <li key={`${trip.shipmentId}-${index}`}><i /><div><strong>{trip.shipmentId} · {trip.status}</strong><span>{trip.route}</span></div><time>{trip.date}</time></li>)}</ol></div>
				</aside> : <aside className="drivers-glass-card drivers-empty-detail"><strong>No driver selected</strong><span>Change filters or add a driver profile.</span></aside>}
			</div>
			{formOpen && <DriverForm driver={editingDriver} onClose={() => { setFormOpen(false); setEditingDriver(null) }} onSave={saveDriver} />}
		</div>
	)
}

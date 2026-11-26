import { useEffect, useState } from 'react'
import { sampleOrders } from './orderData.js'
import { sampleShipments } from './shipmentData.js'

const SHIPMENTS_KEY = 'logicraft-shipments-v1'
const ORDERS_KEY = 'logicraft-orders-v1'
const SHIPMENT_STATUSES = ['Ready for Pickup', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'Delayed', 'Failed Delivery']
const FLEET = [
	{ driver: 'Christina Kamberina', vehicle: 'VAN-204 · Box truck' },
	{ driver: 'Daniel Brooks', vehicle: 'VAN-118 · Cargo van' },
	{ driver: 'Marcus Lee', vehicle: 'TRK-053 · Semi truck' },
	{ driver: 'Avery Chen', vehicle: 'VAN-092 · Box truck' },
	{ driver: 'Nina Patel', vehicle: 'VAN-311 · Refrigerated van' },
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

function dateLabel(value) {
	if (!value) return 'Not scheduled'
	return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ShipmentStatus({ status }) {
	return <span className={`shipment-status-pill shipment-status-${status.toLowerCase().replaceAll(' ', '-')}`}><i />{status}</span>
}

function NewShipmentDialog({ orders, onClose, onCreate }) {
	const availableOrders = orders.filter((order) => order.shipment === 'Not assigned' && order.status !== 'Cancelled')
	const [orderId, setOrderId] = useState(availableOrders[0]?.id ?? '')
	const [driver, setDriver] = useState(FLEET[0].driver)
	const [vehicle, setVehicle] = useState(FLEET[0].vehicle)
	const selectedOrder = availableOrders.find((order) => order.id === orderId)

	return (
		<div className="shipments-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
			<section className="shipments-modal" role="dialog" aria-modal="true" aria-labelledby="new-shipment-title">
				<header className="shipments-modal-heading"><div><span className="shipments-kicker">DISPATCH / NEW SHIPMENT</span><h2 id="new-shipment-title">Create shipment</h2></div><button className="shipments-icon-button" type="button" onClick={onClose} aria-label="Close shipment form">×</button></header>
				{availableOrders.length ? <form onSubmit={(event) => { event.preventDefault(); if (selectedOrder) onCreate(selectedOrder, driver, vehicle) }}>
					<label className="shipments-field">Order to dispatch<select required value={orderId} onChange={(event) => setOrderId(event.target.value)}>{availableOrders.map((order) => <option value={order.id} key={order.id}>{order.id} · {order.customer}</option>)}</select></label>
					{selectedOrder && <div className="shipment-order-preview"><span><small>PICKUP</small><strong>{selectedOrder.pickup}</strong></span><span><small>DESTINATION</small><strong>{selectedOrder.delivery}</strong></span><span><small>ITEMS</small><strong>{selectedOrder.item} · {selectedOrder.quantity} units · {selectedOrder.weight} lb</strong></span><span><small>DELIVERY DATE</small><strong>{dateLabel(selectedOrder.deliveryDate)}</strong></span></div>}
					<div className="shipments-form-grid"><label className="shipments-field">Assigned driver<select value={driver} onChange={(event) => { setDriver(event.target.value); setVehicle(FLEET.find((item) => item.driver === event.target.value)?.vehicle ?? '') }}>{FLEET.map((item) => <option key={item.driver}>{item.driver}</option>)}</select></label><label className="shipments-field">Assigned vehicle<select value={vehicle} onChange={(event) => setVehicle(event.target.value)}>{FLEET.map((item) => <option key={item.vehicle}>{item.vehicle}</option>)}</select></label></div>
					<p className="shipments-eta-note">An ML-predicted ETA will be added when a route model is available. The order delivery date is used as the schedule target.</p>
					<footer className="shipments-form-actions"><button className="shipments-secondary-button" type="button" onClick={onClose}>Cancel</button><button className="shipments-primary-button" type="submit">Create &amp; assign</button></footer>
				</form> : <div className="shipments-no-orders"><strong>No orders ready for dispatch</strong><span>Create a new order or check that an order is not already assigned to a shipment.</span><button className="shipments-secondary-button" type="button" onClick={onClose}>Close</button></div>}
			</section>
		</div>
	)
}

export default function ShipmentsDashboard() {
	const [shipments, setShipments] = useState(() => readList(SHIPMENTS_KEY, sampleShipments))
	const [orders, setOrders] = useState(() => readList(ORDERS_KEY, sampleOrders))
	const [selectedId, setSelectedId] = useState(() => readList(SHIPMENTS_KEY, sampleShipments)[0]?.id ?? '')
	const [query, setQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState('All')
	const [dateFilter, setDateFilter] = useState('')
	const [createOpen, setCreateOpen] = useState(false)

	useEffect(() => {
		try { localStorage.setItem(SHIPMENTS_KEY, JSON.stringify(shipments)) } catch {}
	}, [shipments])

	const filteredShipments = shipments.filter((shipment) => {
		const searchMatch = `${shipment.id} ${shipment.tracking} ${shipment.orderId} ${shipment.customer} ${shipment.pickup} ${shipment.destination} ${shipment.driver}`.toLowerCase().includes(query.trim().toLowerCase())
		return searchMatch && (statusFilter === 'All' || shipment.status === statusFilter) && (!dateFilter || shipment.deliveryDate === dateFilter)
	})
	const selected = filteredShipments.find((shipment) => shipment.id === selectedId) ?? filteredShipments[0]
	const counts = {
		total: shipments.length,
		ready: shipments.filter((shipment) => shipment.status === 'Ready for Pickup').length,
		transit: shipments.filter((shipment) => shipment.status === 'In Transit' || shipment.status === 'Picked Up').length,
		delivery: shipments.filter((shipment) => shipment.status === 'Out for Delivery').length,
		attention: shipments.filter((shipment) => shipment.status === 'Delayed' || shipment.status === 'Failed Delivery').length,
	}

	const syncOrder = (shipment, nextStatus = shipment.status, assignment = {}) => {
		const currentOrders = readList(ORDERS_KEY, sampleOrders)
		const orderStatus = nextStatus === 'Delivered' ? 'Completed' : nextStatus === 'Failed Delivery' ? 'Active' : 'Active'
		const updatedOrders = currentOrders.map((order) => order.id === shipment.orderId ? {
			...order,
			...assignment,
			shipment: shipment.id,
			tracking: shipment.tracking,
			status: orderStatus,
			eta: shipment.eta,
			history: [{ label: `Shipment ${nextStatus.toLowerCase()}`, date: nowLabel(), note: `${shipment.id} · ${shipment.currentLocation}` }, ...(order.history ?? [])],
		} : order)
		setOrders(updatedOrders)
		try { localStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders)) } catch {}
	}

	const createShipment = (order, driver, vehicle) => {
		const suffix = String(Date.now()).slice(-6)
		const shipment = {
			id: `SHP-${new Date().getFullYear()}-${suffix}`,
			tracking: `TRK-${new Date().getFullYear()}-${suffix}`,
			orderId: order.id,
			customer: order.customer,
			pickup: order.pickup,
			destination: order.delivery,
			driver,
			vehicle,
			status: 'Ready for Pickup',
			deliveryDate: order.deliveryDate,
			eta: `Scheduled · ${dateLabel(order.deliveryDate)}`,
			etaConfidence: 'Pending route model',
			etaType: 'Schedule target',
			currentLocation: order.pickup,
			history: [{ status: 'Ready for Pickup', date: nowLabel(), location: order.pickup }],
		}
		setShipments((current) => [shipment, ...current])
		setSelectedId(shipment.id)
		setQuery('')
		setStatusFilter('All')
		setDateFilter('')
		setCreateOpen(false)
		syncOrder(shipment, shipment.status, { driver, vehicle })
	}

	const updateShipment = (shipment, changes, historyStatus) => {
		const nextShipment = { ...shipment, ...changes }
		if (historyStatus) nextShipment.history = [{ status: historyStatus, date: nowLabel(), location: nextShipment.currentLocation }, ...shipment.history]
		setShipments((current) => current.map((item) => item.id === shipment.id ? nextShipment : item))
		syncOrder(nextShipment, nextShipment.status, { driver: nextShipment.driver, vehicle: nextShipment.vehicle })
	}

	return (
		<div className="shipments-workspace">
			<header className="shipments-page-heading"><div><span className="shipments-kicker">OPERATIONS / DISPATCH BOARD</span><h1>Shipments</h1><p>Every load, assigned and accounted for.</p></div><button className="shipments-primary-button" type="button" onClick={() => setCreateOpen(true)}><span aria-hidden="true">＋</span> Create shipment</button></header>

			<section className="shipments-summary-grid" aria-label="Shipment overview">
				{[
					['Total shipments', counts.total, 'Orders in the shipment desk', 'total'],
					['Ready for pickup', counts.ready, 'Assigned and awaiting collection', 'ready'],
					['On the road', counts.transit, 'Picked up or in transit', 'transit'],
					['Out for delivery', counts.delivery, 'Final-mile deliveries', 'delivery'],
					['Needs attention', counts.attention, 'Delayed or failed attempts', 'attention'],
				].map(([label, value, note, tone]) => <article className={`shipments-glass-card shipments-stat shipments-stat-${tone}`} key={tone}><span>{label}</span><strong>{value}</strong><small>{note}</small><i aria-hidden="true" /></article>)}
			</section>

			<div className="shipments-content-grid">
				<section className="shipments-glass-card shipments-list-panel" aria-labelledby="shipments-list-title">
					<div className="shipments-section-heading"><div><h2 id="shipments-list-title">Shipment register</h2><p>{filteredShipments.length} of {shipments.length} shipments</p></div><span className="shipments-register-stamp">DISPATCH LOG <b>/{String(filteredShipments.length).padStart(2, '0')}</b></span></div>
					<div className="shipments-filters"><label className="shipments-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search shipment, tracking, order, driver" aria-label="Search shipments" /></label><label className="shipments-filter-field"><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All</option>{SHIPMENT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label><label className="shipments-filter-field"><span>Delivery date</span><input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="Filter by delivery date" /></label>{(query || statusFilter !== 'All' || dateFilter) && <button className="shipments-reset-button" type="button" onClick={() => { setQuery(''); setStatusFilter('All'); setDateFilter('') }}>Reset</button>}</div>
					<div className="shipments-status-tabs" role="group" aria-label="Filter shipments by status">{['All', ...SHIPMENT_STATUSES].map((status) => <button type="button" key={status} className={statusFilter === status ? 'selected' : ''} onClick={() => setStatusFilter(status)}>{status}<span>{status === 'All' ? shipments.length : shipments.filter((shipment) => shipment.status === status).length}</span></button>)}</div>
					<div className="shipments-table-scroll"><table className="shipments-table"><thead><tr><th>Shipment / Tracking</th><th>Order</th><th>Pickup / Destination</th><th>Driver &amp; vehicle</th><th>Status</th><th>ML ETA</th></tr></thead><tbody>
						{filteredShipments.map((shipment) => <tr key={shipment.id} className={selected?.id === shipment.id ? 'is-selected' : ''}><td><button className="shipment-select-button" type="button" onClick={() => setSelectedId(shipment.id)}><strong>{shipment.id}</strong><span>{shipment.tracking}</span></button></td><td><strong>{shipment.orderId}</strong><span>{shipment.customer}</span></td><td><span className="shipments-route-start">{shipment.pickup.split(',')[0]}</span><span className="shipments-route-end">{shipment.destination.split(',')[0]}</span></td><td><strong>{shipment.driver}</strong><span>{shipment.vehicle}</span></td><td><ShipmentStatus status={shipment.status} /></td><td><strong>{shipment.eta}</strong><span>{shipment.etaType === 'ML predicted' ? `${shipment.etaConfidence} confidence` : shipment.etaType}</span></td></tr>)}
						{filteredShipments.length === 0 && <tr><td className="shipments-empty-row" colSpan="6">No shipments match these filters. Create a shipment from an unassigned order.</td></tr>}
					</tbody></table></div>
				</section>

				{selected ? <aside className="shipments-glass-card shipments-detail-panel" aria-labelledby="shipment-detail-title">
					<div className="shipments-detail-heading"><div><span className="shipments-kicker">SHIPMENT MANIFEST</span><h2 id="shipment-detail-title">{selected.id}</h2><p>{selected.orderId} · {selected.customer}</p></div><ShipmentStatus status={selected.status} /></div>
					<div className="shipments-manifest-route"><div><i className="manifest-pickup" /><small>PICKUP</small><strong>{selected.pickup}</strong></div><span /><div><i className="manifest-destination" /><small>DESTINATION</small><strong>{selected.destination}</strong></div></div>
					<div className="shipments-detail-facts"><span>Tracking ID<strong>{selected.tracking}</strong></span><span>Current location<strong>{selected.currentLocation}</strong></span><span>Delivery date<strong>{dateLabel(selected.deliveryDate)}</strong></span><span>Estimated delivery<strong>{selected.eta}</strong></span></div>
					<div className="shipments-assignment-section"><h3>Dispatch assignment</h3><div className="shipments-assignment-grid"><label className="shipments-field">Driver<select value={selected.driver} onChange={(event) => updateShipment(selected, { driver: event.target.value }, 'Driver reassigned')}>{FLEET.map((item) => <option key={item.driver}>{item.driver}</option>)}</select></label><label className="shipments-field">Vehicle<select value={selected.vehicle} onChange={(event) => updateShipment(selected, { vehicle: event.target.value }, 'Vehicle reassigned')}>{FLEET.map((item) => <option key={item.vehicle}>{item.vehicle}</option>)}</select></label></div></div>
					<div className="shipments-status-section"><label className="shipments-field">Update shipment status<select value={selected.status} onChange={(event) => updateShipment(selected, { status: event.target.value }, event.target.value)}>{SHIPMENT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label><p>Status changes are added to shipment history and synced to the linked order.</p></div>
					<div className="shipments-history-section"><div className="shipments-history-heading"><h3>Shipment history</h3><span>{selected.history.length} events</span></div><ol className="shipments-history">{selected.history.map((entry, index) => <li className={index === 0 ? 'is-current' : ''} key={`${entry.status}-${entry.date}-${index}`}><i /><div><strong>{entry.status}</strong><span>{entry.location}</span></div><time>{entry.date}</time></li>)}</ol></div>
				</aside> : <aside className="shipments-glass-card shipments-empty-detail"><strong>No shipment selected</strong><span>Change filters or create a shipment.</span></aside>}
			</div>
			{createOpen && <NewShipmentDialog orders={orders} onClose={() => setCreateOpen(false)} onCreate={createShipment} />}
		</div>
	)
}

import { useEffect, useState } from 'react'
import { sampleOrders } from './orderData.js'

const STORAGE_KEY = 'logicraft-orders-v1'
const ORDER_STATUSES = ['Pending', 'Active', 'Completed', 'Cancelled']

function readOrders() {
	try {
		const savedOrders = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
		return Array.isArray(savedOrders) ? savedOrders : sampleOrders
	} catch {
		return sampleOrders
	}
}

function todayLocal() {
	const today = new Date()
	return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

function displayDate(value) {
	if (!value) return 'Not set'
	return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function OrderStatus({ status }) {
	return <span className={`order-status order-status-${status.toLowerCase()}`}><i />{status}</span>
}

function OrderForm({ order, onClose, onSave }) {
	const [form, setForm] = useState(() => order ?? {
		customer: '', email: '', phone: '', pickup: '', delivery: '', item: '', quantity: '1', weight: '',
		pickupDate: todayLocal(), deliveryDate: '', instructions: '',
	})
	const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))

	return (
		<div className="orders-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
			<section className="orders-modal" role="dialog" aria-modal="true" aria-labelledby="order-form-title">
				<header className="orders-modal-heading"><div><span className="orders-kicker">ORDER DESK / {order ? 'EDIT' : 'NEW'}</span><h2 id="order-form-title">{order ? 'Edit order' : 'Create an order'}</h2></div><button className="orders-icon-button" type="button" onClick={onClose} aria-label="Close order form">×</button></header>
				<form onSubmit={(event) => { event.preventDefault(); onSave(form) }}>
					<div className="orders-form-section"><h3>Customer</h3><div className="orders-form-grid">
						<label className="orders-field">Customer / business<input name="customer" value={form.customer} onChange={updateField} required placeholder="Business or contact name" /></label>
						<label className="orders-field">Email<input name="email" type="email" value={form.email} onChange={updateField} placeholder="name@company.com" /></label>
						<label className="orders-field">Phone<input name="phone" type="tel" value={form.phone} onChange={updateField} placeholder="+1 (555) 000-0000" /></label>
					</div></div>
					<div className="orders-form-section"><h3>Route</h3><div className="orders-form-grid">
						<label className="orders-field">Pickup location<input name="pickup" value={form.pickup} onChange={updateField} required placeholder="Address, city, state" /></label>
						<label className="orders-field">Delivery location<input name="delivery" value={form.delivery} onChange={updateField} required placeholder="Address, city, state" /></label>
						<label className="orders-field">Pickup date<input name="pickupDate" type="date" value={form.pickupDate} onChange={updateField} required /></label>
						<label className="orders-field">Delivery date<input name="deliveryDate" type="date" value={form.deliveryDate} onChange={updateField} required min={form.pickupDate} /></label>
					</div></div>
					<div className="orders-form-section"><h3>Items &amp; handling</h3><div className="orders-form-grid">
						<label className="orders-field">Item details<input name="item" value={form.item} onChange={updateField} required placeholder="What is being shipped?" /></label>
						<label className="orders-field">Quantity<input name="quantity" type="number" min="1" step="1" value={form.quantity} onChange={updateField} required /></label>
						<label className="orders-field">Weight (lb)<input name="weight" type="number" min="0.1" step="0.1" value={form.weight} onChange={updateField} required placeholder="0.0" /></label>
						<label className="orders-field orders-field-wide">Special instructions<textarea name="instructions" value={form.instructions} onChange={updateField} rows="3" placeholder="Access notes, handling needs, delivery windows..." /></label>
					</div></div>
					<footer className="orders-form-actions"><button className="orders-secondary-button" type="button" onClick={onClose}>Cancel</button><button className="orders-primary-button" type="submit">{order ? 'Save changes' : 'Create order'}</button></footer>
				</form>
			</section>
		</div>
	)
}

export default function OrdersDashboard() {
	const [orders, setOrders] = useState(readOrders)
	const [selectedId, setSelectedId] = useState(() => readOrders()[0]?.id ?? '')
	const [query, setQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState('All')
	const [dateFilter, setDateFilter] = useState('')
	const [formOpen, setFormOpen] = useState(false)
	const [editingOrder, setEditingOrder] = useState(null)

	useEffect(() => {
		try { localStorage.setItem(STORAGE_KEY, JSON.stringify(orders)) } catch {}
	}, [orders])

	const counts = {
		total: orders.length,
		pending: orders.filter((order) => order.status === 'Pending').length,
		active: orders.filter((order) => order.status === 'Active').length,
		completed: orders.filter((order) => order.status === 'Completed').length,
		cancelled: orders.filter((order) => order.status === 'Cancelled').length,
	}
	const filteredOrders = orders.filter((order) => {
		const searchMatch = `${order.id} ${order.customer} ${order.email}`.toLowerCase().includes(query.trim().toLowerCase())
		return searchMatch && (statusFilter === 'All' || order.status === statusFilter) && (!dateFilter || order.pickupDate === dateFilter)
	})
	const selectedOrder = filteredOrders.find((order) => order.id === selectedId) ?? filteredOrders[0]

	const saveOrder = (form) => {
		const timestamp = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
		if (editingOrder) {
			setOrders((current) => current.map((order) => order.id === editingOrder.id ? {
				...order,
				...form,
				history: [{ label: 'Order details updated', date: timestamp, note: 'Order information was edited' }, ...order.history],
			} : order))
			setSelectedId(editingOrder.id)
		} else {
			const newOrder = {
				...form,
				id: `ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
				quantity: Number(form.quantity),
				weight: Number(form.weight),
				status: 'Pending',
				shipment: 'Not assigned', tracking: 'Not assigned', driver: 'Not assigned', vehicle: 'Not assigned', eta: 'Awaiting dispatch',
				history: [{ label: 'Order created', date: timestamp, note: 'Order created in the order desk' }],
			}
			setOrders((current) => [newOrder, ...current])
			setSelectedId(newOrder.id)
			setQuery('')
			setStatusFilter('All')
			setDateFilter('')
		}
		setFormOpen(false)
		setEditingOrder(null)
	}

	const updateStatus = (order, nextStatus) => {
		if (nextStatus === order.status) return
		const timestamp = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
		setOrders((current) => current.map((item) => item.id === order.id ? {
			...item,
			status: nextStatus,
			history: [{ label: `Status changed to ${nextStatus}`, date: timestamp, note: `Updated from ${order.status}` }, ...item.history],
		} : item))
	}

	const openNewOrder = () => { setEditingOrder(null); setFormOpen(true) }
	const openEditOrder = (order) => { setEditingOrder(order); setFormOpen(true) }

	return (
		<div className="orders-workspace">
			<header className="orders-page-heading"><div><span className="orders-kicker">OPERATIONS / ORDER DESK</span><h1>Orders</h1><p>One clear view from customer request to final delivery.</p></div><button className="orders-primary-button" type="button" onClick={openNewOrder}><span aria-hidden="true">＋</span> Add new order</button></header>

			<section className="orders-summary-grid" aria-label="Order overview">
				{[
					['Total orders', counts.total, 'Across all order states', 'total'],
					['Pending', counts.pending, 'Awaiting dispatch', 'pending'],
					['Active', counts.active, 'In fulfillment', 'active'],
					['Completed', counts.completed, 'Successfully delivered', 'completed'],
					['Cancelled', counts.cancelled, 'Closed before delivery', 'cancelled'],
				].map(([label, value, note, tone]) => <article className={`orders-glass-card orders-stat orders-stat-${tone}`} key={tone}><span className="orders-stat-label">{label}</span><strong>{value}</strong><small>{note}</small><span className="orders-stat-orbit" aria-hidden="true" /></article>)}
			</section>

			<div className="orders-content-grid">
				<section className="orders-glass-card orders-list-panel" aria-labelledby="orders-list-title">
					<div className="orders-section-heading"><div><h2 id="orders-list-title">Order register</h2><p>{filteredOrders.length} of {orders.length} orders</p></div><span className="orders-register-mark">ORDER LOG <b>/{String(filteredOrders.length).padStart(2, '0')}</b></span></div>
					<div className="orders-filters">
						<label className="orders-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find order or customer" aria-label="Search Order ID or customer" /></label>
						<label className="orders-filter-field"><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All</option>{ORDER_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
						<label className="orders-filter-field"><span>Pickup date</span><input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="Filter by pickup date" /></label>
						{(query || statusFilter !== 'All' || dateFilter) && <button className="orders-reset-button" type="button" onClick={() => { setQuery(''); setStatusFilter('All'); setDateFilter('') }}>Reset</button>}
					</div>
					<div className="orders-table-scroll"><table className="orders-table"><thead><tr><th>Order</th><th>Customer</th><th>Route</th><th>Pickup</th><th>Delivery</th><th>Status</th></tr></thead><tbody>
						{filteredOrders.map((order) => <tr key={order.id} className={selectedOrder?.id === order.id ? 'is-selected' : ''}>
							<td><button className="order-select-button" type="button" onClick={() => setSelectedId(order.id)}><strong>{order.id}</strong><span>{order.item}</span></button></td>
							<td><strong>{order.customer}</strong><span>{order.phone}</span></td>
							<td><span className="orders-route-from">{order.pickup.split(',')[0]}</span><span className="orders-route-to">{order.delivery.split(',')[0]}</span></td>
							<td>{displayDate(order.pickupDate)}</td><td>{displayDate(order.deliveryDate)}</td><td><OrderStatus status={order.status} /></td>
						</tr>)}
						{filteredOrders.length === 0 && <tr><td className="orders-empty-row" colSpan="6">No orders match these filters.</td></tr>}
					</tbody></table></div>
				</section>

				{selectedOrder ? <aside className="orders-glass-card orders-detail-panel" aria-labelledby="order-detail-title">
					<div className="orders-detail-top"><div><span className="orders-kicker">SELECTED ORDER</span><h2 id="order-detail-title">{selectedOrder.id}</h2><p>Created for {selectedOrder.customer}</p></div><button className="orders-icon-button" type="button" onClick={() => openEditOrder(selectedOrder)} aria-label="Edit selected order" title="Edit order"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16.5-.8 4.3 4.3-.8L19.8 7.7a2.1 2.1 0 0 0-3-3L4 16.5Z" /><path d="m14.9 6.6 3 3" /></svg></button></div>
					<div className="orders-detail-status"><OrderStatus status={selectedOrder.status} /><label><span>Manage status</span><select value={selectedOrder.status} onChange={(event) => updateStatus(selectedOrder, event.target.value)} aria-label="Update order status">{ORDER_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label></div>
					<div className="orders-detail-section"><h3>Delivery route</h3><div className="orders-route-card"><div className="orders-route-stop"><i className="pickup-marker" /><div><small>PICKUP</small><strong>{selectedOrder.pickup}</strong><span>{displayDate(selectedOrder.pickupDate)}</span></div></div><div className="orders-route-line" /><div className="orders-route-stop"><i className="delivery-marker" /><div><small>DELIVER TO</small><strong>{selectedOrder.delivery}</strong><span>{displayDate(selectedOrder.deliveryDate)}</span></div></div></div></div>
					<div className="orders-detail-section"><h3>Items &amp; handling</h3><div className="orders-detail-facts"><span>Item<strong>{selectedOrder.item}</strong></span><span>Quantity<strong>{selectedOrder.quantity} units</strong></span><span>Weight<strong>{selectedOrder.weight} lb</strong></span><span>Instructions<strong>{selectedOrder.instructions || 'No special instructions'}</strong></span></div></div>
					<div className="orders-detail-section"><h3>Shipment &amp; delivery</h3><div className="orders-shipment-facts"><span>Shipment<strong>{selectedOrder.shipment}</strong></span><span>Tracking ID<strong>{selectedOrder.tracking}</strong></span><span>Driver<strong>{selectedOrder.driver}</strong></span><span>Vehicle<strong>{selectedOrder.vehicle}</strong></span><span>Delivery estimate<strong>{selectedOrder.eta}</strong></span></div></div>
					<div className="orders-detail-section orders-history-section"><h3>Order history</h3><ol className="orders-history">{selectedOrder.history.map((entry, index) => <li className={index === 0 ? 'is-current' : ''} key={`${entry.label}-${entry.date}-${index}`}><i /><div><strong>{entry.label}</strong><span>{entry.note}</span></div><time>{entry.date}</time></li>)}</ol></div>
				</aside> : <aside className="orders-glass-card orders-detail-empty"><strong>No order selected</strong><span>Adjust your filters or create an order.</span></aside>}
			</div>

			{formOpen && <OrderForm order={editingOrder} onClose={() => { setFormOpen(false); setEditingOrder(null) }} onSave={saveOrder} />}
		</div>
	)
}

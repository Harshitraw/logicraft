import { useEffect, useState } from 'react'
import { sampleOrders } from './orderData.js'

const INVENTORY_KEY = 'logicraft-warehouse-inventory-v1'
const INBOUND_KEY = 'logicraft-warehouse-inbound-v1'
const TASKS_KEY = 'logicraft-warehouse-pick-tasks-v1'
const ACTIVITY_KEY = 'logicraft-warehouse-activity-v1'
const ORDERS_KEY = 'logicraft-orders-v1'
const STORAGE_CAPACITY = 10000

const initialInventory = [
	{ id: 'SKU-EL-104', name: 'Wireless charging dock', category: 'Electronics', location: 'A-01-03', onHand: 420, reserved: 82, reorderPoint: 100, unit: 'units' },
	{ id: 'SKU-HG-221', name: 'Stoneware dinner set', category: 'Home goods', location: 'B-03-07', onHand: 74, reserved: 22, reorderPoint: 80, unit: 'sets' },
	{ id: 'SKU-FD-030', name: 'Organic ground coffee', category: 'Food & beverage', location: 'C-02-01', onHand: 1620, reserved: 190, reorderPoint: 250, unit: 'cases' },
	{ id: 'SKU-PK-512', name: 'Shipping cartons · M', category: 'Packaging', location: 'D-01-12', onHand: 2830, reserved: 360, reorderPoint: 400, unit: 'cartons' },
	{ id: 'SKU-CL-118', name: 'Surface cleaner · 1 gal', category: 'Cleaning', location: 'C-04-04', onHand: 38, reserved: 4, reorderPoint: 45, unit: 'cases' },
	{ id: 'SKU-OT-901', name: 'Trail pack 28L', category: 'Outdoor', location: 'B-01-02', onHand: 1940, reserved: 218, reorderPoint: 180, unit: 'units' },
]

const initialInbound = [
	{ id: 'RCV-2026-0418', supplier: 'Evergreen Supply Co.', purchaseOrder: 'PO-11842', itemId: 'SKU-EL-104', quantity: 240, eta: 'Oct 02 · 9:30 AM', dock: 'Dock 02', status: 'Expected' },
	{ id: 'RCV-2026-0417', supplier: 'Harbor Home Imports', purchaseOrder: 'PO-11831', itemId: 'SKU-HG-221', quantity: 120, eta: 'Oct 02 · 1:00 PM', dock: 'Dock 04', status: 'Expected' },
	{ id: 'RCV-2026-0414', supplier: 'Packwell Distribution', purchaseOrder: 'PO-11796', itemId: 'SKU-PK-512', quantity: 500, eta: 'Oct 01 · 8:15 AM', dock: 'Dock 01', status: 'Received' },
]

function readStorage(key, fallback) {
	try {
		const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
		return Array.isArray(saved) ? saved : fallback
	} catch {
		return fallback
	}
}

function initialTasks() {
	const orders = readStorage(ORDERS_KEY, sampleOrders)
	const tasks = readStorage(TASKS_KEY, [])
	const taskByOrder = new Map(tasks.map((task) => [task.orderId, task]))
	orders.forEach((order) => {
		if (order.shipment !== 'Not assigned' && order.shipment) {
			const existing = taskByOrder.get(order.id)
			if (existing) taskByOrder.set(order.id, { ...existing, status: 'Dispatched', shipmentId: order.shipment })
		} else if (order.status !== 'Cancelled' && !taskByOrder.has(order.id)) {
			taskByOrder.set(order.id, { id: `PICK-${order.id}`, orderId: order.id, customer: order.customer, item: order.item, quantity: order.quantity, destination: order.delivery, status: 'Awaiting Pick', shipmentId: '' })
		}
	})
	return [...taskByOrder.values()]
}

function timeLabel() {
	return new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function StockFlag({ item }) {
	const available = item.onHand - item.reserved
	const low = available <= item.reorderPoint
	return <span className={`warehouse-stock-flag ${low ? 'is-low' : 'is-healthy'}`}><i />{low ? 'Low stock' : 'In stock'}</span>
}

function ReceiveGoodsDialog({ inventory, initialSku, onClose, onReceive }) {
	const [sku, setSku] = useState(initialSku ?? inventory[0]?.id ?? '')
	const [quantity, setQuantity] = useState('')
	const [reference, setReference] = useState('')
	const selected = inventory.find((item) => item.id === sku)

	return (
		<div className="warehouse-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
			<section className="warehouse-modal" role="dialog" aria-modal="true" aria-labelledby="receive-goods-title">
				<header className="warehouse-modal-heading"><div><span className="warehouse-kicker">INBOUND / STOCK CONTROL</span><h2 id="receive-goods-title">Receive goods</h2></div><button className="warehouse-icon-button" type="button" onClick={onClose} aria-label="Close receive goods form">×</button></header>
				<form onSubmit={(event) => { event.preventDefault(); if (selected) onReceive(selected, Number(quantity), reference) }}>
					<label className="warehouse-field">Inventory item<select value={sku} onChange={(event) => setSku(event.target.value)}>{inventory.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.name}</option>)}</select></label>
					{selected && <p className="warehouse-receive-context">Current stock: <strong>{selected.onHand} {selected.unit}</strong><span>Storage location {selected.location}</span></p>}
					<div className="warehouse-form-grid"><label className="warehouse-field">Quantity received<input type="number" min="1" step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Enter units received" /></label><label className="warehouse-field">Supplier / reference<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Supplier or PO number" /></label></div>
					<footer className="warehouse-form-actions"><button className="warehouse-secondary-button" type="button" onClick={onClose}>Cancel</button><button className="warehouse-primary-button" type="submit">Confirm receipt</button></footer>
				</form>
			</section>
		</div>
	)
}

export default function WarehouseDashboard() {
	const [inventory, setInventory] = useState(() => readStorage(INVENTORY_KEY, initialInventory))
	const [inbound, setInbound] = useState(() => readStorage(INBOUND_KEY, initialInbound))
	const [tasks, setTasks] = useState(initialTasks)
	const [activity, setActivity] = useState(() => readStorage(ACTIVITY_KEY, [
		{ id: 'ACT-01', action: 'Pick list started', detail: 'ORD-2026-10476 · Harbor & Pine', time: 'Today · 9:18 AM', type: 'pick' },
		{ id: 'ACT-02', action: 'Inbound checked in', detail: 'RCV-2026-0414 · Dock 01', time: 'Today · 8:15 AM', type: 'inbound' },
		{ id: 'ACT-03', action: 'Cycle count verified', detail: 'SKU-EL-104 · A-01-03', time: 'Today · 7:52 AM', type: 'count' },
	]))
	const [query, setQuery] = useState('')
	const [categoryFilter, setCategoryFilter] = useState('All categories')
	const [lowOnly, setLowOnly] = useState(false)
	const [receiveOpen, setReceiveOpen] = useState(false)
	const [receiveSku, setReceiveSku] = useState('')

	useEffect(() => {
		try { localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory)) } catch {}
	}, [inventory])
	useEffect(() => {
		try { localStorage.setItem(INBOUND_KEY, JSON.stringify(inbound)) } catch {}
	}, [inbound])
	useEffect(() => {
		try { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)) } catch {}
	}, [tasks])
	useEffect(() => {
		try { localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity)) } catch {}
	}, [activity])

	const categories = [...new Set(inventory.map((item) => item.category))]
	const filteredInventory = inventory.filter((item) => {
		const available = item.onHand - item.reserved
		return `${item.id} ${item.name} ${item.location}`.toLowerCase().includes(query.trim().toLowerCase())
			&& (categoryFilter === 'All categories' || item.category === categoryFilter)
			&& (!lowOnly || available <= item.reorderPoint)
	})
	const totalStock = inventory.reduce((total, item) => total + item.onHand, 0)
	const lowStockCount = inventory.filter((item) => item.onHand - item.reserved <= item.reorderPoint).length
	const incomingCount = inbound.filter((receipt) => receipt.status !== 'Received').length
	const outgoingCount = tasks.filter((task) => task.status !== 'Dispatched').length
	const availableCapacity = Math.max(0, STORAGE_CAPACITY - totalStock)
	const capacityPercent = Math.round((availableCapacity / STORAGE_CAPACITY) * 100)

	const logActivity = (action, detail, type) => setActivity((current) => [{ id: `ACT-${Date.now()}`, action, detail, time: timeLabel(), type }, ...current].slice(0, 30))

	const receiveStock = (item, quantity, reference) => {
		setInventory((current) => current.map((entry) => entry.id === item.id ? { ...entry, onHand: entry.onHand + quantity } : entry))
		logActivity('Goods received', `${item.id} · +${quantity} ${item.unit}${reference ? ` · ${reference}` : ''}`, 'inbound')
		setReceiveOpen(false)
		setReceiveSku('')
	}

	const confirmInbound = (receipt) => {
		const item = inventory.find((entry) => entry.id === receipt.itemId)
		if (!item) return
		setInventory((current) => current.map((entry) => entry.id === item.id ? { ...entry, onHand: entry.onHand + receipt.quantity } : entry))
		setInbound((current) => current.map((entry) => entry.id === receipt.id ? { ...entry, status: 'Received' } : entry))
		logActivity('Inbound received', `${receipt.id} · ${item.id} +${receipt.quantity} ${item.unit} at ${item.location}`, 'inbound')
	}

	const adjustStock = (item, amount) => {
		if (item.onHand + amount < item.reserved) return
		setInventory((current) => current.map((entry) => entry.id === item.id ? { ...entry, onHand: entry.onHand + amount } : entry))
		logActivity(amount > 0 ? 'Stock adjustment' : 'Stock issued', `${item.id} · ${amount > 0 ? '+' : ''}${amount} ${item.unit} · ${item.location}`, amount > 0 ? 'count' : 'pick')
	}

	const advanceTask = (task) => {
		const stages = ['Awaiting Pick', 'Picking', 'Packing', 'Ready for Dispatch', 'Dispatched']
		const nextStatus = stages[Math.min(stages.indexOf(task.status) + 1, stages.length - 1)]
		if (nextStatus === task.status) return
		setTasks((current) => current.map((entry) => entry.id === task.id ? { ...entry, status: nextStatus } : entry))
		logActivity(nextStatus === 'Dispatched' ? 'Order dispatched' : `Order moved to ${nextStatus}`, `${task.orderId} · ${task.customer}`, 'pick')
	}

	return (
		<div className="warehouse-workspace">
			<header className="warehouse-page-heading"><div><span className="warehouse-kicker">OPERATIONS / INVENTORY CONTROL</span><h1>Warehouse</h1><p>Stock, receiving, and dispatch preparation in one place.</p></div><button className="warehouse-primary-button" type="button" onClick={() => { setReceiveSku(''); setReceiveOpen(true) }}><span aria-hidden="true">＋</span> Receive goods</button></header>

			<section className="warehouse-summary-grid" aria-label="Warehouse overview">
				{[
					['Total stock', totalStock.toLocaleString(), 'Units across all SKUs', 'stock'],
					['Incoming goods', incomingCount, 'Expected receipts', 'incoming'],
					['Outgoing goods', outgoingCount, 'Orders in pick / pack', 'outgoing'],
					['Available storage', `${capacityPercent}%`, `${availableCapacity.toLocaleString()} units open`, 'storage'],
					['Low-stock items', lowStockCount, 'At or below reorder point', 'low'],
				].map(([label, value, note, tone]) => <article className={`warehouse-glass-card warehouse-stat warehouse-stat-${tone}`} key={tone}><span>{label}</span><strong>{value}</strong><small>{note}</small><i aria-hidden="true" /></article>)}
			</section>

			<div className="warehouse-main-grid">
				<section className="warehouse-glass-card warehouse-inventory-panel" aria-labelledby="warehouse-inventory-title">
					<div className="warehouse-section-heading"><div><h2 id="warehouse-inventory-title">Inventory</h2><p>{filteredInventory.length} of {inventory.length} stock items</p></div><span className="warehouse-register-mark">STOCK LEDGER <b>/{String(inventory.length).padStart(2, '0')}</b></span></div>
					<div className="warehouse-filters"><label className="warehouse-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search SKU, item, location" aria-label="Search inventory" /></label><label className="warehouse-filter-field"><span>Category</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><button className={`warehouse-low-toggle${lowOnly ? ' selected' : ''}`} type="button" aria-pressed={lowOnly} onClick={() => setLowOnly((current) => !current)}>Low stock <span>{lowStockCount}</span></button></div>
					<div className="warehouse-table-scroll"><table className="warehouse-table"><thead><tr><th>Item / SKU</th><th>Location</th><th>On hand</th><th>Available</th><th>Reorder point</th><th>Stock level</th><th>Adjust</th></tr></thead><tbody>
						{filteredInventory.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><span>{item.id} · {item.category}</span></td><td><span className="warehouse-location-tag">{item.location}</span></td><td><strong>{item.onHand.toLocaleString()} <small>{item.unit}</small></strong></td><td>{(item.onHand - item.reserved).toLocaleString()}</td><td>{item.reorderPoint}</td><td><StockFlag item={item} /></td><td><div className="warehouse-adjust-control"><button type="button" onClick={() => adjustStock(item, -1)} aria-label={`Remove one ${item.unit} from ${item.name}`} disabled={item.onHand <= item.reserved}>−</button><button type="button" onClick={() => adjustStock(item, 1)} aria-label={`Add one ${item.unit} to ${item.name}`}>＋</button></div></td></tr>)}
						{filteredInventory.length === 0 && <tr><td className="warehouse-empty-row" colSpan="7">No items match the current filters.</td></tr>}
					</tbody></table></div>
					<div className="warehouse-capacity"><div><span>Storage capacity</span><strong>{(STORAGE_CAPACITY - availableCapacity).toLocaleString()} / {STORAGE_CAPACITY.toLocaleString()} units used</strong></div><div className="warehouse-capacity-track"><i style={{ width: `${100 - capacityPercent}%` }} /></div><small>{capacityPercent}% available</small></div>
				</section>

				<div className="warehouse-operations-column">
					<section className="warehouse-glass-card warehouse-inbound-panel" aria-labelledby="warehouse-inbound-title"><div className="warehouse-section-heading"><div><h2 id="warehouse-inbound-title">Incoming goods</h2><p>{incomingCount} expected at receiving</p></div><button className="warehouse-text-button" type="button" onClick={() => { setReceiveSku(''); setReceiveOpen(true) }}>Receive +</button></div><div className="warehouse-inbound-list">
						{inbound.map((receipt) => { const item = inventory.find((entry) => entry.id === receipt.itemId); return <article className={`warehouse-inbound-row${receipt.status === 'Received' ? ' is-received' : ''}`} key={receipt.id}><div className="warehouse-receipt-icon" aria-hidden="true">{receipt.status === 'Received' ? '✓' : '↓'}</div><div className="warehouse-receipt-copy"><strong>{receipt.supplier}</strong><span>{receipt.id} · {receipt.purchaseOrder}</span><span>{item?.name ?? receipt.itemId} · {receipt.quantity} {item?.unit ?? 'units'}</span><small>{receipt.eta} · {receipt.dock}</small></div>{receipt.status === 'Received' ? <span className="warehouse-received-label">Received</span> : <button className="warehouse-receive-button" type="button" onClick={() => confirmInbound(receipt)}>Check in</button>}</article> })}
						{inbound.length === 0 && <p className="warehouse-empty-note">No inbound receipts scheduled.</p>}
					</div></section>

					<section className="warehouse-glass-card warehouse-pick-panel" aria-labelledby="warehouse-pick-title"><div className="warehouse-section-heading"><div><h2 id="warehouse-pick-title">Pick &amp; pack</h2><p>Orders moving toward dispatch</p></div><span className="warehouse-task-count">{outgoingCount} open</span></div><div className="warehouse-pick-list">
						{tasks.filter((task) => task.status !== 'Dispatched').map((task) => { const nextLabel = task.status === 'Awaiting Pick' ? 'Start picking' : task.status === 'Picking' ? 'Start packing' : task.status === 'Packing' ? 'Mark ready' : 'Ready'; return <article className="warehouse-pick-task" key={task.id}><div className="warehouse-task-header"><strong>{task.orderId}</strong><span className={`warehouse-task-state state-${task.status.toLowerCase().replaceAll(' ', '-')}`}>{task.status}</span></div><p>{task.customer} · {task.item} · {task.quantity} units</p><div className="warehouse-task-footer"><span>To {task.destination}</span><button type="button" onClick={() => advanceTask(task)} disabled={task.status === 'Ready for Dispatch'}>{nextLabel}{task.status !== 'Ready for Dispatch' && <span aria-hidden="true"> →</span>}</button></div></article> })}
						{outgoingCount === 0 && <p className="warehouse-empty-note">All open orders have been prepared for dispatch.</p>}
					</div></section>
				</div>
			</div>

			<section className="warehouse-glass-card warehouse-activity-panel" aria-labelledby="warehouse-activity-title"><div className="warehouse-section-heading"><div><h2 id="warehouse-activity-title">Warehouse activity</h2><p>Recent movements and handling events</p></div><span className="warehouse-live-mark"><i /> ACTIVITY LOG</span></div><div className="warehouse-activity-list">{activity.map((entry) => <article className="warehouse-activity-row" key={entry.id}><span className={`warehouse-activity-mark activity-${entry.type}`} aria-hidden="true">{entry.type === 'inbound' ? '↓' : entry.type === 'pick' ? '↗' : '◇'}</span><div><strong>{entry.action}</strong><span>{entry.detail}</span></div><time>{entry.time}</time></article>)}</div></section>

			{receiveOpen && <ReceiveGoodsDialog inventory={inventory} initialSku={receiveSku} onClose={() => setReceiveOpen(false)} onReceive={receiveStock} />}
		</div>
	)
}

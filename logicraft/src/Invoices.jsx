import { useEffect, useState } from 'react'
import { sampleOrders } from './orderData.js'
import { sampleShipments } from './shipmentData.js'

const INVOICES_KEY = 'logicraft-invoices-v1'
const ORDERS_KEY = 'logicraft-orders-v1'
const SHIPMENTS_KEY = 'logicraft-shipments-v1'

const sampleInvoices = [
	{
		id: 'INV-2026-00918', orderId: 'ORD-2026-10438', customer: 'Evergreen Supply Co.', amount: 8420.5, currency: 'USD',
		issuedOn: '2026-09-20', dueOn: '2026-09-27', status: 'Paid', paidOn: '2026-09-25', memo: 'Freight service · Portland to Seattle',
		history: [{ action: 'Payment received', date: 'Sep 25, 2026', detail: 'Paid in full · ACH transfer' }, { action: 'Invoice sent', date: 'Sep 20, 2026', detail: 'Invoice delivered to warehouse@evergreen.example' }],
	},
	{
		id: 'INV-2026-00924', orderId: 'ORD-2026-10482', customer: 'Northstar Retail', amount: 3675, currency: 'USD',
		issuedOn: '2026-10-01', dueOn: '2026-10-15', status: 'Pending', paidOn: '', memo: 'Line-haul freight · Newark to Chicago',
		history: [{ action: 'Invoice sent', date: 'Oct 01, 2026', detail: 'Invoice delivered to ops@northstar.example' }],
	},
	{
		id: 'INV-2026-00897', orderId: 'ORD-2026-10476', customer: 'Harbor & Pine', amount: 2180, currency: 'USD',
		issuedOn: '2026-09-16', dueOn: '2026-09-30', status: 'Pending', paidOn: '', memo: 'Home goods freight · Queens to Boston',
		history: [{ action: 'Payment reminder sent', date: 'Oct 01, 2026', detail: 'Payment due date has passed' }, { action: 'Invoice sent', date: 'Sep 16, 2026', detail: 'Invoice delivered to logistics@harborpine.example' }],
	},
]

function readList(key, fallback) {
	try {
		const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
		return Array.isArray(saved) ? saved : fallback
	} catch {
		return fallback
	}
}

function localDate() {
	const today = new Date()
	return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

function shortDate(value) {
	if (!value) return '—'
	return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatMoney(amount, currency = 'USD') {
	return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount) || 0)
}

function formatTimestamp() {
	return new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function invoiceStatus(invoice) {
	return invoice.status !== 'Paid' && invoice.status !== 'Cancelled' && invoice.dueOn < localDate() ? 'Overdue' : invoice.status
}

function InvoiceStatus({ status }) {
	return <span className={`billing-status billing-status-${status.toLowerCase()}`}><i />{status}</span>
}

function InvoiceDialog({ orders, invoices, onClose, onCreate }) {
	const availableOrders = orders.filter((order) => order.status !== 'Cancelled')
	const [orderId, setOrderId] = useState(availableOrders[0]?.id ?? '')
	const [amount, setAmount] = useState('')
	const [issuedOn, setIssuedOn] = useState(localDate())
	const [dueOn, setDueOn] = useState('')
	const [memo, setMemo] = useState('')
	const selectedOrder = availableOrders.find((order) => order.id === orderId)

	return (
		<div className="billing-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
			<section className="billing-modal" role="dialog" aria-modal="true" aria-labelledby="invoice-form-title">
				<header className="billing-modal-heading"><div><span className="billing-kicker">ACCOUNTS RECEIVABLE / NEW</span><h2 id="invoice-form-title">Create invoice</h2></div><button className="billing-icon-button" type="button" onClick={onClose} aria-label="Close invoice form">×</button></header>
				{availableOrders.length ? <form onSubmit={(event) => { event.preventDefault(); if (selectedOrder) onCreate(selectedOrder, { amount: Number(amount), issuedOn, dueOn, memo }) }}>
					<label className="billing-field">Order<select required value={orderId} onChange={(event) => setOrderId(event.target.value)}>{availableOrders.map((order) => <option key={order.id} value={order.id}>{order.id} · {order.customer}</option>)}</select></label>
					{selectedOrder && <div className="billing-order-preview"><span><small>BILL TO</small><strong>{selectedOrder.customer}</strong></span><span><small>ORDER</small><strong>{selectedOrder.id}</strong></span><span><small>ROUTE</small><strong>{selectedOrder.pickup} → {selectedOrder.delivery}</strong></span><span><small>ITEM</small><strong>{selectedOrder.item} · {selectedOrder.quantity} units</strong></span><small className="billing-existing-invoices">{invoices.filter((invoice) => invoice.orderId === selectedOrder.id).length ? `${invoices.filter((invoice) => invoice.orderId === selectedOrder.id).length} existing invoice(s). Supplemental invoices are supported.` : 'No previous invoices for this order.'}</small></div>}
					<div className="billing-form-grid"><label className="billing-field">Invoice amount (USD)<input type="number" min="0.01" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></label><label className="billing-field">Invoice date<input type="date" required value={issuedOn} onChange={(event) => setIssuedOn(event.target.value)} /></label><label className="billing-field">Payment due<input type="date" required min={issuedOn} value={dueOn} onChange={(event) => setDueOn(event.target.value)} /></label><label className="billing-field billing-field-wide">Description<input value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="Freight service or billing note" /></label></div>
					<footer className="billing-form-actions"><button className="billing-secondary-button" type="button" onClick={onClose}>Cancel</button><button className="billing-primary-button" type="submit">Create invoice</button></footer>
				</form> : <div className="billing-no-orders"><strong>No billable orders available</strong><span>Only non-cancelled orders can be invoiced.</span><button className="billing-secondary-button" type="button" onClick={onClose}>Close</button></div>}
			</section>
		</div>
	)
}

export default function InvoicesDashboard() {
	const [invoices, setInvoices] = useState(() => readList(INVOICES_KEY, sampleInvoices))
	const [orders] = useState(() => readList(ORDERS_KEY, sampleOrders))
	const [shipments] = useState(() => readList(SHIPMENTS_KEY, sampleShipments))
	const [selectedId, setSelectedId] = useState(() => readList(INVOICES_KEY, sampleInvoices)[0]?.id ?? '')
	const [query, setQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState('All')
	const [issuedDateFilter, setIssuedDateFilter] = useState('')
	const [dialogOpen, setDialogOpen] = useState(false)

	useEffect(() => { try { localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices)) } catch {} }, [invoices])

	const enrichedInvoices = invoices.map((invoice) => ({ ...invoice, displayStatus: invoiceStatus(invoice) }))
	const filteredInvoices = enrichedInvoices.filter((invoice) => {
		const matchesQuery = `${invoice.id} ${invoice.orderId} ${invoice.customer}`.toLowerCase().includes(query.trim().toLowerCase())
		return matchesQuery && (statusFilter === 'All' || invoice.displayStatus === statusFilter) && (!issuedDateFilter || invoice.issuedOn === issuedDateFilter)
	})
	const selected = filteredInvoices.find((invoice) => invoice.id === selectedId) ?? filteredInvoices[0]
	const totals = {
		all: invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0),
		paid: invoices.filter((invoice) => invoice.status === 'Paid').reduce((sum, invoice) => sum + Number(invoice.amount), 0),
		pending: invoices.filter((invoice) => invoiceStatus(invoice) === 'Pending').reduce((sum, invoice) => sum + Number(invoice.amount), 0),
		overdue: invoices.filter((invoice) => invoiceStatus(invoice) === 'Overdue').reduce((sum, invoice) => sum + Number(invoice.amount), 0),
	}
	const counts = {
		total: invoices.length,
		paid: invoices.filter((invoice) => invoice.status === 'Paid').length,
		pending: invoices.filter((invoice) => invoiceStatus(invoice) === 'Pending').length,
		overdue: invoices.filter((invoice) => invoiceStatus(invoice) === 'Overdue').length,
	}
	const reportTotal = totals.paid + totals.pending + totals.overdue
	const invoiceableOrders = orders.filter((order) => order.status !== 'Cancelled')

	const createInvoice = (order, details) => {
		const invoice = {
			id: `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
			orderId: order.id,
			customer: order.customer,
			amount: details.amount,
			currency: 'USD',
			issuedOn: details.issuedOn,
			dueOn: details.dueOn,
			status: 'Pending',
			paidOn: '',
			memo: details.memo || `Freight service · ${order.pickup} to ${order.delivery}`,
			history: [{ action: 'Invoice created', date: formatTimestamp(), detail: `Invoice sent for ${formatMoney(details.amount)}` }],
		}
		setInvoices((current) => [invoice, ...current])
		setSelectedId(invoice.id)
		setQuery('')
		setStatusFilter('All')
		setIssuedDateFilter('')
		setDialogOpen(false)
	}

	const markPaid = (invoice) => {
		if (invoice.status === 'Paid') return
		const paidOn = localDate()
		setInvoices((current) => current.map((entry) => entry.id === invoice.id ? {
			...entry,
			status: 'Paid',
			paidOn,
			history: [{ action: 'Payment received', date: formatTimestamp(), detail: `Paid in full · ${formatMoney(entry.amount)}` }, ...entry.history],
		} : entry))
	}

	return (
		<div className="billing-workspace">
			<header className="billing-page-heading"><div><span className="billing-kicker">OPERATIONS / ACCOUNTS RECEIVABLE</span><h1>Invoices &amp; Billing</h1><p>Invoice records, payment status, and customer balances.</p></div><button className="billing-primary-button" type="button" onClick={() => setDialogOpen(true)}><span aria-hidden="true">＋</span> Create invoice <small>{invoiceableOrders.length} billable orders</small></button></header>

			<section className="billing-summary-grid" aria-label="Billing overview">
				{[
					['Total invoices', counts.total, formatMoney(totals.all), 'total'],
					['Paid invoices', counts.paid, formatMoney(totals.paid), 'paid'],
					['Pending payments', counts.pending, formatMoney(totals.pending), 'pending'],
					['Overdue invoices', counts.overdue, formatMoney(totals.overdue), 'overdue'],
				].map(([label, count, amount, tone]) => <article className={`billing-glass-card billing-stat billing-stat-${tone}`} key={tone}><span>{label}</span><strong>{count}</strong><small>{amount}</small><i aria-hidden="true" /></article>)}
			</section>

			<div className="billing-main-grid">
				<section className="billing-glass-card billing-register" aria-labelledby="invoice-register-title">
					<div className="billing-section-heading"><div><h2 id="invoice-register-title">Invoice register</h2><p>{filteredInvoices.length} of {invoices.length} invoices</p></div><span className="billing-register-mark">BILLING LOG <b>/{String(filteredInvoices.length).padStart(2, '0')}</b></span></div>
					<div className="billing-filters"><label className="billing-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search invoice, order, customer" aria-label="Search invoices" /></label><label className="billing-filter-field"><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All</option><option>Paid</option><option>Pending</option><option>Overdue</option></select></label><label className="billing-filter-field"><span>Invoice date</span><input type="date" value={issuedDateFilter} onChange={(event) => setIssuedDateFilter(event.target.value)} aria-label="Filter by invoice date" /></label>{(query || statusFilter !== 'All' || issuedDateFilter) && <button className="billing-reset-button" type="button" onClick={() => { setQuery(''); setStatusFilter('All'); setIssuedDateFilter('') }}>Reset</button>}</div>
					<div className="billing-table-scroll"><table className="billing-table"><thead><tr><th>Invoice</th><th>Customer / Order</th><th>Issued</th><th>Due</th><th>Amount</th><th>Status</th></tr></thead><tbody>
						{filteredInvoices.map((invoice) => <tr key={invoice.id} className={selected?.id === invoice.id ? 'is-selected' : ''}><td><button type="button" className="billing-select-button" onClick={() => setSelectedId(invoice.id)}><strong>{invoice.id}</strong><span>{invoice.memo}</span></button></td><td><strong>{invoice.customer}</strong><span>{invoice.orderId}</span></td><td>{shortDate(invoice.issuedOn)}</td><td>{shortDate(invoice.dueOn)}</td><td><strong>{formatMoney(invoice.amount, invoice.currency)}</strong></td><td><InvoiceStatus status={invoice.displayStatus} /></td></tr>)}
						{filteredInvoices.length === 0 && <tr><td className="billing-empty-row" colSpan="6">No invoices match these filters.</td></tr>}
					</tbody></table></div>
				</section>

				{selected ? <aside className="billing-glass-card billing-detail-panel" aria-labelledby="invoice-detail-title">
					<div className="billing-detail-heading"><div><span className="billing-kicker">INVOICE DETAILS</span><h2 id="invoice-detail-title">{selected.id}</h2><p>{selected.orderId} · {selected.customer}</p></div><InvoiceStatus status={selected.displayStatus} /></div>
					<div className="billing-amount-block"><span>AMOUNT DUE</span><strong>{formatMoney(selected.amount, selected.currency)}</strong><small>{selected.status === 'Paid' ? `Paid ${shortDate(selected.paidOn)}` : `Due ${shortDate(selected.dueOn)}`}</small></div>
					<div className="billing-detail-facts"><span>Bill to<strong>{selected.customer}</strong></span><span>Order<strong>{selected.orderId}</strong></span><span>Invoice date<strong>{shortDate(selected.issuedOn)}</strong></span><span>Payment due<strong>{shortDate(selected.dueOn)}</strong></span><span>Shipment<strong>{shipments.find((shipment) => shipment.orderId === selected.orderId)?.id ?? orders.find((order) => order.id === selected.orderId)?.shipment ?? 'Not assigned'}</strong></span><span>Tracking<strong>{shipments.find((shipment) => shipment.orderId === selected.orderId)?.tracking ?? orders.find((order) => order.id === selected.orderId)?.tracking ?? 'Not assigned'}</strong></span></div>
					<p className="billing-memo">{selected.memo}</p>
					{selected.status !== 'Paid' && <button className="billing-mark-paid-button" type="button" onClick={() => markPaid(selected)}>Mark as paid</button>}
					<div className="billing-history"><div className="billing-history-heading"><h3>Billing history</h3><span>{selected.history.length} events</span></div><ol>{selected.history.map((entry, index) => <li className={index === 0 ? 'is-current' : ''} key={`${entry.action}-${entry.date}-${index}`}><i /><div><strong>{entry.action}</strong><span>{entry.detail}</span></div><time>{entry.date}</time></li>)}</ol></div>
				</aside> : <aside className="billing-glass-card billing-empty-detail"><strong>No invoice selected</strong><span>Create an invoice or adjust the filters.</span></aside>}
			</div>

			<section className="billing-glass-card billing-report" aria-labelledby="billing-report-title"><div className="billing-section-heading"><div><h2 id="billing-report-title">Payment report</h2><p>Invoice value by payment state</p></div><span className="billing-report-period">CURRENT INVOICE BOOK</span></div><div className="billing-report-content"><div className="billing-report-bar" role="img" aria-label={`Paid ${formatMoney(totals.paid)}, pending ${formatMoney(totals.pending)}, overdue ${formatMoney(totals.overdue)}`}><i className="report-paid" style={{ width: `${reportTotal ? totals.paid / reportTotal * 100 : 0}%` }} /><i className="report-pending" style={{ width: `${reportTotal ? totals.pending / reportTotal * 100 : 0}%` }} /><i className="report-overdue" style={{ width: `${reportTotal ? totals.overdue / reportTotal * 100 : 0}%` }} /></div><div className="billing-report-legend"><span><i className="report-paid-dot" />Paid<strong>{formatMoney(totals.paid)}</strong></span><span><i className="report-pending-dot" />Pending<strong>{formatMoney(totals.pending)}</strong></span><span><i className="report-overdue-dot" />Overdue<strong>{formatMoney(totals.overdue)}</strong></span><span className="billing-report-total">Total billed<strong>{formatMoney(reportTotal)}</strong></span></div></div></section>
			{dialogOpen && <InvoiceDialog orders={invoiceableOrders} invoices={invoices} onClose={() => setDialogOpen(false)} onCreate={createInvoice} />}
		</div>
	)
}

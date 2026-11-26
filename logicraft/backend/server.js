import { createServer } from 'node:http'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const port = Number(process.env.PORT ?? 3001)
const host = process.env.HOST ?? '127.0.0.1'
const backendDirectory = dirname(fileURLToPath(import.meta.url))
const databaseDirectory = join(backendDirectory, 'data')
const databaseFile = join(databaseDirectory, 'database.json')
const maximumRequestBytes = 1024 * 1024
const allowedOrigins = new Set(
	[5173, 4173, 8000, 8001].flatMap((frontendPort) => [
		`http://localhost:${frontendPort}`,
		`http://127.0.0.1:${frontendPort}`,
	]),
)

const initialState = {
	orders: [
		{
			id: 'ORD-2026-10482',
			customer: 'Northstar Retail',
			email: 'ops@northstar.example',
			phone: '+1 (312) 555-0184',
			pickup: 'Newark Distribution Center, NJ',
			delivery: 'Chicago Fulfillment Hub, IL',
			item: 'Consumer electronics',
			quantity: 48,
			weight: 620,
			pickupDate: '2026-10-01',
			deliveryDate: '2026-10-03',
			instructions: 'Keep cartons upright. Call receiving 30 minutes before arrival.',
			status: 'Active',
			shipment: 'SHP-2026-08421',
			tracking: 'TRK-2026-08421',
			driver: 'Christina Kamberina',
			vehicle: 'VAN-204 · Box truck',
			eta: 'Oct 03, 10:30 AM',
			history: [{ label: 'Order created', date: 'Oct 01, 2026', note: 'Order confirmed by Northstar Retail' }],
		},
		{
			id: 'ORD-2026-10476',
			customer: 'Harbor & Pine',
			email: 'logistics@harborpine.example',
			phone: '+1 (617) 555-0127',
			pickup: 'Queens Sorting Center, NY',
			delivery: 'Boston Retail Warehouse, MA',
			item: 'Home goods',
			quantity: 26,
			weight: 340,
			pickupDate: '2026-10-01',
			deliveryDate: '2026-10-02',
			instructions: 'Dock 4. Delivery window 1:00 PM to 4:00 PM.',
			status: 'Pending',
			shipment: 'Not assigned',
			tracking: 'Not assigned',
			driver: 'Not assigned',
			vehicle: 'Not assigned',
			eta: 'Awaiting dispatch',
			history: [{ label: 'Order created', date: 'Oct 01, 2026', note: 'Awaiting dispatch assignment' }],
		},
		{
			id: 'ORD-2026-10438',
			customer: 'Evergreen Supply Co.',
			email: 'warehouse@evergreen.example',
			phone: '+1 (206) 555-0141',
			pickup: 'Portland Cross-Dock, OR',
			delivery: 'Seattle South Warehouse, WA',
			item: 'Packaged food',
			quantity: 110,
			weight: 840,
			pickupDate: '2026-09-30',
			deliveryDate: '2026-10-01',
			instructions: 'Temperature-controlled vehicle required.',
			status: 'Completed',
			shipment: 'SHP-2026-08396',
			tracking: 'TRK-2026-08396',
			driver: 'Avery Chen',
			vehicle: 'VAN-092 · Box truck',
			eta: 'Delivered Oct 01, 9:42 AM',
			history: [{ label: 'Delivered', date: 'Oct 01, 2026', note: 'Received by warehouse team' }],
		},
	],
	shipments: [
		{
			id: 'SHP-2026-08421',
			tracking: 'TRK-2026-08421',
			orderId: 'ORD-2026-10482',
			customer: 'Northstar Retail',
			pickup: 'Newark Distribution Center, NJ',
			destination: 'Chicago Fulfillment Hub, IL',
			driver: 'Christina Kamberina',
			vehicle: 'VAN-204 · Box truck',
			status: 'In Transit',
			deliveryDate: '2026-10-03',
			eta: 'Oct 03, 10:30 AM',
			etaConfidence: '94%',
			etaType: 'ML predicted',
			currentLocation: 'I-80, near Joliet, IL',
			history: [{ status: 'In Transit', date: 'Oct 01, 1:25 PM', location: 'I-80, near Joliet, IL' }],
		},
		{
			id: 'SHP-2026-08396',
			tracking: 'TRK-2026-08396',
			orderId: 'ORD-2026-10438',
			customer: 'Evergreen Supply Co.',
			pickup: 'Portland Cross-Dock, OR',
			destination: 'Seattle South Warehouse, WA',
			driver: 'Avery Chen',
			vehicle: 'VAN-092 · Box truck',
			status: 'Delivered',
			deliveryDate: '2026-10-01',
			eta: 'Delivered Oct 01, 9:42 AM',
			etaConfidence: '99%',
			etaType: 'ML predicted',
			currentLocation: 'Seattle South Warehouse, WA',
			history: [{ status: 'Delivered', date: 'Oct 01, 9:42 AM', location: 'Seattle South Warehouse, WA' }],
		},
	],
	drivers: [
		{
			id: 'DRV-032',
			name: 'Christina Kamberina',
			phone: '+1 (312) 555-0184',
			email: 'christina.k@logicraft.example',
			licenseNumber: 'IL-C4821-3904',
			licenseClass: 'Class A',
			licenseExpiry: '2028-04-18',
			availability: 'On Trip',
			vehicle: 'VAN-204 · Box truck',
			completedTrips: 86,
			onTimeRate: 96,
			rating: 4.9,
			tripHistory: [],
		},
		{
			id: 'DRV-092',
			name: 'Avery Chen',
			phone: '+1 (206) 555-0141',
			email: 'avery.chen@logicraft.example',
			licenseNumber: 'WA-C2044-6218',
			licenseClass: 'Class C',
			licenseExpiry: '2028-08-30',
			availability: 'Available',
			vehicle: 'VAN-092 · Box truck',
			completedTrips: 68,
			onTimeRate: 98,
			rating: 5,
			tripHistory: [],
		},
		{
			id: 'DRV-018',
			name: 'Daniel Brooks',
			phone: '+1 (617) 555-0127',
			email: 'daniel.b@logicraft.example',
			licenseNumber: 'MA-B1377-8540',
			licenseClass: 'Class B',
			licenseExpiry: '2027-11-02',
			availability: 'Available',
			vehicle: 'VAN-118 · Cargo van',
			completedTrips: 54,
			onTimeRate: 93,
			rating: 4.8,
			tripHistory: [],
		},
	],
	inventory: [
		{ id: 'SKU-EL-104', name: 'Wireless charging dock', category: 'Electronics', location: 'A-01-03', onHand: 420, reserved: 82, reorderPoint: 100, unit: 'units' },
		{ id: 'SKU-HG-221', name: 'Stoneware dinner set', category: 'Home goods', location: 'B-03-07', onHand: 74, reserved: 22, reorderPoint: 80, unit: 'sets' },
		{ id: 'SKU-FD-030', name: 'Organic ground coffee', category: 'Food & beverage', location: 'C-02-01', onHand: 1620, reserved: 190, reorderPoint: 250, unit: 'cases' },
		{ id: 'SKU-PK-512', name: 'Shipping cartons · M', category: 'Packaging', location: 'D-01-12', onHand: 2830, reserved: 360, reorderPoint: 400, unit: 'cartons' },
	],
	inbound: [
		{ id: 'RCV-2026-0418', supplier: 'Evergreen Supply Co.', purchaseOrder: 'PO-11842', itemId: 'SKU-EL-104', quantity: 240, eta: 'Oct 02 · 9:30 AM', dock: 'Dock 02', status: 'Expected' },
		{ id: 'RCV-2026-0417', supplier: 'Harbor Home Imports', purchaseOrder: 'PO-11831', itemId: 'SKU-HG-221', quantity: 120, eta: 'Oct 02 · 1:00 PM', dock: 'Dock 04', status: 'Expected' },
	],
	tasks: [
		{ id: 'PICK-ORD-2026-10482', orderId: 'ORD-2026-10482', customer: 'Northstar Retail', item: 'Consumer electronics', quantity: 48, destination: 'Chicago Fulfillment Hub, IL', status: 'Dispatched', shipmentId: 'SHP-2026-08421' },
		{ id: 'PICK-ORD-2026-10476', orderId: 'ORD-2026-10476', customer: 'Harbor & Pine', item: 'Home goods', quantity: 26, destination: 'Boston Retail Warehouse, MA', status: 'Awaiting Pick', shipmentId: '' },
	],
	conversations: [
		{
			id: 'CONV-DRIVER-032',
			name: 'Christina Kamberina',
			role: 'Driver',
			initials: 'CK',
			presence: 'On trip',
			unread: 1,
			context: 'SHP-2026-08421',
			contextLabel: 'In transit · Newark to Chicago',
			latest: 'Traffic has slowed near Joliet. Still on track for the current ETA.',
			updated: '1:25 PM',
			messages: [{ id: 'MSG-001', from: 'contact', text: 'Traffic has slowed near Joliet. Still on track for the current ETA.', time: '1:25 PM' }],
		},
	],
	notifications: [],
	invoices: [
		{
			id: 'INV-2026-00918',
			orderId: 'ORD-2026-10438',
			customer: 'Evergreen Supply Co.',
			amount: 8420.5,
			currency: 'USD',
			issuedOn: '2026-09-20',
			dueOn: '2026-09-27',
			status: 'Paid',
			paidOn: '2026-09-25',
			memo: 'Freight service · Portland to Seattle',
			history: [{ action: 'Payment received', date: 'Sep 25, 2026', detail: 'Paid in full · ACH transfer' }],
		},
		{
			id: 'INV-2026-00924',
			orderId: 'ORD-2026-10482',
			customer: 'Northstar Retail',
			amount: 3675,
			currency: 'USD',
			issuedOn: '2026-10-01',
			dueOn: '2026-10-15',
			status: 'Pending',
			paidOn: '',
			memo: 'Line-haul freight · Newark to Chicago',
			history: [{ action: 'Invoice sent', date: 'Oct 01, 2026', detail: 'Invoice issued for freight service' }],
		},
	],
	settings: {
		company: 'LogiCraft Logistics',
		timezone: 'America/Chicago',
		emailNotifications: true,
	},
}

const collectionPrefixes = {
	orders: 'ORD',
	shipments: 'SHP',
	drivers: 'DRV',
	inventory: 'SKU',
	inbound: 'RCV',
	tasks: 'PICK',
	conversations: 'CONV',
	notifications: 'NOT',
	invoices: 'INV',
}

const allowedStatuses = {
	orders: ['Pending', 'Active', 'Completed', 'Cancelled'],
	shipments: ['Ready for Pickup', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'Delayed', 'Failed Delivery'],
	drivers: ['Available', 'Off Duty', 'On Trip'],
	inbound: ['Expected', 'Received'],
	tasks: ['Awaiting Pick', 'Picking', 'Picked', 'Dispatched'],
	invoices: ['Pending', 'Paid', 'Overdue', 'Cancelled'],
}

const allowedOriginsForApi = allowedOrigins
let writeQueue = Promise.resolve()

class HttpError extends Error {
	constructor(statusCode, message) {
		super(message)
		this.statusCode = statusCode
	}
}

function assertValidPort(value) {
	if (!Number.isInteger(value) || value < 1 || value > 65535) {
		throw new Error('PORT must be a whole number between 1 and 65535.')
	}
}

function sendJson(response, statusCode, data) {
	response.writeHead(statusCode, {
		'Content-Type': 'application/json; charset=utf-8',
		'Cache-Control': 'no-store',
		'X-Content-Type-Options': 'nosniff',
	})
	response.end(JSON.stringify(data))
}

function applyCors(request, response) {
	const origin = request.headers.origin
	if (origin && allowedOriginsForApi.has(origin)) {
		response.setHeader('Access-Control-Allow-Origin', origin)
		response.setHeader('Vary', 'Origin')
		response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
		response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
		response.setHeader('Access-Control-Max-Age', '600')
	}
}

async function loadState() {
	try {
		const saved = JSON.parse(await readFile(databaseFile, 'utf8'))
		if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
			throw new Error('The saved database must be a JSON object.')
		}

		for (const [collection, fallback] of Object.entries(initialState)) {
			if (collection === 'settings') {
				if (!saved[collection] || typeof saved[collection] !== 'object' || Array.isArray(saved[collection])) {
					saved[collection] = structuredClone(fallback)
				}
			} else if (!Array.isArray(saved[collection])) {
				saved[collection] = structuredClone(fallback)
			}
		}

		return saved
	} catch (error) {
		if (error.code !== 'ENOENT') {
			if (error instanceof SyntaxError) {
				throw new Error(`The database file contains invalid JSON: ${databaseFile}`, { cause: error })
			}
			throw error
		}

		await mkdir(databaseDirectory, { recursive: true })
		const state = structuredClone(initialState)
		await persistState(state)
		return state
	}
}

async function persistState(state) {
	await mkdir(databaseDirectory, { recursive: true })
	const temporaryFile = `${databaseFile}.${process.pid}.${randomUUID()}.tmp`
	await writeFile(temporaryFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
	await rename(temporaryFile, databaseFile)
}

function updateState(update) {
	const operation = writeQueue.then(async () => {
		const state = await loadState()
		const result = await update(state)
		await persistState(state)
		return result
	})

	writeQueue = operation.then(() => undefined, () => undefined)
	return operation
}

async function readJsonBody(request) {
	let size = 0
	const chunks = []

	for await (const chunk of request) {
		size += chunk.length
		if (size > maximumRequestBytes) {
			throw new HttpError(413, 'Request body exceeds the 1 MB limit.')
		}
		chunks.push(chunk)
	}

	if (size === 0) {
		throw new HttpError(400, 'A JSON request body is required.')
	}

	let body
	try {
		body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
	} catch {
		throw new HttpError(400, 'Request body must contain valid JSON.')
	}

	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		throw new HttpError(400, 'Request body must be a JSON object.')
	}

	return body
}

function validateRecord(collection, body, isNewRecord) {
	if (Object.hasOwn(body, 'id') && typeof body.id !== 'string') {
		throw new HttpError(400, 'The record id must be a string.')
	}

	const statuses = allowedStatuses[collection]
	if (statuses && Object.hasOwn(body, 'status') && !statuses.includes(body.status)) {
		throw new HttpError(400, `Invalid ${collection} status. Allowed values: ${statuses.join(', ')}.`)
	}

	if (collection === 'orders') {
		for (const field of ['quantity', 'weight']) {
			if (Object.hasOwn(body, field) && (!Number.isFinite(body[field]) || body[field] <= 0)) {
				throw new HttpError(400, `${field} must be a number greater than zero.`)
			}
		}
	}

	if (collection === 'shipments' && Object.hasOwn(body, 'history') && !Array.isArray(body.history)) {
		throw new HttpError(400, 'Shipment history must be an array.')
	}

	if (collection === 'inventory') {
		for (const field of ['onHand', 'reserved', 'reorderPoint']) {
			if (Object.hasOwn(body, field) && (!Number.isInteger(body[field]) || body[field] < 0)) {
				throw new HttpError(400, `${field} must be a non-negative whole number.`)
			}
		}

		const onHand = body.onHand
		const reserved = body.reserved
		if (onHand !== undefined && reserved !== undefined && reserved > onHand) {
			throw new HttpError(400, 'Reserved inventory cannot exceed on-hand inventory.')
		}
	}

	const requiredFields = {
		orders: ['customer', 'pickup', 'delivery'],
		shipments: ['orderId', 'pickup', 'destination', 'driver', 'vehicle'],
		drivers: ['name', 'phone'],
		inventory: ['name', 'onHand'],
		inbound: ['supplier', 'itemId', 'quantity'],
		tasks: ['orderId', 'status'],
		conversations: ['name', 'role'],
		notifications: ['title', 'detail'],
		invoices: ['orderId', 'customer', 'amount'],
	}

	if (isNewRecord) {
		const missing = requiredFields[collection].filter((field) => {
			const value = body[field]
			return value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
		})
		if (missing.length) {
			throw new HttpError(400, `Missing required fields: ${missing.join(', ')}.`)
		}
	}
}

function createId(collection) {
	const year = new Date().getFullYear()
	return `${collectionPrefixes[collection]}-${year}-${randomUUID().slice(0, 8).toUpperCase()}`
}

function nowLabel() {
	return new Date().toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	})
}

function findOrder(state, orderId) {
	return state.orders.find((order) => order.id === orderId)
}

function syncOrderWithShipment(state, shipment) {
	const order = findOrder(state, shipment.orderId)
	if (!order) {
		throw new HttpError(400, `Order ${shipment.orderId} does not exist.`)
	}

	const otherShipment = state.shipments.find(
		(item) => item.orderId === shipment.orderId && item.id !== shipment.id,
	)
	if (otherShipment) {
		throw new HttpError(409, `Order ${shipment.orderId} already has shipment ${otherShipment.id}.`)
	}

	order.shipment = shipment.id
	order.tracking = shipment.tracking || 'Not assigned'
	order.driver = shipment.driver
	order.vehicle = shipment.vehicle
	order.eta = shipment.eta || 'Awaiting dispatch'
	order.status = shipment.status === 'Delivered' ? 'Completed' : 'Active'
	if (shipment.status !== 'Delivered') {
		order.history = [
			{
				label: `Shipment ${shipment.status.toLowerCase()}`,
				date: nowLabel(),
				note: `${shipment.id} · ${shipment.currentLocation || shipment.pickup}`,
			},
			...(Array.isArray(order.history) ? order.history : []),
		]
	}
}

async function handleCollectionRequest(request, response, collection, recordId, searchParams) {
	if (!Object.hasOwn(collectionPrefixes, collection)) {
		throw new HttpError(404, `Unknown collection "${collection}".`)
	}

	if (!recordId && request.method === 'GET') {
		const limitValue = searchParams.get('limit')
		const offsetValue = searchParams.get('offset')
		const limit = limitValue === null ? 100 : Number(limitValue)
		const offset = offsetValue === null ? 0 : Number(offsetValue)

		if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
			throw new HttpError(400, 'limit must be a whole number between 1 and 500.')
		}
		if (!Number.isInteger(offset) || offset < 0) {
			throw new HttpError(400, 'offset must be a non-negative whole number.')
		}

		const state = await loadState()
		let records = state[collection]
		const status = searchParams.get('status')
		const query = searchParams.get('q')?.trim().toLowerCase()

		if (status) {
			records = records.filter((record) => record.status === status || record.availability === status)
		}
		if (query) {
			records = records.filter((record) => JSON.stringify(record).toLowerCase().includes(query))
		}

		return sendJson(response, 200, {
			data: records.slice(offset, offset + limit),
			total: records.length,
			limit,
			offset,
		})
	}

	if (!recordId && request.method === 'POST') {
		const body = await readJsonBody(request)
		validateRecord(collection, body, true)
		const created = await updateState((state) => {
			const record = { ...body, id: body.id?.trim() || createId(collection) }
			if (state[collection].some((item) => item.id === record.id)) {
				throw new HttpError(409, `${collection} record "${record.id}" already exists.`)
			}
			if (collection === 'shipments') {
				record.tracking = record.tracking || createId('shipments').replace('SHP-', 'TRK-')
				record.eta = record.eta || 'Awaiting dispatch'
				record.etaConfidence = record.etaConfidence || 'Pending route model'
				record.etaType = record.etaType || 'Schedule target'
				record.currentLocation = record.currentLocation || record.pickup
				record.history = Array.isArray(record.history) && record.history.length
					? record.history
					: [{ status: record.status, date: nowLabel(), location: record.currentLocation }]
			}
			state[collection].unshift(record)
			if (collection === 'shipments') {
				syncOrderWithShipment(state, record)
			}
			return record
		})
		return sendJson(response, 201, { data: created })
	}

	if (!recordId) {
		throw new HttpError(405, 'Use GET to list records or POST to create a record.')
	}

	if (request.method === 'GET') {
		const state = await loadState()
		const record = state[collection].find((item) => item.id === recordId)
		if (!record) {
			throw new HttpError(404, `${collection} record "${recordId}" was not found.`)
		}
		return sendJson(response, 200, { data: record })
	}

	if (request.method === 'PATCH' || request.method === 'PUT') {
		const body = await readJsonBody(request)
		if (Object.hasOwn(body, 'id') && body.id !== recordId) {
			throw new HttpError(400, 'A record id cannot be changed.')
		}
		validateRecord(collection, body, false)

		const updated = await updateState((state) => {
			const index = state[collection].findIndex((item) => item.id === recordId)
			if (index === -1) {
				throw new HttpError(404, `${collection} record "${recordId}" was not found.`)
			}

			const previous = state[collection][index]
			const next = { ...previous, ...body, id: recordId }
			if (collection === 'inventory' && next.reserved > next.onHand) {
				throw new HttpError(400, 'Reserved inventory cannot exceed on-hand inventory.')
			}

			if (
				collection === 'shipments'
				&& (next.status !== previous.status || next.driver !== previous.driver || next.vehicle !== previous.vehicle)
			) {
				next.history = [
					{
						status: next.status,
						date: nowLabel(),
						location: next.currentLocation || next.pickup,
					},
					...(Array.isArray(previous.history) ? previous.history : []),
				]
			}

			state[collection][index] = next
			if (collection === 'shipments') {
				syncOrderWithShipment(state, next)
			}
			return next
		})
		return sendJson(response, 200, { data: updated })
	}

	if (request.method === 'DELETE') {
		const deleted = await updateState((state) => {
			const index = state[collection].findIndex((item) => item.id === recordId)
			if (index === -1) {
				throw new HttpError(404, `${collection} record "${recordId}" was not found.`)
			}

			if (collection === 'orders' && state.shipments.some((shipment) => shipment.orderId === recordId)) {
				throw new HttpError(409, 'Delete the order shipment before deleting this order.')
			}

			const [record] = state[collection].splice(index, 1)
			if (collection === 'shipments') {
				const order = findOrder(state, record.orderId)
				if (order && order.shipment === record.id) {
					order.shipment = 'Not assigned'
					order.tracking = 'Not assigned'
					order.driver = 'Not assigned'
					order.vehicle = 'Not assigned'
					order.eta = 'Awaiting dispatch'
					order.status = 'Pending'
				}
			}
			return record
		})
		return sendJson(response, 200, { data: deleted })
	}

	throw new HttpError(405, 'Supported record methods are GET, PATCH, PUT, and DELETE.')
}

async function handleSettingsRequest(request, response) {
	if (request.method === 'GET') {
		const state = await loadState()
		return sendJson(response, 200, { data: state.settings })
	}

	if (request.method === 'PATCH' || request.method === 'PUT') {
		const body = await readJsonBody(request)
		const allowedFields = new Set(['company', 'timezone', 'emailNotifications'])
		const unknownFields = Object.keys(body).filter((key) => !allowedFields.has(key))
		if (unknownFields.length) {
			throw new HttpError(400, `Unsupported setting(s): ${unknownFields.join(', ')}.`)
		}
		if (Object.hasOwn(body, 'company') && (typeof body.company !== 'string' || !body.company.trim())) {
			throw new HttpError(400, 'company must be a non-empty string.')
		}
		if (Object.hasOwn(body, 'timezone') && typeof body.timezone !== 'string') {
			throw new HttpError(400, 'timezone must be a string.')
		}
		if (Object.hasOwn(body, 'emailNotifications') && typeof body.emailNotifications !== 'boolean') {
			throw new HttpError(400, 'emailNotifications must be true or false.')
		}

		const settings = await updateState((state) => {
			state.settings = { ...state.settings, ...body }
			return state.settings
		})
		return sendJson(response, 200, { data: settings })
	}

	throw new HttpError(405, 'Use GET to read settings or PATCH to update them.')
}

async function routeRequest(request, response) {
	applyCors(request, response)

	if (request.method === 'OPTIONS') {
		response.writeHead(204)
		return response.end()
	}

	const requestUrl = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`)
	const segments = requestUrl.pathname.split('/').filter(Boolean).map(decodeURIComponent)

	if (request.method === 'GET' && requestUrl.pathname === '/api/health') {
		const state = await loadState()
		return sendJson(response, 200, {
			status: 'ok',
			service: 'logicraft-backend',
			uptimeSeconds: Math.floor(process.uptime()),
			database: databaseFile,
			collections: Object.keys(state),
		})
	}

	if (request.method === 'GET' && requestUrl.pathname === '/api') {
		return sendJson(response, 200, {
			data: {
				collections: [...Object.keys(collectionPrefixes), 'settings'],
				state: 'GET /api/state',
				collection: '/api/{collection}',
				record: '/api/{collection}/{id}',
				settings: '/api/settings',
			},
		})
	}

	if (request.method === 'GET' && requestUrl.pathname === '/api/state') {
		return sendJson(response, 200, { data: await loadState() })
	}

	if (segments[0] !== 'api' || !segments[1] || segments.length > 3) {
		throw new HttpError(404, 'Endpoint not found. See GET /api for available endpoints.')
	}

	if (segments[1] === 'settings') {
		if (segments.length !== 2) {
			throw new HttpError(404, 'Settings do not have individual record endpoints.')
		}
		return handleSettingsRequest(request, response)
	}

	return handleCollectionRequest(request, response, segments[1], segments[2], requestUrl.searchParams)
}

async function main() {
	assertValidPort(port)
	await loadState()

	const server = createServer((request, response) => {
		void routeRequest(request, response).catch((error) => {
			if (response.headersSent || response.destroyed) {
				response.destroy(error)
				return
			}

			const statusCode = error instanceof HttpError ? error.statusCode : 500
			if (statusCode >= 500) {
				console.error(`[${new Date().toISOString()}] ${error.stack ?? error.message}`)
			}

			sendJson(response, statusCode, {
				error: error instanceof HttpError ? error.message : 'An unexpected backend error occurred.',
			})
		})
	})

	server.on('error', (error) => {
		console.error(`Unable to start the backend on ${host}:${port}: ${error.message}`)
		process.exitCode = 1
	})

	server.listen(port, host, () => {
		console.log(`LogiCraft backend is running at http://localhost:${port}`)
		console.log(`API overview: http://localhost:${port}/api`)
		console.log(`Health check: http://localhost:${port}/api/health`)
		console.log(`Local database: ${databaseFile}`)
	})

	process.on('SIGINT', () => server.close(() => process.exit(0)))
	process.on('SIGTERM', () => server.close(() => process.exit(0)))
}

await main()

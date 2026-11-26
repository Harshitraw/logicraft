const storageCollections = {
	'logicraft-orders-v1': 'orders',
	'logicraft-shipments-v1': 'shipments',
	'logicraft-drivers-v1': 'drivers',
	'logicraft-warehouse-inventory-v1': 'inventory',
	'logicraft-warehouse-inbound-v1': 'inbound',
	'logicraft-warehouse-pick-tasks-v1': 'tasks',
	'logicraft-warehouse-activity-v1': 'activity',
	'logicraft-conversations-v1': 'conversations',
	'logicraft-message-notifications-v1': 'notifications',
	'logicraft-invoices-v1': 'invoices',
	'logicraft-settings-v1': 'settings',
}

const listeners = new Set()
const pendingCollections = new Map()
const originalSetItem = Storage.prototype.setItem
let flushTimer
let flushPromise
let installed = false
let connection = { state: 'connecting', message: 'Connecting to the LogiCraft API.' }

async function fetchWithTimeout(url, options = {}) {
	const controller = new AbortController()
	const timeout = setTimeout(() => controller.abort(), 5000)
	try {
		return await fetch(url, { ...options, signal: controller.signal })
	} finally {
		clearTimeout(timeout)
	}
}

function publishConnection(state, message) {
	connection = { state, message }
	listeners.forEach((listener) => listener())
}

export function getBackendConnection() {
	return connection
}

export function subscribeToBackendConnection(listener) {
	listeners.add(listener)
	return () => listeners.delete(listener)
}

function parseResponse(response) {
	if (!response.ok) {
		return response.json().then(
			(body) => {
				const message = body.detail ?? body.error ?? body
				throw new Error(typeof message === 'string' ? message : JSON.stringify(message))
			},
			() => { throw new Error(`API request failed (${response.status}).`) },
		)
	}
	return response.json()
}

async function saveCollection(collection, data) {
	const response = await fetchWithTimeout('/api/state/', {
		method: 'PUT',
		headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
		body: JSON.stringify({ collection, data }),
	})
	return parseResponse(response)
}

function readCachedValue(key) {
	const value = window.localStorage.getItem(key)
	if (value === null) return null
	try {
		return JSON.parse(value)
	} catch {
		return null
	}
}

function queueCollection(collection, data) {
	pendingCollections.set(collection, data)
	publishConnection('saving', 'Saving changes to the Django backend.')
	clearTimeout(flushTimer)
	flushTimer = setTimeout(() => { void flushPendingCollections() }, 100)
}

async function flushPendingCollections() {
	if (flushPromise) return flushPromise
	flushPromise = (async () => {
		while (pendingCollections.size > 0) {
			const [collection, data] = pendingCollections.entries().next().value
			pendingCollections.delete(collection)
			try {
				await saveCollection(collection, data)
			} catch (error) {
				pendingCollections.set(collection, data)
				publishConnection('offline', `Backend save failed: ${error.message}`)
				return
			}
		}
		publishConnection('connected', 'Connected to the Django backend. All changes are saved.')
	})()
	try {
		await flushPromise
	} finally {
		flushPromise = null
		if (pendingCollections.size > 0 && connection.state !== 'offline') {
			flushTimer = setTimeout(() => { void flushPendingCollections() }, 100)
		}
	}
}

function installStorageSync() {
	if (installed) return
	installed = true
	Storage.prototype.setItem = function setItemAndSync(key, value) {
		originalSetItem.call(this, key, value)
		if (this !== window.localStorage) return
		const collection = storageCollections[String(key)]
		if (!collection) return
		try {
			queueCollection(collection, JSON.parse(String(value)))
		} catch (error) {
			publishConnection('offline', `Could not prepare ${collection} for saving: ${error.message}`)
		}
	}
	window.addEventListener('storage', (event) => {
		if (event.storageArea !== window.localStorage || !event.key || event.newValue === null) return
		const collection = storageCollections[event.key]
		if (!collection) return
		try {
			queueCollection(collection, JSON.parse(event.newValue))
		} catch (error) {
			publishConnection('offline', `Could not prepare ${collection} for saving: ${error.message}`)
		}
	})
}

async function hydrateFromBackend() {
	const response = await fetchWithTimeout('/api/state/', { headers: { Accept: 'application/json' } })
	const payload = await parseResponse(response)
	const backendState = payload.data
	if (!backendState || typeof backendState !== 'object' || Array.isArray(backendState)) {
		throw new Error('The backend returned an invalid workspace state.')
	}

	for (const [key, collection] of Object.entries(storageCollections)) {
		const cached = readCachedValue(key)
		if (cached !== null) {
			queueCollection(collection, cached)
		} else if (Object.hasOwn(backendState, collection)) {
			originalSetItem.call(window.localStorage, key, JSON.stringify(backendState[collection]))
		}
	}
	if (pendingCollections.size === 0) {
		publishConnection('connected', 'Connected to the Django backend. All changes are saved.')
	} else {
		void flushPendingCollections()
	}
}

export async function initializeBackendPersistence() {
	try {
		installStorageSync()
		publishConnection('connecting', 'Connecting to the LogiCraft API.')
		await hydrateFromBackend()
	} catch (error) {
		publishConnection('offline', `Django API unavailable: ${error.message}`)
	}
}

export async function reconnectBackend() {
	try {
		installStorageSync()
		publishConnection('connecting', 'Reconnecting to the Django backend.')
		await hydrateFromBackend()
	} catch (error) {
		publishConnection('offline', `Django API unavailable: ${error.message}`)
	}
}

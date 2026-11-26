export const sampleShipments = [
	{
		id: 'SHP-2026-08421', tracking: 'TRK-2026-08421', orderId: 'ORD-2026-10482', customer: 'Northstar Retail',
		pickup: 'Newark Distribution Center, NJ', destination: 'Chicago Fulfillment Hub, IL', driver: 'Christina Kamberina', vehicle: 'VAN-204 · Box truck',
		status: 'In Transit', deliveryDate: '2026-10-03', eta: 'Oct 03, 10:30 AM', etaConfidence: '94%', etaType: 'ML predicted',
		currentLocation: 'I-80, near Joliet, IL', history: [
			{ status: 'In Transit', date: 'Oct 01, 1:25 PM', location: 'I-80, near Joliet, IL' },
			{ status: 'Picked Up', date: 'Oct 01, 10:40 AM', location: 'Newark Distribution Center, NJ' },
			{ status: 'Ready for Pickup', date: 'Oct 01, 8:12 AM', location: 'Newark Distribution Center, NJ' },
		],
	},
	{
		id: 'SHP-2026-08396', tracking: 'TRK-2026-08396', orderId: 'ORD-2026-10438', customer: 'Evergreen Supply Co.',
		pickup: 'Portland Cross-Dock, OR', destination: 'Seattle South Warehouse, WA', driver: 'Avery Chen', vehicle: 'VAN-092 · Box truck',
		status: 'Delivered', deliveryDate: '2026-10-01', eta: 'Delivered Oct 01, 9:42 AM', etaConfidence: '99%', etaType: 'ML predicted',
		currentLocation: 'Seattle South Warehouse, WA', history: [
			{ status: 'Delivered', date: 'Oct 01, 9:42 AM', location: 'Seattle South Warehouse, WA' },
			{ status: 'Out for Delivery', date: 'Oct 01, 7:10 AM', location: 'Seattle, WA' },
			{ status: 'In Transit', date: 'Sep 30, 2:20 PM', location: 'Route to Seattle, WA' },
			{ status: 'Picked Up', date: 'Sep 30, 11:15 AM', location: 'Portland Cross-Dock, OR' },
		],
	},
]

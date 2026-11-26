export const sampleOrders = [
	{
		id: 'ORD-2026-10482', customer: 'Northstar Retail', email: 'ops@northstar.example', phone: '+1 (312) 555-0184',
		pickup: 'Newark Distribution Center, NJ', delivery: 'Chicago Fulfillment Hub, IL', item: 'Consumer electronics', quantity: 48, weight: 620,
		pickupDate: '2026-10-01', deliveryDate: '2026-10-03', instructions: 'Keep cartons upright. Call receiving 30 minutes before arrival.',
		status: 'Active', shipment: 'SHP-2026-08421', tracking: 'TRK-2026-08421', driver: 'Christina Kamberina', vehicle: 'VAN-204 · Box truck', eta: 'Oct 03, 10:30 AM',
		history: [{ label: 'Order created', date: 'Oct 01, 8:12 AM', note: 'Order confirmed by Northstar Retail' }, { label: 'Picked up', date: 'Oct 01, 10:40 AM', note: 'Newark Distribution Center' }, { label: 'In transit', date: 'Oct 01, 1:25 PM', note: 'Driver Christina Kamberina · I-80' }],
	},
	{
		id: 'ORD-2026-10476', customer: 'Harbor & Pine', email: 'logistics@harborpine.example', phone: '+1 (617) 555-0127',
		pickup: 'Queens Sorting Center, NY', delivery: 'Boston Retail Warehouse, MA', item: 'Home goods', quantity: 26, weight: 340,
		pickupDate: '2026-10-01', deliveryDate: '2026-10-02', instructions: 'Dock 4. Delivery window 1:00 PM to 4:00 PM.',
		status: 'Pending', shipment: 'Not assigned', tracking: 'Not assigned', driver: 'Not assigned', vehicle: 'Not assigned', eta: 'Awaiting dispatch',
		history: [{ label: 'Order created', date: 'Oct 01, 9:04 AM', note: 'Awaiting dispatch assignment' }],
	},
	{
		id: 'ORD-2026-10438', customer: 'Evergreen Supply Co.', email: 'warehouse@evergreen.example', phone: '+1 (206) 555-0141',
		pickup: 'Portland Cross-Dock, OR', delivery: 'Seattle South Warehouse, WA', item: 'Packaged food', quantity: 110, weight: 840,
		pickupDate: '2026-09-30', deliveryDate: '2026-10-01', instructions: 'Temperature-controlled vehicle required.',
		status: 'Completed', shipment: 'SHP-2026-08396', tracking: 'TRK-2026-08396', driver: 'Avery Chen', vehicle: 'VAN-092 · Box truck', eta: 'Delivered Oct 01, 9:42 AM',
		history: [{ label: 'Order created', date: 'Sep 30, 7:32 AM', note: 'Order confirmed by Evergreen Supply Co.' }, { label: 'Picked up', date: 'Sep 30, 11:15 AM', note: 'Portland Cross-Dock' }, { label: 'In transit', date: 'Sep 30, 2:20 PM', note: 'Route to Seattle, WA' }, { label: 'Delivered', date: 'Oct 01, 9:42 AM', note: 'Received by warehouse team' }],
	},
	{
		id: 'ORD-2026-10391', customer: 'Summit Outfitters', email: 'receiving@summit.example', phone: '+1 (512) 555-0192',
		pickup: 'Dallas North Warehouse, TX', delivery: 'Austin Central Depot, TX', item: 'Outdoor equipment', quantity: 32, weight: 510,
		pickupDate: '2026-09-29', deliveryDate: '2026-09-30', instructions: 'Use loading entrance on the east side.',
		status: 'Cancelled', shipment: 'Not assigned', tracking: 'Not assigned', driver: 'Not assigned', vehicle: 'Not assigned', eta: 'Cancelled',
		history: [{ label: 'Order created', date: 'Sep 29, 8:16 AM', note: 'Order received' }, { label: 'Cancelled', date: 'Sep 29, 9:02 AM', note: 'Cancelled by customer' }],
	},
]

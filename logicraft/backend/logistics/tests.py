import json

from django.test import TestCase


class LogisticsApiTests(TestCase):
    def test_health_checks_database_connection(self):
        response = self.client.get('/api/health/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'ok')

    def test_workspace_starts_with_demo_collections(self):
        state = self.client.get('/api/state/').json()['data']

        self.assertEqual(state['orders'][0]['id'], 'ORD-2026-10482')
        self.assertEqual(state['shipments'][0]['tracking'], 'TRK-2026-08421')
        self.assertEqual(len(state['drivers']), 3)
        self.assertGreater(len(state['inventory']), 0)

    def test_model_apis_start_with_seeded_demo_orders_and_shipments(self):
        orders = self.client.get('/api/orders/').json()
        shipments = self.client.get('/api/shipments/').json()

        self.assertEqual(orders['total'], 3)
        self.assertTrue(any(record['customer'] == 'Evergreen Supply Co.' for record in orders['data']))
        self.assertEqual(shipments['total'], 2)
        self.assertTrue(any(record['tracking'] == 'TRK-2026-08421' for record in shipments['data']))

    def test_orders_can_be_created_listed_and_updated(self):
        created = self.client.post(
            '/api/orders/',
            data=json.dumps({
                'customer': 'Test Freight Co.',
                'pickup': 'New York, NY',
                'delivery': 'Boston, MA',
                'quantity': 2,
                'weight': 25,
            }),
            content_type='application/json',
        )
        self.assertEqual(created.status_code, 201)
        order_id = created.json()['data']['id']

        updated = self.client.patch(
            f'/api/orders/{order_id}/',
            data=json.dumps({'status': 'Active'}),
            content_type='application/json',
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()['data']['status'], 'Active')
        listed = self.client.get('/api/orders/').json()
        self.assertEqual(listed['total'], 4)
        self.assertTrue(any(record['id'] == order_id for record in listed['data']))

        deleted = self.client.delete(f'/api/orders/{order_id}/')
        self.assertEqual(deleted.status_code, 200)
        self.assertEqual(deleted.json(), {'deleted': True})

    def test_order_rejects_invalid_decimal_precision_and_field_lengths(self):
        base = {
            'customer': 'Test Freight Co.',
            'pickup': 'New York, NY',
            'delivery': 'Boston, MA',
        }
        for invalid_fields in (
            {'weight': '1.234'},
            {'customer': 'x' * 201},
            {'quantity': True},
        ):
            with self.subTest(invalid_fields=invalid_fields):
                response = self.client.post(
                    '/api/orders/',
                    data=json.dumps({**base, **invalid_fields}),
                    content_type='application/json',
                )
                self.assertEqual(response.status_code, 400)

    def test_shipment_requires_existing_order_and_appears_in_order(self):
        order = self.client.post(
            '/api/orders/',
            data=json.dumps({
                'customer': 'Test Freight Co.',
                'pickup': 'New York, NY',
                'delivery': 'Boston, MA',
            }),
            content_type='application/json',
        ).json()['data']

        created = self.client.post(
            '/api/shipments/',
            data=json.dumps({
                'orderId': order['id'],
                'tracking': 'TRK-TEST-1',
                'status': 'In Transit',
                'currentLocation': 'Hartford, CT',
            }),
            content_type='application/json',
        )
        self.assertEqual(created.status_code, 201)

        detail = self.client.get(f"/api/orders/{order['id']}/")
        self.assertEqual(detail.json()['data']['shipments'][0]['tracking'], 'TRK-TEST-1')

    def test_shipment_tracking_conflict_on_update_returns_conflict(self):
        order = self.client.post(
            '/api/orders/',
            data=json.dumps({
                'customer': 'Test Freight Co.',
                'pickup': 'New York, NY',
                'delivery': 'Boston, MA',
            }),
            content_type='application/json',
        ).json()['data']
        shipment_ids = []
        for tracking in ('TRK-TEST-A', 'TRK-TEST-B'):
            response = self.client.post(
                '/api/shipments/',
                data=json.dumps({'orderId': order['id'], 'tracking': tracking}),
                content_type='application/json',
            )
            shipment_ids.append(response.json()['data']['id'])

        response = self.client.patch(
            f'/api/shipments/{shipment_ids[1]}/',
            data=json.dumps({'tracking': 'TRK-TEST-A'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 409)

        unchanged = self.client.get(f'/api/shipments/{shipment_ids[1]}/')
        self.assertEqual(unchanged.json()['data']['tracking'], 'TRK-TEST-B')

    def test_shipment_rejects_invalid_eta(self):
        order = self.client.post(
            '/api/orders/',
            data=json.dumps({
                'customer': 'Test Freight Co.',
                'pickup': 'New York, NY',
                'delivery': 'Boston, MA',
            }),
            content_type='application/json',
        ).json()['data']

        response = self.client.post(
            '/api/shipments/',
            data=json.dumps({
                'orderId': order['id'],
                'tracking': 'TRK-TEST-ETA',
                'eta': False,
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

    def test_invalid_order_is_rejected(self):
        response = self.client.post(
            '/api/orders/',
            data=json.dumps({'customer': '', 'pickup': '', 'delivery': ''}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

    def test_api_exposes_csrf_token_for_browser_clients(self):
        client = self.client_class(enforce_csrf_checks=True)
        response = client.get('/api/csrf/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('csrftoken', response.cookies)
        self.assertTrue(response.json()['csrfToken'])

    def test_workspace_state_preserves_and_updates_frontend_collections(self):
        initial = self.client.get('/api/state/')
        self.assertEqual(initial.status_code, 200)
        self.assertIn('orders', initial.json()['data'])

        updated_orders = [
            {
                'id': 'ORD-TEST-1',
                'customer': 'Test Freight Co.',
                'pickup': 'New York, NY',
                'delivery': 'Boston, MA',
                'status': 'Pending',
            },
        ]
        updated = self.client.put(
            '/api/state/',
            data=json.dumps({'collection': 'orders', 'data': updated_orders}),
            content_type='application/json',
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()['data']['orders'], updated_orders)
        self.assertEqual(
            self.client.get('/api/state/').json()['data']['orders'],
            updated_orders,
        )

    def test_workspace_state_rejects_invalid_collection_shapes(self):
        response = self.client.put(
            '/api/state/',
            data=json.dumps({'collection': 'shipments', 'data': {'id': 'not-a-list'}}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

    def test_workspace_state_rejects_records_without_unique_ids(self):
        response = self.client.put(
            '/api/state/',
            data=json.dumps({
                'collection': 'drivers',
                'data': [{'id': 'DRV-1'}, {'id': 'DRV-1'}],
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

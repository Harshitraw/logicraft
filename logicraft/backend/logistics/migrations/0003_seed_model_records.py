import json
from pathlib import Path

from django.db import migrations


def seed_model_records(apps, schema_editor):
    using = schema_editor.connection.alias
    Order = apps.get_model('logistics', 'Order')
    Shipment = apps.get_model('logistics', 'Shipment')

    if Order.objects.using(using).exists():
        return

    state_file = Path(__file__).resolve().parents[2] / 'data' / 'database.json'
    if not state_file.is_file():
        return

    with state_file.open(encoding='utf-8') as file:
        data = json.load(file)
    if not isinstance(data, dict):
        raise ValueError('The workspace seed file must contain a JSON object.')

    order_ids = {}
    for record in data.get('orders', []):
        order = Order.objects.using(using).create(
            customer=record['customer'],
            email=record.get('email', ''),
            phone=record.get('phone', ''),
            pickup=record['pickup'],
            delivery=record['delivery'],
            item=record.get('item', ''),
            quantity=record.get('quantity', 1),
            weight=record.get('weight', 0),
            status=record.get('status', 'Pending'),
        )
        order_ids[record['id']] = order.pk

    for record in data.get('shipments', []):
        order_id = order_ids.get(record.get('orderId'))
        if order_id is None:
            continue
        Shipment.objects.using(using).create(
            order_id=order_id,
            tracking=record['tracking'],
            driver=record.get('driver', ''),
            vehicle=record.get('vehicle', ''),
            status=record.get('status', 'Ready for Pickup'),
            current_location=record.get('currentLocation', ''),
        )


class Migration(migrations.Migration):

    dependencies = [
        ('logistics', '0002_workspace_state'),
    ]

    operations = [
        migrations.RunPython(seed_model_records, migrations.RunPython.noop),
    ]

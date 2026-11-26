import json
from pathlib import Path

from django.db import migrations, models


def load_demo_state(apps, schema_editor):
    state_file = Path(__file__).resolve().parents[2] / 'data' / 'database.json'
    if not state_file.is_file():
        return

    with state_file.open(encoding='utf-8') as file:
        data = json.load(file)
    if not isinstance(data, dict):
        raise ValueError('The workspace seed file must contain a JSON object.')

    WorkspaceState = apps.get_model('logistics', 'WorkspaceState')
    WorkspaceState.objects.using(schema_editor.connection.alias).get_or_create(
        pk=1,
        defaults={'data': data},
    )


class Migration(migrations.Migration):

    dependencies = [
        ('logistics', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='WorkspaceState',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('data', models.JSONField(blank=True, default=dict)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.RunPython(load_demo_state, migrations.RunPython.noop),
    ]

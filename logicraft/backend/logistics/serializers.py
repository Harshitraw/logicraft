from rest_framework import serializers


WORKSPACE_COLLECTIONS = (
    'orders',
    'shipments',
    'drivers',
    'inventory',
    'inbound',
    'tasks',
    'conversations',
    'notifications',
    'invoices',
    'settings',
    'activity',
)


class WorkspaceCollectionUpdateSerializer(serializers.Serializer):
    collection = serializers.ChoiceField(choices=WORKSPACE_COLLECTIONS)
    data = serializers.JSONField()

    def validate(self, attrs):
        collection = attrs['collection']
        data = attrs['data']
        expected_type = dict if collection == 'settings' else list
        if not isinstance(data, expected_type):
            raise serializers.ValidationError({
                'data': f'{collection} must be a JSON {expected_type.__name__}.',
            })
        if isinstance(data, list):
            identifiers = set()
            for index, record in enumerate(data):
                if not isinstance(record, dict):
                    raise serializers.ValidationError({
                        'data': f'Item {index} in {collection} must be a JSON object.',
                    })
                identifier = record.get('id')
                if isinstance(identifier, bool) or not isinstance(identifier, (str, int)) or not str(identifier).strip():
                    raise serializers.ValidationError({
                        'data': f'Item {index} in {collection} must have a non-empty string or integer id.',
                    })
                if identifier in identifiers:
                    raise serializers.ValidationError({
                        'data': f'{collection} cannot contain duplicate ids.',
                    })
                identifiers.add(identifier)
        return attrs

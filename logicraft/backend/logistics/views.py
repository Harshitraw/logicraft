import json
from decimal import Decimal, InvalidOperation

from django.db import IntegrityError, connection, transaction
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods
from django.utils.dateparse import parse_datetime
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Order, Shipment, WorkspaceState
from .serializers import WorkspaceCollectionUpdateSerializer


def json_error(message, status):
    return JsonResponse({'error': message}, status=status)


def parse_body(request):
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise ValueError('Request body must contain valid JSON.') from None
    if not isinstance(body, dict):
        raise ValueError('Request body must be a JSON object.')
    return body


def order_data(order):
    return {
        'id': order.pk,
        'customer': order.customer,
        'email': order.email,
        'phone': order.phone,
        'pickup': order.pickup,
        'delivery': order.delivery,
        'item': order.item,
        'quantity': order.quantity,
        'weight': str(order.weight),
        'status': order.status,
        'shipments': [shipment_data(item) for item in order.shipments.all()],
        'createdAt': order.created_at.isoformat(),
    }


def shipment_data(shipment):
    return {
        'id': shipment.pk,
        'orderId': shipment.order_id,
        'tracking': shipment.tracking,
        'driver': shipment.driver,
        'vehicle': shipment.vehicle,
        'status': shipment.status,
        'currentLocation': shipment.current_location,
        'eta': shipment.eta.isoformat() if shipment.eta else None,
        'createdAt': shipment.created_at.isoformat(),
        'updatedAt': shipment.updated_at.isoformat(),
    }


def validate_order(data, partial=False):
    required_fields = ('customer', 'pickup', 'delivery')
    field_lengths = {
        'customer': 200,
        'email': 254,
        'phone': 50,
        'pickup': 300,
        'delivery': 300,
        'item': 200,
    }
    for field in required_fields:
        if (not partial or field in data) and (
            not isinstance(data.get(field), str) or not data[field].strip()
        ):
            raise ValueError(f'{field} is required and must be a non-empty string.')

    for field, max_length in field_lengths.items():
        if field in data and (
            not isinstance(data[field], str) or len(data[field]) > max_length
        ):
            raise ValueError(f'{field} must be a string no longer than {max_length} characters.')

    if data.get('email'):
        try:
            validate_email(data['email'])
        except ValidationError:
            raise ValueError('email must be a valid email address.') from None

    if 'quantity' in data:
        if (
            isinstance(data['quantity'], bool)
            or not isinstance(data['quantity'], int)
            or not 1 <= data['quantity'] <= 4294967295
        ):
            raise ValueError('quantity must be a whole number between 1 and 4294967295.')

    if 'weight' in data:
        try:
            weight = Decimal(str(data['weight']))
        except (InvalidOperation, TypeError):
            raise ValueError('weight must be a non-negative number.') from None
        if not weight.is_finite() or weight < 0 or weight >= Decimal('100000000') or max(0, -weight.as_tuple().exponent) > 2:
            raise ValueError('weight must be a non-negative number.')

    if 'status' in data and data['status'] not in Order.Status.values:
        raise ValueError('status must be Pending, Active, Completed, or Cancelled.')


def apply_order_fields(order, data):
    for field in ('customer', 'pickup', 'delivery', 'email', 'phone', 'item', 'quantity', 'weight', 'status'):
        if field in data:
            setattr(order, field, data[field])


def validate_shipment(data, partial=False):
    required = ('orderId', 'tracking')
    for field in required:
        if not partial or field in data:
            value = data.get(field)
            if (
                isinstance(value, bool)
                or not isinstance(value, (str, int))
                or not str(value).strip()
            ):
                raise ValueError(f'{field} is required.')

    if 'orderId' in data:
        try:
            data['orderId'] = int(data['orderId'])
        except (ValueError, TypeError, OverflowError):
            raise ValueError('orderId must refer to an existing order.') from None
        if data['orderId'] < 1 or not Order.objects.filter(pk=data['orderId']).exists():
            raise ValueError('orderId must refer to an existing order.')

    field_lengths = {
        'tracking': 80,
        'driver': 200,
        'vehicle': 200,
        'currentLocation': 300,
    }
    for field, max_length in field_lengths.items():
        if field in data and (
            not isinstance(data[field], str) or len(data[field]) > max_length
        ):
            raise ValueError(f'{field} must be a string no longer than {max_length} characters.')
    if 'tracking' in data and not data['tracking'].strip():
        raise ValueError('tracking is required.')

    if 'status' in data and data['status'] not in Shipment.Status.values:
        raise ValueError('Invalid shipment status.')
    if 'eta' in data and data['eta'] is not None and data['eta'] != '':
        if not isinstance(data['eta'], str) or parse_datetime(data['eta']) is None:
            raise ValueError('eta must be an ISO 8601 date-time or null.')


def apply_shipment_fields(shipment, data):
    fields = {
        'orderId': 'order_id',
        'tracking': 'tracking',
        'driver': 'driver',
        'vehicle': 'vehicle',
        'status': 'status',
        'currentLocation': 'current_location',
    }
    for incoming, model_field in fields.items():
        if incoming in data:
            setattr(shipment, model_field, data[incoming])
    if 'eta' in data:
        if data['eta'] is None or data['eta'] == '':
            shipment.eta = None
        elif not isinstance(data['eta'], str):
            raise ValueError('eta must be an ISO 8601 date-time or null.')
        else:
            parsed_eta = parse_datetime(data['eta'])
            if parsed_eta is None:
                raise ValueError('eta must be an ISO 8601 date-time or null.')
            shipment.eta = parsed_eta


@require_http_methods(['GET'])
def health(request):
    with connection.cursor() as cursor:
        cursor.execute('SELECT 1')
    return JsonResponse({'status': 'ok', 'service': 'logicraft-django'})


class WorkspaceStateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        state, _ = WorkspaceState.objects.get_or_create(pk=1)
        return Response({'data': state.data})

    def put(self, request):
        serializer = WorkspaceCollectionUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            state, _ = WorkspaceState.objects.select_for_update().get_or_create(pk=1)
            data = dict(state.data)
            data[serializer.validated_data['collection']] = serializer.validated_data['data']
            state.data = data
            state.save(update_fields=['data', 'updated_at'])

        return Response({'data': state.data})


@require_http_methods(['GET'])
@ensure_csrf_cookie
def csrf_token(request):
    return JsonResponse({'csrfToken': get_token(request)})


@require_http_methods(['GET', 'POST'])
def orders(request):
    if request.method == 'GET':
        records = [order_data(order) for order in Order.objects.prefetch_related('shipments').order_by('-created_at')]
        return JsonResponse({'data': records, 'total': len(records)})

    try:
        data = parse_body(request)
        validate_order(data)
    except ValueError as error:
        return json_error(str(error), 400)

    order = Order()
    apply_order_fields(order, data)
    order.save()
    return JsonResponse({'data': order_data(order)}, status=201)


@require_http_methods(['GET', 'PATCH', 'DELETE'])
def order_detail(request, order_id):
    try:
        order = Order.objects.prefetch_related('shipments').get(pk=order_id)
    except Order.DoesNotExist:
        return json_error('Order not found.', 404)

    if request.method == 'GET':
        return JsonResponse({'data': order_data(order)})

    if request.method == 'DELETE':
        order.delete()
        return JsonResponse({'deleted': True})

    try:
        data = parse_body(request)
        validate_order(data, partial=True)
    except ValueError as error:
        return json_error(str(error), 400)

    apply_order_fields(order, data)
    order.save()
    return JsonResponse({'data': order_data(order)})


@require_http_methods(['GET', 'POST'])
def shipments(request):
    if request.method == 'GET':
        records = [shipment_data(item) for item in Shipment.objects.order_by('-created_at')]
        return JsonResponse({'data': records, 'total': len(records)})

    try:
        data = parse_body(request)
        validate_shipment(data)
    except ValueError as error:
        return json_error(str(error), 400)

    shipment = Shipment()
    apply_shipment_fields(shipment, data)
    try:
        with transaction.atomic():
            shipment.save()
    except IntegrityError:
        if Shipment.objects.filter(tracking=shipment.tracking).exists():
            return json_error('A shipment with this tracking ID already exists.', 409)
        raise
    return JsonResponse({'data': shipment_data(shipment)}, status=201)


@require_http_methods(['GET', 'PATCH', 'DELETE'])
def shipment_detail(request, shipment_id):
    try:
        shipment = Shipment.objects.get(pk=shipment_id)
    except Shipment.DoesNotExist:
        return json_error('Shipment not found.', 404)

    if request.method == 'GET':
        return JsonResponse({'data': shipment_data(shipment)})

    if request.method == 'DELETE':
        shipment.delete()
        return JsonResponse({'deleted': True})

    try:
        data = parse_body(request)
        validate_shipment(data, partial=True)
        apply_shipment_fields(shipment, data)
    except ValueError as error:
        return json_error(str(error), 400)

    try:
        with transaction.atomic():
            shipment.save()
    except IntegrityError:
        if Shipment.objects.filter(tracking=shipment.tracking).exclude(pk=shipment.pk).exists():
            return json_error('A shipment with this tracking ID already exists.', 409)
        raise

    return JsonResponse({'data': shipment_data(shipment)})

from django.urls import path

from . import views

urlpatterns = [
    path('health/', views.health, name='api-health'),
    path('state/', views.WorkspaceStateView.as_view(), name='workspace-state'),
    path('csrf/', views.csrf_token, name='api-csrf-token'),
    path('orders/', views.orders, name='orders'),
    path('orders/<int:order_id>/', views.order_detail, name='order-detail'),
    path('shipments/', views.shipments, name='shipments'),
    path('shipments/<int:shipment_id>/', views.shipment_detail, name='shipment-detail'),
]

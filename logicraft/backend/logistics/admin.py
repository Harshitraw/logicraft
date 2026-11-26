from django.contrib import admin

from .models import Order, Shipment


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'status', 'pickup', 'delivery', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('customer', 'email', 'pickup', 'delivery')


@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'tracking', 'order', 'status', 'driver', 'updated_at')
    list_filter = ('status', 'updated_at')
    search_fields = ('tracking', 'driver', 'vehicle', 'current_location')

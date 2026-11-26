from django.db import models


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = 'Pending', 'Pending'
        ACTIVE = 'Active', 'Active'
        COMPLETED = 'Completed', 'Completed'
        CANCELLED = 'Cancelled', 'Cancelled'

    customer = models.CharField(max_length=200)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    pickup = models.CharField(max_length=300)
    delivery = models.CharField(max_length=300)
    item = models.CharField(max_length=200, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    weight = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.customer} · Order {self.pk}'


class Shipment(models.Model):
    class Status(models.TextChoices):
        READY = 'Ready for Pickup', 'Ready for Pickup'
        PICKED_UP = 'Picked Up', 'Picked Up'
        IN_TRANSIT = 'In Transit', 'In Transit'
        OUT_FOR_DELIVERY = 'Out for Delivery', 'Out for Delivery'
        DELIVERED = 'Delivered', 'Delivered'
        DELAYED = 'Delayed', 'Delayed'

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='shipments')
    tracking = models.CharField(max_length=80, unique=True)
    driver = models.CharField(max_length=200, blank=True)
    vehicle = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.READY)
    current_location = models.CharField(max_length=300, blank=True)
    eta = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.tracking


class WorkspaceState(models.Model):
    data = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return 'LogiCraft workspace state'

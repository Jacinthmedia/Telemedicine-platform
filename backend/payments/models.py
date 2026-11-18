from django.db import models
import uuid

class Transaction(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"

    reference = models.CharField(max_length=100, unique=True, default=uuid.uuid4)
    appointment = models.OneToOneField(
        'api.Appointment', on_delete=models.PROTECT, related_name='transaction'
    )
    patient = models.ForeignKey(
        'api.PatientProfile', on_delete=models.PROTECT, related_name='transactions'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    platform_commission = models.DecimalField(max_digits=10, decimal_places=2)
    doctor_share = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    gateway_response = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class DoctorWallet(models.Model):
    doctor = models.OneToOneField(
        'api.DoctorProfile', on_delete=models.CASCADE, related_name='wallet'
    )
    pending_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    available_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

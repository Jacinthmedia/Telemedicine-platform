from rest_framework import serializers
from .models import DoctorWallet

class WalletSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.user.get_full_name', read_only=True)

    class Meta:
        model = DoctorWallet
        fields = ['id', 'doctor_name', 'pending_balance', 'available_balance']

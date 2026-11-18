from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from api.models import Appointment, DoctorProfile
from .models import Transaction, DoctorWallet
from .services import calculate_paystack_fee, initialize_transaction, verify_transaction
from .serializers import WalletSerializer
import uuid
import hmac
import hashlib
from django.conf import settings
from decimal import Decimal

class InitializePaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, appointment_id):
        appointment = get_object_or_404(Appointment, id=appointment_id, patient__user=request.user)
        
        if appointment.payment_status == 'paid':
            return Response({"error": "Already paid"}, status=400)

        base_fee = appointment.doctor.consultation_fee
        gateway_fee = calculate_paystack_fee(base_fee)
        total_to_pay = base_fee + gateway_fee
        
        commission = base_fee * Decimal('0.30')
        doctor_share = base_fee * Decimal('0.70')

        reference = str(uuid.uuid4())
        
        transaction = Transaction.objects.create(
            reference=reference,
            appointment=appointment,
            patient=appointment.patient,
            amount=total_to_pay,
            platform_commission=commission,
            doctor_share=doctor_share,
            status=Transaction.Status.PENDING
        )

        callback_url = f"http://192.168.137.1:3000/payment-success?reference={reference}"
        paystack_res = initialize_transaction(
            email=request.user.email,
            amount=total_to_pay,
            reference=reference,
            callback_url=callback_url
        )

        if paystack_res.get('status'):
            return Response({
                "authorization_url": paystack_res['data']['authorization_url'],
                "reference": reference
            })
        else:
            transaction.status = Transaction.Status.FAILED
            transaction.save()
            return Response({"error": "Paystack initialization failed"}, status=400)

class PaystackWebhookView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        paystack_signature = request.headers.get('x-paystack-signature')
        secret = settings.PAYSTACK_SECRET_KEY.encode('utf-8')
        
        hash = hmac.new(secret, request.body, hashlib.sha512).hexdigest()
        if hash != paystack_signature:
            return Response({"error": "Invalid signature"}, status=400)

        event = request.data
        if event['event'] == 'charge.success':
            reference = event['data']['reference']
            try:
                transaction = Transaction.objects.get(reference=reference)
                if transaction.status == Transaction.Status.PENDING:
                    verify_res = verify_transaction(reference)
                    if verify_res['data']['status'] == 'success':
                        transaction.status = Transaction.Status.SUCCESS
                        transaction.gateway_response = verify_res['data']
                        transaction.save()

                        appointment = transaction.appointment
                        appointment.payment_status = 'paid'
                        appointment.save()
            except Transaction.DoesNotExist:
                pass

        return Response({"status": "success"})

class DoctorWalletView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        doctor_profile = DoctorProfile.objects.filter(user=request.user).first()
        
        if not doctor_profile:
            doctor_profile = DoctorProfile.objects.create(
                user=request.user,
                specialization='general',
                license_number='AUTO-GENERATED',
                hospital='MediCare',
                years_experience=1,
                consultation_fee=10000.00
            )
        
        wallet, _ = DoctorWallet.objects.get_or_create(doctor=doctor_profile)
        return Response(WalletSerializer(wallet).data)
from rest_framework.permissions import IsAdminUser
from django.db.models import Sum

class AdminDashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        # Calculate total platform commission from successful transactions
        total_commission = Transaction.objects.filter(status=Transaction.Status.SUCCESS).aggregate(
            total=Sum('platform_commission')
        )['total'] or 0

        # Calculate total pending doctor earnings (escrow)
        total_escrow = DoctorWallet.objects.aggregate(
            total=Sum('pending_balance')
        )['total'] or 0

        # Get recent successful transactions
        recent_txs = Transaction.objects.filter(status=Transaction.Status.SUCCESS).order_by('-created_at')[:10]
        tx_data = [{
            'id': tx.id,
            'reference': tx.reference,
            'amount': tx.amount,
            'commission': tx.platform_commission,
            'doctor_share': tx.doctor_share,
            'date': tx.created_at.strftime('%Y-%m-%d %H:%M')
        } for tx in recent_txs]

        return Response({
            'total_commission': total_commission,
            'total_escrow': total_escrow,
            'recent_transactions': tx_data
        })

from rest_framework.permissions import IsAdminUser
from django.db.models import Sum


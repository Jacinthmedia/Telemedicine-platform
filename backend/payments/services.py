import requests
from django.conf import settings
from decimal import Decimal

PAYSTACK_BASE_URL = "https://api.paystack.co"

def calculate_paystack_fee(amount):
    if amount < 2500:
        return Decimal('0.00')
    fee = (Decimal(amount) * Decimal('0.015')) + 100
    return min(fee, Decimal('2000.00'))

def initialize_transaction(email, amount, reference, callback_url):
    headers = {
        "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
        "Content-Type": "application/json",
    }
    data = {
        "email": email,
        "amount": int(amount * 100),
        "reference": reference,
        "callback_url": callback_url,
    }
    response = requests.post(f"{PAYSTACK_BASE_URL}/transaction/initialize", json=data, headers=headers)
    return response.json()

def verify_transaction(reference):
    headers = {"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"}
    response = requests.get(f"{PAYSTACK_BASE_URL}/transaction/verify/{reference}", headers=headers)
    return response.json()

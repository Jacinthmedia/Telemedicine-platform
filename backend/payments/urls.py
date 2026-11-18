from django.urls import path
from . import views

urlpatterns = [
    path('checkout/<int:appointment_id>/', views.InitializePaymentView.as_view(), name='initialize-payment'),
    path('webhook/', views.PaystackWebhookView.as_view(), name='paystack-webhook'),
    path('wallet/', views.DoctorWalletView.as_view(), name='doctor-wallet'),
    path('admin-dashboard/', views.AdminDashboardView.as_view(), name='admin-dashboard'),
]

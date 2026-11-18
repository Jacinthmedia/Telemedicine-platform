from django.urls import path
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenRefreshView

from . import views


# ============================================================
# ROOT API VIEW
# ============================================================

def api_root(request):
    return JsonResponse(
        {
            'message': '🏥 Telemedicine Platform API',
            'version': '1.0.0',
            'status': 'operational',
            'endpoints': {
                'auth': '/api/auth/',
                'patients': '/api/patients/',
                'doctors': '/api/doctors/',
                'doctor_availability': '/api/doctor-availability/',
                'appointments': '/api/appointments/',
                'medical_records': '/api/medical-records/',
                'prescriptions': '/api/prescriptions/',
                'notifications': '/api/notifications/',
                'reviews': '/api/reviews/',
                'messages': '/api/messages/',
                'payments': '/api/payments/',
                'documents': '/api/documents/',
                'system_logs': '/api/system-logs/',
                'video_calls': '/api/video-calls/',
                'search': '/api/search/doctors/',
                'admin_dashboard': '/api/admin/dashboard/',
                'health': '/api/health/',
            },
            'documentation': '/swagger/',
            'admin': '/admin/',
        },
        json_dumps_params={'indent': 2},
    )


# ============================================================
# URL PATTERNS
# ============================================================

urlpatterns = [

    # ========================================================
    # ROOT
    # ========================================================

    path('', api_root, name='api-root'),

    # ========================================================
    # HEALTH CHECK
    # ========================================================

    path('health/', views.HealthCheckView.as_view(), name='health-check'),

    # ========================================================
    # AUTHENTICATION
    # ========================================================

    path(
        'auth/register/',
        views.AuthViewSet.as_view({'post': 'register'}),
        name='auth-register',
    ),
    path(
        'auth/login/',
        views.AuthViewSet.as_view({'post': 'login'}),
        name='auth-login',
    ),
    path(
        'auth/token/refresh/',
        TokenRefreshView.as_view(),
        name='token-refresh',
    ),
    path(
        'auth/me/',
        views.AuthViewSet.as_view({
            'get': 'me',
            'patch': 'update_me',
        }),
        name='auth-me',
    ),
    path(
        'auth/logout/',
        views.AuthViewSet.as_view({'post': 'logout'}),
        name='auth-logout',
    ),
    path(
        'auth/change-password/',
        views.AuthViewSet.as_view({'post': 'change_password'}),
        name='auth-change-password',
    ),
    path(
        'auth/reset-password/',
        views.AuthViewSet.as_view({'post': 'reset_password'}),
        name='auth-reset-password',
    ),
    path(
        'auth/create-admin/',
        views.AuthViewSet.as_view({'post': 'create_admin'}),
        name='auth-create-admin',
    ),

    # ========================================================
    # PATIENTS
    # ========================================================

    path(
        'patients/',
        views.PatientViewSet.as_view({
            'get': 'list',
            'post': 'create',
        }),
        name='patient-list',
    ),
    path(
        'patients/<int:pk>/',
        views.PatientViewSet.as_view({
            'get': 'retrieve',
            'patch': 'partial_update',
            'put': 'update',
            'delete': 'destroy',
        }),
        name='patient-detail',
    ),
    path(
        'patients/dashboard/',
        views.PatientViewSet.as_view({'get': 'dashboard'}),
        name='patient-dashboard',
    ),

    # ========================================================
    # DOCTORS
    # ========================================================

    path(
        'doctors/',
        views.DoctorViewSet.as_view({
            'get': 'list',
            'post': 'create',
        }),
        name='doctor-list',
    ),
    path(
        'doctors/<int:pk>/',
        views.DoctorViewSet.as_view({
            'get': 'retrieve',
            'patch': 'partial_update',
            'put': 'update',
            'delete': 'destroy',
        }),
        name='doctor-detail',
    ),
    path(
        'doctors/dashboard/',
        views.DoctorViewSet.as_view({'get': 'dashboard'}),
        name='doctor-dashboard',
    ),
    path(
        'doctors/available/',
        views.DoctorViewSet.as_view({'get': 'available_doctors'}),
        name='doctor-available',
    ),
    path(
        'doctors/update-availability/',
        views.DoctorViewSet.as_view({'post': 'update_availability'}),
        name='doctor-update-availability',
    ),
    path(
        'doctors/pending/',
        views.DoctorViewSet.as_view({'get': 'pending_verification'}),
        name='doctor-pending',
    ),
    path(
        'doctors/<int:pk>/approve/',
        views.DoctorViewSet.as_view({'post': 'approve'}),
        name='doctor-approve',
    ),
    path(
        'doctors/<int:pk>/reject/',
        views.DoctorViewSet.as_view({'post': 'reject'}),
        name='doctor-reject',
    ),

    # ========================================================
    # DOCTOR AVAILABILITY
    # ========================================================

    path(
        'doctor-availability/',
        views.DoctorAvailabilityViewSet.as_view({
            'get': 'list',
            'post': 'create',
        }),
        name='doctor-availability-list',
    ),
    path(
        'doctor-availability/<int:pk>/',
        views.DoctorAvailabilityViewSet.as_view({
            'get': 'retrieve',
            'patch': 'partial_update',
            'put': 'update',
            'delete': 'destroy',
        }),
        name='doctor-availability-detail',
    ),

    # ========================================================
    # APPOINTMENTS
    # ========================================================

    path(
        'appointments/',
        views.AppointmentViewSet.as_view({
            'get': 'list',
            'post': 'create',
        }),
        name='appointment-list',
    ),
    path(
        'appointments/<int:pk>/',
        views.AppointmentViewSet.as_view({
            'get': 'retrieve',
            'patch': 'partial_update',
            'put': 'update',
            'delete': 'destroy',
        }),
        name='appointment-detail',
    ),
    path(
        'appointments/<int:pk>/confirm/',
        views.AppointmentViewSet.as_view({'post': 'confirm'}),
        name='appointment-confirm',
    ),
    path(
        'appointments/<int:pk>/start/',
        views.AppointmentViewSet.as_view({'post': 'start'}),
        name='appointment-start',
    ),
    path(
        'appointments/<int:pk>/complete/',
        views.AppointmentViewSet.as_view({'post': 'complete'}),
        name='appointment-complete',
    ),
    path(
        'appointments/<int:pk>/cancel/',
        views.AppointmentViewSet.as_view({'post': 'cancel'}),
        name='appointment-cancel',
    ),

    path(
        'appointments/upcoming/',
        views.AppointmentViewSet.as_view({'get': 'upcoming'}),
        name='appointment-upcoming',
    ),
    path(
        'appointments/history/',
        views.AppointmentViewSet.as_view({'get': 'history'}),
        name='appointment-history',
    ),

    # ========================================================
    # MEDICAL RECORDS
    # ========================================================

    path(
        'medical-records/',
        views.MedicalRecordViewSet.as_view({
            'get': 'list',
            'post': 'create',
        }),
        name='medical-record-list',
    ),
    path(
        'medical-records/<int:pk>/',
        views.MedicalRecordViewSet.as_view({
            'get': 'retrieve',
            'patch': 'partial_update',
            'put': 'update',
            'delete': 'destroy',
        }),
        name='medical-record-detail',
    ),

    # ========================================================
    # PRESCRIPTIONS
    # ========================================================

    path(
        'prescriptions/',
        views.PrescriptionViewSet.as_view({
            'get': 'list',
            'post': 'create',
        }),
        name='prescription-list',
    ),
    path(
        'prescriptions/<int:pk>/',
        views.PrescriptionViewSet.as_view({
            'get': 'retrieve',
            'patch': 'partial_update',
            'put': 'update',
            'delete': 'destroy',
        }),
        name='prescription-detail',
    ),

    # ========================================================
    # NOTIFICATIONS
    # ========================================================

    path(
        'notifications/',
        views.NotificationViewSet.as_view({
            'get': 'list',
            'post': 'create',
        }),
        name='notification-list',
    ),
    path(
        'notifications/<int:pk>/',
        views.NotificationViewSet.as_view({
            'get': 'retrieve',
            'patch': 'partial_update',
            'delete': 'destroy',
        }),
        name='notification-detail',
    ),
    path(
        'notifications/<int:pk>/mark-read/',
        views.NotificationViewSet.as_view({'post': 'mark_read'}),
        name='notification-mark-read',
    ),
    path(
        'notifications/mark-all-read/',
        views.NotificationViewSet.as_view({'post': 'mark_all_read'}),
        name='notification-mark-all-read',
    ),
    path(
        'notifications/unread/',
        views.NotificationViewSet.as_view({'get': 'unread'}),
        name='notification-unread',
    ),

    # ========================================================
    # REVIEWS
    # ========================================================

    path(
        'reviews/',
        views.ReviewViewSet.as_view({
            'get': 'list',
            'post': 'create',
        }),
        name='review-list',
    ),
    path(
        'reviews/<int:pk>/',
        views.ReviewViewSet.as_view({
            'get': 'retrieve',
            'patch': 'partial_update',
            'delete': 'destroy',
        }),
        name='review-detail',
    ),

    # ========================================================
    # CHAT MESSAGES
    # ========================================================

    path(
        'messages/',
        views.ChatMessageViewSet.as_view({
            'get': 'list',
            'post': 'create',
        }),
        name='message-list',
    ),
    path(
        'messages/<int:pk>/',
        views.ChatMessageViewSet.as_view({'get': 'retrieve'}),
        name='message-detail',
    ),
    path(
        'messages/<int:pk>/mark-read/',
        views.ChatMessageViewSet.as_view({'post': 'mark_read'}),
        name='message-mark-read',
    ),
    path(
        'messages/unread-count/',
        views.ChatMessageViewSet.as_view({'get': 'unread_count'}),
        name='message-unread-count',
    ),
    path(
        'messages/conversation/',
        views.ChatMessageViewSet.as_view({'get': 'conversation'}),
        name='message-conversation',
    ),

    # ========================================================
    # PAYMENTS
    # ========================================================

    path(
        'payments/',
        views.PaymentViewSet.as_view({
            'get': 'list',
            'post': 'create',
        }),
        name='payment-list',
    ),
    path(
        'payments/<int:pk>/',
        views.PaymentViewSet.as_view({'get': 'retrieve'}),
        name='payment-detail',
    ),

    # ========================================================
    # DOCUMENTS
    # ========================================================

    path(
        'documents/',
        views.DocumentViewSet.as_view({
            'get': 'list',
            'post': 'create',
        }),
        name='document-list',
    ),
    path(
        'documents/<int:pk>/',
        views.DocumentViewSet.as_view({
            'get': 'retrieve',
            'patch': 'partial_update',
            'delete': 'destroy',
        }),
        name='document-detail',
    ),

    path(
        'documents/<int:pk>/verify/',
        views.DocumentViewSet.as_view({'post': 'verify'}),
        name='document-verify',
    ),

    # ========================================================
    # SYSTEM LOGS
    # ========================================================

    path(
        'system-logs/',
        views.SystemLogViewSet.as_view({'get': 'list'}),
        name='system-log-list',
    ),
    path(
        'system-logs/<int:pk>/',
        views.SystemLogViewSet.as_view({'get': 'retrieve'}),
        name='system-log-detail',
    ),

    # ========================================================
    # SEARCH
    # ========================================================

    path(
        'search/doctors/',
        views.DoctorSearchViewSet.as_view({'get': 'list'}),
        name='search-doctors',
    ),
    path(
        'search/',
        views.GlobalSearchView.as_view(),
        name='global-search',
    ),

    # ========================================================
    # VIDEO CALLS
    # ========================================================

    path(
        'video-calls/',
        views.VideoCallViewSet.as_view({
            'get': 'list',
            'post': 'create',
        }),
        name='video-call-list',
    ),
    path(
        'video-calls/<int:pk>/',
        views.VideoCallViewSet.as_view({
            'get': 'retrieve',
            'patch': 'partial_update',
            'delete': 'destroy',
        }),
        name='video-call-detail',
    ),
    path(
        'video-calls/call-history/',
        views.VideoCallViewSet.as_view({'get': 'call_history'}),
        name='video-call-history',
    ),

    path(
        'video-calls/start/',
        views.VideoCallViewSet.as_view({'post': 'start'}),
        name='video-call-start',
    ),
    path(
        'video-calls/<int:pk>/join/',
        views.VideoCallViewSet.as_view({'post': 'join'}),
        name='video-call-join',
    ),
    path(
        'video-calls/<int:pk>/end/',
        views.VideoCallViewSet.as_view({'post': 'end'}),
        name='video-call-end',
    ),

    # ========================================================
    # ADMIN
    # ========================================================

    path(
        'admin/dashboard/',
        views.AdminViewSet.as_view({'get': 'dashboard'}),
        name='admin-dashboard',
    ),

    # ========================================================
    # USER PREFERENCES
    # ========================================================

    path(
        'user-preferences/',
        views.UserPreferenceView.as_view(),
        name='user-preferences',
    ),

        path(
        'payments/checkout/',
        views.CreateCheckoutPaymentView.as_view(),
        name='payment-checkout-create',
    ),

    path(
        'payments/<int:pk>/checkout/',
        views.PaymentCheckoutView.as_view(),
        name='payment-checkout',
    ),

# ========================================================
# FAVORITE DOCTORS
# ========================================================

path(
    'favorites/',
    views.FavoriteDoctorViewSet.as_view({
        'get': 'list',
        'post': 'create',
    }),
    name='favorite-list',
),
path(
    'favorites/<int:pk>/',
    views.FavoriteDoctorViewSet.as_view({
        'get': 'retrieve',
        'delete': 'destroy',
    }),
    name='favorite-detail',
),
path(
    'favorites/by-doctor/',
    views.FavoriteDoctorViewSet.as_view({
        'delete': 'by_doctor',
    }),
    name='favorite-by-doctor',
),

# ========================================================
# SAVED SEARCHES
# ========================================================

path(
    'saved-searches/',
    views.SavedSearchViewSet.as_view({
        'get': 'list',
        'post': 'create',
    }),
    name='saved-search-list',
),
path(
    'saved-searches/<int:pk>/',
    views.SavedSearchViewSet.as_view({
        'get': 'retrieve',
        'patch': 'partial_update',
        'delete': 'destroy',
    }),
    name='saved-search-detail',
),
]

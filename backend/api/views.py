from datetime import datetime, timedelta, timedelta
from uuid import uuid4
import uuid as _uuid

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.db import transaction
from django.db.models import Q, Count, Avg, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend

from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework import status, viewsets, serializers, mixins
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .pagination import StandardPagination
from .permissions import IsPatient, IsDoctor
from django.core.exceptions import ValidationError as DjangoValidationError

def full_clean_or_400(instance):
    try:
        instance.full_clean(exclude=None, validate_unique=True)
    except DjangoValidationError as exc:
        if hasattr(exc, "message_dict"):
            raise serializers.ValidationError(exc.message_dict)
        raise serializers.ValidationError({"detail": exc.messages})

from .models import (
    PatientProfile,
    DoctorProfile,
    DoctorAvailability,
    Appointment,
    MedicalRecord,
    Prescription,
    Notification,
    Review,
    ChatMessage,
    Payment,
    Document,
    SystemLog,
    VideoCall,
    UserPreference,
    FavoriteDoctor,
    SavedSearch,
)

from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    ChangePasswordSerializer,
    ResetPasswordSerializer,
    PatientProfileSerializer,
    DoctorProfileSerializer,
    DoctorAvailabilitySerializer,
    AppointmentSerializer,
    MedicalRecordSerializer,
    PrescriptionSerializer,
    NotificationSerializer,
    ReviewSerializer,
    ChatMessageSerializer,
    PaymentSerializer,
    DocumentSerializer,
    SystemLogSerializer,
    VideoCallSerializer,
    UserPreferenceSerializer,
    FavoriteDoctorSerializer,
    SavedSearchSerializer,
)


User = get_user_model()


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_client_ip(request):
    """
    Get the client's IP address safely.

    NOTE: X-Forwarded-For is client-settable and only trustworthy
    if a reverse proxy (nginx, etc.) overwrites/strips it before
    the app sees it. This value is fine for logging but should not
    be relied on for security decisions (bans, rate limits) unless
    the proxy config is verified to sanitize the header.
    """
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")

    if forwarded:
        return forwarded.split(",")[0].strip()

    return request.META.get("REMOTE_ADDR")


def get_user_role(user):
    """
    Determine the user's application role.

    Priority:
    - superuser -> admin
    - doctor profile -> doctor
    - patient profile -> patient
    - staff without profile -> admin
    - otherwise -> user
    """
    if not user or not user.is_authenticated:
        return "anonymous"

    if user.is_superuser:
        return "admin"

    if hasattr(user, "doctor_profile"):
        return "doctor"

    if hasattr(user, "patient_profile"):
        return "patient"

    if user.is_staff:
        return "admin"

    return "user"


def user_payload(user, request=None):
    """
    Return a safe representation of the authenticated user.
    """
    role = get_user_role(user)

    data = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": user.get_full_name() or user.username,
        "is_active": user.is_active,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "role": role,
    }

    if hasattr(user, "patient_profile"):
        profile = user.patient_profile

        profile_picture = None

        if profile.profile_picture:
            try:
                profile_picture = profile.profile_picture.url

                if request:
                    profile_picture = request.build_absolute_uri(
                        profile_picture
                    )
            except ValueError:
                profile_picture = None

        data["profile"] = {
            "id": profile.id,
            "full_name": profile.full_name,
            "age": profile.age,
            "phone": profile.phone,
            "gender": profile.gender,
            "city": profile.city,
            "state": profile.state,
            "country": profile.country,
            "profile_picture": profile_picture,
        }

    elif hasattr(user, "doctor_profile"):
        profile = user.doctor_profile

        profile_picture = None

        if profile.profile_picture:
            try:
                profile_picture = profile.profile_picture.url

                if request:
                    profile_picture = request.build_absolute_uri(
                        profile_picture
                    )
            except ValueError:
                profile_picture = None

        data["profile"] = {
            "id": profile.id,
            "full_name": profile.full_name,
            "specialization": profile.specialization,
            "hospital": profile.hospital,
            "years_experience": profile.years_experience,
            "consultation_fee": str(profile.consultation_fee),
            "available": profile.available,
            "verification_status": profile.verification_status,
            "is_verified": profile.is_verified,
            "rating": str(profile.rating),
            "total_reviews": profile.total_reviews,
            "profile_picture": profile_picture,
        }

    return data


def log_action(
    request,
    action,
    model_name="",
    object_id="",
    details=None,
    user=None,
):
    """
    Create a SystemLog entry.

    Logging must never break the main request.
    """
    try:
        SystemLog.objects.create(
            user=user or (
                request.user
                if request and request.user.is_authenticated
                else None
            ),
            action=action,
            model_name=model_name,
            object_id=str(object_id or ""),
            details=details or {},
            ip_address=get_client_ip(request) if request else None,
            user_agent=(
                request.META.get("HTTP_USER_AGENT", "")
                if request
                else ""
            ),
        )
    except Exception:
        pass


def create_notification(
    user,
    title,
    message,
    notification_type,
    related_object=None,
    link="",
):
    """
    Create an application notification.

    related_object_id uses the object's numeric database PK.
    """
    related_object_id = None

    if related_object is not None:
        related_object_id = getattr(related_object, "pk", None)

    return Notification.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=notification_type,
        related_object_id=related_object_id,
        link=link or "",
    )


def get_patient(user):
    """
    Return the patient's profile or None.
    """
    return getattr(user, "patient_profile", None)


def get_doctor(user):
    """
    Return the doctor's profile or None.
    """
    return getattr(user, "doctor_profile", None)


# ============================================================
# AUTHENTICATION
# ============================================================

class AuthViewSet(viewsets.ViewSet):
    """
    Authentication and user-account endpoints.
    """

    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in [
            "register",
            "login",
            "reset_password",
        ]:
            return [AllowAny()]

        if self.action == "create_admin":
            return [IsAdminUser()]

        return [IsAuthenticated()]

    # --------------------------------------------------------
    # REGISTER
    # --------------------------------------------------------

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[AllowAny],
    )
    def register(self, request):
        serializer = RegisterSerializer(
            data=request.data,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            user = serializer.save()

            log_action(
                request=request,
                action=SystemLog.Action.CREATE,
                model_name="User",
                object_id=user.id,
                details={
                    "event": "user_registration",
                    "role": get_user_role(user),
                },
                user=user,
            )

        return Response(
            {
                "success": True,
                "message": "Registration successful.",
                "data": {
                    "user": user_payload(user, request)
                },
            },
            status=status.HTTP_201_CREATED,
        )

    # --------------------------------------------------------
    # LOGIN
    # --------------------------------------------------------

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[AllowAny],
    )
    def login(self, request):
        serializer = LoginSerializer(
            data=request.data,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(user)

        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        log_action(
            request=request,
            action=SystemLog.Action.LOGIN,
            model_name="User",
            object_id=user.id,
            details={
                "event": "successful_login",
                "role": get_user_role(user),
            },
            user=user,
        )

        return Response(
            {
                "success": True,
                "message": "Login successful.",
                "data": {
                    "user": user_payload(user, request),
                    "tokens": {
                        "access": access_token,
                        "refresh": refresh_token,
                    },
                },
            },
            status=status.HTTP_200_OK,
        )

    # --------------------------------------------------------
    # CURRENT USER
    # --------------------------------------------------------

    @action(
        detail=False,
        methods=["get"],
        url_path="me",
    )
    def me(self, request):
        return Response(
            {
                "success": True,
                "data": user_payload(request.user, request),
            }
        )

    # --------------------------------------------------------
    # UPDATE CURRENT USER
    # --------------------------------------------------------

    @action(
        detail=False,
        methods=["patch"],
        url_path="update-me",
    )
    def update_me(self, request):
        user = request.user

        allowed_fields = ["first_name", "last_name", "email"]
        updated_fields = []

        for field in allowed_fields:
            if field in request.data:
                setattr(user, field, request.data[field])
                updated_fields.append(field)

        if "email" in updated_fields:
            new_email = request.data["email"]

            if User.objects.filter(email__iexact=new_email).exclude(pk=user.pk).exists():
                return Response(
                    {
                        "success": False,
                        "message": "That email is already in use.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if updated_fields:
            user.save(update_fields=updated_fields)

            log_action(
                request=request,
                action=SystemLog.Action.UPDATE,
                model_name="User",
                object_id=user.id,
                details={
                    "event": "profile_updated",
                    "fields": updated_fields,
                },
            )

        return Response(
            {
                "success": True,
                "message": "Profile updated successfully.",
                "data": user_payload(user, request),
            }
        )

    # --------------------------------------------------------
    # LOGOUT
    # --------------------------------------------------------

    @action(
        detail=False,
        methods=["post"],
    )
    def logout(self, request):
        refresh_token = request.data.get("refresh")

        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except (TokenError, AttributeError):
                pass

        log_action(
            request=request,
            action=SystemLog.Action.LOGOUT,
            model_name="User",
            object_id=request.user.id,
            details={
                "event": "logout",
            },
        )

        return Response(
            {
                "success": True,
                "message": "Logout successful.",
            }
        )

    # --------------------------------------------------------
    # CHANGE PASSWORD
    # --------------------------------------------------------

    @action(
        detail=False,
        methods=["post"],
        url_path="change-password",
    )
    def change_password(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)

        new_password = serializer.validated_data["new_password"]

        user = request.user

        user.set_password(new_password)
        user.save(update_fields=["password"])

        log_action(
            request=request,
            action=SystemLog.Action.SECURITY,
            model_name="User",
            object_id=user.id,
            details={
                "event": "password_changed",
            },
        )

        return Response(
            {
                "success": True,
                "message": "Password changed successfully.",
            }
        )

    # --------------------------------------------------------
    # RESET PASSWORD
    # --------------------------------------------------------

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[AllowAny],
        url_path="reset-password",
    )
    def reset_password(self, request):
        serializer = ResetPasswordSerializer(
            data=request.data,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        user = User.objects.filter(email__iexact=email).first()

        # Do not reveal whether an account exists.
        response_data = {
            "success": True,
            "message": (
                "If an account exists with that email, "
                "password reset instructions will be sent."
            ),
        }

        if user:
            log_action(
                request=request,
                action=SystemLog.Action.SECURITY,
                model_name="User",
                object_id=user.id,
                details={
                    "event": "password_reset_requested",
                },
                user=user,
            )

        return Response(response_data)

    # --------------------------------------------------------
    # CREATE ADMIN
    # --------------------------------------------------------

    @action(
        detail=False,
        methods=["post"],
        url_path="create-admin",
    )
    def create_admin(self, request):
        username = request.data.get("username")
        email = request.data.get("email")
        password = request.data.get("password")

        if not username or not email or not password:
            return Response(
                {
                    "success": False,
                    "message": "username, email and password are required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(username=username).exists():
            return Response(
                {
                    "success": False,
                    "message": "Username already exists.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {
                    "success": False,
                    "message": "Email already exists.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=request.data.get("first_name", ""),
            last_name=request.data.get("last_name", ""),
            is_staff=True,
            is_superuser=bool(request.data.get("is_superuser", False)),
        )

        log_action(
            request=request,
            action=SystemLog.Action.CREATE,
            model_name="User",
            object_id=user.id,
            details={
                "event": "admin_created",
            },
        )

        return Response(
            {
                "success": True,
                "message": "Admin account created successfully.",
                "data": {
                    "user": user_payload(user, request)
                },
            },
            status=status.HTTP_201_CREATED,
        )


# ============================================================
# PATIENTS
# ============================================================

class PatientViewSet(viewsets.ModelViewSet):
    queryset = PatientProfile.objects.select_related("user").all()
    serializer_class = PatientProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.is_staff or user.is_superuser:
            return self.queryset

        patient = get_patient(user)

        if patient:
            return self.queryset.filter(pk=patient.pk)

        return self.queryset.none()

    @action(
        detail=False,
        methods=["get"],
        url_path="dashboard",
    )
    def dashboard(self, request):
        patient = get_patient(request.user)

        if not patient:
            return Response(
                {"success": False, "message": "Patient profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        appointments = Appointment.objects.filter(patient=patient)
        today = timezone.localdate()

        upcoming = (
            appointments
            .filter(appointment_date__gte=today)
            .exclude(status=Appointment.Status.CANCELLED)
            .order_by("appointment_date", "start_time")[:5]
        )

        recent = (
            appointments
            .order_by("-appointment_date", "-start_time")[:5]
        )

        completed = appointments.filter(status=Appointment.Status.COMPLETED)

        statistics = {
            "total_appointments": appointments.count(),
            "upcoming_count": upcoming.count(),
            "completed_count": completed.count(),
            "total_medical_records": MedicalRecord.objects.filter(
                patient=patient
            ).count(),
            "active_prescriptions": Prescription.objects.filter(
                patient=patient,
                is_active=True,
            ).count(),
        }

        return Response(
            {
                "success": True,
                "data": {
                    "profile": PatientProfileSerializer(
                        patient, context={"request": request}
                    ).data,
                    "statistics": statistics,
                    "upcoming_appointments": AppointmentSerializer(
                        upcoming, many=True, context={"request": request}
                    ).data,
                    "recent_appointments": AppointmentSerializer(
                        recent, many=True, context={"request": request}
                    ).data,
                },
            }
        )


class DoctorViewSet(viewsets.ModelViewSet):
    queryset = DoctorProfile.objects.select_related("user").all()
    serializer_class = DoctorProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        """Public read for list/retrieve/available; auth for writes."""
        if self.action in ["list", "retrieve", "available_doctors"]:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user

        # Anonymous / public — only verified & approved doctors
        if not user.is_authenticated:
            return self.queryset.filter(
                verification_status=DoctorProfile.VerificationStatus.APPROVED,
                is_verified=True,
            )

        # Admin / staff — everything
        if user.is_staff or user.is_superuser:
            return self.queryset

        # Doctor — only their own profile
        doctor = get_doctor(user)
        if doctor:
            return self.queryset.filter(pk=doctor.pk)

        # Patient — verified & approved doctors
        return self.queryset.filter(
            verification_status=DoctorProfile.VerificationStatus.APPROVED,
            is_verified=True,
        )

    # --------------------------------------------------------
    # DASHBOARD
    # --------------------------------------------------------

    @action(
        detail=False,
        methods=["get"],
        url_path="dashboard",
    )
    def dashboard(self, request):
        doctor = get_doctor(request.user)

        if not doctor:
            return Response(
                {
                    "success": False,
                    "message": "Doctor profile not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        appointments = doctor.appointments.all()
        today = timezone.localdate()

        today_appointments = appointments.filter(
            appointment_date=today
        )

        upcoming = appointments.filter(
            appointment_date__gte=today,
        ).exclude(
            status=Appointment.Status.CANCELLED
        )

        completed = appointments.filter(
            status=Appointment.Status.COMPLETED
        )

        pending = appointments.filter(
            status=Appointment.Status.PENDING
        )

        unread_messages = ChatMessage.objects.filter(
            receiver=request.user,
            is_read=False,
        ).count()

        patient_count = appointments.values(
            "patient"
        ).distinct().count()

        recent_appointments = appointments.select_related(
            "patient",
            "patient__user",
        ).order_by(
            "-appointment_date",
            "-start_time",
        )[:5]

        return Response(
            {
                "success": True,
                "data": {
                    "doctor": DoctorProfileSerializer(
                        doctor,
                        context={"request": request},
                    ).data,
                    "statistics": {
                        "total_appointments": appointments.count(),
                        "today_appointments": today_appointments.count(),
                        "upcoming_appointments": upcoming.count(),
                        "completed_appointments": completed.count(),
                        "pending_appointments": pending.count(),
                        "total_patients": patient_count,
                        "unread_messages": unread_messages,
                        "rating": str(doctor.rating),
                        "total_reviews": doctor.total_reviews,
                    },
                    "recent_appointments": AppointmentSerializer(
                        recent_appointments,
                        many=True,
                        context={"request": request},
                    ).data,
                },
            }
        )

    # --------------------------------------------------------
    # AVAILABLE DOCTORS — public
    # --------------------------------------------------------

    @action(
        detail=False,
        methods=["get"],
        url_path="available",
    )
    def available_doctors(self, request):
        queryset = DoctorProfile.objects.select_related("user").filter(
            verification_status=DoctorProfile.VerificationStatus.APPROVED,
            is_verified=True,
            available=True,
        )

        specialization = request.query_params.get("specialization")
        if specialization:
            queryset = queryset.filter(
                specialization__iexact=specialization
            )

        search = request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(user__username__icontains=search)
                | Q(specialization__icontains=search)
                | Q(hospital__icontains=search)
            )

        queryset = queryset.order_by("-rating", "-total_reviews")

        return Response(
            {
                "success": True,
                "data": DoctorProfileSerializer(
                    queryset,
                    many=True,
                    context={"request": request},
                ).data,
            }
        )

    # --------------------------------------------------------
    # UPDATE AVAILABILITY (doctor toggles on/off)
    # --------------------------------------------------------

    @action(
        detail=False,
        methods=["post", "patch"],
        url_path="availability",
    )
    def update_availability(self, request):
        doctor = get_doctor(request.user)

        if not doctor:
            return Response(
                {
                    "success": False,
                    "message": "Doctor profile not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        data = request.data.copy()
        data["doctor"] = doctor.pk

        serializer = DoctorAvailabilitySerializer(
            data=data,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)

        day = serializer.validated_data["day_of_week"]

        try:
            availability = DoctorAvailability.objects.get(
                doctor=doctor, day_of_week=day,
            )
            created = False
        except DoctorAvailability.DoesNotExist:
            availability = DoctorAvailability(
                doctor=doctor, day_of_week=day,
            )
            created = True

        availability.start_time = serializer.validated_data["start_time"]
        availability.end_time = serializer.validated_data["end_time"]
        availability.is_available = serializer.validated_data.get(
            "is_available", True
        )

        full_clean_or_400(availability)
        availability.save()

        log_action(
            request=request,
            action=SystemLog.Action.UPDATE,
            model_name="DoctorAvailability",
            object_id=availability.pk,
            details={
                "doctor_id": doctor.pk,
                "day_of_week": availability.day_of_week,
            },
        )

        return Response(
            {
                "success": True,
                "message": (
                    "Availability created successfully."
                    if created
                    else "Availability updated successfully."
                ),
                "data": DoctorAvailabilitySerializer(
                    availability,
                    context={"request": request},
                ).data,
            }
        )

    # --------------------------------------------------------
    # PENDING VERIFICATIONS (admin only)
    # --------------------------------------------------------

    @action(
        detail=False,
        methods=["get"],
        url_path="pending",
    )
    def pending_verification(self, request):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {
                    "success": False,
                    "message": "Only administrators can view pending verifications.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        queryset = DoctorProfile.objects.select_related("user").filter(
            verification_status=DoctorProfile.VerificationStatus.PENDING,
        ).order_by("user__date_joined")

        return Response(
            {
                "success": True,
                "data": DoctorProfileSerializer(
                    queryset,
                    many=True,
                    context={"request": request},
                ).data,
            }
        )

    # --------------------------------------------------------
    # APPROVE DOCTOR (admin only)
    # --------------------------------------------------------

    @action(
        detail=True,
        methods=["post"],
    )
    def approve(self, request, pk=None):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {
                    "success": False,
                    "message": "Only administrators can approve doctors.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        doctor = self.get_object()

        doctor.verification_status = DoctorProfile.VerificationStatus.APPROVED
        doctor.is_verified = True

        doctor.save(
            update_fields=[
                "verification_status",
                "is_verified",
                "updated_at",
            ]
        )

        create_notification(
            user=doctor.user,
            title="Profile Verified!",
            message=(
                "Your doctor profile has been verified. You can "
                "now accept appointments."
            ),
            notification_type=Notification.NotificationType.SYSTEM,
        )

        log_action(
            request=request,
            action=SystemLog.Action.VERIFY,
            model_name="DoctorProfile",
            object_id=doctor.pk,
            details={
                "event": "doctor_approved",
                "doctor_id": doctor.pk,
            },
        )

        return Response(
            {
                "success": True,
                "message": "Doctor approved successfully.",
                "data": DoctorProfileSerializer(
                    doctor,
                    context={"request": request},
                ).data,
            }
        )

    # --------------------------------------------------------
    # REJECT DOCTOR (admin only)
    # --------------------------------------------------------

    @action(
        detail=True,
        methods=["post"],
    )
    def reject(self, request, pk=None):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {
                    "success": False,
                    "message": "Only administrators can reject doctors.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        doctor = self.get_object()

        doctor.verification_status = DoctorProfile.VerificationStatus.REJECTED
        doctor.is_verified = False

        doctor.save(
            update_fields=[
                "verification_status",
                "is_verified",
                "updated_at",
            ]
        )

        create_notification(
            user=doctor.user,
            title="Profile Verification Failed",
            message=(
                "Your doctor profile verification was not approved. "
                "Please contact support for details."
            ),
            notification_type=Notification.NotificationType.SYSTEM,
        )

        log_action(
            request=request,
            action=SystemLog.Action.VERIFY,
            model_name="DoctorProfile",
            object_id=doctor.pk,
            details={
                "event": "doctor_rejected",
                "doctor_id": doctor.pk,
            },
        )

        return Response(
            {
                "success": True,
                "message": "Doctor rejected.",
                "data": DoctorProfileSerializer(
                    doctor,
                    context={"request": request},
                ).data,
            }
        )


# ============================================================
# DOCTOR AVAILABILITY
# ============================================================

class DoctorAvailabilityViewSet(viewsets.ModelViewSet):
    queryset = DoctorAvailability.objects.select_related(
        "doctor",
        "doctor__user",
    ).all()

    serializer_class = DoctorAvailabilitySerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user

        if user.is_authenticated and (user.is_staff or user.is_superuser):
            queryset = self.queryset
        elif user.is_authenticated and get_doctor(user):
            queryset = self.queryset.filter(doctor=get_doctor(user))
        else:
            queryset = self.queryset.filter(
                doctor__verification_status=(
                    DoctorProfile.VerificationStatus.APPROVED
                ),
                doctor__is_verified=True,
            )

        doctor_id = self.request.query_params.get("doctor")

        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)

        return queryset

    def create(self, request, *args, **kwargs):
        doctor = get_doctor(request.user)

        if not doctor and not request.user.is_staff:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Only doctors or administrators "
                        "can manage availability."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data.copy()

        if doctor:
            data["doctor"] = doctor.pk

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        doctor_instance = (
            doctor or serializer.validated_data["doctor"]
        )

        day = serializer.validated_data["day_of_week"]

        try:
            availability = DoctorAvailability.objects.get(
                doctor=doctor_instance, day_of_week=day,
            )
            created = False
        except DoctorAvailability.DoesNotExist:
            availability = DoctorAvailability(
                doctor=doctor_instance, day_of_week=day,
            )
            created = True

        availability.start_time = serializer.validated_data["start_time"]
        availability.end_time = serializer.validated_data["end_time"]
        availability.is_available = serializer.validated_data.get(
            "is_available", True
        )

        full_clean_or_400(availability)
        availability.save()

        return Response(
            {
                "success": True,
                "message": (
                    "Availability created."
                    if created
                    else "Availability updated."
                ),
                "data": self.get_serializer(availability).data,
            },
            status=(
                status.HTTP_201_CREATED
                if created
                else status.HTTP_200_OK
            ),
        )


# ============================================================
# APPOINTMENTS
# ============================================================

class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.select_related(
        "patient",
        "patient__user",
        "doctor",
        "doctor__user",
    ).all()

    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.is_staff or user.is_superuser:
            return self.queryset

        patient = get_patient(user)
        doctor = get_doctor(user)

        if patient:
            return self.queryset.filter(patient=patient)

        if doctor:
            return self.queryset.filter(doctor=doctor)

        return self.queryset.none()

    # --------------------------------------------------------
    # CREATE APPOINTMENT
    # --------------------------------------------------------

    def create(self, request, *args, **kwargs):
        patient = get_patient(request.user)

        if not patient and not (
            request.user.is_staff
            or request.user.is_superuser
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "Only patients or administrators "
                        "can create appointments."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data.copy()

        if patient:
            data["patient"] = patient.pk

        serializer = self.get_serializer(
            data=data,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)

        doctor = serializer.validated_data.get("doctor")

        if not doctor:
            return Response(
                {
                    "success": False,
                    "message": "A doctor is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


        # serializer.create() handles slot locking + full_clean()
        appointment = serializer.save()

        create_notification(
            user=doctor.user,
            title="New Appointment",
            message=(
                f"You have a new appointment request "
                f"from {appointment.patient.full_name}."
            ),
            notification_type=(
                Notification.NotificationType.APPOINTMENT
            ),
            related_object=appointment,
            link=f"/appointments/{appointment.pk}",
        )

        create_notification(
            user=appointment.patient.user,
            title="Appointment Requested",
            message=(
                "Your appointment request has been "
                "submitted successfully."
            ),
            notification_type=(
                Notification.NotificationType.APPOINTMENT
            ),
            related_object=appointment,
            link=f"/appointments/{appointment.pk}",
        )

        log_action(
            request=request,
            action=SystemLog.Action.APPOINTMENT,
            model_name="Appointment",
            object_id=appointment.appointment_id,
            details={
                "event": "appointment_created",
                "appointment_pk": appointment.pk,
                "doctor_id": doctor.pk,
                "patient_id": appointment.patient.pk,
            },
        )

        return Response(
            {
                "success": True,
                "message": "Appointment created successfully.",
                "data": self.get_serializer(appointment).data,
            },
            status=status.HTTP_201_CREATED,
        )

    # --------------------------------------------------------
    # CONFIRM
    # --------------------------------------------------------

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        appointment = self.get_object()

        doctor = get_doctor(request.user)

        if not (
            request.user.is_staff
            or request.user.is_superuser
            or (doctor and appointment.doctor_id == doctor.id)
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "Only the assigned doctor or "
                        "administrator can confirm this appointment."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != Appointment.Status.PENDING:
            return Response(
                {
                    "success": False,
                    "message": "Only pending appointments can be confirmed.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = Appointment.Status.CONFIRMED
        appointment.save(update_fields=["status", "updated_at"])

        create_notification(
            user=appointment.patient.user,
            title="Appointment Confirmed",
            message="Your doctor has confirmed your appointment.",
            notification_type=(
                Notification.NotificationType.APPOINTMENT
            ),
            related_object=appointment,
            link=f"/appointments/{appointment.pk}",
        )

        log_action(
            request=request,
            action=SystemLog.Action.APPOINTMENT,
            model_name="Appointment",
            object_id=appointment.appointment_id,
            details={"event": "appointment_confirmed"},
        )

        return Response(
            {
                "success": True,
                "message": "Appointment confirmed.",
                "data": self.get_serializer(appointment).data,
            }
        )

    # --------------------------------------------------------
    # START
    # --------------------------------------------------------

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        appointment = self.get_object()

        doctor = get_doctor(request.user)

        is_participant = (
            request.user == appointment.patient.user
            or (doctor and appointment.doctor_id == doctor.id)
        )

        if not (
            is_participant
            or request.user.is_staff
            or request.user.is_superuser
        ):
            return Response(
                {
                    "success": False,
                    "message": "You are not a participant.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status not in [
            Appointment.Status.CONFIRMED,
            Appointment.Status.IN_PROGRESS,
        ]:
            return Response(
                {
                    "success": False,
                    "message": "Only confirmed appointments can be started.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()

        appointment.status = Appointment.Status.IN_PROGRESS

        if not appointment.call_started_at:
            appointment.call_started_at = now

        if not appointment.call_id:
            appointment.call_id = str(uuid4())

        if (
            appointment.consultation_type
            == Appointment.ConsultationType.VIDEO
            and not appointment.meeting_link
        ):
            appointment.meeting_link = f"/video-call/{appointment.pk}/"

        appointment.save(
            update_fields=[
                "status",
                "call_started_at",
                "call_id",
                "meeting_link",
                "updated_at",
            ]
        )

        if (
            appointment.consultation_type
            == Appointment.ConsultationType.VIDEO
        ):
            video_call, created = VideoCall.objects.get_or_create(
                appointment=appointment,
                defaults={
                    "patient": appointment.patient,
                    "doctor": appointment.doctor,
                    "status": VideoCall.Status.ACTIVE,
                    "started_at": now,
                },
            )

            if not created:
                video_call.status = VideoCall.Status.ACTIVE

                if not video_call.started_at:
                    video_call.started_at = now

                video_call.save(
                    update_fields=[
                        "status",
                        "started_at",
                        "updated_at",
                    ]
                )

        create_notification(
            user=(
                appointment.patient.user
                if request.user != appointment.patient.user
                else appointment.doctor.user
            ),
            title="Appointment Started",
            message="Your telemedicine appointment has started.",
            notification_type=(
                Notification.NotificationType.APPOINTMENT
            ),
            related_object=appointment,
            link=f"/appointments/{appointment.pk}",
        )

        return Response(
            {
                "success": True,
                "message": "Appointment started.",
                "data": self.get_serializer(appointment).data,
            }
        )

    # --------------------------------------------------------
    # COMPLETE
    # --------------------------------------------------------

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        try:
            from payments.models import Transaction, DoctorWallet
            transaction = appointment.transaction
            if transaction.status == "success":
                wallet, _ = DoctorWallet.objects.get_or_create(doctor=appointment.doctor)
                wallet.pending_balance -= transaction.doctor_share
                wallet.available_balance += transaction.doctor_share
                wallet.save()
        except Exception:
            pass
        appointment = self.get_object()

        doctor = get_doctor(request.user)

        if not (
            request.user.is_staff
            or request.user.is_superuser
            or (doctor and appointment.doctor_id == doctor.id)
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "Only the assigned doctor or "
                        "administrator can complete this appointment."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status not in [
            Appointment.Status.CONFIRMED,
            Appointment.Status.IN_PROGRESS,
        ]:
            return Response(
                {
                    "success": False,
                    "message": (
                        "This appointment cannot be completed "
                        "in its current state."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = Appointment.Status.COMPLETED
        appointment.completed_at = timezone.now()

        appointment.save(
            update_fields=["status", "completed_at", "updated_at"]
        )

        video_call = getattr(appointment, "video_call", None)

        if video_call and video_call.status == VideoCall.Status.ACTIVE:
            video_call.status = VideoCall.Status.ENDED
            video_call.ended_at = timezone.now()
            video_call.save(
                update_fields=["status", "ended_at", "updated_at"]
            )

        create_notification(
            user=appointment.patient.user,
            title="Appointment Completed",
            message="Your appointment has been marked as completed.",
            notification_type=(
                Notification.NotificationType.APPOINTMENT
            ),
            related_object=appointment,
            link=f"/appointments/{appointment.pk}",
        )

        log_action(
            request=request,
            action=SystemLog.Action.APPOINTMENT,
            model_name="Appointment",
            object_id=appointment.appointment_id,
            details={"event": "appointment_completed"},
        )

        return Response(
            {
                "success": True,
                "message": "Appointment completed.",
                "data": self.get_serializer(appointment).data,
            }
        )

    # --------------------------------------------------------
    # CANCEL
    # --------------------------------------------------------

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        appointment = self.get_object()

        patient = get_patient(request.user)
        doctor = get_doctor(request.user)

        allowed = (
            request.user.is_staff
            or request.user.is_superuser
            or (patient and appointment.patient_id == patient.id)
            or (doctor and appointment.doctor_id == doctor.id)
        )

        if not allowed:
            return Response(
                {
                    "success": False,
                    "message": "You cannot cancel this appointment.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status in [
            Appointment.Status.COMPLETED,
            Appointment.Status.CANCELLED,
        ]:
            return Response(
                {
                    "success": False,
                    "message": "This appointment cannot be cancelled.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = Appointment.Status.CANCELLED
        appointment.save(update_fields=["status", "updated_at"])

        create_notification(
            user=(
                appointment.doctor.user
                if request.user == appointment.patient.user
                else appointment.patient.user
            ),
            title="Appointment Cancelled",
            message="An appointment has been cancelled.",
            notification_type=(
                Notification.NotificationType.APPOINTMENT
            ),
            related_object=appointment,
            link=f"/appointments/{appointment.pk}",
        )

        log_action(
            request=request,
            action=SystemLog.Action.APPOINTMENT,
            model_name="Appointment",
            object_id=appointment.appointment_id,
            details={
                "event": "appointment_cancelled",
                "cancelled_by": request.user.id,
            },
        )

        return Response(
            {
                "success": True,
                "message": "Appointment cancelled.",
                "data": self.get_serializer(appointment).data,
            }
        )

    # --------------------------------------------------------
    # UPCOMING
    # --------------------------------------------------------

    @action(detail=False, methods=["get"])
    def upcoming(self, request):
        queryset = self.get_queryset().filter(
            appointment_date__gte=timezone.localdate(),
            status__in=[
                Appointment.Status.PENDING,
                Appointment.Status.CONFIRMED,
                Appointment.Status.IN_PROGRESS,
            ],
        )

        return Response(
            {
                "success": True,
                "data": self.get_serializer(queryset, many=True).data,
            }
        )

    # --------------------------------------------------------
    # HISTORY
    # --------------------------------------------------------

    @action(detail=False, methods=["get"])
    def history(self, request):
        queryset = self.get_queryset().filter(
            status__in=[
                Appointment.Status.COMPLETED,
                Appointment.Status.CANCELLED,
            ]
        )

        return Response(
            {
                "success": True,
                "data": self.get_serializer(queryset, many=True).data,
            }
        )


# ============================================================
# MEDICAL RECORDS
# ============================================================

class MedicalRecordViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = MedicalRecordSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        user = self.request.user

        appointment_id = self.request.query_params.get("appointment")

        if hasattr(user, "patient_profile"):
            qs = MedicalRecord.objects.filter(patient=user.patient_profile)
        elif hasattr(user, "doctor_profile"):
            qs = MedicalRecord.objects.filter(doctor=user.doctor_profile)
        elif user.is_staff or user.is_superuser:
            qs = MedicalRecord.objects.all()
        else:
            return MedicalRecord.objects.none()

        if appointment_id:
            qs = qs.filter(appointment_id=appointment_id)

        return qs.select_related(
            "patient__user", "doctor__user", "appointment"
        ).order_by("-record_date")

    def perform_create(self, serializer):
        user = self.request.user

        if not (
            user.is_staff
            or user.is_superuser
            or hasattr(user, "doctor_profile")
        ):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(
                "Only doctors or admins can create medical records."
            )

        doctor = user.doctor_profile if hasattr(user, "doctor_profile") else None

        appointment = serializer.validated_data.get("appointment")
        patient = serializer.validated_data.get("patient")

        if appointment and not patient:
            patient = appointment.patient

        serializer.save(doctor=doctor, patient=patient)

    def update(self, request, *args, **kwargs):
        user = request.user
        instance = self.get_object()

        is_owner = (
            hasattr(user, "doctor_profile")
            and instance.doctor_id == user.doctor_profile.id
        )
        is_admin = user.is_staff or user.is_superuser

        if not (is_owner or is_admin):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(
                "Only the attending doctor can edit this record."
            )

        return super().update(request, *args, **kwargs)


# ============================================================
# PRESCRIPTIONS
# ============================================================

class PrescriptionViewSet(viewsets.ModelViewSet):
    queryset = Prescription.objects.select_related(
        "patient",
        "patient__user",
        "doctor",
        "doctor__user",
        "appointment",
        "medical_record",
    ).all()

    serializer_class = PrescriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.is_staff or user.is_superuser:
            return self.queryset

        patient = get_patient(user)
        doctor = get_doctor(user)

        if patient:
            return self.queryset.filter(patient=patient)

        if doctor:
            return self.queryset.filter(doctor=doctor)

        return self.queryset.none()

    def create(self, request, *args, **kwargs):
        doctor = get_doctor(request.user)

        if not (
            doctor
            or request.user.is_staff
            or request.user.is_superuser
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "Only doctors or administrators "
                        "can issue prescriptions."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data.copy()

        appointment = None
        appointment_id = data.get("appointment")

        if appointment_id:
            try:
                appointment = Appointment.objects.select_related(
                    "doctor",
                ).get(pk=appointment_id)
            except Appointment.DoesNotExist:
                return Response(
                    {
                        "success": False,
                        "message": "Appointment not found.",
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            if doctor and appointment.doctor_id != doctor.id:
                return Response(
                    {
                        "success": False,
                        "message": (
                            "You are not the doctor assigned "
                            "to this appointment."
                        ),
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            data["patient"] = appointment.patient.pk

            if not data.get("doctor"):
                data["doctor"] = appointment.doctor.pk

        elif doctor:
            data["doctor"] = doctor.pk

        serializer = self.get_serializer(
            data=data,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            prescription = serializer.save()

            create_notification(
                user=prescription.patient.user,
                title="New Prescription",
                message="A new prescription has been issued for you.",
                notification_type=(
                    Notification.NotificationType.PRESCRIPTION
                ),
                related_object=prescription,
                link=f"/prescriptions/{prescription.pk}",
            )

            log_action(
                request=request,
                action=SystemLog.Action.CREATE,
                model_name="Prescription",
                object_id=prescription.pk,
                details={
                    "event": "prescription_created",
                    "patient_id": prescription.patient_id,
                    "doctor_id": prescription.doctor_id,
                },
            )

        return Response(
            {
                "success": True,
                "message": "Prescription created successfully.",
                "data": self.get_serializer(prescription).data,
            },
            status=status.HTTP_201_CREATED,
        )


# ============================================================
# NOTIFICATIONS
# ============================================================

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Notification.objects.none()
        return Notification.objects.filter(
            user=self.request.user
        ).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(
        detail=True,
        methods=["post"],
        url_path="mark-read",
    )
    def mark_read(self, request, pk=None):
        notification = self.get_object()

        notification.mark_read()

        return Response(
            {
                "success": True,
                "message": "Notification marked as read.",
                "data": self.get_serializer(notification).data,
            }
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="mark-all-read",
    )
    def mark_all_read(self, request):
        now = timezone.now()

        updated = Notification.objects.filter(
            user=request.user,
            is_read=False,
        ).update(is_read=True, read_at=now)

        return Response(
            {
                "success": True,
                "message": "All notifications marked as read.",
                "data": {"updated": updated},
            }
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="unread",
    )
    def unread(self, request):
        queryset = self.get_queryset().filter(is_read=False)

        return Response(
            {
                "success": True,
                "data": self.get_serializer(queryset, many=True).data,
            }
        )


# ============================================================
# REVIEWS
# ============================================================

class ReviewViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ReviewSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        user = self.request.user

        doctor_id = self.request.query_params.get("doctor")
        if doctor_id:
            return Review.objects.filter(
                doctor_id=doctor_id
            ).select_related(
                "patient__user", "doctor__user"
            ).order_by("-created_at")

        if hasattr(user, "patient_profile"):
            return Review.objects.filter(
                patient=user.patient_profile
            ).order_by("-created_at")

        if hasattr(user, "doctor_profile"):
            return Review.objects.filter(
                doctor=user.doctor_profile
            ).order_by("-created_at")

        if user.is_staff or user.is_superuser:
            return Review.objects.all().order_by("-created_at")

        return Review.objects.none()

    def perform_create(self, serializer):
        appointment_id = self.request.data.get("appointment")

        if not appointment_id:
            raise serializers.ValidationError({
                "appointment": "Appointment is required."
            })

        try:
            appointment = Appointment.objects.select_related(
                "patient", "doctor"
            ).get(pk=appointment_id)
        except Appointment.DoesNotExist:
            raise serializers.ValidationError({
                "appointment": "Appointment not found."
            })

        if appointment.patient.user_id != self.request.user.id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(
                "You can only review your own appointments."
            )

        if appointment.status != Appointment.Status.COMPLETED:
            raise serializers.ValidationError({
                "appointment": (
                    "Only completed appointments can be reviewed."
                )
            })

        if Review.objects.filter(appointment=appointment).exists():
            raise serializers.ValidationError({
                "appointment": (
                    "This appointment has already been reviewed."
                )
            })

        review = serializer.save(
            patient=appointment.patient,
            doctor=appointment.doctor,
            appointment=appointment,
        )

        doctor = review.doctor
        stats = Review.objects.filter(doctor=doctor).aggregate(
            avg=Avg("rating"),
            count=Count("id"),
        )
        doctor.rating = round(stats["avg"] or 0, 2)
        doctor.total_reviews = stats["count"] or 0
        doctor.save(update_fields=["rating", "total_reviews"])

        try:
            Notification.objects.create(
                user=doctor.user,
                notification_type="review",
                title="New Review Received",
                message=(
                    f"{review.patient.full_name if not review.is_anonymous else 'A patient'} "
                    f"rated you {review.rating}/5."
                ),
            )
        except Exception:
            pass


# ============================================================
# CHAT MESSAGES
# ============================================================

class ChatMessageViewSet(viewsets.ModelViewSet):
    queryset = ChatMessage.objects.select_related(
        "sender",
        "receiver",
        "appointment",
    ).all()

    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        queryset = self.queryset.filter(
            Q(sender=user) | Q(receiver=user)
        )

        appointment_id = self.request.query_params.get("appointment")

        if appointment_id:
            queryset = queryset.filter(appointment_id=appointment_id)

        return queryset.order_by("created_at")

    def create(self, request, *args, **kwargs):
        data = request.data.copy()

        data["sender"] = request.user.pk

        receiver_id = data.get("receiver")

        if not receiver_id:
            return Response(
                {
                    "success": False,
                    "message": "Receiver is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            receiver = User.objects.get(pk=receiver_id)
        except User.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "Receiver not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if receiver.pk == request.user.pk:
            return Response(
                {
                    "success": False,
                    "message": "You cannot send a message to yourself.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment = None
        appointment_id = data.get("appointment")

        if appointment_id:
            try:
                appointment = Appointment.objects.select_related(
                    "patient__user",
                    "doctor__user",
                ).get(pk=appointment_id)
            except Appointment.DoesNotExist:
                return Response(
                    {
                        "success": False,
                        "message": "Appointment not found.",
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            allowed_users = {
                appointment.patient.user_id,
                appointment.doctor.user_id,
            }

            if request.user.is_staff:
                allowed_users.add(request.user.id)

            if (
                request.user.id not in allowed_users
                or receiver.id not in allowed_users
            ):
                return Response(
                    {
                        "success": False,
                        "message": (
                            "You are not authorized to "
                            "use this appointment chat."
                        ),
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
        else:
            # No appointment → only allow doctor↔their patient or admin
            is_allowed = request.user.is_staff or request.user.is_superuser

            if not is_allowed:
                if hasattr(request.user, "doctor_profile"):
                    is_allowed = Appointment.objects.filter(
                        doctor=request.user.doctor_profile,
                        patient__user=receiver,
                    ).exists()
                elif hasattr(request.user, "patient_profile"):
                    is_allowed = Appointment.objects.filter(
                        patient=request.user.patient_profile,
                        doctor__user=receiver,
                    ).exists()

            if not is_allowed:
                return Response(
                    {
                        "success": False,
                        "message": (
                            "You can only message your "
                            "patients or doctors."
                        ),
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        serializer = self.get_serializer(
            data=data,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            message = serializer.save(sender=request.user)

            create_notification(
                user=receiver,
                title="New Message",
                message="You have received a new message.",
                notification_type=(
                    Notification.NotificationType.MESSAGE
                ),
                related_object=appointment if appointment else None,
                link=f"/messages/{message.pk}",
            )

        return Response(
            {
                "success": True,
                "message": "Message sent successfully.",
                "data": self.get_serializer(message).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="mark-read",
    )
    def mark_read(self, request, pk=None):
        message = self.get_object()

        if message.receiver_id != request.user.id:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Only the receiver can mark "
                        "this message as read."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        message.mark_read()

        return Response(
            {
                "success": True,
                "message": "Message marked as read.",
                "data": self.get_serializer(message).data,
            }
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="unread-count",
    )
    def unread_count(self, request):
        count = self.get_queryset().filter(
            receiver=request.user,
            is_read=False,
        ).count()

        return Response(
            {
                "success": True,
                "data": {"count": count},
            }
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="conversation",
    )
    def conversation(self, request):
        other_user_id = request.query_params.get("user")

        if not other_user_id:
            return Response(
                {
                    "success": False,
                    "message": "The user parameter is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = self.get_queryset().filter(
            Q(sender=request.user, receiver_id=other_user_id)
            | Q(sender_id=other_user_id, receiver=request.user)
        )

        return Response(
            {
                "success": True,
                "data": self.get_serializer(queryset, many=True).data,
            }
        )


# ============================================================
# PAYMENTS
# ============================================================

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related(
        "patient",
        "patient__user",
        "appointment",
        "appointment__doctor",
    ).all()

    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.is_staff or user.is_superuser:
            return self.queryset

        patient = get_patient(user)

        if patient:
            return self.queryset.filter(patient=patient)

        doctor = get_doctor(user)

        if doctor:
            return self.queryset.filter(appointment__doctor=doctor)

        return self.queryset.none()

    def create(self, request, *args, **kwargs):
        patient = get_patient(request.user)

        if not (
            patient
            or request.user.is_staff
            or request.user.is_superuser
        ):
            return Response(
                {
                    "success": False,
                    "message": (
                        "Only patients or administrators "
                        "can create payments."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data.copy()
        appointment_id = data.get("appointment")

        if not appointment_id:
            return Response(
                {
                    "success": False,
                    "message": "Appointment is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            appointment = Appointment.objects.select_related(
                "patient",
                "doctor",
            ).get(pk=appointment_id)
        except Appointment.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "Appointment not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if patient and appointment.patient_id != patient.id:
            return Response(
                {
                    "success": False,
                    "message": (
                        "You cannot make a payment for "
                        "another patient's appointment."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status == Appointment.Status.CANCELLED:
            return Response(
                {
                    "success": False,
                    "message": "Cancelled appointments cannot be paid for.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        data["patient"] = appointment.patient.pk

        if not data.get("amount"):
            data["amount"] = str(appointment.doctor.consultation_fee)

        if not data.get("currency"):
            data["currency"] = "NGN"

        if not data.get("transaction_reference"):
            data["transaction_reference"] = (
                f"TXN-{uuid4().hex[:16].upper()}"
            )

        data["payment_status"] = Payment.PaymentStatus.PENDING
        data["is_paid"] = False

        serializer = self.get_serializer(
            data=data,
            context={"request": request},
        )

        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            payment = serializer.save()

            log_action(
                request=request,
                action=SystemLog.Action.PAYMENT,
                model_name="Payment",
                object_id=payment.pk,
                details={
                    "event": "payment_created",
                    "amount": str(payment.amount),
                    "currency": payment.currency,
                    "appointment_id": appointment.pk,
                },
            )

        return Response(
            {
                "success": True,
                "message": "Payment request created successfully.",
                "data": self.get_serializer(payment).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="mark-paid",
    )
    def mark_paid(self, request, pk=None):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {
                    "success": False,
                    "message": "Only administrators can mark payments as paid.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        payment = self.get_object()

        payment.payment_status = Payment.PaymentStatus.PAID
        payment.is_paid = True
        payment.paid_at = timezone.now()

        payment.save(
            update_fields=[
                "payment_status",
                "is_paid",
                "paid_at",
                "updated_at",
            ]
        )

        appointment = payment.appointment

        appointment.payment_status = Appointment.PaymentStatus.PAID
        appointment.is_paid = True

        appointment.save(
            update_fields=["payment_status", "is_paid", "updated_at"]
        )

        create_notification(
            user=payment.patient.user,
            title="Payment Successful",
            message="Your appointment payment has been confirmed.",
            notification_type=(
                Notification.NotificationType.PAYMENT
            ),
            related_object=payment,
            link=f"/payments/{payment.pk}",
        )

        return Response(
            {
                "success": True,
                "message": "Payment marked as paid.",
                "data": self.get_serializer(payment).data,
            }
        )


# ============================================================
# DOCUMENTS
# ============================================================

class DocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentSerializer
    pagination_class = StandardPagination
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        user = self.request.user

        doc_type = self.request.query_params.get("document_type")
        patient_id = self.request.query_params.get("patient")
        appointment_id = self.request.query_params.get("appointment")

        if hasattr(user, "patient_profile"):
            qs = Document.objects.filter(patient=user.patient_profile)
        elif hasattr(user, "doctor_profile"):
            patient_ids = Appointment.objects.filter(
                doctor=user.doctor_profile
            ).values_list("patient_id", flat=True).distinct()
            qs = Document.objects.filter(patient_id__in=patient_ids)
        elif user.is_staff or user.is_superuser:
            qs = Document.objects.all()
        else:
            return Document.objects.none()

        if doc_type:
            qs = qs.filter(document_type=doc_type)
        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        if appointment_id:
            qs = qs.filter(appointment_id=appointment_id)

        return qs.select_related(
            "patient__user", "uploaded_by", "appointment"
        ).order_by("-created_at")

    def create(self, request, *args, **kwargs):
        user = request.user

        if not (
            hasattr(user, "patient_profile")
            or hasattr(user, "doctor_profile")
            or user.is_staff
            or user.is_superuser
        ):
            return Response(
                {"success": False, "message": "Permission denied"},
                status=status.HTTP_403_FORBIDDEN,
            )

        file = request.FILES.get("file")
        if not file:
            return Response(
                {"success": False, "message": "A file is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        max_size = 20 * 1024 * 1024
        if file.size > max_size:
            return Response(
                {"success": False, "message": "File exceeds 20 MB limit"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Basic MIME allowlist (client-supplied header; add
        # python-magic for stronger server-side detection if needed).
        allowed_mime = {
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp",
        }
        if file.content_type not in allowed_mime:
            return Response(
                {"success": False, "message": "Unsupported file type"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = request.data.copy()

        if hasattr(user, "patient_profile"):
            data["patient"] = user.patient_profile.id

        elif hasattr(user, "doctor_profile"):
            if not data.get("patient"):
                return Response(
                    {"success": False, "message": "Patient ID is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            patient_ok = Appointment.objects.filter(
                doctor=user.doctor_profile,
                patient_id=data["patient"],
            ).exists()
            if not patient_ok:
                return Response(
                    {
                        "success": False,
                        "message": "You do not have access to this patient.",
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        data["uploaded_by"] = user.id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        document = serializer.save(uploaded_by=user)

        return Response(
            {
                "success": True,
                "message": "Document uploaded successfully",
                "data": self.get_serializer(document).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user

        is_owner = instance.uploaded_by_id == user.id
        is_admin = user.is_staff or user.is_superuser
        is_patient_owner = (
            hasattr(user, "patient_profile")
            and instance.patient_id == user.patient_profile.id
        )

        if not (is_owner or is_admin or is_patient_owner):
            return Response(
                {
                    "success": False,
                    "message": "You cannot delete this document.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().destroy(request, *args, **kwargs)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated],
    )
    def verify(self, request, pk=None):
        """Mark a document as verified (doctor or admin)."""
        user = request.user

        if not (
            hasattr(user, "doctor_profile")
            or user.is_staff
            or user.is_superuser
        ):
            return Response(
                {
                    "success": False,
                    "message": "Only doctors or admins can verify.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        document = self.get_object()
        document.is_verified = True
        document.verified_at = timezone.now()
        document.verified_by = user
        document.save(
            update_fields=["is_verified", "verified_at", "verified_by"]
        )

        return Response(
            {
                "success": True,
                "message": "Document verified",
                "data": self.get_serializer(document).data,
            }
        )


# ============================================================
# SYSTEM LOGS
# ============================================================

class SystemLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    System logs are read-only through the API.

    Application events should create logs through log_action().
    """

    queryset = SystemLog.objects.select_related("user").all()
    serializer_class = SystemLogSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        queryset = self.queryset

        action_filter = self.request.query_params.get("action")
        model_name = self.request.query_params.get("model_name")
        user_id = self.request.query_params.get("user")

        if action_filter:
            queryset = queryset.filter(action=action_filter)

        if model_name:
            queryset = queryset.filter(model_name__iexact=model_name)

        if user_id:
            queryset = queryset.filter(user_id=user_id)

        return queryset.order_by("-created_at")


# ============================================================
# DOCTOR SEARCH
# ============================================================

class DoctorSearchViewSet(
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = DoctorProfileSerializer
    pagination_class = StandardPagination

    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]

    filterset_fields = ["specialization", "hospital"]

    search_fields = [
        "user__first_name",
        "user__last_name",
        "specialization",
        "hospital",
    ]

    ordering_fields = ["rating", "years_experience", "consultation_fee"]
    ordering = ["-rating", "-years_experience"]

    def get_queryset(self):
        queryset = DoctorProfile.objects.filter(
            available=True,
            verification_status=DoctorProfile.VerificationStatus.APPROVED,
            is_verified=True,
        )

        min_rating = self.request.query_params.get("min_rating")
        if min_rating:
            try:
                queryset = queryset.filter(rating__gte=float(min_rating))
            except ValueError:
                pass

        return queryset


# ============================================================
# VIDEO CALLS
# ============================================================

class VideoCallViewSet(viewsets.ModelViewSet):
    queryset = VideoCall.objects.select_related(
        "appointment",
        "patient",
        "patient__user",
        "doctor",
        "doctor__user",
    ).all()

    serializer_class = VideoCallSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.is_staff or user.is_superuser:
            return self.queryset

        patient = get_patient(user)
        doctor = get_doctor(user)

        if patient:
            return self.queryset.filter(patient=patient)

        if doctor:
            return self.queryset.filter(doctor=doctor)

        return self.queryset.none()

    def create(self, request, *args, **kwargs):
        # VideoCalls are created via the /start/ action, not via POST /.
        return Response(
            {
                "success": False,
                "message": "Use /video-calls/start/ to begin a call.",
            },
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def _get_participant(self, appointment):
        user = self.request.user

        if user.is_staff or user.is_superuser:
            return True

        return (
            user.id == appointment.patient.user_id
            or user.id == appointment.doctor.user_id
        )

    # --------------------------------------------------------
    # START CALL
    # --------------------------------------------------------


    @action(detail=False, methods=["post"])
    def instant(self, request):
        receiver_id = request.data.get("receiver_id")
        call_type = request.data.get("call_type", "video")

        if not receiver_id:
            return Response({"success": False, "message": "receiver_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        try:
            receiver = User.objects.get(id=receiver_id)
        except User.DoesNotExist:
            return Response({"success": False, "message": "Receiver not found."}, status=status.HTTP_404_NOT_FOUND)

        patient_user = user if hasattr(user, "patient_profile") else receiver
        doctor_user = user if hasattr(user, "doctor_profile") else receiver

        if not hasattr(patient_user, "patient_profile") or not hasattr(doctor_user, "doctor_profile"):
            return Response({"success": False, "message": "Call must be between a patient and a doctor."}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        
        with transaction.atomic():
            appointment = Appointment.objects.create(
                patient=patient_user.patient_profile,
                doctor=doctor_user.doctor_profile,
                appointment_date=now.date(),
                start_time=now.time(),
                end_time=(now + timedelta(minutes=30)).time(),
                status=Appointment.Status.IN_PROGRESS,
                consultation_type=Appointment.ConsultationType.VIDEO if call_type == "video" else Appointment.ConsultationType.AUDIO,
                reason="Instant Call"
            )

            video_call = VideoCall.objects.create(
                appointment=appointment,
                patient=patient_user.patient_profile,
                doctor=doctor_user.doctor_profile,
                status=VideoCall.Status.ACTIVE,
                started_at=now,
            )

            appointment.call_id = str(video_call.room_id)
            appointment.meeting_link = f"/video-call/{appointment.pk}/"
            appointment.save(update_fields=["call_id", "meeting_link"])

        return Response({
            "success": True,
            "message": "Instant call started.",
            "appointment_id": appointment.id,
            "data": self.get_serializer(video_call).data
        })

    @action(detail=False, methods=["post"])
    def start(self, request):
        appointment_id = request.data.get("appointment_id")

        if not appointment_id:
            return Response(
                {
                    "success": False,
                    "message": "appointment_id is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment = get_object_or_404(
            Appointment.objects.select_related(
                "patient",
                "patient__user",
                "doctor",
                "doctor__user",
            ),
            pk=appointment_id,
        )

        if not self._get_participant(appointment):
            return Response(
                {
                    "success": False,
                    "message": "You are not authorized to join this call.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.consultation_type != Appointment.ConsultationType.VIDEO:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Video calls are only available "
                        "for video consultations."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if appointment.status not in [
            Appointment.Status.CONFIRMED,
            Appointment.Status.IN_PROGRESS,
        ]:
            return Response(
                {
                    "success": False,
                    "message": (
                        "The appointment must be confirmed "
                        "before starting the call."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()

        with transaction.atomic():
            video_call = (
                VideoCall.objects.select_for_update()
                .filter(appointment=appointment)
                .first()
            )

            if video_call:
                if video_call.status == VideoCall.Status.ENDED:
                    return Response(
                        {
                            "success": False,
                            "message": "This video call has already ended.",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                video_call.status = VideoCall.Status.ACTIVE

                if not video_call.started_at:
                    video_call.started_at = now

                video_call.save(
                    update_fields=["status", "started_at", "updated_at"]
                )

            else:
                video_call = VideoCall(
                    appointment=appointment,
                    patient=appointment.patient,
                    doctor=appointment.doctor,
                    status=VideoCall.Status.ACTIVE,
                    started_at=now,
                )
                full_clean_or_400(video_call)
                video_call.save()

            appointment.status = Appointment.Status.IN_PROGRESS
            appointment.call_started_at = now
            appointment.call_id = str(video_call.room_id)
            appointment.meeting_link = f"/video-call/{appointment.pk}/"

            appointment.save(
                update_fields=[
                    "status",
                    "call_started_at",
                    "call_id",
                    "meeting_link",
                    "updated_at",
                ]
            )

            log_action(
                request=request,
                action=SystemLog.Action.APPOINTMENT,
                model_name="VideoCall",
                object_id=video_call.pk,
                details={
                    "event": "video_call_started",
                    "appointment_id": appointment.pk,
                },
            )

        return Response(
            {
                "success": True,
                "message": "Video call started.",
                "data": self.get_serializer(video_call).data,
            }
        )

    # --------------------------------------------------------
    # JOIN CALL
    # --------------------------------------------------------

    @action(detail=True, methods=["post"])
    def join(self, request, pk=None):
        video_call = self.get_object()
        appointment = video_call.appointment

        if not self._get_participant(appointment):
            return Response(
                {
                    "success": False,
                    "message": "You are not authorized to join this call.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if video_call.status not in [
            VideoCall.Status.PENDING,
            VideoCall.Status.ACTIVE,
        ]:
            return Response(
                {
                    "success": False,
                    "message": "This video call is no longer active.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "success": True,
                "message": "You can join the video call.",
                "data": self.get_serializer(video_call).data,
            }
        )

    # --------------------------------------------------------
    # END CALL
    # --------------------------------------------------------

    @action(detail=True, methods=["post"])
    def end(self, request, pk=None):
        video_call = self.get_object()
        appointment = video_call.appointment

        if not self._get_participant(appointment):
            return Response(
                {
                    "success": False,
                    "message": "You are not authorized to end this call.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if video_call.status in [
            VideoCall.Status.ENDED,
            VideoCall.Status.CANCELLED,
        ]:
            return Response(
                {
                    "success": False,
                    "message": "This video call has already ended.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        video_call.status = VideoCall.Status.ENDED
        video_call.ended_at = timezone.now()

        video_call.save(
            update_fields=["status", "ended_at", "updated_at"]
        )

        log_action(
            request=request,
            action=SystemLog.Action.APPOINTMENT,
            model_name="VideoCall",
            object_id=video_call.pk,
            details={
                "event": "video_call_ended",
                "appointment_id": appointment.pk,
                "duration_seconds": video_call.duration_seconds,
            },
        )

        return Response(
            {
                "success": True,
                "message": "Video call ended.",
                "data": self.get_serializer(video_call).data,
            }
        )

    # --------------------------------------------------------
    # CALL HISTORY
    # --------------------------------------------------------

    @action(detail=False, methods=["get"], url_path="call-history")
    def call_history(self, request):
        """Return past video calls for the current user."""
        user = request.user

        if hasattr(user, "patient_profile"):
            qs = VideoCall.objects.filter(
                patient=user.patient_profile
            )
        elif hasattr(user, "doctor_profile"):
            qs = VideoCall.objects.filter(
                doctor=user.doctor_profile
            )
        elif user.is_staff or user.is_superuser:
            qs = VideoCall.objects.all()
        else:
            return Response({"success": True, "data": []})

        qs = qs.select_related(
            "appointment",
            "patient__user",
            "doctor__user",
        ).order_by("-created_at")[:50]

        serializer = VideoCallSerializer(qs, many=True)
        return Response(
            {
                "success": True,
                "data": serializer.data,
            }
        )


# ============================================================
# HEALTH CHECK
# ============================================================

class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "success": True,
                "status": "healthy",
                "message": "Telemedicine API is running.",
                "timestamp": timezone.now(),
            }
        )


# ============================================================
# ADMIN DASHBOARD
# ============================================================

class AdminViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]

    @action(detail=False, methods=["get"], url_path="dashboard")
    def dashboard(self, request):
        today = timezone.localdate()

        total_users = User.objects.filter(is_staff=False).count()
        total_patients = PatientProfile.objects.count()
        total_doctors = DoctorProfile.objects.count()
        total_appointments = Appointment.objects.count()

        active_doctors = DoctorProfile.objects.filter(
            available=True,
            verification_status=DoctorProfile.VerificationStatus.APPROVED,
        ).count()

        pending_doctors = DoctorProfile.objects.filter(
            verification_status=DoctorProfile.VerificationStatus.PENDING,
        ).count()

        today_appointments = Appointment.objects.filter(
            appointment_date=today
        ).count()

        paid = Payment.objects.filter(payment_status=Payment.PaymentStatus.PAID)
        total_revenue = paid.aggregate(total=Sum("amount"))["total"] or 0

        month_start = today.replace(day=1)
        month_revenue = paid.filter(
            paid_at__date__gte=month_start
        ).aggregate(total=Sum("amount"))["total"] or 0

        start_date = today - timedelta(days=13)
        appts_by_day = Appointment.objects.filter(
            appointment_date__gte=start_date
        ).values("appointment_date").annotate(count=Count("id"))
        appts_map = {
            row["appointment_date"]: row["count"] for row in appts_by_day
        }
        appointments_chart = [
            {
                "date": (start_date + timedelta(days=i)).isoformat(),
                "label": (start_date + timedelta(days=i)).strftime("%b %d"),
                "count": appts_map.get(start_date + timedelta(days=i), 0),
            }
            for i in range(14)
        ]

        revs_by_day = paid.filter(
            paid_at__date__gte=start_date
        ).values("paid_at__date").annotate(total=Sum("amount"))
        revs_map = {
            row["paid_at__date"]: float(row["total"] or 0)
            for row in revs_by_day
        }
        revenue_chart = [
            {
                "date": (start_date + timedelta(days=i)).isoformat(),
                "label": (start_date + timedelta(days=i)).strftime("%b %d"),
                "amount": revs_map.get(start_date + timedelta(days=i), 0),
            }
            for i in range(14)
        ]

        top_specs = Appointment.objects.values(
            "doctor__specialization"
        ).annotate(count=Count("id")).order_by("-count")[:6]
        specializations_chart = [
            {
                "name": row["doctor__specialization"] or "Unknown",
                "count": row["count"],
            }
            for row in top_specs
        ]

        signup_start = today - timedelta(days=29)
        signups_by_day = User.objects.filter(
            date_joined__date__gte=signup_start
        ).values("date_joined__date").annotate(count=Count("id"))
        signups_map = {
            row["date_joined__date"]: row["count"]
            for row in signups_by_day
        }
        signups_chart = [
            {
                "date": (signup_start + timedelta(days=i)).isoformat(),
                "label": (signup_start + timedelta(days=i)).strftime("%b %d"),
                "count": signups_map.get(signup_start + timedelta(days=i), 0),
            }
            for i in range(30)
        ]

        recent_users = User.objects.filter(
            is_staff=False
        ).order_by("-date_joined")[:5]
        recent_users_data = [
            {
                "id": u.id,
                "name": u.get_full_name().strip() or u.username,
                "email": u.email,
                "date": u.date_joined,
                "role": "doctor" if hasattr(u, "doctor_profile") else "patient",
            }
            for u in recent_users
        ]

        recent_appointments = Appointment.objects.select_related(
            "patient__user", "doctor__user"
        ).order_by("-created_at")[:5]
        recent_appointments_data = [
            {
                "id": a.id,
                "patient": a.patient.full_name,
                "doctor": a.doctor.full_name,
                "date": a.appointment_date,
                "status": a.status,
                "type": a.consultation_type,
            }
            for a in recent_appointments
        ]

        pending_verifications = DoctorProfile.objects.filter(
            verification_status=DoctorProfile.VerificationStatus.PENDING,
        ).select_related("user").order_by("-created_at")[:5]
        pending_data = [
            {
                "id": d.id,
                "name": d.full_name,
                "specialization": d.specialization,
                "applied": d.created_at,
            }
            for d in pending_verifications
        ]

        return Response(
            {
                "success": True,
                "data": {
                    "statistics": {
                        "total_users": total_users,
                        "total_patients": total_patients,
                        "total_doctors": total_doctors,
                        "active_doctors": active_doctors,
                        "pending_doctors": pending_doctors,
                        "total_appointments": total_appointments,
                        "today_appointments": today_appointments,
                        "total_revenue": float(total_revenue),
                        "month_revenue": float(month_revenue),
                    },
                    "charts": {
                        "appointments_14d": appointments_chart,
                        "revenue_14d": revenue_chart,
                        "specializations": specializations_chart,
                        "signups_30d": signups_chart,
                    },
                    "recent_users": recent_users_data,
                    "recent_appointments": recent_appointments_data,
                    "pending_verifications": pending_data,
                    "system_health": {
                        "status": "operational",
                        "checked_at": timezone.now().isoformat(),
                    },
                },
            }
        )


class GlobalSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get("q", "").strip()

        if not query:
            return Response(
                {
                    "success": True,
                    "data": {"doctors": [], "appointments": []},
                }
            )

        doctors = DoctorProfile.objects.select_related("user").filter(
            verification_status=DoctorProfile.VerificationStatus.APPROVED,
            is_verified=True,
        ).filter(
            Q(user__first_name__icontains=query)
            | Q(user__last_name__icontains=query)
            | Q(user__username__icontains=query)
            | Q(specialization__icontains=query)
            | Q(hospital__icontains=query)
        )[:10]

        appointment_queryset = Appointment.objects.select_related(
            "patient",
            "patient__user",
            "doctor",
            "doctor__user",
        )

        patient = get_patient(request.user)
        doctor = get_doctor(request.user)

        if patient:
            appointment_queryset = appointment_queryset.filter(patient=patient)
        elif doctor:
            appointment_queryset = appointment_queryset.filter(doctor=doctor)
        else:
            appointment_queryset = appointment_queryset.none()

        appointments = appointment_queryset.filter(
            Q(reason__icontains=query)
            | Q(symptoms__icontains=query)
            | Q(diagnosis__icontains=query)
            | Q(notes__icontains=query)
        )[:10]

        return Response(
            {
                "success": True,
                "data": {
                    "doctors": DoctorProfileSerializer(
                        doctors,
                        many=True,
                        context={"request": request},
                    ).data,
                    "appointments": AppointmentSerializer(
                        appointments,
                        many=True,
                        context={"request": request},
                    ).data,
                },
            }
        )


class AdminDashboardView(APIView):
    """Get admin dashboard statistics."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        total_users = User.objects.filter(is_staff=False).count()
        total_doctors = DoctorProfile.objects.count()
        total_patients = PatientProfile.objects.count()
        total_appointments = Appointment.objects.count()

        pending_verifications = DoctorProfile.objects.filter(
            verification_status=DoctorProfile.VerificationStatus.PENDING,
        ).count()

        total_revenue = Payment.objects.filter(
            payment_status=Payment.PaymentStatus.PAID,
        ).aggregate(total=Sum("amount"))["total"] or 0

        today = timezone.now().date()
        today_appointments = Appointment.objects.filter(
            appointment_date=today
        ).count()

        active_doctors = DoctorProfile.objects.filter(
            is_verified=True,
            available=True,
        ).count()

        return Response(
            {
                "success": True,
                "data": {
                    "total_users": total_users,
                    "total_doctors": total_doctors,
                    "total_patients": total_patients,
                    "total_appointments": total_appointments,
                    "pending_verifications": pending_verifications,
                    "total_revenue": float(total_revenue),
                    "today_appointments": today_appointments,
                    "active_doctors": active_doctors,
                },
            }
        )


# ============================================================
# USER PREFERENCES
# ============================================================

class UserPreferenceView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_or_create(self, user):
        pref, _ = UserPreference.objects.get_or_create(user=user)
        return pref

    def get(self, request):
        pref = self._get_or_create(request.user)
        serializer = UserPreferenceSerializer(pref)
        return Response(
            {
                "success": True,
                "data": serializer.data,
            }
        )

    def patch(self, request):
        pref = self._get_or_create(request.user)
        serializer = UserPreferenceSerializer(
            pref,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {
                "success": True,
                "data": serializer.data,
            }
        )


# ============================================================
# PAYMENT CHECKOUT
# ============================================================

class PaymentCheckoutView(APIView):
    """
    GET  /api/payments/<id>/checkout/   → fetch payment + appointment details
    POST /api/payments/<id>/checkout/   → simulate payment completion
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            payment = Payment.objects.select_related(
                "patient__user",
                "appointment__doctor__user",
            ).get(pk=pk)
        except Payment.DoesNotExist:
            return Response(
                {"success": False, "message": "Payment not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        is_owner = hasattr(request.user, "patient_profile") and \
                   payment.patient_id == request.user.patient_profile.id
        is_admin = request.user.is_staff or request.user.is_superuser

        if not (is_owner or is_admin):
            return Response(
                {"success": False, "message": "Permission denied"},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(
            {
                "success": True,
                "data": PaymentSerializer(payment).data,
            }
        )

    def post(self, request, pk):
        # Mock payment completion. Disabled unless explicitly enabled
        # via settings.ALLOW_MOCK_PAYMENTS.
        if not getattr(settings, "ALLOW_MOCK_PAYMENTS", False):
            return Response(
                {"success": False, "message": "Not available"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            payment = Payment.objects.select_related(
                "patient__user",
                "appointment__doctor__user",
            ).get(pk=pk)
        except Payment.DoesNotExist:
            return Response(
                {"success": False, "message": "Payment not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        is_owner = hasattr(request.user, "patient_profile") and \
                   payment.patient_id == request.user.patient_profile.id
        is_admin = request.user.is_staff or request.user.is_superuser

        if not (is_owner or is_admin):
            return Response(
                {"success": False, "message": "Permission denied"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if payment.payment_status == Payment.PaymentStatus.PAID:
            return Response(
                {"success": False, "message": "Payment already completed"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        method = request.data.get("payment_method", "card")

        if method not in dict(Payment.PaymentMethod.choices):
            return Response(
                {"success": False, "message": "Invalid payment method"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            payment.payment_method = method
            payment.payment_status = Payment.PaymentStatus.PAID
            payment.is_paid = True
            payment.paid_at = timezone.now()

            if not payment.transaction_reference:
                payment.transaction_reference = (
                    f"TXN-{timezone.now().strftime('%Y%m%d%H%M%S')}-"
                    f"{payment.id}-{_uuid.uuid4().hex[:6].upper()}"
                )

            payment.payment_data = {
                **(payment.payment_data or {}),
                "completed_via": "checkout_ui",
                "method": method,
                "completed_at": timezone.now().isoformat(),
            }

            full_clean_or_400(payment)
            payment.save()

            if payment.appointment:
                payment.appointment.is_paid = True
                payment.appointment.payment_status = (
                    Appointment.PaymentStatus.PAID
                )
                payment.appointment.payment_id = (
                    payment.transaction_reference
                )
                payment.appointment.save(
                    update_fields=[
                        "is_paid",
                        "payment_status",
                        "payment_id",
                    ]
                )

                try:
                    Notification.objects.create(
                        user=payment.appointment.doctor.user,
                        notification_type=(
                            Notification.NotificationType.PAYMENT
                        ),
                        title="Payment Received",
                        message=(
                            f"Patient {payment.patient.full_name} paid "
                            f"{payment.currency} {payment.amount} for "
                            f"appointment #{payment.appointment.id}."
                        ),
                    )
                except Exception:
                    pass

        return Response(
            {
                "success": True,
                "message": "Payment completed successfully",
                "data": PaymentSerializer(payment).data,
            }
        )


class CreateCheckoutPaymentView(APIView):
    """
    POST /api/payments/checkout/
    Body: { appointment: <id> }
    Creates a pending payment for an appointment (if not exists).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not hasattr(request.user, "patient_profile"):
            return Response(
                {"success": False, "message": "Only patients can pay"},
                status=status.HTTP_403_FORBIDDEN,
            )

        appointment_id = request.data.get("appointment")
        if not appointment_id:
            return Response(
                {"success": False, "message": "Appointment ID required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            appointment = Appointment.objects.select_related(
                "doctor__user",
                "patient__user",
            ).get(
                pk=appointment_id,
                patient=request.user.patient_profile,
            )
        except Appointment.DoesNotExist:
            return Response(
                {"success": False, "message": "Appointment not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if appointment.status == Appointment.Status.CANCELLED:
            return Response(
                {
                    "success": False,
                    "message": "Cannot pay for cancelled appointment",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = Payment.objects.filter(
            patient=request.user.patient_profile,
            appointment=appointment,
        ).first()

        if existing:
            return Response(
                {
                    "success": True,
                    "message": "Existing payment loaded",
                    "data": PaymentSerializer(existing).data,
                }
            )

        amount = appointment.doctor.consultation_fee or 0

        if amount <= 0:
            return Response(
                {
                    "success": False,
                    "message": "Doctor's consultation fee is not set",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        import uuid
        payment = Payment(
            patient=request.user.patient_profile,
            appointment=appointment,
            amount=amount,
            currency="NGN",
            payment_method=Payment.PaymentMethod.ONLINE,
            payment_status=Payment.PaymentStatus.PENDING,
            transaction_reference=f"TXN-{uuid.uuid4().hex[:12].upper()}",
        )
        full_clean_or_400(payment)
        
        try:
            payment.save()
        except Exception as e:
            if "UNIQUE constraint failed" in str(e):
                existing = Payment.objects.filter(
                    patient=request.user.patient_profile,
                    appointment=appointment,
                ).first()
                if existing:
                    return Response({
                        "success": True,
                        "message": "Existing payment loaded",
                        "data": PaymentSerializer(existing).data,
                    })
            raise

        return Response(
            {
                "success": True,
                "message": "Payment created",
                "data": PaymentSerializer(payment).data,
            },
            status=status.HTTP_201_CREATED,
        )


# ============================================================
# FAVORITE DOCTORS
# ============================================================

class FavoriteDoctorViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsPatient]
    serializer_class = FavoriteDoctorSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        if not hasattr(self.request.user, "patient_profile"):
            return FavoriteDoctor.objects.none()
        return FavoriteDoctor.objects.filter(
            patient=self.request.user.patient_profile
        ).select_related("doctor__user").order_by("-created_at")

    def create(self, request, *args, **kwargs):
        doctor_id = request.data.get("doctor")
        if not doctor_id:
            return Response(
                {"success": False, "message": "Doctor ID required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            doctor = DoctorProfile.objects.get(pk=doctor_id)
        except DoctorProfile.DoesNotExist:
            return Response(
                {"success": False, "message": "Doctor not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        fav, created = FavoriteDoctor.objects.get_or_create(
            patient=request.user.patient_profile,
            doctor=doctor,
        )

        return Response(
            {
                "success": True,
                "message": (
                    "Added to favorites" if created
                    else "Already in favorites"
                ),
                "data": FavoriteDoctorSerializer(fav).data,
            },
            status=(
                status.HTTP_201_CREATED if created
                else status.HTTP_200_OK
            ),
        )

    @action(detail=False, methods=["delete"])
    def by_doctor(self, request):
        doctor_id = request.query_params.get("doctor")
        if not doctor_id:
            return Response(
                {"success": False, "message": "Doctor ID required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        deleted, _ = FavoriteDoctor.objects.filter(
            patient=request.user.patient_profile,
            doctor_id=doctor_id,
        ).delete()
        return Response(
            {
                "success": True,
                "message": "Removed" if deleted else "Not in favorites",
            }
        )


# ============================================================
# SAVED SEARCHES
# ============================================================

class SavedSearchViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsPatient]
    serializer_class = SavedSearchSerializer
    pagination_class = StandardPagination

    def get_queryset(self):
        if not hasattr(self.request.user, "patient_profile"):
            return SavedSearch.objects.none()
        return SavedSearch.objects.filter(
            patient=self.request.user.patient_profile
        ).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(patient=self.request.user.patient_profile)
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser


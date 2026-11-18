from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from django.utils.timesince import timesince
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from rest_framework import serializers

from .models import (
    UserPreference,
    FavoriteDoctor,
    SavedSearch,
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
)


# ============================================================
# BASE: FULL-CLEAN MODEL SERIALIZER
# ============================================================

class FullCleanModelSerializer(serializers.ModelSerializer):
    """
    ModelSerializer that runs full_clean() on the model instance
    during create and full (non-partial) update.

    Use for models with a clean() method that must actually be
    enforced. Django's Model.save() does NOT call clean(), and
    neither does DRF by default — this closes that gap.

    On partial PATCH, full_clean() is skipped because required
    fields may be temporarily unset mid-edit; DRF's own field-
    level validation covers those cases.
    """

    def _run_full_clean(self, instance):
        try:
            instance.full_clean(exclude=None, validate_unique=True)
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict"):
                raise serializers.ValidationError(exc.message_dict)
            raise serializers.ValidationError({"detail": exc.messages})

    def create(self, validated_data):
        instance = self.Meta.model(**validated_data)
        self._run_full_clean(instance)
        instance.save()
        return instance

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if not getattr(self, "partial", False):
            self._run_full_clean(instance)

        instance.save()
        return instance


# ============================================================
# USER SERIALIZER
# ============================================================

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "is_active",
            "is_staff",
            "is_superuser",
            "role",
            "date_joined",
            "last_login",
        ]
        read_only_fields = [
            "id",
            "is_active",
            "is_staff",
            "is_superuser",
            "role",
            "date_joined",
            "last_login",
        ]

    def get_full_name(self, obj):
        return obj.get_full_name().strip() or obj.username

    def get_role(self, obj):
        if obj.is_superuser or obj.is_staff:
            return "admin"
        if hasattr(obj, "doctor_profile"):
            return "doctor"
        if hasattr(obj, "patient_profile"):
            return "patient"
        return "unknown"


# ============================================================
# PATIENT PROFILE SERIALIZER
# ============================================================

class PatientProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()

    class Meta:
        model = PatientProfile
        fields = [
            "id",
            "user",
            "profile_picture",
            "date_of_birth",
            "phone",
            "address",
            "city",
            "state",
            "country",
            "emergency_contact",
            "blood_type",
            "gender",
            "allergies",
            "chronic_conditions",
            "current_medications",
            "medical_history",
            "height",
            "weight",
            "insurance_provider",
            "insurance_id",
            "full_name",
            "age",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "full_name",
            "age",
            "created_at",
            "updated_at",
        ]

    def get_full_name(self, obj):
        return obj.full_name

    def get_age(self, obj):
        return obj.age


# ============================================================
# DOCTOR PROFILE SERIALIZER
# ============================================================

class DoctorProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()
    specialization_display = serializers.SerializerMethodField()
    is_favorite = serializers.SerializerMethodField()

    class Meta:
        model = DoctorProfile
        fields = [
            "id",
            "user",
            "profile_picture",
            "specialization",
            "specialization_display",
            "license_number",
            "hospital",
            "years_experience",
            "consultation_fee",
            "available",
            "verification_status",
            "is_verified",
            "rating",
            "total_reviews",
            "bio",
            "education",
            "certifications",
            "languages",
            "monday_hours",
            "tuesday_hours",
            "wednesday_hours",
            "thursday_hours",
            "friday_hours",
            "saturday_hours",
            "sunday_hours",
            "full_name",
            "is_favorite",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "specialization_display",
            "rating",
            "total_reviews",
            "verification_status",
            "is_verified",
            "available",
            "is_favorite",
            "created_at",
            "updated_at",
        ]

    def get_full_name(self, obj):
        return obj.full_name

    def get_specialization_display(self, obj):
        return obj.get_specialization_display()

    def get_is_favorite(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        if not hasattr(request.user, "patient_profile"):
            return False
        return FavoriteDoctor.objects.filter(
            patient=request.user.patient_profile,
            doctor=obj,
        ).exists()


# ============================================================
# DOCTOR AVAILABILITY SERIALIZER
# ============================================================

class DoctorAvailabilitySerializer(FullCleanModelSerializer):
    day_display = serializers.SerializerMethodField()

    class Meta:
        model = DoctorAvailability
        fields = [
            "id",
            "doctor",
            "day_of_week",
            "day_display",
            "start_time",
            "end_time",
            "is_available",
        ]
        read_only_fields = [
            "id",
            "day_display",
        ]

    def get_day_display(self, obj):
        return obj.get_day_of_week_display()

    def validate(self, attrs):
        start_time = attrs.get("start_time")
        end_time = attrs.get("end_time")

        if self.instance:
            start_time = start_time or self.instance.start_time
            end_time = end_time or self.instance.end_time

        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError({
                "start_time": "Start time must be before end time."
            })

        doctor = attrs.get("doctor")
        if doctor is None and self.instance:
            doctor = self.instance.doctor

        day = attrs.get("day_of_week")
        if day is None and self.instance:
            day = self.instance.day_of_week

        if doctor is not None and day is not None:
            existing = DoctorAvailability.objects.filter(
                doctor=doctor,
                day_of_week=day,
            )
            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                raise serializers.ValidationError({
                    "day_of_week": "Availability for this day already exists."
                })

        return attrs


# ============================================================
# APPOINTMENT SERIALIZER
# ============================================================

class AppointmentSerializer(FullCleanModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    doctor_specialization = serializers.SerializerMethodField()
    patient_user_id = serializers.SerializerMethodField()
    doctor_user_id = serializers.SerializerMethodField()
    patient_user_id = serializers.SerializerMethodField()
    doctor_user_id = serializers.SerializerMethodField()
    scheduled_time = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    payment_status_display = serializers.SerializerMethodField()
    consultation_type_display = serializers.SerializerMethodField()
    is_paid = serializers.SerializerMethodField()
    is_upcoming = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            "id",
            "appointment_id",
            "patient",
            "doctor",
            "appointment_date",
            "start_time",
            "end_time",
            "duration",
            "status",
            "status_display",
            "consultation_type",
            "consultation_type_display",
            "reason",
            "symptoms",
            "notes",
            "meeting_link",
            "call_id",
            "recording_url",
            "call_started_at",
            "completed_at",
            "payment_status",
            "payment_status_display",
            "payment_id",
            "is_paid",
            "patient_name",
            "doctor_name",
            "doctor_specialization",
            "patient_user_id",
            "doctor_user_id",
            "patient_user_id",
            "doctor_user_id",
            "scheduled_time",
            "is_upcoming",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "appointment_id",
            "status",
            "status_display",
            "payment_status",
            "payment_status_display",
            "payment_id",
            "meeting_link",
            "call_id",
            "recording_url",
            "call_started_at",
            "completed_at",
            "patient_name",
            "doctor_name",
            "doctor_specialization",
            "patient_user_id",
            "doctor_user_id",
            "patient_user_id",
            "doctor_user_id",
            "scheduled_time",
            "is_paid",
            "is_upcoming",
            "created_at",
            "updated_at",
        ]

    def get_patient_name(self, obj):
        return obj.patient.full_name

    def get_doctor_name(self, obj):
        return obj.doctor.full_name

    def get_doctor_specialization(self, obj):
        return obj.doctor.get_specialization_display()

    def get_patient_user_id(self, obj):
        return obj.patient.user_id

    def get_doctor_user_id(self, obj):
        return obj.doctor.user_id

    def get_patient_user_id(self, obj):
        return obj.patient.user_id

    def get_doctor_user_id(self, obj):
        return obj.doctor.user_id

    def get_scheduled_time(self, obj):
        return f"{obj.appointment_date} {obj.start_time}"

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_payment_status_display(self, obj):
        return obj.get_payment_status_display()

    def get_consultation_type_display(self, obj):
        return obj.get_consultation_type_display()

    def get_is_paid(self, obj):
        return obj.is_paid

    def get_is_upcoming(self, obj):
        return obj.is_upcoming

    def validate(self, attrs):
        appointment_date = attrs.get("appointment_date")
        start_time = attrs.get("start_time")
        end_time = attrs.get("end_time")
        doctor = attrs.get("doctor")

        if self.instance:
            appointment_date = appointment_date or self.instance.appointment_date
            start_time = start_time or self.instance.start_time
            end_time = end_time or self.instance.end_time
            doctor = doctor or self.instance.doctor

        if not appointment_date:
            return attrs

        today = timezone.localdate()

        if appointment_date < today:
            raise serializers.ValidationError({
                "appointment_date": "Appointment date cannot be in the past."
            })

        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError({
                "start_time": "Start time must be before end time."
            })

        if (
            appointment_date == today
            and start_time
            and start_time <= timezone.localtime().time()
        ):
            raise serializers.ValidationError({
                "start_time": "Appointment start time must be in the future."
            })

        if not doctor or not start_time or not end_time:
            return attrs

        if doctor.verification_status != DoctorProfile.VerificationStatus.APPROVED:
            raise serializers.ValidationError({
                "doctor": "This doctor is not currently approved."
            })

        if not doctor.available:
            raise serializers.ValidationError({
                "doctor": "This doctor is currently unavailable."
            })

        day_of_week = appointment_date.weekday()

        availability = DoctorAvailability.objects.filter(
            doctor=doctor,
            day_of_week=day_of_week,
            is_available=True,
        ).first()

        if not availability:
            raise serializers.ValidationError({
                "appointment_date": (
                    f"Doctor is not available on "
                    f"{appointment_date.strftime('%A')}."
                )
            })

        if (
            start_time < availability.start_time
            or end_time > availability.end_time
        ):
            raise serializers.ValidationError({
                "start_time": (
                    f"Time must be between "
                    f"{availability.start_time.strftime('%H:%M')} "
                    f"and "
                    f"{availability.end_time.strftime('%H:%M')}."
                )
            })

        # Slot conflict check with row-lock; runs inside a transaction.
        # Full clean on the model also checks, but without a lock,
        # so we do the authoritative check here.
        existing = Appointment.objects.filter(
            doctor=doctor,
            appointment_date=appointment_date,
            status__in=[
                Appointment.Status.PENDING,
                Appointment.Status.CONFIRMED,
                Appointment.Status.IN_PROGRESS,
            ],
        )

        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)

        conflict = existing.filter(
            start_time__lt=end_time,
            end_time__gt=start_time,
        ).exists()

        if conflict:
            raise serializers.ValidationError({
                "start_time": (
                    "This time slot conflicts with an existing appointment."
                )
            })

        return attrs

    def create(self, validated_data):
        from .utils import full_clean_or_400

        instance = Appointment(**validated_data)

        with transaction.atomic():
            # Lock existing appointments for this doctor/day so two
            # concurrent bookings can't both pass the conflict check.
            list(
                Appointment.objects.select_for_update().filter(
                    doctor=instance.doctor,
                    appointment_date=instance.appointment_date,
                    status__in=[
                        Appointment.Status.PENDING,
                        Appointment.Status.CONFIRMED,
                        Appointment.Status.IN_PROGRESS,
                    ],
                ).values_list("pk", flat=True)
            )

            full_clean_or_400(instance)
            instance.save()

        return instance


# ============================================================
# MEDICAL RECORD SERIALIZER
# ============================================================

class MedicalRecordSerializer(FullCleanModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    created_at_formatted = serializers.SerializerMethodField()
    blood_pressure = serializers.SerializerMethodField()

    class Meta:
        model = MedicalRecord
        fields = [
            "id",
            "record_id",
            "patient",
            "doctor",
            "appointment",
            "record_date",
            "diagnosis",
            "symptoms",
            "treatment",
            "prescription",
            "notes",
            "blood_pressure_systolic",
            "blood_pressure_diastolic",
            "blood_pressure",
            "vitals",
            "follow_up_date",
            "lab_results",
            "patient_name",
            "doctor_name",
            "created_at_formatted",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "record_id",
            "patient",
            "doctor",
            "appointment",
            "patient_name",
            "doctor_name",
            "blood_pressure",
            "created_at_formatted",
            "created_at",
            "updated_at",
        ]

    def get_patient_name(self, obj):
        return obj.patient.full_name

    def get_doctor_name(self, obj):
        if not obj.doctor:
            return None
        return obj.doctor.full_name

    def get_created_at_formatted(self, obj):
        if not obj.created_at:
            return None
        return obj.created_at.strftime("%B %d, %Y at %I:%M %p")

    def get_blood_pressure(self, obj):
        return obj.blood_pressure


# ============================================================
# PRESCRIPTION SERIALIZER
# ============================================================

class PrescriptionSerializer(FullCleanModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    issued_at_formatted = serializers.SerializerMethodField()
    refills_remaining = serializers.SerializerMethodField()

    class Meta:
        model = Prescription
        fields = [
            "id",
            "medical_record",
            "patient",
            "doctor",
            "appointment",
            "medication_name",
            "dosage",
            "frequency",
            "duration",
            "instructions",
            "refills",
            "refills_used",
            "refills_remaining",
            "is_active",
            "issued_at",
            "issued_at_formatted",
            "patient_name",
            "doctor_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "patient",
            "doctor",
            "appointment",
            "medical_record",
            "refills_used",
            "refills_remaining",
            "issued_at",
            "issued_at_formatted",
            "patient_name",
            "doctor_name",
            "created_at",
            "updated_at",
        ]

    def get_patient_name(self, obj):
        return obj.patient.full_name

    def get_doctor_name(self, obj):
        if not obj.doctor:
            return None
        return obj.doctor.full_name

    def get_issued_at_formatted(self, obj):
        if not obj.issued_at:
            return None
        return obj.issued_at.strftime("%B %d, %Y")

    def get_refills_remaining(self, obj):
        return obj.refills_remaining


# ============================================================
# NOTIFICATION SERIALIZER
# ============================================================

class NotificationSerializer(serializers.ModelSerializer):
    time_ago = serializers.SerializerMethodField()
    type_display = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "user",
            "title",
            "message",
            "notification_type",
            "type_display",
            "is_read",
            "link",
            "related_object_id",
            "read_at",
            "time_ago",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "type_display",
            "time_ago",
            "read_at",
            "created_at",
        ]

    def get_time_ago(self, obj):
        return timesince(obj.created_at)

    def get_type_display(self, obj):
        return obj.get_notification_type_display()


# ============================================================
# REVIEW SERIALIZER
# ============================================================

class ReviewSerializer(FullCleanModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    rating_display = serializers.SerializerMethodField()
    created_at_formatted = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            "id",
            "patient",
            "doctor",
            "appointment",
            "rating",
            "rating_display",
            "comment",
            "is_anonymous",
            "patient_name",
            "doctor_name",
            "created_at_formatted",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "patient",
            "doctor",
            "rating_display",
            "patient_name",
            "doctor_name",
            "created_at_formatted",
            "created_at",
        ]

    def get_patient_name(self, obj):
        return "Anonymous" if obj.is_anonymous else obj.patient.full_name

    def get_doctor_name(self, obj):
        return obj.doctor.full_name

    def get_rating_display(self, obj):
        return obj.rating_display

    def get_created_at_formatted(self, obj):
        if not obj.created_at:
            return None
        return obj.created_at.strftime("%B %d, %Y")


# ============================================================
# CHAT MESSAGE SERIALIZER
# ============================================================

class ChatMessageSerializer(FullCleanModelSerializer):
    sender_name = serializers.SerializerMethodField()
    receiver_name = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "sender",
            "receiver",
            "appointment",
            "message",
            "attachment",
            "is_read",
            "read_at",
            "sender_name",
            "receiver_name",
            "time_ago",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "sender",
            "is_read",
            "read_at",
            "sender_name",
            "receiver_name",
            "time_ago",
            "created_at",
        ]

    def get_sender_name(self, obj):
        return obj.sender.get_full_name().strip() or obj.sender.username

    def get_receiver_name(self, obj):
        return obj.receiver.get_full_name().strip() or obj.receiver.username

    def get_time_ago(self, obj):
        return timesince(obj.created_at)

    def validate(self, attrs):
        # Mirror ChatMessage.clean() at the serializer level so a
        # broken model clean() cannot silently allow empty messages.
        message = attrs.get("message")
        attachment = attrs.get("attachment")

        if self.instance:
            message = message if message is not None else self.instance.message
            attachment = attachment if attachment is not None else self.instance.attachment

        has_text = bool(message and message.strip())
        has_file = bool(attachment)

        if not has_text and not has_file:
            raise serializers.ValidationError({
                "message": "Message must contain text or an attachment."
            })

        return attrs


# ============================================================
# PAYMENT SERIALIZER
# ============================================================

class PaymentSerializer(FullCleanModelSerializer):
    patient_name = serializers.SerializerMethodField()
    appointment_details = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    method_display = serializers.SerializerMethodField()
    is_paid = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id",
            "patient",
            "appointment",
            "amount",
            "currency",
            "payment_method",
            "method_display",
            "payment_status",
            "status_display",
            "transaction_reference",
            "payment_data",
            "paid_at",
            "is_paid",
            "patient_name",
            "appointment_details",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "patient",
            "appointment",
            "payment_status",
            "transaction_reference",
            "paid_at",
            "is_paid",
            "patient_name",
            "appointment_details",
            "status_display",
            "method_display",
            "created_at",
            "updated_at",
        ]

    def get_patient_name(self, obj):
        return obj.patient.full_name

    def get_appointment_details(self, obj):
        if not obj.appointment:
            return None
        appointment = obj.appointment
        return {
            "id": appointment.id,
            "appointment_id": appointment.appointment_id,
            "appointment_date": appointment.appointment_date,
            "start_time": appointment.start_time,
            "end_time": appointment.end_time,
            "status": appointment.status,
            "doctor_name": appointment.doctor.full_name,
        }

    def get_status_display(self, obj):
        return obj.get_payment_status_display()

    def get_method_display(self, obj):
        return obj.get_payment_method_display()

    def get_is_paid(self, obj):
        return obj.is_paid


# ============================================================
# DOCUMENT SERIALIZER
# ============================================================

class DocumentSerializer(FullCleanModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()
    document_type_display = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    file_size_display = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "patient",
            "uploaded_by",
            "appointment",
            "document_type",
            "document_type_display",
            "title",
            "description",
            "file",
            "file_url",
            "file_size",
            "file_size_display",
            "mime_type",
            "is_verified",
            "verified_at",
            "verified_by",
            "uploaded_by_name",
            "patient_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "uploaded_by",
            "verified_by",
            "file_url",
            "file_size",
            "file_size_display",
            "mime_type",
            "is_verified",
            "verified_at",
            "uploaded_by_name",
            "patient_name",
            "created_at",
            "updated_at",
        ]

    def get_uploaded_by_name(self, obj):
        if not obj.uploaded_by:
            return "System"
        return obj.uploaded_by.get_full_name().strip() or obj.uploaded_by.username

    def get_patient_name(self, obj):
        return obj.patient.full_name

    def get_document_type_display(self, obj):
        return obj.get_document_type_display()

    def get_file_url(self, obj):
        if not obj.file:
            return None
        try:
            url = obj.file.url
        except (ValueError, OSError):
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(url)
        return url

    def get_file_size_display(self, obj):
        size = obj.file_size or 0
        if size < 1024:
            return f"{size} B"
        if size < 1024 * 1024:
            return f"{size / 1024:.1f} KB"
        if size < 1024 * 1024 * 1024:
            return f"{size / (1024 * 1024):.1f} MB"
        return f"{size / (1024 * 1024 * 1024):.1f} GB"

    def create(self, validated_data):
        # Skip full_clean on the file field — Document.save() already
        # reads file.size and file.content_type, and calling
        # full_clean() would open the file a second time.
        instance = Document(**validated_data)
        try:
            instance.full_clean(exclude=["file"], validate_unique=True)
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict"):
                raise serializers.ValidationError(exc.message_dict)
            raise serializers.ValidationError({"detail": exc.messages})
        instance.save()
        return instance


# ============================================================
# SYSTEM LOG SERIALIZER
# ============================================================

class SystemLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    action_display = serializers.SerializerMethodField()

    class Meta:
        model = SystemLog
        fields = [
            "id",
            "user",
            "action",
            "action_display",
            "model_name",
            "object_id",
            "details",
            "ip_address",
            "user_agent",
            "user_name",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "action",
            "action_display",
            "model_name",
            "object_id",
            "details",
            "ip_address",
            "user_agent",
            "user_name",
            "created_at",
        ]

    def get_user_name(self, obj):
        if not obj.user:
            return "System"
        return obj.user.get_full_name().strip() or obj.user.username

    def get_action_display(self, obj):
        return obj.get_action_display()



# ============================================================
# LOGIN SERIALIZER
# ============================================================

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True, allow_blank=False)
    password = serializers.CharField(
        required=True,
        write_only=True,
        allow_blank=False
    )

    def validate(self, attrs):
        from django.contrib.auth.hashers import check_password

        UserModel = get_user_model()

        username_or_email = attrs["username"].strip()
        password = attrs["password"]

        if not username_or_email:
            raise serializers.ValidationError({
                "username": "Username or email is required."
            })

        if not password:
            raise serializers.ValidationError({
                "password": "Password is required."
            })

        # First attempt authentication using the supplied username.
        user = authenticate(
            username=username_or_email,
            password=password
        )

        # Track whether an account matching the supplied identifier
        # exists. This helps avoid unnecessary dummy password hashing
        # when Django has already checked a real account's password.
        account_exists = False

        if user is None:
            # Check for a matching username.
            account_exists = UserModel.objects.filter(
                username__iexact=username_or_email
            ).exists()

            # If no username matches, try email authentication.
            if not account_exists:
                try:
                    user_obj = UserModel.objects.get(
                        email__iexact=username_or_email
                    )
                except UserModel.DoesNotExist:
                    user_obj = None
                except UserModel.MultipleObjectsReturned:
                    raise serializers.ValidationError({
                        "username": (
                            "Multiple accounts are associated "
                            "with this email."
                        )
                    })

                if user_obj is not None:
                    account_exists = True

                    user = authenticate(
                        username=user_obj.username,
                        password=password
                    )

        if user is None:
            # Only perform dummy password hashing when no matching
            # account was found. Failed authentication against an
            # existing account has already performed password hashing.
            if not account_exists:
                check_password(password, _get_dummy_hash())

            raise serializers.ValidationError(
                "Invalid username/email or password."
            )

        if not user.is_active:
            raise serializers.ValidationError(
                "This account is inactive."
            )

        attrs["user"] = user
        return attrs


# ============================================================
# DUMMY PASSWORD HASH FOR TIMING PROTECTION
# ============================================================

_DUMMY_HASH = None


def _get_dummy_hash():
    """
    Generate and cache a valid password hash for nonexistent accounts.

    This prevents an invalid login for an unknown account from
    returning immediately without performing password hashing.
    """

    global _DUMMY_HASH

    if _DUMMY_HASH is None:
        from django.contrib.auth.hashers import make_password

        _DUMMY_HASH = make_password("not-a-real-password")

    return _DUMMY_HASH


# ============================================================
# RESET PASSWORD SERIALIZER
# ============================================================

class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        return value.strip().lower()


# ============================================================
# REGISTER SERIALIZER
# ============================================================

class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True, validators=[validate_password]
    )
    confirm_password = serializers.CharField(write_only=True)

    first_name = serializers.CharField(
        max_length=150, required=False, allow_blank=True
    )
    last_name = serializers.CharField(
        max_length=150, required=False, allow_blank=True
    )

    role = serializers.ChoiceField(
        choices=[("patient", "Patient"), ("doctor", "Doctor")]
    )

    # Patient fields
    date_of_birth = serializers.DateField(required=False)
    phone = serializers.CharField(
        max_length=20, required=False, allow_blank=True
    )
    address = serializers.CharField(required=False, allow_blank=True)
    emergency_contact = serializers.CharField(
        max_length=255, required=False, allow_blank=True
    )

    # Doctor fields
    specialization = serializers.ChoiceField(
        choices=DoctorProfile.SPECIALIZATIONS, required=False
    )
    license_number = serializers.CharField(
        max_length=100, required=False, allow_blank=True
    )
    hospital = serializers.CharField(
        max_length=255, required=False, allow_blank=True
    )
    years_experience = serializers.IntegerField(
        required=False, min_value=0, max_value=80
    )
    consultation_fee = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, min_value=0
    )

    def validate_username(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Username cannot be empty.")
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Username already exists.")
        return value

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already registered.")
        return value

    def validate(self, data):
        password = data.get("password")
        confirm_password = data.get("confirm_password")
        role = data.get("role")

        if password != confirm_password:
            raise serializers.ValidationError({
                "confirm_password": "Passwords don't match."
            })

        if role == "patient":
            required_fields = [
                "date_of_birth",
                "phone",
                "address",
                "emergency_contact",
            ]
            for field in required_fields:
                value = data.get(field)
                if value is None or (
                    isinstance(value, str) and not value.strip()
                ):
                    raise serializers.ValidationError({
                        field: (
                            f"{field.replace('_', ' ').title()} "
                            f"is required for patients."
                        )
                    })

            if (
                data.get("date_of_birth")
                and data["date_of_birth"] > timezone.localdate()
            ):
                raise serializers.ValidationError({
                    "date_of_birth": "Date of birth cannot be in the future."
                })

        elif role == "doctor":
            required_fields = [
                "specialization",
                "license_number",
                "hospital",
                "years_experience",
                "consultation_fee",
            ]
            for field in required_fields:
                value = data.get(field)
                if value is None or (
                    isinstance(value, str) and not value.strip()
                ):
                    raise serializers.ValidationError({
                        field: (
                            f"{field.replace('_', ' ').title()} "
                            f"is required for doctors."
                        )
                    })

            license_number = data.get("license_number", "").strip()
            if DoctorProfile.objects.filter(
                license_number__iexact=license_number
            ).exists():
                raise serializers.ValidationError({
                    "license_number": (
                        "A doctor with this license number already exists."
                    )
                })

        return data

    def create(self, validated_data):
        role = validated_data.pop("role")
        validated_data.pop("confirm_password")
        password = validated_data.pop("password")

        # Extract role-specific fields.
        patient_fields = {
            k: validated_data.pop(k)
            for k in [
                "date_of_birth",
                "phone",
                "address",
                "emergency_contact",
            ]
            if k in validated_data
        }
        doctor_fields = {
            k: validated_data.pop(k)
            for k in [
                "specialization",
                "license_number",
                "hospital",
                "years_experience",
                "consultation_fee",
            ]
            if k in validated_data
        }

        with transaction.atomic():
            user = User.objects.create_user(
                username=validated_data["username"],
                email=validated_data["email"],
                password=password,
                first_name=validated_data.get("first_name", ""),
                last_name=validated_data.get("last_name", ""),
            )

            if role == "patient":
                PatientProfile.objects.create(
                    user=user,
                    **patient_fields,
                )
            elif role == "doctor":
                DoctorProfile.objects.create(
                    user=user,
                    **doctor_fields,
                )

        return user


# ============================================================
# CHANGE PASSWORD SERIALIZER
# ============================================================

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(
        write_only=True, validators=[validate_password]
    )
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        request = self.context.get("request")
        user = request.user if request else None

        if not user or not user.is_authenticated:
            raise serializers.ValidationError("Authentication is required.")

        if not user.check_password(data["old_password"]):
            raise serializers.ValidationError({
                "old_password": "Current password is incorrect."
            })

        if data["new_password"] != data["confirm_password"]:
            raise serializers.ValidationError({
                "confirm_password": "Passwords don't match."
            })

        if data["old_password"] == data["new_password"]:
            raise serializers.ValidationError({
                "new_password": (
                    "New password must be different from your current password."
                )
            })

        return data


# ============================================================
# VIDEO CALL SERIALIZER
# ============================================================

class VideoCallSerializer(FullCleanModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.SerializerMethodField()
    appointment_details = serializers.SerializerMethodField()
    duration_formatted = serializers.SerializerMethodField()

    class Meta:
        model = VideoCall
        fields = [
            "id",
            "appointment",
            "patient",
            "doctor",
            "room_id",
            "status",
            "started_at",
            "ended_at",
            "duration_seconds",
            "duration_formatted",
            "recording_url",
            "chat_log",
            "patient_name",
            "doctor_name",
            "appointment_details",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "appointment",
            "patient",
            "doctor",
            "room_id",
            "status",
            "started_at",
            "ended_at",
            "duration_seconds",
            "duration_formatted",
            "recording_url",
            "chat_log",
            "patient_name",
            "doctor_name",
            "appointment_details",
            "created_at",
            "updated_at",
        ]

    def get_patient_name(self, obj):
        return obj.patient.full_name

    def get_doctor_name(self, obj):
        return obj.doctor.full_name

    def get_appointment_details(self, obj):
        if not obj.appointment:
            return None
        appointment = obj.appointment
        return {
            "id": appointment.id,
            "appointment_id": appointment.appointment_id,
            "appointment_date": appointment.appointment_date,
            "start_time": appointment.start_time,
            "end_time": appointment.end_time,
            "status": appointment.status,
            "doctor_name": appointment.doctor.full_name,
        }

    def get_duration_formatted(self, obj):
        return obj.duration_formatted


# ============================================================
# START VIDEO CALL SERIALIZER
# ============================================================

class StartVideoCallSerializer(serializers.Serializer):
    appointment = serializers.IntegerField(min_value=1)

    def validate_appointment(self, value):
        try:
            appointment = Appointment.objects.select_related(
                "patient__user", "doctor__user"
            ).get(pk=value)
        except Appointment.DoesNotExist:
            raise serializers.ValidationError("Appointment not found.")

        if appointment.status not in [
            Appointment.Status.CONFIRMED,
            Appointment.Status.IN_PROGRESS,
        ]:
            raise serializers.ValidationError(
                "Appointment must be confirmed or in progress before "
                "starting a video call."
            )

        request = self.context.get("request")
        if request and request.user.is_authenticated:
            user = request.user
            is_admin = user.is_staff or user.is_superuser
            is_patient = appointment.patient.user_id == user.id
            is_doctor = appointment.doctor.user_id == user.id
            if not (is_admin or is_patient or is_doctor):
                raise serializers.ValidationError(
                    "You are not a participant in this appointment."
                )

        self._appointment = appointment
        return value

    def validate(self, attrs):
        appointment = getattr(self, "_appointment", None)
        if appointment:
            attrs["appointment"] = appointment
        return attrs


# ============================================================
# JOIN VIDEO CALL SERIALIZER
# ============================================================

class JoinVideoCallSerializer(serializers.Serializer):
    room_id = serializers.CharField(
        max_length=255, required=False, allow_blank=True
    )

    def validate_room_id(self, value):
        if value is None:
            return ""
        return value.strip()


# ============================================================
# USER PREFERENCE SERIALIZER
# ============================================================

class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = [
            "id",
            "language",
            "timezone",
            "currency",
            "theme",
            "email_appointments",
            "email_prescriptions",
            "email_results",
            "email_payments",
            "push_appointments",
            "push_messages",
            "push_reminders",
            "sms_urgent",
            "show_profile_to_doctors",
            "allow_doctor_reviews",
            "share_data_research",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_timezone(self, value):
        if not value:
            return value
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError:
            raise serializers.ValidationError(
                "Invalid IANA timezone name."
            )
        return value


# ============================================================
# FAVORITE DOCTOR SERIALIZER
# ============================================================

class FavoriteDoctorSerializer(serializers.ModelSerializer):
    doctor_details = DoctorProfileSerializer(source="doctor", read_only=True)

    class Meta:
        model = FavoriteDoctor
        fields = ["id", "doctor", "doctor_details", "created_at"]
        read_only_fields = ["id", "doctor_details", "created_at"]


# ============================================================
# SAVED SEARCH SERIALIZER
# ============================================================

class SavedSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedSearch
        fields = ["id", "name", "filters", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
from .models import SystemLog

class SystemLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = SystemLog
        fields = ['id', 'user_name', 'action', 'details', 'created_at', 'ip_address']

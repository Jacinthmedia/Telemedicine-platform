# backend/api/utils.py
import re
import uuid
import logging
from datetime import datetime, timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone

logger = logging.getLogger(__name__)


# ============================================
# ID GENERATION
# ============================================

def generate_appointment_id():
    """Generate a unique appointment ID."""
    return f"APP-{uuid.uuid4().hex[:8].upper()}"


def generate_medical_record_id():
    """Generate a unique medical record ID."""
    return f"MR-{uuid.uuid4().hex[:8].upper()}"


def generate_prescription_id():
    """Generate a unique prescription ID."""
    return f"RX-{uuid.uuid4().hex[:8].upper()}"


def generate_transaction_id():
    """Generate a unique transaction ID."""
    return f"TXN-{uuid.uuid4().hex[:12].upper()}"


def generate_document_id():
    """Generate a unique document ID."""
    return f"DOC-{uuid.uuid4().hex[:8].upper()}"


def generate_verification_code():
    """Generate a 6-digit verification code."""
    return str(uuid.uuid4().int)[:6]


def generate_slug(text, max_length=50):
    """Generate a URL-friendly slug from text."""
    slug = re.sub(r"[^a-zA-Z0-9\s-]", "", text)
    slug = re.sub(r"[-\s]+", "-", slug)
    slug = slug.strip("-").lower()

    if len(slug) > max_length:
        slug = slug[:max_length].rstrip("-")

    return slug


# ============================================
# DATE/TIME HELPERS
# ============================================

def get_current_date():
    """Get current date."""
    return timezone.now().date()


def get_current_datetime():
    """Get current datetime."""
    return timezone.now()


def format_date(date, format_str="%B %d, %Y"):
    """Format a date object."""
    if date:
        return date.strftime(format_str)
    return None


def format_datetime(dt, format_str="%B %d, %Y at %I:%M %p"):
    """Format a datetime object."""
    if dt:
        return dt.strftime(format_str)
    return None


def get_date_range(start_date, end_date):
    """Get a list of dates between start_date and end_date (inclusive)."""
    if not start_date or not end_date:
        return []

    delta = end_date - start_date
    return [start_date + timedelta(days=i) for i in range(delta.days + 1)]


def is_date_in_past(date):
    """Check if a date is in the past."""
    return date < get_current_date()


def is_date_in_future(date):
    """Check if a date is in the future."""
    return date > get_current_date()


def is_datetime_in_past(dt):
    """Check if a datetime is in the past."""
    return dt < get_current_datetime()


def is_datetime_in_future(dt):
    """Check if a datetime is in the future."""
    return dt > get_current_datetime()


def calculate_age(date_of_birth):
    """Calculate age from date of birth."""
    if not date_of_birth:
        return None

    today = get_current_date()
    age = today.year - date_of_birth.year
    if (today.month, today.day) < (date_of_birth.month, date_of_birth.day):
        age -= 1
    return age


# ============================================
# APPOINTMENT HELPERS
# ============================================

def check_appointment_conflict(
    doctor,
    appointment_date,
    start_time,
    end_time,
    exclude_id=None,
):
    """
    Check if there is a conflict for a doctor's appointment.

    Returns True if any active appointment overlaps the given time.
    """
    from .models import Appointment

    appointments = Appointment.objects.filter(
        doctor=doctor,
        appointment_date=appointment_date,
        status__in=[
            Appointment.Status.PENDING,
            Appointment.Status.CONFIRMED,
            Appointment.Status.IN_PROGRESS,
        ],
    )

    if exclude_id:
        appointments = appointments.exclude(id=exclude_id)

    for appointment in appointments:
        if (
            start_time < appointment.end_time
            and end_time > appointment.start_time
        ):
            return True

    return False


def get_available_time_slots(doctor, appointment_date):
    """
    Get available time slots for a doctor on a given date.

    Returns a list of dicts: [{"start_time": time, "end_time": time}, ...]
    """
    from .models import DoctorAvailability, Appointment

    day_of_week = appointment_date.weekday()

    availability = DoctorAvailability.objects.filter(
        doctor=doctor,
        day_of_week=day_of_week,
        is_available=True,
    ).first()

    if not availability:
        return []

    booked = Appointment.objects.filter(
        doctor=doctor,
        appointment_date=appointment_date,
        status__in=[
            Appointment.Status.PENDING,
            Appointment.Status.CONFIRMED,
            Appointment.Status.IN_PROGRESS,
        ],
    ).order_by("start_time")

    start = availability.start_time
    end = availability.end_time
    slot_duration = timedelta(minutes=30)

    time_slots = []
    current = datetime.combine(appointment_date, start)
    end_datetime = datetime.combine(appointment_date, end)

    while current + slot_duration <= end_datetime:
        slot_start = current.time()
        slot_end = (current + slot_duration).time()

        is_available = True
        for book in booked:
            if slot_start < book.end_time and slot_end > book.start_time:
                is_available = False
                break

        if is_available:
            time_slots.append(
                {"start_time": slot_start, "end_time": slot_end}
            )

        current += slot_duration

    return time_slots


# ============================================
# DRF VALIDATION BRIDGE
# ============================================

def full_clean_or_400(instance):
    """
    Run full_clean() on a model instance and convert Django's
    ValidationError into a DRF ValidationError (HTTP 400).

    Use in construct-before-save flows:

        obj = MyModel(**validated_data)
        full_clean_or_400(obj)
        obj.save()

    Raises serializers.ValidationError on failure.
    Returns None on success.
    """
    from rest_framework import serializers

    try:
        instance.full_clean(exclude=None, validate_unique=True)
    except ValidationError as exc:
        if hasattr(exc, "message_dict"):
            raise serializers.ValidationError(exc.message_dict)
        raise serializers.ValidationError({"detail": exc.messages})


# ============================================
# FILE VALIDATION
# ============================================

def validate_file_size(file, max_size_mb=10):
    """Validate file size (returns bool)."""
    max_size_bytes = max_size_mb * 1024 * 1024
    return file.size <= max_size_bytes


def validate_file_extension(filename, allowed_extensions):
    """Validate file extension (returns bool)."""
    extension = filename.split(".")[-1].lower()
    return extension in allowed_extensions


def get_file_size_display(size_bytes):
    """Get human-readable file size."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    if size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    if size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"


def get_file_type(filename):
    """Get file type from extension."""
    extension = filename.split(".")[-1].lower()

    image_types = ["jpg", "jpeg", "png", "gif", "webp", "svg"]
    document_types = ["pdf", "doc", "docx", "txt", "rtf"]
    spreadsheet_types = ["xls", "xlsx", "csv"]
    presentation_types = ["ppt", "pptx"]

    if extension in image_types:
        return "image"
    if extension in document_types:
        return "document"
    if extension in spreadsheet_types:
        return "spreadsheet"
    if extension in presentation_types:
        return "presentation"
    return "other"


# ============================================
# VALIDATION HELPERS
# ============================================

def validate_phone_number(phone):
    """Basic phone number validation."""
    cleaned = re.sub(r"[\s\-()]", "", phone)
    return 10 <= len(cleaned) <= 15


def validate_password_strength(password):
    """
    Validate password strength.

    Returns (is_valid: bool, message: str).
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    return True, "Password is strong"


def validate_url(url):
    """Validate URL."""
    regex = re.compile(
        r"^(?:http|ftp)s?://"
        r"(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+"
        r"(?:[A-Z]{2,6}\.?|[A-Z0-9-]{2,}\.?)|"
        r"localhost|"
        r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
        r"\[?[A-F0-9]*:[A-F0-9:]+\]?)"
        r"(?::\d+)?"
        r"(?:/?|[/?]\S+)$",
        re.IGNORECASE,
    )
    return re.match(regex, url) is not None


# ============================================
# CALCULATION HELPERS
# ============================================

def calculate_bmi(weight_kg, height_cm):
    """Calculate BMI from weight (kg) and height (cm)."""
    if not weight_kg or not height_cm or height_cm == 0:
        return None
    height_m = height_cm / 100
    return round(weight_kg / (height_m * height_m), 1)


def get_bmi_category(bmi):
    """Get BMI category."""
    if not bmi:
        return "Unknown"
    if bmi < 18.5:
        return "Underweight"
    if bmi < 25:
        return "Normal weight"
    if bmi < 30:
        return "Overweight"
    if bmi < 35:
        return "Obese Class I"
    if bmi < 40:
        return "Obese Class II"
    return "Obese Class III"


def calculate_health_score(metrics):
    """
    Calculate a health score (0-100) based on various metrics.
    """
    score = 0

    bmi = metrics.get("bmi")
    if bmi:
        if 18.5 <= bmi <= 25:
            score += 25
        elif 17 <= bmi <= 27:
            score += 15
        elif 16 <= bmi <= 28:
            score += 5

    systolic = metrics.get("blood_pressure_systolic")
    diastolic = metrics.get("blood_pressure_diastolic")
    if systolic and diastolic:
        if systolic < 120 and diastolic < 80:
            score += 25
        elif systolic < 130 and diastolic < 85:
            score += 15
        elif systolic < 140 and diastolic < 90:
            score += 5

    heart_rate = metrics.get("heart_rate")
    if heart_rate:
        if 60 <= heart_rate <= 80:
            score += 20
        elif 50 <= heart_rate <= 90:
            score += 10
        elif 40 <= heart_rate <= 100:
            score += 5

    steps = metrics.get("steps")
    if steps:
        if steps >= 10000:
            score += 15
        elif steps >= 7000:
            score += 10
        elif steps >= 5000:
            score += 5

    sleep = metrics.get("sleep_hours")
    if sleep:
        if 7 <= sleep <= 9:
            score += 15
        elif 6 <= sleep <= 10:
            score += 10
        elif 5 <= sleep <= 11:
            score += 5

    return min(score, 100)


# ============================================
# USER / PROFILE HELPERS
# ============================================

def get_doctor(user):
    """Safely return DoctorProfile or None."""
    if not user or not user.is_authenticated:
        return None
    return getattr(user, "doctor_profile", None)


def get_patient(user):
    """Safely return PatientProfile or None."""
    if not user or not user.is_authenticated:
        return None
    return getattr(user, "patient_profile", None)


# ============================================
# NOTIFICATION HELPERS
# ============================================

def create_notification(
    user,
    title,
    message,
    notification_type="system",
    link="",
    related_object=None,
):
    """
    Create a notification for a user.

    Note: views.py defines its own create_notification with a
    slightly different signature. Prefer that one in views; this
    one is kept for scripts / management commands.
    """
    from .models import Notification

    related_object_id = None
    if related_object is not None:
        related_object_id = getattr(related_object, "pk", None)

    try:
        Notification.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            link=link or "",
            related_object_id=related_object_id,
        )
    except Exception as e:
        logger.error(
            f"Failed to create notification for "
            f"{getattr(user, 'username', user)}: {e}"
        )


# ============================================
# LOGGING HELPERS
# ============================================

def log_system_action(
    user,
    action,
    model_name,
    object_id=None,
    details=None,
):
    """Log a system action."""
    from .models import SystemLog

    try:
        SystemLog.objects.create(
            user=user,
            action=action,
            model_name=model_name,
            object_id=str(object_id) if object_id else "",
            details=details or {},
        )
    except Exception as e:
        logger.error(f"Failed to log system action: {e}")


# ============================================
# EMAIL HELPERS
# ============================================

def send_email(subject, message, recipient_list, html_message=None):
    """Send an email. Returns True on success, False otherwise."""
    if not getattr(settings, "EMAIL_HOST_USER", None):
        logger.warning("Email not configured. Skipping email send.")
        return False

    try:
        from django.core.mail import send_mail

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=recipient_list,
            html_message=html_message,
            fail_silently=True,
        )
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False


def send_verification_email(user, verification_code):
    """Send a verification email to a user."""
    subject = "Verify Your Email - Telemedicine Platform"
    message = f"""
    Hello {user.get_full_name()},

    Please use the following verification code to verify your email:

    {verification_code}

    This code will expire in 24 hours.

    If you didn't request this, please ignore this email.

    Best regards,
    Telemedicine Team
    """
    return send_email(subject, message, [user.email])


def send_password_reset_email(user, reset_link):
    """Send a password reset email to a user."""
    subject = "Password Reset - Telemedicine Platform"
    message = f"""
    Hello {user.get_full_name()},

    We received a request to reset your password.

    Please click the link below to reset your password:

    {reset_link}

    This link will expire in 1 hour.

    If you didn't request this, please ignore this email.

    Best regards,
    Telemedicine Team
    """
    return send_email(subject, message, [user.email])


# ============================================
# PAYMENT HELPERS
# ============================================

def process_payment(amount, currency, payment_method, patient, appointment):
    """
    Placeholder for payment processing.

    In production, integrate with a payment provider (Stripe, Paystack, etc.).
    Returns a dict: {"success": bool, "payment": Payment, "message": str}.
    """
    from .models import Payment

    transaction_ref = generate_transaction_id()

    payment = Payment.objects.create(
        patient=patient,
        appointment=appointment,
        amount=amount,
        currency=currency,
        payment_method=payment_method,
        payment_status=Payment.PaymentStatus.PENDING,
        transaction_reference=transaction_ref,
    )

    try:
        # Simulated success — replace with real provider call.
        payment_success = True

        if payment_success:
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

            appointment.payment_status = (
                appointment.PaymentStatus.PAID
            )
            appointment.is_paid = True
            appointment.payment_id = transaction_ref
            appointment.save(
                update_fields=[
                    "payment_status",
                    "is_paid",
                    "payment_id",
                    "updated_at",
                ]
            )

            return {
                "success": True,
                "payment": payment,
                "message": "Payment processed successfully",
            }

        payment.payment_status = Payment.PaymentStatus.FAILED
        payment.save(update_fields=["payment_status", "updated_at"])

        return {
            "success": False,
            "payment": payment,
            "message": "Payment failed",
        }

    except Exception as e:
        payment.payment_status = Payment.PaymentStatus.FAILED
        payment.save(update_fields=["payment_status", "updated_at"])
        logger.error(f"Payment processing error: {e}")

        return {
            "success": False,
            "payment": payment,
            "message": str(e),
        }


# ============================================
# RATING HELPERS
# ============================================

def update_doctor_rating(doctor):
    """
    Update a doctor's rating based on all reviews.

    Returns (new_rating, total_reviews).
    """
    from django.db.models import Avg, Count
    from .models import Review

    stats = Review.objects.filter(doctor=doctor).aggregate(
        avg=Avg("rating"),
        count=Count("id"),
    )

    doctor.rating = round(stats["avg"] or 0, 2)
    doctor.total_reviews = stats["count"] or 0
    doctor.save(update_fields=["rating", "total_reviews", "updated_at"])

    return doctor.rating, doctor.total_reviews


# ============================================
# SEARCH HELPERS
# ============================================

def search_doctors(query, filters=None):
    """
    Search for doctors based on query and filters.
    Returns a DoctorProfile QuerySet.
    """
    from django.db.models import Q
    from .models import DoctorProfile

    queryset = DoctorProfile.objects.filter(
        verification_status=DoctorProfile.VerificationStatus.APPROVED,
        available=True,
    )

    if query:
        queryset = queryset.filter(
            Q(user__first_name__icontains=query)
            | Q(user__last_name__icontains=query)
            | Q(specialization__icontains=query)
            | Q(hospital__icontains=query)
            | Q(bio__icontains=query)
        )

    if filters:
        specialization = filters.get("specialization")
        if specialization:
            queryset = queryset.filter(specialization=specialization)

        min_rating = filters.get("min_rating")
        if min_rating:
            queryset = queryset.filter(rating__gte=min_rating)

        max_fee = filters.get("max_fee")
        if max_fee:
            queryset = queryset.filter(consultation_fee__lte=max_fee)

    return queryset


# ============================================
# DATA EXPORT HELPERS
# ============================================

def export_appointment_data(appointments):
    """Export appointment data to a list of dictionaries."""
    data = []
    for appointment in appointments:
        data.append({
            "appointment_id": appointment.appointment_id,
            "patient": appointment.patient.full_name,
            "doctor": appointment.doctor.full_name,
            "date": str(appointment.appointment_date),
            "start_time": str(appointment.start_time),
            "end_time": str(appointment.end_time),
            "status": appointment.status,
            "consultation_type": appointment.consultation_type,
            "symptoms": appointment.symptoms,
            "diagnosis": appointment.diagnosis,
            "created_at": str(appointment.created_at),
        })
    return data


def export_patient_data(patients):
    """Export patient data to a list of dictionaries."""
    data = []
    for patient in patients:
        data.append({
            "name": patient.full_name,
            "email": patient.user.email,
            "phone": patient.phone,
            "date_of_birth": str(patient.date_of_birth),
            "age": patient.age,
            "blood_type": patient.blood_type,
            "gender": patient.gender,
            "address": patient.address,
            "city": patient.city,
            "state": patient.state,
            "country": patient.country,
            "allergies": patient.allergies,
            "chronic_conditions": patient.chronic_conditions,
        })
    return data


# ============================================
# RATE LIMITING HELPERS
# ============================================

class RateLimiter:
    """
    Simple in-memory rate limiter.

    Not suitable for multi-process deployments — use Redis or
    Django's cache framework in production.
    """

    def __init__(self, key, max_attempts=5, time_window=300):
        self.key = key
        self.max_attempts = max_attempts
        self.time_window = time_window
        self.cache = {}

    def is_allowed(self, identifier):
        """Check if request is allowed."""
        cache_key = f"{self.key}_{identifier}"

        if cache_key not in self.cache:
            self.cache[cache_key] = {
                "count": 1,
                "timestamp": timezone.now(),
            }
            return True

        data = self.cache[cache_key]
        elapsed = (timezone.now() - data["timestamp"]).total_seconds()

        if elapsed > self.time_window:
            self.cache[cache_key] = {
                "count": 1,
                "timestamp": timezone.now(),
            }
            return True

        if data["count"] >= self.max_attempts:
            return False

        data["count"] += 1
        return True

    def reset(self, identifier):
        """Reset rate limit for an identifier."""
        cache_key = f"{self.key}_{identifier}"
        self.cache.pop(cache_key, None)
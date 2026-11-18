from datetime import date, datetime, time
from uuid import uuid4

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone


# ============================================================
# FILE UPLOAD PATHS
# ============================================================

def patient_profile_picture_path(instance, filename):
    return f"profiles/patients/{instance.user_id}/{filename}"


def doctor_profile_picture_path(instance, filename):
    return f"profiles/doctors/{instance.user_id}/{filename}"


def chat_attachment_path(instance, filename):
    return (
        f"chat/{instance.sender_id}/"
        f"{timezone.now():%Y/%m/%d}/{filename}"
    )


def document_upload_path(instance, filename):
    return f"documents/{timezone.now():%Y/%m/%d}/{filename}"


# ============================================================
# PATIENT PROFILE
# ============================================================

class PatientProfile(models.Model):

    class BloodType(models.TextChoices):
        A_POSITIVE = "A+", "A+"
        A_NEGATIVE = "A-", "A-"
        B_POSITIVE = "B+", "B+"
        B_NEGATIVE = "B-", "B-"
        AB_POSITIVE = "AB+", "AB+"
        AB_NEGATIVE = "AB-", "AB-"
        O_POSITIVE = "O+", "O+"
        O_NEGATIVE = "O-", "O-"
        UNKNOWN = "unknown", "Unknown"

    class Gender(models.TextChoices):
        MALE = "male", "Male"
        FEMALE = "female", "Female"
        OTHER = "other", "Other"
        PREFER_NOT_TO_SAY = "prefer_not_to_say", "Prefer not to say"

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="patient_profile",
    )

    profile_picture = models.ImageField(
        upload_to=patient_profile_picture_path,
        blank=True,
        null=True,
    )

    date_of_birth = models.DateField()

    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default="Nigeria", blank=True)
    emergency_contact = models.CharField(max_length=255, blank=True)

    blood_type = models.CharField(
        max_length=20,
        choices=BloodType.choices,
        default=BloodType.UNKNOWN,
    )

    gender = models.CharField(
        max_length=30,
        choices=Gender.choices,
        default=Gender.OTHER,
    )

    allergies = models.TextField(blank=True)
    chronic_conditions = models.TextField(blank=True)
    current_medications = models.TextField(blank=True)
    medical_history = models.TextField(blank=True)

    height = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Height in centimeters",
    )

    weight = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Weight in kilograms",
    )

    insurance_provider = models.CharField(max_length=255, blank=True)
    insurance_id = models.CharField(max_length=100, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["date_of_birth"]),
            models.Index(fields=["blood_type"]),
            models.Index(fields=["gender"]),
        ]

    def __str__(self):
        return f"Patient: {self.user.get_full_name() or self.user.username}"

    @property
    def full_name(self):
        return self.user.get_full_name() or self.user.username

    @property
    def age(self):
        if not self.date_of_birth:
            return None

        today = timezone.localdate()
        return (
            today.year
            - self.date_of_birth.year
            - (
                (today.month, today.day)
                < (self.date_of_birth.month, self.date_of_birth.day)
            )
        )


# ============================================================
# DOCTOR PROFILE
# ============================================================

class DoctorProfile(models.Model):

    class VerificationStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        SUSPENDED = "suspended", "Suspended"

    SPECIALIZATIONS = (
        ("General Practice", "General Practice"),
        ("Family Medicine", "Family Medicine"),
        ("Internal Medicine", "Internal Medicine"),
        ("Pediatrics", "Pediatrics"),
        ("Cardiology", "Cardiology"),
        ("Dermatology", "Dermatology"),
        ("Neurology", "Neurology"),
        ("Psychiatry", "Psychiatry"),
        ("Obstetrics & Gynecology", "Obstetrics & Gynecology"),
        ("Orthopedics", "Orthopedics"),
        ("Ophthalmology", "Ophthalmology"),
        ("ENT", "ENT"),
        ("Dentistry", "Dentistry"),
        ("Radiology", "Radiology"),
        ("Surgery", "Surgery"),
        ("Urology", "Urology"),
        ("Oncology", "Oncology"),
        ("Endocrinology", "Endocrinology"),
        ("Gastroenterology", "Gastroenterology"),
        ("Pulmonology", "Pulmonology"),
        ("Nephrology", "Nephrology"),
        ("Other", "Other"),
    )

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="doctor_profile",
    )

    profile_picture = models.ImageField(
        upload_to=doctor_profile_picture_path,
        blank=True,
        null=True,
    )

    specialization = models.CharField(
        max_length=100,
        choices=SPECIALIZATIONS,
    )

    license_number = models.CharField(max_length=100, unique=True)
    hospital = models.CharField(max_length=255, blank=True)
    years_experience = models.PositiveIntegerField(default=0)

    consultation_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )

    available = models.BooleanField(default=False)

    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )

    is_verified = models.BooleanField(default=False)

    rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(5),
        ],
    )

    total_reviews = models.PositiveIntegerField(default=0)

    bio = models.TextField(blank=True)
    education = models.TextField(blank=True)
    certifications = models.TextField(blank=True)
    languages = models.CharField(max_length=255, blank=True)

    monday_hours = models.CharField(max_length=50, blank=True)
    tuesday_hours = models.CharField(max_length=50, blank=True)
    wednesday_hours = models.CharField(max_length=50, blank=True)
    thursday_hours = models.CharField(max_length=50, blank=True)
    friday_hours = models.CharField(max_length=50, blank=True)
    saturday_hours = models.CharField(max_length=50, blank=True)
    sunday_hours = models.CharField(max_length=50, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-rating", "-created_at"]
        indexes = [
            models.Index(fields=["specialization"]),
            models.Index(fields=["verification_status"]),
            models.Index(fields=["available"]),
            models.Index(fields=["rating"]),
            models.Index(fields=["years_experience"]),
        ]

    def __str__(self):
        return f"Dr. {self.user.get_full_name() or self.user.username}"

    @property
    def full_name(self):
        return self.user.get_full_name() or self.user.username

    def save(self, *args, **kwargs):
        # FIX: derived field is_verified; convert update_fields set
        # back to a list (Django expects a list/tuple).
        self.is_verified = (
            self.verification_status
            == self.VerificationStatus.APPROVED
        )

        update_fields = kwargs.get("update_fields")

        if update_fields is not None:
            update_fields = set(update_fields)

            if "verification_status" in update_fields:
                update_fields.add("is_verified")

            kwargs["update_fields"] = list(update_fields)

        super().save(*args, **kwargs)

    def update_rating(self):
        from django.db.models import Avg, Count

        result = self.reviews.aggregate(
            average_rating=Avg("rating"),
            review_count=Count("id"),
        )

        self.rating = round(result["average_rating"] or 0, 2)
        self.total_reviews = result["review_count"] or 0

        self.save(update_fields=["rating", "total_reviews"])


# ============================================================
# DOCTOR AVAILABILITY
# ============================================================

class DoctorAvailability(models.Model):

    class DayOfWeek(models.IntegerChoices):
        MONDAY = 0, "Monday"
        TUESDAY = 1, "Tuesday"
        WEDNESDAY = 2, "Wednesday"
        THURSDAY = 3, "Thursday"
        FRIDAY = 4, "Friday"
        SATURDAY = 5, "Saturday"
        SUNDAY = 6, "Sunday"

    doctor = models.ForeignKey(
        DoctorProfile,
        on_delete=models.CASCADE,
        related_name="availability",
    )

    day_of_week = models.PositiveSmallIntegerField(
        choices=DayOfWeek.choices,
    )

    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)

    class Meta:
        ordering = ["day_of_week", "start_time"]
        constraints = [
            models.UniqueConstraint(
                fields=["doctor", "day_of_week"],
                name="unique_doctor_day_availability",
            ),
        ]
        indexes = [
            models.Index(fields=["doctor", "day_of_week"]),
            models.Index(fields=["is_available"]),
        ]

    def __str__(self):
        return (
            f"{self.doctor} - "
            f"{self.get_day_of_week_display()} "
            f"{self.start_time} - {self.end_time}"
        )

    def clean(self):
        # FIX: kept (serializer also checks), used by full_clean.
        if (
            self.start_time
            and self.end_time
            and self.start_time >= self.end_time
        ):
            raise ValidationError(
                "Start time must be earlier than end time."
            )

    @property
    def day_display(self):
        return self.get_day_of_week_display()


# ============================================================
# APPOINTMENT
# ============================================================

class Appointment(models.Model):

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    class ConsultationType(models.TextChoices):
        VIDEO = "video", "Video Consultation"
        AUDIO = "audio", "Audio Consultation"
        CHAT = "chat", "Chat Consultation"
        IN_PERSON = "in_person", "In Person"

    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"
        CANCELLED = "cancelled", "Cancelled"

    appointment_id = models.UUIDField(
        default=uuid4,
        unique=True,
        editable=False,
    )

    patient = models.ForeignKey(
        PatientProfile,
        on_delete=models.PROTECT,
        related_name="appointments",
    )

    doctor = models.ForeignKey(
        DoctorProfile,
        on_delete=models.PROTECT,
        related_name="appointments",
    )

    appointment_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()

    duration = models.PositiveIntegerField(
        default=30,
        editable=False,
        help_text="Duration in minutes",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    consultation_type = models.CharField(
        max_length=20,
        choices=ConsultationType.choices,
        default=ConsultationType.VIDEO,
    )

    reason = models.TextField(blank=True)
    symptoms = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    diagnosis = models.TextField(blank=True)
    prescription = models.TextField(blank=True)
    treatment_plan = models.TextField(blank=True)

    meeting_link = models.CharField(max_length=500, blank=True)
    call_id = models.CharField(max_length=255, blank=True)
    recording_url = models.CharField(max_length=500, blank=True)

    call_started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )

    payment_id = models.CharField(max_length=255, blank=True)
    is_paid = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-appointment_date", "-start_time"]
        constraints = [
            models.CheckConstraint(
                condition=Q(end_time__gt=models.F("start_time")),
                name="appointment_end_after_start",
            ),
        ]
        indexes = [
            models.Index(
                fields=["doctor", "appointment_date", "status"]
            ),
            models.Index(
                fields=["patient", "appointment_date", "status"]
            ),
            models.Index(fields=["appointment_date"]),
            models.Index(fields=["status"]),
            models.Index(fields=["payment_status"]),
        ]

    def __str__(self):
        return (
            f"{self.appointment_id} - "
            f"{self.patient} with {self.doctor}"
        )

    def save(self, *args, **kwargs):
        # FIX: derived duration; update_fields set -> list.
        if self.start_time and self.end_time:
            start = datetime.combine(date.min, self.start_time)
            end = datetime.combine(date.min, self.end_time)
            seconds = (end - start).total_seconds()

            if seconds > 0:
                self.duration = max(1, int(seconds / 60))

        update_fields = kwargs.get("update_fields")

        if update_fields is not None:
            update_fields = set(update_fields)

            if (
                "start_time" in update_fields
                or "end_time" in update_fields
            ):
                update_fields.add("duration")

            kwargs["update_fields"] = list(update_fields)

        super().save(*args, **kwargs)

    def clean(self):
        # Time sanity
        if (
            self.start_time
            and self.end_time
            and self.start_time >= self.end_time
        ):
            raise ValidationError(
                "Appointment end time must be later than start time."
            )

        # Creation-time scheduling rules.
        if self._state.adding and self.appointment_date:
            today = timezone.localdate()

            if self.appointment_date < today:
                raise ValidationError(
                    "Appointment date cannot be in the past."
                )

            if self.appointment_date == today and self.start_time:
                current_time = timezone.localtime().time()
                if self.start_time <= current_time:
                    raise ValidationError(
                        "Appointment time cannot be in the past."
                    )

        # Conflict check — runs on create, and on update only when
        # the schedule fields actually changed. Excludes self on update.
        if (
            self.doctor_id
            and self.appointment_date
            and self.start_time
            and self.end_time
        ):
            conflicting_statuses = [
                self.Status.PENDING,
                self.Status.CONFIRMED,
                self.Status.IN_PROGRESS,
            ]

            qs = Appointment.objects.filter(
                doctor_id=self.doctor_id,
                appointment_date=self.appointment_date,
                status__in=conflicting_statuses,
                start_time__lt=self.end_time,
                end_time__gt=self.start_time,
            )

            # FIX: exclude self on update too (was only guarded by
            # _state.adding, so reschedules skipped the check).
            if self.pk:
                qs = qs.exclude(pk=self.pk)

            if qs.exists():
                raise ValidationError(
                    "The doctor already has an appointment "
                    "during this time."
                )

    @property
    def scheduled_time(self):
        combined = datetime.combine(
            self.appointment_date,
            self.start_time,
        )

        if timezone.is_naive(combined):
            return timezone.make_aware(combined)

        return combined

    @property
    def is_upcoming(self):
        if self.status not in [
            self.Status.PENDING,
            self.Status.CONFIRMED,
        ]:
            return False

        return self.scheduled_time >= timezone.now()


# ============================================================
# MEDICAL RECORD
# ============================================================

class MedicalRecord(models.Model):

    record_id = models.UUIDField(
        default=uuid4,
        unique=True,
        editable=False,
    )

    patient = models.ForeignKey(
        PatientProfile,
        on_delete=models.PROTECT,
        related_name="medical_records",
    )

    doctor = models.ForeignKey(
        DoctorProfile,
        on_delete=models.PROTECT,
        related_name="medical_records",
        null=True,
        blank=True,
    )

    appointment = models.OneToOneField(
        Appointment,
        on_delete=models.PROTECT,
        related_name="medical_record",
        null=True,
        blank=True,
    )

    record_date = models.DateTimeField(default=timezone.now)

    diagnosis = models.TextField(blank=True)
    symptoms = models.TextField(blank=True)
    treatment = models.TextField(blank=True)
    prescription = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    blood_pressure_systolic = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(300)],
    )

    blood_pressure_diastolic = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(200)],
    )

    vitals = models.JSONField(default=dict, blank=True)
    follow_up_date = models.DateField(null=True, blank=True)
    lab_results = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-record_date"]
        indexes = [
            models.Index(fields=["patient", "record_date"]),
            models.Index(fields=["doctor", "record_date"]),
            models.Index(fields=["follow_up_date"]),
        ]

    def __str__(self):
        return f"Medical Record {self.record_id}"

    @property
    def blood_pressure(self):
        # FIX: serializer was calling obj.blood_pressure — property
        # didn't exist.
        if (
            self.blood_pressure_systolic is None
            or self.blood_pressure_diastolic is None
        ):
            return None
        return (
            f"{self.blood_pressure_systolic}/"
            f"{self.blood_pressure_diastolic}"
        )

    def clean(self):
        if self.appointment:
            if self.patient_id != self.appointment.patient_id:
                raise ValidationError(
                    "Medical record patient must match appointment patient."
                )

            if (
                self.doctor_id
                and self.appointment.doctor_id != self.doctor_id
            ):
                raise ValidationError(
                    "Medical record doctor must match appointment doctor."
                )


# ============================================================
# PRESCRIPTION
# ============================================================

class Prescription(models.Model):

    medical_record = models.ForeignKey(
        MedicalRecord,
        on_delete=models.SET_NULL,
        related_name="prescriptions",
        null=True,
        blank=True,
    )

    patient = models.ForeignKey(
        PatientProfile,
        on_delete=models.PROTECT,
        related_name="prescriptions",
    )

    doctor = models.ForeignKey(
        DoctorProfile,
        on_delete=models.PROTECT,
        related_name="prescriptions",
        null=True,
        blank=True,
    )

    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.SET_NULL,
        related_name="prescriptions",
        null=True,
        blank=True,
    )

    medication_name = models.CharField(max_length=255)
    dosage = models.CharField(max_length=255)
    frequency = models.CharField(max_length=255)
    duration = models.CharField(max_length=255)
    instructions = models.TextField(blank=True)

    refills = models.PositiveIntegerField(default=0)
    refills_used = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    issued_at = models.DateTimeField(default=timezone.now)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-issued_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(refills_used__lte=models.F("refills")),
                name="prescription_refills_used_lte_refills",
            ),
        ]
        indexes = [
            models.Index(fields=["patient", "is_active"]),
            models.Index(fields=["doctor"]),
            models.Index(fields=["issued_at"]),
        ]

    def __str__(self):
        return f"{self.medication_name} - {self.patient}"

    def clean(self):
        if self.refills_used > self.refills:
            raise ValidationError(
                "Refills used cannot exceed total refills."
            )

        if (
            self.appointment
            and self.patient_id != self.appointment.patient_id
        ):
            raise ValidationError(
                "Prescription patient must match appointment patient."
            )

        if (
            self.appointment
            and self.doctor_id
            and self.doctor_id != self.appointment.doctor_id
        ):
            raise ValidationError(
                "Prescription doctor must match appointment doctor."
            )

        if (
            self.medical_record
            and self.patient_id != self.medical_record.patient_id
        ):
            raise ValidationError(
                "Prescription patient must match medical record patient."
            )

    @property
    def refills_remaining(self):
        return max(0, self.refills - self.refills_used)


# ============================================================
# NOTIFICATION
# ============================================================

class Notification(models.Model):

    class NotificationType(models.TextChoices):
        SYSTEM = "system", "System"
        APPOINTMENT = "appointment", "Appointment"
        MEDICAL_RECORD = "medical_record", "Medical Record"
        PRESCRIPTION = "prescription", "Prescription"
        PAYMENT = "payment", "Payment"
        MESSAGE = "message", "Message"
        REVIEW = "review", "Review"
        DOCUMENT = "document", "Document"
        DOCTOR_VERIFICATION = (
            "doctor_verification",
            "Doctor Verification",
        )
        SECURITY = "security", "Security"

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    title = models.CharField(max_length=255)
    message = models.TextField()

    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM,
    )

    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=500, blank=True)

    related_object_id = models.PositiveBigIntegerField(
        null=True,
        blank=True,
    )

    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["user", "is_read", "created_at"]
            ),
            models.Index(fields=["notification_type"]),
        ]

    def __str__(self):
        return f"{self.title} - {self.user.username}"

    def mark_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=["is_read", "read_at"])


# ============================================================
# REVIEW
# ============================================================

class Review(models.Model):

    appointment = models.OneToOneField(
        Appointment,
        on_delete=models.PROTECT,
        related_name="review",
    )

    patient = models.ForeignKey(
        PatientProfile,
        on_delete=models.PROTECT,
        related_name="reviews",
    )

    doctor = models.ForeignKey(
        DoctorProfile,
        on_delete=models.PROTECT,
        related_name="reviews",
    )

    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )

    comment = models.TextField(blank=True)
    is_anonymous = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["doctor", "created_at"]),
            models.Index(fields=["patient", "created_at"]),
            models.Index(fields=["rating"]),
        ]

    def __str__(self):
        return f"Review {self.rating}/5 - {self.doctor}"

    def clean(self):
        if self.appointment:
            if self.appointment.status != Appointment.Status.COMPLETED:
                raise ValidationError(
                    "Only completed appointments can be reviewed."
                )

            if self.patient_id != self.appointment.patient_id:
                raise ValidationError(
                    "Review patient must match appointment patient."
                )

            if self.doctor_id != self.appointment.doctor_id:
                raise ValidationError(
                    "Review doctor must match appointment doctor."
                )

    @property
    def rating_display(self):
        return f"{self.rating}/5"


# ============================================================
# CHAT MESSAGE
# ============================================================

class ChatMessage(models.Model):

    # FIX: on_delete changed from CASCADE to SET_NULL so deleting a
    # user doesn't nuke the other party's chat history. Make sure
    # you run a migration for this (and that your view/serializer
    # handles the nullable sender/receiver gracefully).
    sender = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="sent_messages",
        null=True,
    )

    receiver = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="received_messages",
        null=True,
    )

    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.SET_NULL,
        related_name="chat_messages",
        null=True,
        blank=True,
    )

    message = models.TextField(blank=True)

    attachment = models.FileField(
        upload_to=chat_attachment_path,
        blank=True,
        null=True,
    )

    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(
                fields=["sender", "receiver", "created_at"]
            ),
            models.Index(
                fields=["receiver", "is_read", "created_at"]
            ),
            models.Index(fields=["appointment"]),
        ]

    def __str__(self):
        s = self.sender.username if self.sender else "(deleted)"
        r = self.receiver.username if self.receiver else "(deleted)"
        return f"Message from {s} to {r}"

    def clean(self):
        # FIX: rewritten from the tangled nested conditional.
        if self.sender_id and self.receiver_id and self.sender_id == self.receiver_id:
            raise ValidationError(
                "A user cannot send a message to themselves."
            )

        has_text = bool(self.message and self.message.strip())
        has_file = bool(self.attachment)

        if not has_text and not has_file:
            raise ValidationError(
                "Message must contain text or an attachment."
            )

        if self.appointment:
            if not (self.sender_id and self.receiver_id):
                return

            participant_ids = {
                self.appointment.patient.user_id,
                self.appointment.doctor.user_id,
            }

            admin_ids = set(
                User.objects.filter(is_staff=True).values_list(
                    "id", flat=True
                )
            )

            allowed_ids = participant_ids | admin_ids

            if (
                self.sender_id not in allowed_ids
                or self.receiver_id not in allowed_ids
            ):
                raise ValidationError(
                    "Message participants must belong to "
                    "the appointment."
                )

    def mark_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=["is_read", "read_at"])


# ============================================================
# PAYMENT
# ============================================================

class Payment(models.Model):

    class PaymentMethod(models.TextChoices):
        CARD = "card", "Card"
        BANK_TRANSFER = "bank_transfer", "Bank Transfer"
        CASH = "cash", "Cash"
        INSURANCE = "insurance", "Insurance"
        WALLET = "wallet", "Wallet"
        ONLINE = "online", "Online"

    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"
        CANCELLED = "cancelled", "Cancelled"

    patient = models.ForeignKey(
        PatientProfile,
        on_delete=models.PROTECT,
        related_name="payments",
    )

    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.PROTECT,
        related_name="payments",
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0.01)],
    )

    currency = models.CharField(max_length=10, default="NGN")

    payment_method = models.CharField(
        max_length=30,
        choices=PaymentMethod.choices,
        default=PaymentMethod.ONLINE,
    )

    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )

    transaction_reference = models.CharField(
        max_length=255,
        unique=True,
    )

    payment_data = models.JSONField(default=dict, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    is_paid = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            # FIX: enforce at most one PAID payment per appointment.
            # Postgres partial unique index.
            models.UniqueConstraint(
                fields=["appointment"],
                condition=Q(payment_status="paid"),
                name="one_paid_payment_per_appointment",
            ),
        ]
        indexes = [
            models.Index(fields=["patient", "payment_status"]),
            models.Index(fields=["appointment", "payment_status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return (
            f"{self.transaction_reference} - "
            f"{self.amount} {self.currency}"
        )

    def clean(self):
        if self.amount is not None and self.amount <= 0:
            raise ValidationError(
                "Payment amount must be greater than zero."
            )

        if (
            self.appointment
            and self.patient_id != self.appointment.patient_id
        ):
            raise ValidationError(
                "Payment patient must match appointment patient."
            )

        if (
            self.appointment
            and self.appointment.status
            == Appointment.Status.CANCELLED
        ):
            raise ValidationError(
                "Cancelled appointments cannot be paid for."
            )


# ============================================================
# DOCUMENT
# ============================================================

class Document(models.Model):

    class DocumentType(models.TextChoices):
        MEDICAL_REPORT = "medical_report", "Medical Report"
        LAB_RESULT = "lab_result", "Laboratory Result"
        PRESCRIPTION = "prescription", "Prescription"
        IMAGING = "imaging", "Medical Imaging"
        INSURANCE = "insurance", "Insurance Document"
        IDENTIFICATION = "identification", "Identification"
        OTHER = "other", "Other"

    patient = models.ForeignKey(
        PatientProfile,
        on_delete=models.PROTECT,
        related_name="documents",
    )

    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="uploaded_documents",
        null=True,
        blank=True,
    )

    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.SET_NULL,
        related_name="documents",
        null=True,
        blank=True,
    )

    document_type = models.CharField(
        max_length=30,
        choices=DocumentType.choices,
        default=DocumentType.OTHER,
    )

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    file = models.FileField(upload_to=document_upload_path)
    file_size = models.PositiveBigIntegerField(default=0)
    mime_type = models.CharField(max_length=100, blank=True)

    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)

    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="verified_documents",
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["patient", "created_at"]),
            models.Index(fields=["document_type"]),
            models.Index(fields=["is_verified"]),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if self.file:
            if hasattr(self.file, "size"):
                self.file_size = self.file.size

            content_type = getattr(self.file, "content_type", None)

            if content_type:
                self.mime_type = content_type

        update_fields = kwargs.get("update_fields")

        if update_fields is not None:
            update_fields = set(update_fields)

            if "file" in update_fields:
                update_fields.update(["file_size", "mime_type"])

            kwargs["update_fields"] = list(update_fields)

        super().save(*args, **kwargs)

    def clean(self):
        if (
            self.appointment
            and self.patient_id != self.appointment.patient_id
        ):
            raise ValidationError(
                "Document patient must match appointment patient."
            )

        if self.is_verified:
            if not self.verified_by:
                raise ValidationError(
                    "Verified documents must have a verifier."
                )

            if not self.verified_at:
                raise ValidationError(
                    "Verified documents must have a verification date."
                )

    @property
    def file_url(self):
        if self.file:
            return self.file.url

        return None


# ============================================================
# SYSTEM LOG
# ============================================================

class SystemLog(models.Model):

    class Action(models.TextChoices):
        CREATE = "create", "Create"
        UPDATE = "update", "Update"
        DELETE = "delete", "Delete"
        LOGIN = "login", "Login"
        LOGOUT = "logout", "Logout"
        VIEW = "view", "View"
        VERIFY = "verify", "Verify"
        PAYMENT = "payment", "Payment"
        APPOINTMENT = "appointment", "Appointment"
        SECURITY = "security", "Security"
        OTHER = "other", "Other"

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="system_logs",
        null=True,
        blank=True,
    )

    action = models.CharField(max_length=30, choices=Action.choices)
    model_name = models.CharField(max_length=100, blank=True)
    object_id = models.CharField(max_length=255, blank=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["action"]),
            models.Index(fields=["model_name"]),
            models.Index(fields=["user"]),
        ]

    def __str__(self):
        username = self.user.username if self.user else "System"
        return f"{username} - {self.get_action_display()}"


# ============================================================
# VIDEO CALL
# ============================================================

class VideoCall(models.Model):

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACTIVE = "active", "Active"
        ENDED = "ended", "Ended"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"

    appointment = models.OneToOneField(
        Appointment,
        on_delete=models.PROTECT,
        related_name="video_call",
    )

    patient = models.ForeignKey(
        PatientProfile,
        on_delete=models.PROTECT,
        related_name="video_calls",
    )

    doctor = models.ForeignKey(
        DoctorProfile,
        on_delete=models.PROTECT,
        related_name="video_calls",
    )

    room_id = models.UUIDField(
        default=uuid4,
        unique=True,
        editable=False,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    recording_url = models.CharField(max_length=500, blank=True)
    chat_log = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["started_at"]),
            models.Index(fields=["ended_at"]),
            models.Index(fields=["doctor"]),
            models.Index(fields=["patient"]),
        ]

    def __str__(self):
        return (
            f"Video Call "
            f"{self.room_id} - "
            f"{self.get_status_display()}"
        )

    def clean(self):
        if self.appointment:
            if self.patient_id != self.appointment.patient_id:
                raise ValidationError(
                    "Video call patient must match appointment patient."
                )

            if self.doctor_id != self.appointment.doctor_id:
                raise ValidationError(
                    "Video call doctor must match appointment doctor."
                )

    def save(self, *args, **kwargs):
        if self.started_at and self.ended_at:
            seconds = (
                self.ended_at - self.started_at
            ).total_seconds()
            self.duration_seconds = max(0, int(seconds))

        update_fields = kwargs.get("update_fields")

        if update_fields is not None:
            update_fields = set(update_fields)

            if "ended_at" in update_fields:
                update_fields.add("duration_seconds")

            kwargs["update_fields"] = list(update_fields)

        super().save(*args, **kwargs)

    @property
    def duration_formatted(self):
        total_seconds = self.duration_seconds or 0
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60

        if hours:
            return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

        return f"{minutes:02d}:{seconds:02d}"


# ============================================================
# MODEL ALIASES
# ============================================================

Doctor = DoctorProfile
Patient = PatientProfile


# ============================================================
# USER PREFERENCE
# ============================================================

class UserPreference(models.Model):

    class Theme(models.TextChoices):
        LIGHT = "light", "Light"
        DARK = "dark", "Dark"
        SYSTEM = "system", "System"

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="preferences",
    )

    language = models.CharField(max_length=10, default="en")
    timezone = models.CharField(max_length=64, default="Africa/Lagos")
    currency = models.CharField(max_length=10, default="NGN")

    theme = models.CharField(
        max_length=10,
        choices=Theme.choices,
        default=Theme.LIGHT,
    )

    email_appointments = models.BooleanField(default=True)
    email_prescriptions = models.BooleanField(default=True)
    email_results = models.BooleanField(default=True)
    email_payments = models.BooleanField(default=True)

    push_appointments = models.BooleanField(default=True)
    push_messages = models.BooleanField(default=True)
    push_reminders = models.BooleanField(default=True)

    sms_urgent = models.BooleanField(default=False)

    show_profile_to_doctors = models.BooleanField(default=True)
    allow_doctor_reviews = models.BooleanField(default=True)
    share_data_research = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Preference"
        verbose_name_plural = "User Preferences"

    def __str__(self):
        return f"Preferences for {self.user.username}"


# ============================================================
# FAVORITE DOCTOR
# ============================================================

class FavoriteDoctor(models.Model):
    patient = models.ForeignKey(
        PatientProfile,
        on_delete=models.CASCADE,
        related_name="favorites",
    )

    doctor = models.ForeignKey(
        DoctorProfile,
        on_delete=models.CASCADE,
        related_name="favorited_by",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["patient", "doctor"],
                name="unique_patient_doctor_favorite",
            ),
        ]
        indexes = [
            models.Index(fields=["patient", "created_at"]),
            models.Index(fields=["doctor"]),
        ]

    def __str__(self):
        return f"{self.patient.full_name} → Dr. {self.doctor.full_name}"


# ============================================================
# SAVED SEARCH
# ============================================================

class SavedSearch(models.Model):
    patient = models.ForeignKey(
        PatientProfile,
        on_delete=models.CASCADE,
        related_name="saved_searches",
    )

    name = models.CharField(max_length=120)
    filters = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["patient", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.patient.full_name})"
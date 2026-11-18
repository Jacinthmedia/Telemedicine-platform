from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db import transaction

from api.models import PatientProfile, DoctorProfile


class Command(BaseCommand):
    help = "Create demo patient and doctor accounts for local development/testing."

    def handle(self, *args, **options):
        with transaction.atomic():
            self.create_patient_demo()
            self.create_doctor_demo()
            self.create_admin_demo()

        self.stdout.write(
            self.style.SUCCESS(
                "Demo accounts ready: patient_demo / Patient123!, "
                "doctor_demo / Doctor123!, and admin_demo / Admin123!"
            )
        )

    def create_patient_demo(self):
        username = "patient_demo"
        password = "Patient123!"

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": "patient_demo@example.com",
                "first_name": "Demo",
                "last_name": "Patient",
                "is_active": True,
            },
        )

        # Always reset the password so this command is safe to
        # re-run even if the account already exists with a stale
        # or unknown password.
        user.set_password(password)
        user.save()

        PatientProfile.objects.get_or_create(
            user=user,
            defaults={
                "date_of_birth": "1995-06-15",
                "phone": "08000000001",
                "address": "123 Demo Street, Lagos",
                "emergency_contact": "08000000099",
            },
        )

        action = "Created" if created else "Updated"
        self.stdout.write(f"{action} patient_demo")

    def create_doctor_demo(self):
        username = "doctor_demo"
        password = "Doctor123!"

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": "doctor_demo@example.com",
                "first_name": "Demo",
                "last_name": "Doctor",
                "is_active": True,
            },
        )

        user.set_password(password)
        user.save()

        doctor_profile, _ = DoctorProfile.objects.get_or_create(
            user=user,
            defaults={
                "specialization": "General Medicine",
                "license_number": "DEMO-LICENSE-001",
                "hospital": "Demo General Hospital",
                "years_experience": 5,
                "consultation_fee": "5000.00",
            },
        )

        # Verify and activate the demo doctor so it shows up in
        # search/available-doctors and can accept appointments.
        updated_fields = []

        if hasattr(doctor_profile, "verification_status") and doctor_profile.verification_status != "approved":
            doctor_profile.verification_status = "approved"
            updated_fields.append("verification_status")

        if hasattr(doctor_profile, "is_verified") and not doctor_profile.is_verified:
            doctor_profile.is_verified = True
            updated_fields.append("is_verified")

        if hasattr(doctor_profile, "available") and not doctor_profile.available:
            doctor_profile.available = True
            updated_fields.append("available")

        if updated_fields:
            doctor_profile.save(update_fields=updated_fields)

        action = "Created" if created else "Updated"
        self.stdout.write(f"{action} doctor_demo")

    def create_admin_demo(self):
        username = "admin_demo"
        password = "Admin123!"

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": "admin_demo@example.com",
                "first_name": "Demo",
                "last_name": "Admin",
                "is_active": True,
                "is_staff": True,
            },
        )

        user.set_password(password)

        # Make sure the flag is set even if the account already
        # existed from before staff status was part of this command.
        if not user.is_staff:
            user.is_staff = True

        user.save()

        action = "Created" if created else "Updated"
        self.stdout.write(f"{action} admin_demo")
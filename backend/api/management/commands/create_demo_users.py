from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.models import DoctorProfile, PatientProfile
from datetime import date

class Command(BaseCommand):
    help = 'Create demo users for testing'
    
    def handle(self, *args, **options):
        User = get_user_model()
        
        # Create Patient Demo User
        if not User.objects.filter(username='patient_demo').exists():
            patient_user = User.objects.create_user(
                username='patient_demo',
                email='patient@demo.com',
                password='Patient123!',
                first_name='John',
                last_name='Doe',
                role='patient'
            )
            
            PatientProfile.objects.create(
                user=patient_user,
                date_of_birth=date(1990, 1, 15),
                phone='+1234567890',
                address='123 Main Street, New York, NY',
                emergency_contact='+0987654321'
            )
            
            self.stdout.write(
                self.style.SUCCESS('Patient demo user created: patient_demo / Patient123!')
            )
        else:
            self.stdout.write('Patient demo user already exists')
        
        # Create Doctor Demo User
        if not User.objects.filter(username='doctor_demo').exists():
            doctor_user = User.objects.create_user(
                username='doctor_demo',
                email='doctor@demo.com',
                password='Doctor123!',
                first_name='Dr. Jane',
                last_name='Smith',
                role='doctor'
            )
            
            DoctorProfile.objects.create(
                user=doctor_user,
                specialization='Cardiology',
                license_number='MD123456',
                hospital='City General Hospital',
                years_experience=10,
                consultation_fee=150.00,
                is_verified=True,
                verification_status='approved',
                available=True
            )
            
            self.stdout.write(
                self.style.SUCCESS('Doctor demo user created: doctor_demo / Doctor123!')
            )
        else:
            self.stdout.write('Doctor demo user already exists')
        
        self.stdout.write(
            self.style.SUCCESS('Demo users created successfully!')
        )
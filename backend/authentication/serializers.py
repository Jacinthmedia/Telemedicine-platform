# authentication/serializers.py
from django.db import transaction
from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import authenticate
from api.models import PatientProfile, DoctorProfile


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'role', 'date_joined']
        read_only_fields = ['id', 'date_joined']

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_role(self, obj):
        if hasattr(obj, 'patient_profile'):
            return 'patient'
        elif hasattr(obj, 'doctor_profile'):
            return 'doctor'
        return 'unknown'


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=30, required=False)
    last_name = serializers.CharField(max_length=30, required=False)
    role = serializers.ChoiceField(choices=['patient', 'doctor'])

    # Patient fields
    date_of_birth = serializers.DateField(required=False)
    phone = serializers.CharField(max_length=15, required=False)
    address = serializers.CharField(required=False)
    emergency_contact = serializers.CharField(max_length=15, required=False)

    # Doctor fields
    specialization = serializers.CharField(max_length=50, required=False)
    license_number = serializers.CharField(max_length=20, required=False)
    hospital = serializers.CharField(max_length=200, required=False)
    years_experience = serializers.IntegerField(required=False, min_value=0)
    consultation_fee = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"password": "Passwords don't match"})

        if User.objects.filter(username=data['username']).exists():
            raise serializers.ValidationError({"username": "Username already exists"})

        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({"email": "Email already registered"})

        if data['role'] == 'patient':
            required_fields = ['date_of_birth', 'phone', 'address']
            for field in required_fields:
                if not data.get(field):
                    raise serializers.ValidationError({field: f"{field} is required for patients"})
        else:
            required_fields = ['specialization', 'license_number', 'hospital', 'years_experience', 'consultation_fee']
            for field in required_fields:
                if not data.get(field):
                    raise serializers.ValidationError({field: f"{field} is required for doctors"})

        return data

    def save(self):
        data = self.validated_data

        # Wrapped in a transaction so a failure creating the
        # patient/doctor profile rolls back the User row too -
        # otherwise a partial failure here leaves an orphaned
        # User with no profile, which blocks re-registration
        # with the same username/email while being unusable.
        with transaction.atomic():
            user = User.objects.create_user(
                username=data['username'],
                email=data['email'],
                password=data['password'],
                first_name=data.get('first_name', ''),
                last_name=data.get('last_name', '')
            )

            if data['role'] == 'patient':
                PatientProfile.objects.create(
                    user=user,
                    date_of_birth=data['date_of_birth'],
                    phone=data['phone'],
                    address=data['address'],
                    emergency_contact=data.get('emergency_contact', '')
                )
            else:
                DoctorProfile.objects.create(
                    user=user,
                    specialization=data['specialization'],
                    license_number=data['license_number'],
                    hospital=data['hospital'],
                    years_experience=data['years_experience'],
                    consultation_fee=data['consultation_fee'],
                    verification_status='pending'
                )

        return user

    def get_role(self, user):
        return self.validated_data['role']


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if not user:
            raise serializers.ValidationError("Invalid credentials")
        if not user.is_active:
            raise serializers.ValidationError("Account is inactive")
        return {'user': user}


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords don't match"})

        user = self.context.get('user')
        if not user.check_password(data['old_password']):
            raise serializers.ValidationError({"old_password": "Incorrect password"})

        return data

    def save(self):
        user = self.context.get('user')
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user
# backend/api/filters.py
from django_filters import rest_framework as filters
from django.db.models import Q
from .models import *

# PATIENT FILTERS

class PatientFilter(filters.FilterSet):
    """Filter for PatientProfile model"""
    
    # Search filters
    search = filters.CharFilter(method='filter_search', label='Search')
    
    # Exact matches
    blood_type = filters.ChoiceFilter(choices=PatientProfile.BLOOD_TYPES)
    gender = filters.ChoiceFilter(choices=PatientProfile.GENDER_CHOICES)
    
    # Date filters
    created_at_start = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_at_end = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    date_of_birth_start = filters.DateFilter(field_name='date_of_birth', lookup_expr='gte')
    date_of_birth_end = filters.DateFilter(field_name='date_of_birth', lookup_expr='lte')
    
    # Range filters
    age_min = filters.NumberFilter(field_name='age', lookup_expr='gte')
    age_max = filters.NumberFilter(field_name='age', lookup_expr='lte')
    
    # Boolean filters
    has_allergies = filters.BooleanFilter(method='filter_has_allergies')
    has_chronic_conditions = filters.BooleanFilter(method='filter_has_chronic_conditions')
    
    class Meta:
        model = PatientProfile
        fields = [
            'blood_type', 'gender', 'created_at', 'date_of_birth',
            'phone', 'city', 'state', 'country'
        ]
    
    def filter_search(self, queryset, name, value):
        """Search across multiple fields"""
        return queryset.filter(
            Q(user__first_name__icontains=value) |
            Q(user__last_name__icontains=value) |
            Q(user__username__icontains=value) |
            Q(user__email__icontains=value) |
            Q(phone__icontains=value) |
            Q(address__icontains=value) |
            Q(city__icontains=value) |
            Q(state__icontains=value)
        )
    
    def filter_has_allergies(self, queryset, name, value):
        """Filter patients with or without allergies"""
        if value:
            return queryset.exclude(Q(allergies__isnull=True) | Q(allergies=''))
        return queryset.filter(Q(allergies__isnull=True) | Q(allergies=''))
    
    def filter_has_chronic_conditions(self, queryset, name, value):
        """Filter patients with or without chronic conditions"""
        if value:
            return queryset.exclude(Q(chronic_conditions__isnull=True) | Q(chronic_conditions=''))
        return queryset.filter(Q(chronic_conditions__isnull=True) | Q(chronic_conditions=''))


# DOCTOR FILTERS

class DoctorFilter(filters.FilterSet):
    """Filter for DoctorProfile model"""
    
    # Search filters
    search = filters.CharFilter(method='filter_search', label='Search')
    
    # Exact matches
    specialization = filters.ChoiceFilter(choices=DoctorProfile.SPECIALIZATIONS)
    verification_status = filters.ChoiceFilter(choices=DoctorProfile.VERIFICATION_STATUS)
    available = filters.BooleanFilter()
    
    # Range filters
    rating_min = filters.NumberFilter(field_name='rating', lookup_expr='gte')
    rating_max = filters.NumberFilter(field_name='rating', lookup_expr='lte')
    consultation_fee_min = filters.NumberFilter(field_name='consultation_fee', lookup_expr='gte')
    consultation_fee_max = filters.NumberFilter(field_name='consultation_fee', lookup_expr='lte')
    years_experience_min = filters.NumberFilter(field_name='years_experience', lookup_expr='gte')
    years_experience_max = filters.NumberFilter(field_name='years_experience', lookup_expr='lte')
    
    # Date filters
    created_at_start = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_at_end = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    
    # Boolean filters
    has_bio = filters.BooleanFilter(method='filter_has_bio')
    has_education = filters.BooleanFilter(method='filter_has_education')
    
    class Meta:
        model = DoctorProfile
        fields = [
            'specialization', 'verification_status', 'available',
            'hospital', 'rating', 'consultation_fee', 'years_experience'
        ]
    
    def filter_search(self, queryset, name, value):
        """Search across multiple fields"""
        return queryset.filter(
            Q(user__first_name__icontains=value) |
            Q(user__last_name__icontains=value) |
            Q(user__username__icontains=value) |
            Q(specialization__icontains=value) |
            Q(hospital__icontains=value) |
            Q(license_number__icontains=value) |
            Q(bio__icontains=value)
        )
    
    def filter_has_bio(self, queryset, name, value):
        """Filter doctors with or without bio"""
        if value:
            return queryset.exclude(Q(bio__isnull=True) | Q(bio=''))
        return queryset.filter(Q(bio__isnull=True) | Q(bio=''))
    
    def filter_has_education(self, queryset, name, value):
        """Filter doctors with or without education"""
        if value:
            return queryset.exclude(Q(education__isnull=True) | Q(education=''))
        return queryset.filter(Q(education__isnull=True) | Q(education=''))


# APPOINTMENT FILTERS

class AppointmentFilter(filters.FilterSet):
    """Filter for Appointment model"""
    
    # Search filters
    search = filters.CharFilter(method='filter_search', label='Search')
    
    # Exact matches
    status = filters.ChoiceFilter(choices=Appointment.STATUS_CHOICES)
    consultation_type = filters.ChoiceFilter(choices=Appointment.CONSULTATION_TYPES)
    payment_status = filters.ChoiceFilter(choices=Appointment._meta.get_field('payment_status').choices)
    
    # Date filters
    appointment_date_start = filters.DateFilter(field_name='appointment_date', lookup_expr='gte')
    appointment_date_end = filters.DateFilter(field_name='appointment_date', lookup_expr='lte')
    created_at_start = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_at_end = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    
    # Time filters
    start_time_start = filters.TimeFilter(field_name='start_time', lookup_expr='gte')
    start_time_end = filters.TimeFilter(field_name='start_time', lookup_expr='lte')
    
    # Foreign key filters
    patient = filters.NumberFilter(field_name='patient__id')
    doctor = filters.NumberFilter(field_name='doctor__id')
    
    # Boolean filters
    is_upcoming = filters.BooleanFilter(method='filter_is_upcoming')
    has_notes = filters.BooleanFilter(method='filter_has_notes')
    has_diagnosis = filters.BooleanFilter(method='filter_has_diagnosis')
    
    class Meta:
        model = Appointment
        fields = [
            'status', 'consultation_type', 'payment_status',
            'appointment_date', 'patient', 'doctor'
        ]
    
    def filter_search(self, queryset, name, value):
        """Search across multiple fields"""
        return queryset.filter(
            Q(appointment_id__icontains=value) |
            Q(patient__user__first_name__icontains=value) |
            Q(patient__user__last_name__icontains=value) |
            Q(doctor__user__first_name__icontains=value) |
            Q(doctor__user__last_name__icontains=value) |
            Q(symptoms__icontains=value) |
            Q(diagnosis__icontains=value) |
            Q(notes__icontains=value)
        )
    
    def filter_is_upcoming(self, queryset, name, value):
        """Filter upcoming appointments"""
        from django.utils import timezone
        if value:
            return queryset.filter(
                appointment_date__gte=timezone.now().date(),
                status__in=['pending', 'confirmed']
            )
        return queryset.exclude(
            appointment_date__gte=timezone.now().date(),
            status__in=['pending', 'confirmed']
        )
    
    def filter_has_notes(self, queryset, name, value):
        """Filter appointments with or without notes"""
        if value:
            return queryset.exclude(Q(notes__isnull=True) | Q(notes=''))
        return queryset.filter(Q(notes__isnull=True) | Q(notes=''))
    
    def filter_has_diagnosis(self, queryset, name, value):
        """Filter appointments with or without diagnosis"""
        if value:
            return queryset.exclude(Q(diagnosis__isnull=True) | Q(diagnosis=''))
        return queryset.filter(Q(diagnosis__isnull=True) | Q(diagnosis=''))


# MEDICAL RECORD FILTERS

class MedicalRecordFilter(filters.FilterSet):
    """Filter for MedicalRecord model"""
    
    # Search filters
    search = filters.CharFilter(method='filter_search', label='Search')
    
    # Date filters
    record_date_start = filters.DateTimeFilter(field_name='record_date', lookup_expr='gte')
    record_date_end = filters.DateTimeFilter(field_name='record_date', lookup_expr='lte')
    created_at_start = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_at_end = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    follow_up_date_start = filters.DateTimeFilter(field_name='follow_up_date', lookup_expr='gte')
    follow_up_date_end = filters.DateTimeFilter(field_name='follow_up_date', lookup_expr='lte')
    
    # Range filters
    heart_rate_min = filters.NumberFilter(field_name='heart_rate', lookup_expr='gte')
    heart_rate_max = filters.NumberFilter(field_name='heart_rate', lookup_expr='lte')
    temperature_min = filters.NumberFilter(field_name='temperature', lookup_expr='gte')
    temperature_max = filters.NumberFilter(field_name='temperature', lookup_expr='lte')
    oxygen_saturation_min = filters.NumberFilter(field_name='oxygen_saturation', lookup_expr='gte')
    oxygen_saturation_max = filters.NumberFilter(field_name='oxygen_saturation', lookup_expr='lte')
    
    # Foreign key filters
    patient = filters.NumberFilter(field_name='patient__id')
    doctor = filters.NumberFilter(field_name='doctor__id')
    
    # Boolean filters
    has_follow_up = filters.BooleanFilter(method='filter_has_follow_up')
    has_lab_results = filters.BooleanFilter(method='filter_has_lab_results')
    
    class Meta:
        model = MedicalRecord
        fields = [
            'patient', 'doctor', 'record_date',
            'heart_rate', 'temperature', 'oxygen_saturation'
        ]
    
    def filter_search(self, queryset, name, value):
        """Search across multiple fields"""
        return queryset.filter(
            Q(record_id__icontains=value) |
            Q(diagnosis__icontains=value) |
            Q(symptoms__icontains=value) |
            Q(treatment__icontains=value) |
            Q(prescription__icontains=value) |
            Q(patient__user__first_name__icontains=value) |
            Q(patient__user__last_name__icontains=value) |
            Q(doctor__user__first_name__icontains=value) |
            Q(doctor__user__last_name__icontains=value)
        )
    
    def filter_has_follow_up(self, queryset, name, value):
        """Filter records with or without follow-up"""
        if value:
            return queryset.exclude(Q(follow_up_date__isnull=True))
        return queryset.filter(Q(follow_up_date__isnull=True))
    
    def filter_has_lab_results(self, queryset, name, value):
        """Filter records with or without lab results"""
        from django.db.models import Q
        if value:
            return queryset.exclude(Q(lab_results__isnull=True) | Q(lab_results={}))
        return queryset.filter(Q(lab_results__isnull=True) | Q(lab_results={}))


# PRESCRIPTION FILTERS

class PrescriptionFilter(filters.FilterSet):
    """Filter for Prescription model"""
    
    # Search filters
    search = filters.CharFilter(method='filter_search', label='Search')
    
    # Exact matches
    is_active = filters.BooleanFilter()
    
    # Date filters
    issued_at_start = filters.DateTimeFilter(field_name='issued_at', lookup_expr='gte')
    issued_at_end = filters.DateTimeFilter(field_name='issued_at', lookup_expr='lte')
    created_at_start = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_at_end = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    
    # Foreign key filters
    patient = filters.NumberFilter(field_name='patient__id')
    doctor = filters.NumberFilter(field_name='doctor__id')
    
    # Range filters
    refills_min = filters.NumberFilter(field_name='refills', lookup_expr='gte')
    refills_max = filters.NumberFilter(field_name='refills', lookup_expr='lte')
    refills_remaining_min = filters.NumberFilter(method='filter_refills_remaining_min')
    refills_remaining_max = filters.NumberFilter(method='filter_refills_remaining_max')
    
    class Meta:
        model = Prescription
        fields = [
            'is_active', 'medication_name', 'patient', 'doctor',
            'issued_at', 'refills'
        ]
    
    def filter_search(self, queryset, name, value):
        """Search across multiple fields"""
        return queryset.filter(
            Q(medication_name__icontains=value) |
            Q(dosage__icontains=value) |
            Q(frequency__icontains=value) |
            Q(duration__icontains=value) |
            Q(instructions__icontains=value) |
            Q(patient__user__first_name__icontains=value) |
            Q(patient__user__last_name__icontains=value) |
            Q(doctor__user__first_name__icontains=value) |
            Q(doctor__user__last_name__icontains=value)
        )
    
    def filter_refills_remaining_min(self, queryset, name, value):
        """Filter prescriptions with minimum refills remaining"""
        return queryset.filter(refills__gt=0)
    
    def filter_refills_remaining_max(self, queryset, name, value):
        """Filter prescriptions with maximum refills remaining"""
        return queryset.filter(refills__lte=value)


# NOTIFICATION FILTERS

class NotificationFilter(filters.FilterSet):
    """Filter for Notification model"""
    
    # Exact matches
    type = filters.ChoiceFilter(choices=Notification.NOTIFICATION_TYPES)
    is_read = filters.BooleanFilter()
    
    # Date filters
    created_at_start = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_at_end = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    
    # User filter
    user = filters.NumberFilter(field_name='user__id')
    
    class Meta:
        model = Notification
        fields = ['type', 'is_read', 'user', 'created_at']


# PAYMENT FILTERS

class PaymentFilter(filters.FilterSet):
    """Filter for Payment model"""
    
    # Exact matches
    payment_status = filters.ChoiceFilter(choices=Payment.PAYMENT_STATUS)
    payment_method = filters.ChoiceFilter(choices=Payment.PAYMENT_METHODS)
    
    # Date filters
    created_at_start = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_at_end = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    paid_at_start = filters.DateTimeFilter(field_name='paid_at', lookup_expr='gte')
    paid_at_end = filters.DateTimeFilter(field_name='paid_at', lookup_expr='lte')
    
    # Range filters
    amount_min = filters.NumberFilter(field_name='amount', lookup_expr='gte')
    amount_max = filters.NumberFilter(field_name='amount', lookup_expr='lte')
    
    # Foreign key filters
    patient = filters.NumberFilter(field_name='patient__id')
    appointment = filters.NumberFilter(field_name='appointment__id')
    
    class Meta:
        model = Payment
        fields = [
            'payment_status', 'payment_method', 'patient',
            'appointment', 'amount', 'created_at'
        ]


# DOCUMENT FILTERS

class DocumentFilter(filters.FilterSet):
    """Filter for Document model"""
    
    # Exact matches
    document_type = filters.ChoiceFilter(choices=Document.DOCUMENT_TYPES)
    
    # Date filters
    created_at_start = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_at_end = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    
    # Foreign key filters
    patient = filters.NumberFilter(field_name='patient__id')
    uploaded_by = filters.NumberFilter(field_name='uploaded_by__id')
    
    # Boolean filters
    is_verified = filters.BooleanFilter(field_name='is_verified')
    
    class Meta:
        model = Document
        fields = [
            'document_type', 'patient', 'uploaded_by',
            'is_verified', 'created_at'
        ]


# CHAT MESSAGE FILTERS

class ChatMessageFilter(filters.FilterSet):
    """Filter for ChatMessage model"""
    
    # Exact matches
    is_read = filters.BooleanFilter()
    
    # Date filters
    created_at_start = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_at_end = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    read_at_start = filters.DateTimeFilter(field_name='read_at', lookup_expr='gte')
    read_at_end = filters.DateTimeFilter(field_name='read_at', lookup_expr='lte')
    
    # Foreign key filters
    sender = filters.NumberFilter(field_name='sender__id')
    receiver = filters.NumberFilter(field_name='receiver__id')
    appointment = filters.NumberFilter(field_name='appointment__id')
    
    class Meta:
        model = ChatMessage
        fields = ['is_read', 'sender', 'receiver', 'appointment', 'created_at']


# UTILITY FUNCTIONS

def apply_filters(queryset, filterset_class, request_data):
    """
    Utility function to apply filters to a queryset.
    
    Args:
        queryset: Django queryset
        filterset_class: FilterSet class
        request_data: Request data (usually request.GET)
    
    Returns:
        FilterSet instance with filtered queryset
    """
    filterset = filterset_class(data=request_data, queryset=queryset)
    return filterset.qs
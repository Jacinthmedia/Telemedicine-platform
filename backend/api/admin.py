# backend/api/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from .models import *

# ============================================
# CUSTOM ADMIN SITE CONFIGURATION
# ============================================

admin.site.site_header = "Telemedicine Platform Admin"
admin.site.site_title = "Telemedicine Admin"
admin.site.index_title = "Welcome to Telemedicine Platform Admin Panel"

# ============================================
# USER ADMIN (Using Django's default User)
# ============================================

class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active', 'date_joined']
    list_filter = ['is_staff', 'is_active', 'date_joined']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering = ['-date_joined']
    readonly_fields = ['date_joined', 'last_login']
    fieldsets = (
        ('Personal Information', {
            'fields': ('first_name', 'last_name', 'username', 'email')
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Important Dates', {
            'fields': ('last_login', 'date_joined')
        }),
    )

# Unregister default User admin and register custom one
admin.site.unregister(User)
admin.site.register(User, UserAdmin)


# ============================================
# PATIENT PROFILE ADMIN
# ============================================

class PatientProfileAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'full_name', 'phone', 'blood_type', 'age', 'created_at']
    list_filter = ['blood_type', 'created_at', 'gender']
    search_fields = ['user__username', 'user__first_name', 'user__last_name', 'phone', 'emergency_contact']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'profile_picture')
        }),
        ('Personal Details', {
            'fields': ('date_of_birth', 'phone', 'address', 'city', 'state', 'country', 'gender', 'emergency_contact', 'emergency_contact_name')
        }),
        ('Medical Information', {
            'fields': ('blood_type', 'allergies', 'chronic_conditions', 'current_medications', 'medical_history')
        }),
        ('Physical Attributes', {
            'fields': ('height', 'weight')
        }),
        ('Insurance', {
            'fields': ('insurance_provider', 'insurance_id')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def full_name(self, obj):
        return obj.full_name
    full_name.short_description = "Full Name"
    
    def age(self, obj):
        return obj.age if obj.age else "-"
    age.short_description = "Age"


# ============================================
# DOCTOR PROFILE ADMIN
# ============================================

class DoctorProfileAdmin(admin.ModelAdmin):
    list_display = ['id', 'full_name', 'specialization_display', 'hospital', 'consultation_fee', 'available', 'rating', 'total_reviews', 'verification_status']
    list_filter = ['specialization', 'available', 'verification_status', 'created_at']
    search_fields = ['user__username', 'user__first_name', 'user__last_name', 'license_number', 'hospital']
    readonly_fields = ['created_at', 'updated_at', 'rating', 'total_reviews']
    ordering = ['-rating', '-total_reviews']
    
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'profile_picture')
        }),
        ('Professional Details', {
            'fields': ('specialization', 'license_number', 'hospital', 'years_experience', 'consultation_fee', 'verification_status')
        }),
        ('Availability', {
            'fields': ('available',)
        }),
        ('About', {
            'fields': ('bio', 'education', 'certifications', 'languages')
        }),
        ('Ratings', {
            'fields': ('rating', 'total_reviews'),
            'classes': ('collapse',)
        }),
        ('Working Hours', {
            'fields': ('monday_hours', 'tuesday_hours', 'wednesday_hours', 'thursday_hours', 'friday_hours', 'saturday_hours', 'sunday_hours'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def full_name(self, obj):
        return obj.full_name
    full_name.short_description = "Full Name"
    
    def specialization_display(self, obj):
        return obj.get_specialization_display()
    specialization_display.short_description = "Specialization"


# ============================================
# DOCTOR AVAILABILITY ADMIN
# ============================================

class DoctorAvailabilityAdmin(admin.ModelAdmin):
    list_display = ['id', 'doctor', 'day_display', 'start_time', 'end_time', 'is_available']
    list_filter = ['day_of_week', 'is_available', 'doctor']
    search_fields = ['doctor__user__first_name', 'doctor__user__last_name']
    ordering = ['doctor', 'day_of_week']
    
    def day_display(self, obj):
        return obj.get_day_of_week_display()
    day_display.short_description = "Day"


# ============================================
# APPOINTMENT ADMIN
# ============================================

class AppointmentAdmin(admin.ModelAdmin):
    list_display = ['appointment_id', 'patient', 'doctor', 'appointment_date', 'start_time', 'status', 'payment_status']
    list_filter = ['status', 'payment_status', 'appointment_date', 'consultation_type']
    search_fields = ['appointment_id', 'patient__user__first_name', 'patient__user__last_name', 'doctor__user__first_name', 'doctor__user__last_name']
    readonly_fields = ['appointment_id', 'created_at', 'updated_at']
    ordering = ['-appointment_date', '-start_time']
    
    fieldsets = (
        ('Appointment Info', {
            'fields': ('appointment_id', 'patient', 'doctor', 'appointment_date', 'start_time', 'end_time', 'duration', 'status', 'consultation_type')
        }),
        ('Medical Details', {
            'fields': ('reason', 'symptoms', 'notes', 'diagnosis', 'prescription', 'treatment_plan')
        }),
        ('Video Call', {
            'fields': ('meeting_link', 'call_started_at', 'call_ended_at', 'recording_url')
        }),
        ('Payment', {
            'fields': ('payment_status', 'payment_id')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['confirm_appointments', 'cancel_appointments', 'complete_appointments']
    
    def confirm_appointments(self, request, queryset):
        updated = queryset.update(status='confirmed')
        self.message_user(request, f'{updated} appointments confirmed.')
    confirm_appointments.short_description = "Confirm selected appointments"
    
    def cancel_appointments(self, request, queryset):
        updated = queryset.update(status='cancelled')
        self.message_user(request, f'{updated} appointments cancelled.')
    cancel_appointments.short_description = "Cancel selected appointments"
    
    def complete_appointments(self, request, queryset):
        updated = queryset.update(status='completed')
        self.message_user(request, f'{updated} appointments completed.')
    complete_appointments.short_description = "Complete selected appointments"


# ============================================
# MEDICAL RECORD ADMIN
# ============================================

class MedicalRecordAdmin(admin.ModelAdmin):
    list_display = ['record_id', 'patient', 'doctor', 'record_date', 'created_at']
    list_filter = ['created_at', 'record_date', 'doctor']
    search_fields = ['record_id', 'patient__user__first_name', 'patient__user__last_name', 'doctor__user__first_name', 'doctor__user__last_name']
    readonly_fields = ['record_id', 'created_at', 'updated_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Record Info', {
            'fields': ('record_id', 'patient', 'doctor', 'appointment', 'record_date')
        }),
        ('Clinical Information', {
            'fields': ('diagnosis', 'symptoms', 'treatment', 'prescription', 'notes')
        }),
        ('Vital Signs', {
            'fields': ('blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate', 'temperature', 'weight', 'height', 'oxygen_saturation')
        }),
        ('Follow-up', {
            'fields': ('follow_up_date', 'follow_up_notes')
        }),
        ('Lab Results', {
            'fields': ('lab_results',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


# ============================================
# PRESCRIPTION ADMIN
# ============================================

class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ['id', 'medication_name', 'patient', 'doctor', 'dosage', 'frequency', 'is_active', 'issued_at']
    list_filter = ['is_active', 'created_at', 'issued_at']
    search_fields = ['medication_name', 'patient__user__first_name', 'patient__user__last_name']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-issued_at']
    
    actions = ['activate_prescriptions', 'deactivate_prescriptions']
    
    def activate_prescriptions(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} prescriptions activated.')
    activate_prescriptions.short_description = "Activate selected prescriptions"
    
    def deactivate_prescriptions(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} prescriptions deactivated.')
    deactivate_prescriptions.short_description = "Deactivate selected prescriptions"


# ============================================
# NOTIFICATION ADMIN
# ============================================

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "title",
        "notification_type",
        "is_read",
        "created_at",
    )

    list_filter = (
        "notification_type",
        "is_read",
        "created_at",
    )

    search_fields = (
        "recipient__username",
        "recipient__email",
        "title",
        "message",
    )

    readonly_fields = (
        "created_at",
        "read_at",
    )

    ordering = (
        "-created_at",
    )

# ============================================
# REVIEW ADMIN
# ============================================

class ReviewAdmin(admin.ModelAdmin):
    list_display = ['id', 'patient', 'doctor', 'rating', 'is_anonymous', 'created_at']
    list_filter = ['rating', 'is_anonymous', 'created_at']
    search_fields = ['patient__user__first_name', 'patient__user__last_name', 'doctor__user__first_name', 'doctor__user__last_name']
    readonly_fields = ['created_at']
    ordering = ['-created_at', '-rating']


# ============================================
# CHAT MESSAGE ADMIN
# ============================================

class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'sender', 'receiver', 'message_preview', 'is_read', 'created_at']
    list_filter = ['is_read', 'created_at']
    search_fields = ['sender__username', 'receiver__username', 'message']
    readonly_fields = ['created_at']
    ordering = ['-created_at']
    
    def message_preview(self, obj):
        return obj.message[:50] + '...' if len(obj.message) > 50 else obj.message
    message_preview.short_description = "Message"


# ============================================
# PAYMENT ADMIN
# ============================================

class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'patient', 'appointment', 'amount', 'payment_status', 'payment_method', 'created_at']
    list_filter = ['payment_status', 'payment_method', 'created_at']
    search_fields = ['patient__user__username', 'transaction_reference']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Payment Info', {
            'fields': ('patient', 'appointment', 'amount', 'currency')
        }),
        ('Payment Details', {
            'fields': ('payment_method', 'payment_status', 'transaction_reference')
        }),
        ('Payment Data', {
            'fields': ('payment_data',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


# ============================================
# DOCUMENT ADMIN
# ============================================

class DocumentAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'patient', 'uploaded_by', 'document_type', 'file_size_display', 'is_verified', 'created_at']
    list_filter = ['document_type', 'is_verified', 'created_at']
    search_fields = ['title', 'patient__user__first_name', 'patient__user__last_name']
    readonly_fields = ['created_at', 'updated_at', 'file_size']
    ordering = ['-created_at']
    
    def file_size_display(self, obj):
        if obj.file_size < 1024:
            return f"{obj.file_size} B"
        elif obj.file_size < 1024 * 1024:
            return f"{obj.file_size / 1024:.1f} KB"
        else:
            return f"{obj.file_size / (1024 * 1024):.1f} MB"
    file_size_display.short_description = "File Size"


# ============================================
# SYSTEM LOG ADMIN
# ============================================

class SystemLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'action', 'model_name', 'object_id', 'created_at']
    list_filter = ['action', 'model_name', 'created_at']
    search_fields = ['user__username', 'action', 'model_name']
    readonly_fields = ['created_at']
    ordering = ['-created_at']


# ============================================
# REGISTER ALL MODELS
# ============================================

# Register all models with their admin classes
admin.site.register(PatientProfile, PatientProfileAdmin)
admin.site.register(DoctorProfile, DoctorProfileAdmin)
admin.site.register(DoctorAvailability, DoctorAvailabilityAdmin)
admin.site.register(Appointment, AppointmentAdmin)
admin.site.register(MedicalRecord, MedicalRecordAdmin)
admin.site.register(Prescription, PrescriptionAdmin)
admin.site.register(Review, ReviewAdmin)
admin.site.register(ChatMessage, ChatMessageAdmin)
admin.site.register(Payment, PaymentAdmin)
admin.site.register(Document, DocumentAdmin)
admin.site.register(SystemLog, SystemLogAdmin)
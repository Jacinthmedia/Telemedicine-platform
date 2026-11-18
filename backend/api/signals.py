from django.db.models.signals import (
    post_save, 
    pre_save, 
    post_delete, 
    m2m_changed,
    pre_delete
)
from django.dispatch import receiver
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
import logging

from .models import *
from .utils import generate_notification

# Set up logging
logger = logging.getLogger(__name__)

# USER SIGNALS

@receiver(post_save, sender=User)
def user_created(sender, instance, created, **kwargs):
    """
    Handle user creation events.
    """
    if created:
        logger.info(f"New user created: {instance.username} ({instance.email})")
        
        # Send welcome email (if email is configured)
        if settings.EMAIL_HOST_USER:
            try:
                send_mail(
                    subject='Welcome to Telemedicine Platform',
                    message=f"""
                    Welcome {instance.get_full_name()}!
                    
                    Thank you for joining our Telemedicine Platform.
                    We're excited to help you with your healthcare needs.
                    
                    Best regards,
                    Telemedicine Team
                    We care Jesus heals
                    """,
                    from_email=settings.EMAIL_HOST_USER,
                    recipient_list=[instance.email],
                    fail_silently=True,
                )
            except Exception as e:
                logger.error(f"Failed to send welcome email to {instance.email}: {str(e)}")

@receiver(pre_save, sender=User)
def user_pre_save(sender, instance, **kwargs):
    """
    Handle pre-save user events (e.g., logging changes).
    """
    if instance.pk:
        old = User.objects.get(pk=instance.pk)
        changes = []
        
        # Check for changes
        if old.first_name != instance.first_name:
            changes.append(f"first_name: {old.first_name} -> {instance.first_name}")
        if old.last_name != instance.last_name:
            changes.append(f"last_name: {old.last_name} -> {instance.last_name}")
        if old.email != instance.email:
            changes.append(f"email: {old.email} -> {instance.email}")
        if old.is_active != instance.is_active:
            changes.append(f"is_active: {old.is_active} -> {instance.is_active}")
        
        if changes:
            logger.info(f"User {instance.username} updated: {', '.join(changes)}")


# PATIENT PROFILE SIGNALS

@receiver(post_save, sender=PatientProfile)
def patient_profile_created(sender, instance, created, **kwargs):
    """
    Handle patient profile creation.
    """
    if created:
        logger.info(f"Patient profile created for: {instance.user.username}")
        
        # Create welcome notification
        Notification.objects.create(
            user=instance.user,
            title='Welcome to Telemedicine Platform!',
            message=f'Welcome {instance.user.get_full_name()}! Your patient profile has been created.',
            type='system'
        )
        
        # Create system log entry
        SystemLog.objects.create(
            user=instance.user,
            action='create',
            model_name='PatientProfile',
            object_id=str(instance.id),
            details={
                'username': instance.user.username,
                'email': instance.user.email,
                'action': 'profile_created'
            }
        )

@receiver(pre_save, sender=PatientProfile)
def patient_profile_pre_save(sender, instance, **kwargs):
    """
    Handle pre-save patient profile events.
    """
    if instance.pk:
        old = PatientProfile.objects.get(pk=instance.pk)
        changes = []
        
        # Check for important changes
        if old.blood_type != instance.blood_type:
            changes.append(f"blood_type: {old.blood_type} -> {instance.blood_type}")
        if old.phone != instance.phone:
            changes.append(f"phone: {old.phone} -> {instance.phone}")
        if old.address != instance.address:
            changes.append(f"address changed")
        
        if changes:
            logger.info(f"Patient profile {instance.user.username} updated: {', '.join(changes)}")
            
            # Create notification for important changes
            if 'phone' in str(changes) or 'address' in str(changes):
                Notification.objects.create(
                    user=instance.user,
                    title='Profile Updated',
                    message='Your contact information has been updated.',
                    type='system'
                )


# DOCTOR PROFILE SIGNALS

@receiver(post_save, sender=DoctorProfile)
def doctor_profile_created(sender, instance, created, **kwargs):
    """
    Handle doctor profile creation.
    """
    if created:
        logger.info(f"Doctor profile created for: {instance.user.username}")
        
        # Create welcome notification
        Notification.objects.create(
            user=instance.user,
            title='Welcome to Telemedicine Platform!',
            message=f'Welcome Dr. {instance.user.get_full_name()}! Your doctor profile has been created.',
            type='system'
        )
        
        # Create system log entry
        SystemLog.objects.create(
            user=instance.user,
            action='create',
            model_name='DoctorProfile',
            object_id=str(instance.id),
            details={
                'username': instance.user.username,
                'email': instance.user.email,
                'specialization': instance.specialization,
                'action': 'profile_created'
            }
        )

@receiver(pre_save, sender=DoctorProfile)
def doctor_profile_pre_save(sender, instance, **kwargs):
    """
    Handle pre-save doctor profile events.
    """
    if instance.pk:
        old = DoctorProfile.objects.get(pk=instance.pk)
        changes = []
        
        # Check for important changes
        if old.specialization != instance.specialization:
            changes.append(f"specialization: {old.specialization} -> {instance.specialization}")
        if old.available != instance.available:
            changes.append(f"available: {old.available} -> {instance.available}")
        if old.consultation_fee != instance.consultation_fee:
            changes.append(f"consultation_fee: {old.consultation_fee} -> {instance.consultation_fee}")
        if old.verification_status != instance.verification_status:
            changes.append(f"verification_status: {old.verification_status} -> {instance.verification_status}")
        
        if changes:
            logger.info(f"Doctor profile {instance.user.username} updated: {', '.join(changes)}")
            
            # Create notification for verification status change
            if 'verification_status' in str(changes):
                if instance.verification_status == 'approved':
                    Notification.objects.create(
                        user=instance.user,
                        title='Profile Verified!',
                        message='Your doctor profile has been verified. You can now accept appointments.',
                        type='system'
                    )
                elif instance.verification_status == 'rejected':
                    Notification.objects.create(
                        user=instance.user,
                        title='Profile Verification Failed',
                        message='Your doctor profile verification failed. Please contact support.',
                        type='system'
                    )


# APPOINTMENT SIGNALS

@receiver(post_save, sender=Appointment)
def appointment_created(sender, instance, created, **kwargs):
    """
    Handle appointment creation and status changes.
    """
    if created:
        logger.info(f"New appointment created: {instance.appointment_id}")
        
        # Notify doctor
        Notification.objects.create(
            user=instance.doctor.user,
            title='New Appointment Request',
            message=f'New appointment request from {instance.patient.full_name} on {instance.appointment_date} at {instance.start_time}',
            type='appointment',
            link=f'/appointments/{instance.id}'
        )
        
        # Notify patient (appointment created)
        Notification.objects.create(
            user=instance.patient.user,
            title='Appointment Requested',
            message=f'Your appointment request with Dr. {instance.doctor.full_name} has been sent. Awaiting confirmation.',
            type='appointment',
            link=f'/appointments/{instance.id}'
        )
        
        # System log
        SystemLog.objects.create(
            user=instance.patient.user,
            action='create',
            model_name='Appointment',
            object_id=instance.appointment_id,
            details={
                'patient': instance.patient.user.username,
                'doctor': instance.doctor.user.username,
                'date': str(instance.appointment_date),
                'time': str(instance.start_time)
            }
        )

@receiver(pre_save, sender=Appointment)
def appointment_pre_save(sender, instance, **kwargs):
    """
    Handle appointment status changes.
    """
    if instance.pk:
        old = Appointment.objects.get(pk=instance.pk)
        
        # Handle status changes
        if old.status != instance.status:
            status_messages = {
                'confirmed': {
                    'message': f'Your appointment with Dr. {instance.doctor.full_name} has been confirmed.',
                    'type': 'appointment_confirm'
                },
                'completed': {
                    'message': f'Your appointment with Dr. {instance.doctor.full_name} has been completed.',
                    'type': 'appointment_complete'
                },
                'cancelled': {
                    'message': f'Your appointment with Dr. {instance.doctor.full_name} has been cancelled.',
                    'type': 'appointment_cancel'
                },
                'missed': {
                    'message': f'You missed your appointment with Dr. {instance.doctor.full_name}.',
                    'type': 'appointment_missed'
                }
            }
            
            # Notify patient about status changes
            if instance.status in status_messages:
                Notification.objects.create(
                    user=instance.patient.user,
                    title=f'Appointment {instance.status.title()}',
                    message=status_messages[instance.status]['message'],
                    type='appointment',
                    link=f'/appointments/{instance.id}'
                )
            
            # Notify doctor if appointment was cancelled
            if instance.status == 'cancelled':
                Notification.objects.create(
                    user=instance.doctor.user,
                    title='Appointment Cancelled',
                    message=f'Appointment with {instance.patient.full_name} has been cancelled.',
                    type='appointment',
                    link=f'/appointments/{instance.id}'
                )
            
            # System log for status changes
            SystemLog.objects.create(
                user=instance.patient.user,
                action='update',
                model_name='Appointment',
                object_id=instance.appointment_id,
                details={
                    'old_status': old.status,
                    'new_status': instance.status,
                    'appointment_id': instance.appointment_id
                }
            )
            
            logger.info(f"Appointment {instance.appointment_id} status changed: {old.status} -> {instance.status}")


# MEDICAL RECORD SIGNALS

@receiver(post_save, sender=MedicalRecord)
def medical_record_created(sender, instance, created, **kwargs):
    """
    Handle medical record creation.
    """
    if created:
        logger.info(f"New medical record created: {instance.record_id}")
        
        # Notify patient
        Notification.objects.create(
            user=instance.patient.user,
            title='New Medical Record',
            message=f'A new medical record has been created by Dr. {instance.doctor.full_name}.',
            type='medical',
            link=f'/medical-records/{instance.id}'
        )
        
        # System log
        SystemLog.objects.create(
            user=instance.doctor.user,
            action='create',
            model_name='MedicalRecord',
            object_id=instance.record_id,
            details={
                'patient': instance.patient.user.username,
                'doctor': instance.doctor.user.username,
                'diagnosis': instance.diagnosis[:100]
            }
        )


# PRESCRIPTION SIGNALS

@receiver(post_save, sender=Prescription)
def prescription_created(sender, instance, created, **kwargs):
    """
    Handle prescription creation.
    """
    if created:
        logger.info(f"New prescription created: {instance.medication_name} for {instance.patient.user.username}")
        
        # Notify patient
        Notification.objects.create(
            user=instance.patient.user,
            title='New Prescription',
            message=f'Dr. {instance.doctor.full_name} has prescribed {instance.medication_name}.',
            type='prescription',
            link=f'/prescriptions/{instance.id}'
        )
        
        # System log
        SystemLog.objects.create(
            user=instance.doctor.user,
            action='create',
            model_name='Prescription',
            object_id=str(instance.id),
            details={
                'patient': instance.patient.user.username,
                'doctor': instance.doctor.user.username,
                'medication': instance.medication_name
            }
        )


# REVIEW SIGNALS

@receiver(post_save, sender=Review)
def review_created(sender, instance, created, **kwargs):
    """
    Handle review creation and doctor rating update.
    """
    if created:
        logger.info(f"New review created: {instance.patient.user.username} rated {instance.doctor.user.username} {instance.rating}★")
        
        # Notify doctor
        Notification.objects.create(
            user=instance.doctor.user,
            title='New Review',
            message=f'{instance.patient.full_name} rated you {instance.rating}★',
            type='system',
            link=f'/reviews/{instance.id}'
        )
        
        # Update doctor rating (done in view to avoid recursion)
        # This is handled in the ReviewViewSet create method
        
        # System log
        SystemLog.objects.create(
            user=instance.patient.user,
            action='create',
            model_name='Review',
            object_id=str(instance.id),
            details={
                'doctor': instance.doctor.user.username,
                'rating': instance.rating,
                'comment': instance.comment[:100]
            }
        )


# PAYMENT SIGNALS

@receiver(post_save, sender=Payment)
def payment_created(sender, instance, created, **kwargs):
    """
    Handle payment creation and status changes.
    """
    if created:
        logger.info(f"New payment created: {instance.id} for {instance.patient.user.username} - {instance.amount}")
        
        # Notify patient
        Notification.objects.create(
            user=instance.patient.user,
            title='Payment Initiated',
            message=f'Payment of ${instance.amount} for appointment has been initiated.',
            type='payment',
            link=f'/payments/{instance.id}'
        )
    
    # Handle payment status changes
    if instance.pk:
        old = Payment.objects.get(pk=instance.pk)
        if old.payment_status != instance.payment_status:
            if instance.payment_status == 'completed':
                Notification.objects.create(
                    user=instance.patient.user,
                    title='Payment Successful',
                    message=f'Payment of ${instance.amount} has been completed successfully.',
                    type='payment',
                    link=f'/payments/{instance.id}'
                )
                
                # Update appointment payment status
                if instance.appointment:
                    instance.appointment.payment_status = 'paid'
                    instance.appointment.payment_id = instance.transaction_reference
                    instance.appointment.save()
            
            elif instance.payment_status == 'failed':
                Notification.objects.create(
                    user=instance.patient.user,
                    title='Payment Failed',
                    message=f'Payment of ${instance.amount} has failed. Please try again.',
                    type='payment',
                    link=f'/payments/{instance.id}'
                )


# DOCUMENT SIGNALS

@receiver(post_save, sender=Document)
def document_created(sender, instance, created, **kwargs):
    """
    Handle document creation.
    """
    if created:
        logger.info(f"New document uploaded: {instance.title} for {instance.patient.user.username}")
        
        # Notify patient
        Notification.objects.create(
            user=instance.patient.user,
            title='Document Uploaded',
            message=f'A new document "{instance.title}" has been uploaded.',
            type='system',
            link=f'/documents/{instance.id}'
        )
        
        # System log
        SystemLog.objects.create(
            user=instance.uploaded_by,
            action='create',
            model_name='Document',
            object_id=str(instance.id),
            details={
                'patient': instance.patient.user.username,
                'title': instance.title,
                'type': instance.document_type
            }
        )


# CHAT MESSAGE SIGNALS

@receiver(post_save, sender=ChatMessage)
def chat_message_created(sender, instance, created, **kwargs):
    """
    Handle chat message creation.
    """
    if created:
        logger.info(f"New chat message: {instance.sender.username} -> {instance.receiver.username}")
        
        # Create notification for receiver
        Notification.objects.create(
            user=instance.receiver,
            title='New Message',
            message=f'You have a new message from {instance.sender.get_full_name() or instance.sender.username}',
            type='message',
            link=f'/chat/{instance.id}'
        )
        
        # System log (only log metadata, not message content for privacy)
        SystemLog.objects.create(
            user=instance.sender,
            action='create',
            model_name='ChatMessage',
            object_id=str(instance.id),
            details={
                'sender': instance.sender.username,
                'receiver': instance.receiver.username,
                'appointment': instance.appointment.id if instance.appointment else None
            }
        )


# DELETE SIGNALS

@receiver(post_delete, sender=Appointment)
def appointment_deleted(sender, instance, **kwargs):
    """
    Handle appointment deletion.
    """
    logger.info(f"Appointment {instance.appointment_id} deleted")
    
    # Notify both parties
    Notification.objects.create(
        user=instance.patient.user,
        title='Appointment Deleted',
        message=f'Your appointment with Dr. {instance.doctor.full_name} has been deleted.',
        type='appointment'
    )
    
    Notification.objects.create(
        user=instance.doctor.user,
        title='Appointment Deleted',
        message=f'Appointment with {instance.patient.full_name} has been deleted.',
        type='appointment'
    )

@receiver(post_delete, sender=Document)
def document_deleted(sender, instance, **kwargs):
    """
    Handle document deletion.
    """
    logger.info(f"Document {instance.title} deleted for {instance.patient.user.username}")
    
    # Notify patient
    Notification.objects.create(
        user=instance.patient.user,
        title='Document Deleted',
        message=f'The document "{instance.title}" has been deleted.',
        type='system'
    )


# SYSTEM LOGGING SIGNAL

@receiver(post_save, sender=User)
def log_user_login(sender, instance, **kwargs):
    """
    Log user login events (handled via middleware or custom authentication).
    This is a placeholder - actual login logging is handled in the view.
    """
    pass


# UTILITY SIGNAL FUNCTIONS

def create_system_log(user, action, model_name, object_id, details=None):
    """
    Utility function to create a system log entry.
    """
    SystemLog.objects.create(
        user=user,
        action=action,
        model_name=model_name,
        object_id=object_id,
        details=details or {}
    )


def send_notification(user, title, message, notification_type='system', link=''):
    """
    Utility function to send a notification.
    """
    Notification.objects.create(
        user=user,
        title=title,
        message=message,
        type=notification_type,
        link=link
    )


# CONNECTION FUNCTION (To be called in apps.py)

def connect_signals():
    """
    Connect all signals.
    This function should be called in the AppConfig.ready() method.
    """
    # User signals
    post_save.connect(user_created, sender=User)
    pre_save.connect(user_pre_save, sender=User)
    
    # Patient profile signals
    post_save.connect(patient_profile_created, sender=PatientProfile)
    pre_save.connect(patient_profile_pre_save, sender=PatientProfile)
    
    # Doctor profile signals
    post_save.connect(doctor_profile_created, sender=DoctorProfile)
    pre_save.connect(doctor_profile_pre_save, sender=DoctorProfile)
    
    # Appointment signals
    post_save.connect(appointment_created, sender=Appointment)
    pre_save.connect(appointment_pre_save, sender=Appointment)
    post_delete.connect(appointment_deleted, sender=Appointment)
    
    # Medical record signals
    post_save.connect(medical_record_created, sender=MedicalRecord)
    
    # Prescription signals
    post_save.connect(prescription_created, sender=Prescription)
    
    # Review signals
    post_save.connect(review_created, sender=Review)
    
    # Payment signals
    post_save.connect(payment_created, sender=Payment)
    
    # Document signals
    post_save.connect(document_created, sender=Document)
    post_delete.connect(document_deleted, sender=Document)
    
    # Chat message signals
    post_save.connect(chat_message_created, sender=ChatMessage)
    
    logger.info("All signals connected successfully")
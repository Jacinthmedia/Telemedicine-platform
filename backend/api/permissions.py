from rest_framework import permissions


class IsPatient(permissions.BasePermission):
    """Allow access only to authenticated users with a patient_profile."""
    message = "Only patients can access this resource."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "patient_profile")
        )


class IsDoctor(permissions.BasePermission):
    """Allow access only to authenticated users with a doctor_profile."""
    message = "Only doctors can access this resource."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and hasattr(request.user, "doctor_profile")
        )


class IsAdminOrReadOnly(permissions.BasePermission):
    """Read-only for anyone, write access only for staff/admin."""
    message = "Only administrators can modify this resource."

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff or request.user.is_superuser)
        )

        from django.core.exceptions import ObjectDoesNotExist
from rest_framework import permissions


def _has_profile(user, attr):
    if not user or not user.is_authenticated:
        return False
    try:
        getattr(user, attr)
        return True
    except ObjectDoesNotExist:
        return False


class IsPatient(permissions.BasePermission):
    message = "Only patients can access this resource."

    def has_permission(self, request, view):
        return _has_profile(request.user, "patient_profile")

    def has_object_permission(self, request, view, obj):
        owner = getattr(obj, "patient", None) or getattr(obj, "patient_profile", None)
        return owner == getattr(request.user, "patient_profile", None)


class IsDoctor(permissions.BasePermission):
    message = "Only doctors can access this resource."

    def has_permission(self, request, view):
        return _has_profile(request.user, "doctor_profile")

    def has_object_permission(self, request, view, obj):
        owner = getattr(obj, "doctor", None) or getattr(obj, "doctor_profile", None)
        return owner == getattr(request.user, "doctor_profile", None)


class IsAdminOrReadOnly(permissions.BasePermission):
    message = "Only administrators can modify this resource."

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


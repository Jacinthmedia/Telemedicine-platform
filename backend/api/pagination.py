"""
Pagination configuration for the Telemedicine API.

This module provides:
- Standard page-number pagination
- Large/small pagination variants
- Limit/offset pagination
- Cursor pagination for infinite-scroll resources
- Model-specific pagination classes
- A reusable pagination utility
"""

from rest_framework.pagination import (
    PageNumberPagination,
    LimitOffsetPagination,
    CursorPagination,
)
from rest_framework.response import Response


# ============================================================================
# STANDARD PAGE NUMBER PAGINATION
# ============================================================================

class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard pagination used by most API list endpoints.

    Example:
        GET /api/appointments/?page=2&page_size=20
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
    page_query_param = "page"

    def get_paginated_response(self, data):
        return Response({
            "success": True,
            "data": data,
            "pagination": {
                "current_page": self.page.number,
                "total_pages": self.page.paginator.num_pages,
                "total_items": self.page.paginator.count,
                "page_size": self.get_page_size(self.request),
                "has_next": self.page.has_next(),
                "has_previous": self.page.has_previous(),
                "next_page": (
                    self.page.next_page_number()
                    if self.page.has_next()
                    else None
                ),
                "previous_page": (
                    self.page.previous_page_number()
                    if self.page.has_previous()
                    else None
                ),
            },
        })


# Backward-compatible alias.
# Existing views can continue using StandardPagination.
StandardPagination = StandardResultsSetPagination


# ============================================================================
# LARGE PAGE PAGINATION
# ============================================================================

class LargePagination(StandardResultsSetPagination):
    """
    Pagination with a larger default page size.

    Suitable for:
    - Admin dashboards
    - Data management screens
    - Large table views

    Avoid using this indiscriminately for public/mobile endpoints.
    """

    page_size = 100
    max_page_size = 500


# ============================================================================
# SMALL PAGE PAGINATION
# ============================================================================

class SmallPagination(StandardResultsSetPagination):
    """
    Smaller pagination size for mobile and lightweight views.
    """

    page_size = 10
    max_page_size = 50


# ============================================================================
# LIMIT / OFFSET PAGINATION
# ============================================================================

class StandardLimitOffsetPagination(LimitOffsetPagination):
    """
    Limit/offset pagination for endpoints that require
    flexible offset-based navigation.
    """

    default_limit = 20
    limit_query_param = "limit"
    offset_query_param = "offset"
    max_limit = 100


# ============================================================================
# CURSOR PAGINATION
# ============================================================================

class StandardCursorPagination(CursorPagination):
    """
    Cursor pagination for infinite-scroll or feed-style endpoints.

    Particularly useful for:
    - Chat messages
    - Notifications
    - Activity feeds
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
    cursor_query_param = "cursor"
    ordering = "-created_at"


# ============================================================================
# CUSTOM PAGINATION RESPONSE
# ============================================================================

class CustomPagination(StandardResultsSetPagination):
    """
    Standard pagination with additional range metadata.
    """

    def get_paginated_response(self, data):
        page_size = self.get_page_size(self.request) or self.page_size
        total_items = self.page.paginator.count

        start_index = (
            (self.page.number - 1) * page_size + 1
            if total_items > 0
            else 0
        )

        end_index = min(
            self.page.number * page_size,
            total_items,
        )

        return Response({
            "success": True,
            "data": data,
            "pagination": {
                "current_page": self.page.number,
                "total_pages": self.page.paginator.num_pages,
                "total_items": total_items,
                "page_size": page_size,
                "has_next": self.page.has_next(),
                "has_previous": self.page.has_previous(),
                "next_page": (
                    self.page.next_page_number()
                    if self.page.has_next()
                    else None
                ),
                "previous_page": (
                    self.page.previous_page_number()
                    if self.page.has_previous()
                    else None
                ),
                "start_index": start_index,
                "end_index": end_index,
            },
        })


# ============================================================================
# MODEL-SPECIFIC PAGINATION
# ============================================================================

class AppointmentPagination(StandardResultsSetPagination):
    """
    Pagination for appointments.

    Appointments may be displayed in calendar and schedule views,
    so a slightly larger page size is useful.
    """

    page_size = 30
    max_page_size = 100


class MedicalRecordPagination(StandardResultsSetPagination):
    """
    Pagination for medical records.
    """

    page_size = 15
    max_page_size = 50


class NotificationPagination(StandardResultsSetPagination):
    """
    Pagination for notifications.
    """

    page_size = 10
    max_page_size = 50


class ChatMessagePagination(CursorPagination):
    """
    Cursor pagination for chat messages.

    Cursor pagination is preferable here because new messages can
    arrive while the user is scrolling through older messages.
    """

    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 50
    cursor_query_param = "cursor"
    ordering = "-created_at"


class DoctorPagination(StandardResultsSetPagination):
    """
    Pagination for doctor listings.
    """

    page_size = 15
    max_page_size = 50


# ============================================================================
# PAGINATION UTILITY
# ============================================================================

def get_paginated_response(
    queryset,
    serializer_class,
    request,
    pagination_class=StandardResultsSetPagination,
):
    """
    Paginate a queryset and serialize the result.

    Args:
        queryset:
            Django QuerySet or compatible iterable.

        serializer_class:
            DRF serializer class.

        request:
            Current Django/DRF request.

        pagination_class:
            Pagination class to use.

    Returns:
        DRF Response
    """

    paginator = pagination_class()

    page = paginator.paginate_queryset(
        queryset,
        request,
        view=None,
    )

    if page is not None:
        serializer = serializer_class(
            page,
            many=True,
            context={"request": request},
        )

        return paginator.get_paginated_response(
            serializer.data
        )

    serializer = serializer_class(
        queryset,
        many=True,
        context={"request": request},
    )

    return Response({
        "success": True,
        "data": serializer.data,
        "pagination": None,
    })


# ============================================================================
# PAGINATION CLASS REGISTRY
# ============================================================================

PAGINATION_CLASSES = {
    "default": StandardResultsSetPagination,
    "large": LargePagination,
    "small": SmallPagination,
    "appointment": AppointmentPagination,
    "medical_record": MedicalRecordPagination,
    "notification": NotificationPagination,
    "chat": ChatMessagePagination,
    "doctor": DoctorPagination,
    "limit_offset": StandardLimitOffsetPagination,
    "cursor": StandardCursorPagination,
    "custom": CustomPagination,
}


def get_pagination_class(name="default"):
    """
    Retrieve a pagination class by name.

    Unknown names safely fall back to standard pagination.
    """

    return PAGINATION_CLASSES.get(
        name,
        StandardResultsSetPagination,
    )
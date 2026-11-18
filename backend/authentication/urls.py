"""
Authentication app URL configuration.

Note: The API already exposes auth endpoints at /api/auth/*
(see api/urls.py). This file exists only for compatibility
and to allow future authentication-only routes.
"""
from django.urls import path
from . import views


urlpatterns = [
    path("register/",        views.AuthViewSet.as_view({"post": "register"}),        name="register"),
    path("login/",           views.AuthViewSet.as_view({"post": "login"}),           name="login"),
    path("me/",              views.AuthViewSet.as_view({"get": "me"}),               name="me"),
    path("logout/",          views.AuthViewSet.as_view({"post": "logout"}),          name="logout"),
    path("refresh-token/",   views.AuthViewSet.as_view({"post": "refresh_token"}),   name="refresh-token"),
    path("change-password/", views.AuthViewSet.as_view({"post": "change_password"}), name="change-password"),
    path("create-admin/",    views.AuthViewSet.as_view({"post": "create_admin"}),    name="create-admin"),
]

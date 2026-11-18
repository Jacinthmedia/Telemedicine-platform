from django.shortcuts import render

# authentication/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User

from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserSerializer,
    ChangePasswordSerializer,
)
from api.models import PatientProfile, DoctorProfile
from api.serializers import PatientProfileSerializer, DoctorProfileSerializer


class AuthViewSet(viewsets.GenericViewSet):
    """Authentication endpoints"""
    permission_classes = [AllowAny]
    serializer_class = UserSerializer

    @action(detail=False, methods=['post'])
    def register(self, request):
        """Register a new user"""
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': 'Validation failed',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()
        return Response({
            'success': True,
            'message': 'Registration successful! Please login.',
            'data': {
                'user': UserSerializer(user).data,
                'role': serializer.get_role(user)
            }
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def login(self, request):
        """Login user and return JWT tokens"""
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': 'Invalid credentials',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)

        if hasattr(user, 'patient_profile'):
            role = 'patient'
            profile_id = user.patient_profile.id
            profile = PatientProfileSerializer(user.patient_profile).data
        elif hasattr(user, 'doctor_profile'):
            role = 'doctor'
            profile_id = user.doctor_profile.id
            profile = DoctorProfileSerializer(user.doctor_profile).data
        else:
            role = 'admin'
            profile_id = None
            profile = None

        return Response({
            'success': True,
            'message': 'Login successful',
            'data': {
                'user': UserSerializer(user).data,
                'role': role,
                'profile_id': profile_id,
                'profile': profile,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh)
                }
            }
        })

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user information"""
        if not request.user.is_authenticated:
            return Response({
                'success': False,
                'message': 'Not authenticated'
            }, status=status.HTTP_401_UNAUTHORIZED)

        user = request.user
        role = None
        profile = None

        if hasattr(user, 'patient_profile'):
            role = 'patient'
            profile = PatientProfileSerializer(user.patient_profile).data
        elif hasattr(user, 'doctor_profile'):
            role = 'doctor'
            profile = DoctorProfileSerializer(user.doctor_profile).data

        return Response({
            'success': True,
            'data': {
                'user': UserSerializer(user).data,
                'role': role,
                'profile': profile
            }
        })

    @action(detail=False, methods=['post'])
    def logout(self, request):
        """Logout user"""
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({
                'success': True,
                'message': 'Logged out successfully'
            })
        except Exception as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def refresh_token(self, request):
        """Refresh access token"""
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({
                'success': False,
                'message': 'Refresh token required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            refresh = RefreshToken(refresh_token)
            return Response({
                'success': True,
                'data': {
                    'access': str(refresh.access_token)
                }
            })
        except Exception as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """Change user password"""
        if not request.user.is_authenticated:
            return Response({
                'success': False,
                'message': 'Authentication required'
            }, status=status.HTTP_401_UNAUTHORIZED)

        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'user': request.user}
        )
        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': 'Validation failed',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()
        return Response({
            'success': True,
            'message': 'Password changed successfully'
        })

    @action(detail=False, methods=['post'])
    def create_admin(self, request):
        """Create an admin user"""
        if not request.user.is_authenticated or not request.user.is_superuser:
            return Response({
                'error': 'Only authenticated superusers can create admins'
            }, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')

        if not all([username, email, password]):
            return Response({
                'error': 'Username, email, and password required'
            }, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({
                'error': 'Username already exists'
            }, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password
        )

        return Response({
            'success': True,
            'message': f'Admin user "{username}" created successfully',
            'user': UserSerializer(user).data
        })
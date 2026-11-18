"""
Django settings for the Telemedicine Platform.

This configuration supports:

- Development
- Production deployment
- Django REST Framework
- JWT authentication
- CORS
- Media/file uploads
- API documentation
- Email
- Secure production defaults
- Django Channels (WebSocket / WebRTC signaling)

Sensitive configuration should be stored in environment variables.
"""

import os
from datetime import timedelta
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass


# ============================================================
# BASE DIRECTORY
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent


# ============================================================
# CORE SECURITY SETTINGS
# ============================================================

PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY", "")
PAYSTACK_PUBLIC_KEY = os.getenv("PAYSTACK_PUBLIC_KEY", "")

SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "django-insecure-development-only-change-this-key",
)


def env_bool(name, default=False):
    """Safely convert environment variables to boolean values."""
    value = os.getenv(name)

    if value is None:
        return default

    return value.strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


DEBUG = env_bool("DEBUG", True)


# ============================================================
# ALLOWED HOSTS
# ============================================================

ALLOWED_HOSTS = ["*"]  # Development only  # Development only


# ============================================================
# APPLICATION DEFINITION
# ============================================================

INSTALLED_APPS = [
    # --------------------------------------------------------
    # Django Channels - must be first
    # --------------------------------------------------------
    "daphne",                         # ← CHANGE: ASGI server for WebSockets

    # --------------------------------------------------------
    # Django Core
    # --------------------------------------------------------
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # --------------------------------------------------------
    # Django REST Framework
    # --------------------------------------------------------
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",

    # --------------------------------------------------------
    # Third-Party Applications
    # --------------------------------------------------------
    "corsheaders",
    "django_filters",
    "drf_yasg",
    "channels",                       # ← CHANGE: WebSocket support

    # --------------------------------------------------------
    # Local Applications
    # --------------------------------------------------------
    "api",
    "payments",
]


# ============================================================
# MIDDLEWARE
# ============================================================

MIDDLEWARE = [
    # CORS should appear before CommonMiddleware.
    "corsheaders.middleware.CorsMiddleware",

    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# ============================================================
# URL CONFIGURATION
# ============================================================

ROOT_URLCONF = "telemedicine.urls"


# ============================================================
# TEMPLATES
# ============================================================

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",

        "DIRS": [
            BASE_DIR / "templates",
        ],

        "APP_DIRS": True,

        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# ============================================================
# WSGI
# ============================================================

WSGI_APPLICATION = "telemedicine.wsgi.application"


# ============================================================
# ASGI (WebSockets / Channels)
# ============================================================

ASGI_APPLICATION = "telemedicine.asgi.application"   # ← CHANGE

CHANNEL_LAYERS = {                                   # ← CHANGE
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    },
}


# ============================================================
# DATABASE
# ============================================================

DATABASE_ENGINE = os.getenv(
    "DATABASE_ENGINE",
    "django.db.backends.sqlite3",
)

if DATABASE_ENGINE == "django.db.backends.sqlite3":

    DATABASES = {
        "default": {
            "ENGINE": DATABASE_ENGINE,
            "NAME": BASE_DIR / os.getenv(
                "DATABASE_NAME",
                "db.sqlite3",
            ),
        }
    }

else:

    DATABASES = {
        "default": {
            "ENGINE": DATABASE_ENGINE,
            "NAME": os.getenv(
                "DATABASE_NAME",
                "",
            ),
            "USER": os.getenv(
                "DATABASE_USER",
                "",
            ),
            "PASSWORD": os.getenv(
                "DATABASE_PASSWORD",
                "",
            ),
            "HOST": os.getenv(
                "DATABASE_HOST",
                "localhost",
            ),
            "PORT": os.getenv(
                "DATABASE_PORT",
                "5432",
            ),
        }
    }


# ============================================================
# PASSWORD VALIDATION
# ============================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "UserAttributeSimilarityValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "MinimumLengthValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "CommonPasswordValidator"
        ),
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "NumericPasswordValidator"
        ),
    },
]


# ============================================================
# INTERNATIONALIZATION
# ============================================================

LANGUAGE_CODE = "en-us"

TIME_ZONE = os.getenv(
    "TIME_ZONE",
    "Africa/Lagos",
)

USE_I18N = True

USE_TZ = True


# ============================================================
# STATIC FILES
# ============================================================

STATIC_URL = "/static/"

STATIC_ROOT = BASE_DIR / "staticfiles"


# ============================================================
# MEDIA FILES
# ============================================================

MEDIA_URL = "/media/"

MEDIA_ROOT = BASE_DIR / "media"


# ============================================================
# DEFAULT PRIMARY KEY
# ============================================================

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# ============================================================
# CORS CONFIGURATION
# ============================================================

if DEBUG:

    CORS_ALLOWED_ORIGINS = [
        "http://192.168.137.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://169.254.11.157:5173",
        "http://169.254.11.157:3000",
    ]

else:

    CORS_ALLOWED_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ALLOWED_ORIGINS",
            "",
        ).split(",")
        if origin.strip()
    ]


CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]

CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]


# ============================================================
# CSRF TRUSTED ORIGINS
# ============================================================

if DEBUG:

    CSRF_TRUSTED_ORIGINS = [
        "http://192.168.137.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://169.254.11.157:5173",
        "http://169.254.11.157:3000",
    ]

else:

    CSRF_TRUSTED_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "CSRF_TRUSTED_ORIGINS",
            "",
        ).split(",")
        if origin.strip()
    ]


# ============================================================
# DJANGO REST FRAMEWORK
# ============================================================

REST_FRAMEWORK = {

    "DEFAULT_AUTHENTICATION_CLASSES": [
        (
            "rest_framework_simplejwt.authentication."
            "JWTAuthentication"
        ),
    ],

    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],

    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
    ],

    "DEFAULT_PAGINATION_CLASS": (
        "api.pagination.StandardResultsSetPagination"
    ),

    "PAGE_SIZE": 20,

    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],

    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FormParser",
    ],
}


# ============================================================
# SIMPLE JWT
# ============================================================

SIMPLE_JWT = {

    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=int(
            os.getenv(
                "JWT_ACCESS_TOKEN_MINUTES",
                "60",
            )
        )
    ),

    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=int(
            os.getenv(
                "JWT_REFRESH_TOKEN_DAYS",
                "7",
            )
        )
    ),

    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,

    "AUTH_HEADER_TYPES": (
        "Bearer",
    ),

    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,

    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",

    "TOKEN_TYPE_CLAIM": "token_type",
}


# ============================================================
# EMAIL CONFIGURATION
# ============================================================

EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.smtp.EmailBackend",
)

EMAIL_HOST = os.getenv(
    "EMAIL_HOST",
    "smtp.gmail.com",
)

EMAIL_PORT = int(
    os.getenv(
        "EMAIL_PORT",
        "587",
    )
)

EMAIL_USE_TLS = env_bool(
    "EMAIL_USE_TLS",
    True,
)

EMAIL_USE_SSL = env_bool(
    "EMAIL_USE_SSL",
    False,
)

EMAIL_HOST_USER = os.getenv(
    "EMAIL_HOST_USER",
    "",
)

EMAIL_HOST_PASSWORD = os.getenv(
    "EMAIL_HOST_PASSWORD",
    "",
)

DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL",
    EMAIL_HOST_USER or "noreply@telemedicine.local",
)


# ============================================================
# SECURITY SETTINGS
# ============================================================

if not DEBUG:

    SECURE_SSL_REDIRECT = env_bool(
        "SECURE_SSL_REDIRECT",
        True,
    )

    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

    SECURE_HSTS_SECONDS = int(
        os.getenv(
            "SECURE_HSTS_SECONDS",
            "31536000",
        )
    )

    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

    SECURE_CONTENT_TYPE_NOSNIFF = True

    SECURE_REFERRER_POLICY = (
        "strict-origin-when-cross-origin"
    )

    SECURE_BROWSER_XSS_FILTER = True

else:

    SECURE_SSL_REDIRECT = False

    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False

    SECURE_CONTENT_TYPE_NOSNIFF = True


# ============================================================
# SESSION SETTINGS
# ============================================================

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"

CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = "Lax"


# ============================================================
# FILE UPLOAD SETTINGS
# ============================================================

DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024


# ============================================================
# DRF-YASG
# ============================================================

SWAGGER_USE_COMPAT_RENDERERS = False


# ============================================================
# DEVELOPMENT / DEBUG INFORMATION
# ============================================================

if DEBUG:
    print("Telemedicine Platform running in DEVELOPMENT mode.")
else:
    print("Telemedicine Platform running in PRODUCTION mode.")
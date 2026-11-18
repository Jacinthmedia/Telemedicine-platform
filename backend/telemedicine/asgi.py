"""
ASGI entrypoint for the Telemedicine Platform.

Routes HTTP requests to Django and WebSocket requests through
JWT authentication to the signaling consumer used for video calls.
"""
import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "telemedicine.settings")

# Initialize Django ASGI app before importing anything that touches models
django_asgi_app = get_asgi_application()

# Import AFTER Django setup
from api.routing import websocket_urlpatterns      # noqa: E402
from api.middleware import JWTAuthMiddleware       # noqa: E402


application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddleware(
        URLRouter(websocket_urlpatterns)
    ),
})

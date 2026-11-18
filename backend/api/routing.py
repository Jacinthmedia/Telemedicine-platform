from django.urls import re_path
from . import consumers

from .consumers import ChatConsumer

websocket_urlpatterns = [
    re_path(r'^ws/chat/$', ChatConsumer.as_asgi()),
    re_path(r'^ws/video/(?P<room_id>[\w-]+)/$', consumers.SignalingConsumer.as_asgi()),
]
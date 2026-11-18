from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError


@database_sync_to_async
def get_user_from_token(token):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    try:
        access_token = AccessToken(token)
        user_id = access_token['user_id']
        return User.objects.get(id=user_id)
    except (TokenError, User.DoesNotExist, KeyError):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Authenticates a Channels WebSocket connection using the JWT passed
    as a query string param: ws://host/ws/chat/?token=<access_token>

    Django Channels' default AuthMiddlewareStack only reads Django
    session cookies, so JWT auth needs this explicit middleware —
    without it, self.scope['user'] is always AnonymousUser and
    every consumer's `if not self.user.is_authenticated: self.close()`
    check fires immediately.
    """

    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        token = params.get('token', [None])[0]

        if token:
            scope['user'] = await get_user_from_token(token)
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    from channels.auth import AuthMiddlewareStack
    return JWTAuthMiddleware(AuthMiddlewareStack(inner))
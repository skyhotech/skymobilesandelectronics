import base64
import hashlib
import hmac

from django.conf import settings


def ice_servers(user, call):
    servers = list(settings.CHAT_ICE_SERVERS)
    if settings.CHAT_TURN_SECRET and settings.CHAT_TURN_URLS:
        username = f"{int(call.created_at.timestamp()) + 7500}:{user.pk}"
        credential = base64.b64encode(
            hmac.new(settings.CHAT_TURN_SECRET.encode(), username.encode(), hashlib.sha1).digest()
        ).decode()
        servers.append(
            {"urls": settings.CHAT_TURN_URLS, "username": username, "credential": credential}
        )
    return servers

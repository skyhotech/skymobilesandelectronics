import asyncio
import uuid
from datetime import timedelta

import pytest
from asgiref.testing import ApplicationCommunicator
from channels.db import database_sync_to_async
from django.contrib.auth.models import Group, User
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient

from apps.chat.models import Call, Message, Signal

pytestmark = pytest.mark.django_db


@pytest.fixture
def staff(settings, tmp_path):
    settings.PRIVATE_MEDIA_ROOT = tmp_path
    cache.clear()
    hr = User.objects.create_user("chat-hr", password="test-only-password")
    employee = User.objects.create_user("chat-employee", password="test-only-password")
    other = User.objects.create_user("chat-other", password="test-only-password")
    customer = User.objects.create_user("chat-customer")
    hr.groups.add(Group.objects.get_or_create(name="HR")[0])
    group = Group.objects.get_or_create(name="Employees")[0]
    employee.groups.add(group)
    other.groups.add(group)
    clients = []
    for user in [hr, employee, other, customer]:
        client = APIClient()
        client.force_login(user)
        clients.append(client)
    return hr, employee, other, customer, clients


def thread(client, user):
    response = client.post("/api/v1/chat/inbox/", {"user_id": user.pk})
    assert response.status_code == 201
    return response.json()["id"]


def test_chat_role_isolation_and_pair_deduplication(staff):
    hr, employee, other, customer, (h, e, o, c) = staff
    assert c.get("/api/v1/chat/inbox/").status_code == 403
    assert e.get("/api/v1/hr/branches/").status_code == 403
    assert e.post("/api/v1/chat/inbox/", {"user_id": other.pk}).status_code == 404
    assert h.post("/api/v1/chat/inbox/", {"user_id": customer.pk}).status_code == 404
    assert thread(h, employee) == thread(e, hr)
    assert [u["id"] for u in e.get("/api/v1/chat/inbox/").json()["contacts"]] == [hr.pk]


def test_messages_private_files_read_receipts_and_retry_safety(staff):
    hr, employee, other, _, (h, e, o, _) = staff
    pk = thread(h, employee)
    path = f"/api/v1/chat/threads/{pk}/messages/"
    identifier = str(uuid.uuid4())
    response = h.post(
        path,
        {
            "client_id": identifier,
            "text": "Hello <script>not HTML</script>",
            "file": SimpleUploadedFile("staff.txt", b"Private staff document"),
        },
        format="multipart",
    )
    assert response.status_code == 201
    message = response.json()
    assert "private-media" not in str(message)
    assert h.post(path, {"client_id": identifier, "text": "retry"}).json()["id"] == message["id"]
    assert Message.objects.count() == 1
    assert e.get("/api/v1/chat/inbox/").json()["conversations"][0]["unread"] == 1
    assert o.get(path).status_code == 404
    download = f"/api/v1/chat/files/{message['id']}/"
    assert o.get(download).status_code == 404
    file = e.get(download)
    assert b"".join(file.streaming_content) == b"Private staff document"
    assert file["Content-Disposition"].startswith("attachment;")
    assert file["Cache-Control"].find("no-store") >= 0
    assert e.post(f"/api/v1/chat/threads/{pk}/read/", {"through": message["id"]}).status_code == 200
    assert h.get(path).json()["messages"][0]["read_at"]
    employee.groups.clear()
    assert e.get(download).status_code == 403
    assert h.get(path).status_code == 404


@pytest.mark.parametrize(
    "name,content",
    [
        ("bad.svg", b"<svg/>"),
        ("bad.jpg", b"not an image"),
        ("bad.pdf", b"not a PDF"),
        ("bad.txt", b"\x00binary"),
        ("large.txt", b"x" * (5 * 1024 * 1024 + 1)),
    ],
    ids=["svg", "spoofed-image", "pdf", "binary-text", "oversize"],
)
def test_unsafe_or_oversized_files_are_rejected(staff, name, content):
    hr, employee, _, _, (h, _, _, _) = staff
    pk = thread(h, employee)
    response = h.post(
        f"/api/v1/chat/threads/{pk}/messages/",
        {"client_id": str(uuid.uuid4()), "file": SimpleUploadedFile(name, content)},
        format="multipart",
    )
    assert response.status_code == 400
    assert not Message.objects.exists()


def test_call_consent_signaling_and_participant_authorization(staff):
    hr, employee, other, _, (h, e, o, _) = staff
    pk = thread(h, employee)
    start = h.post(f"/api/v1/chat/threads/{pk}/calls/", {"kind": "video"})
    assert start.status_code == 201
    cid = start.json()["id"]
    path = f"/api/v1/chat/calls/{cid}/"
    signal = path + "signals/"
    assert o.get(path).status_code == 404
    assert h.post(path, {"action": "accept"}).status_code == 403
    assert (
        h.post(
            signal,
            {"kind": "offer", "payload": {"type": "offer", "sdp": "test-only"}},
            format="json",
        ).status_code
        == 409
    )
    assert h.post(f"/api/v1/chat/threads/{pk}/calls/", {"kind": "audio"}).status_code == 409
    assert e.post(path, {"action": "accept"}).json()["status"] == "accepted"
    assert (
        e.post(
            signal,
            {"kind": "offer", "payload": {"type": "offer", "sdp": "test-only"}},
            format="json",
        ).status_code
        == 403
    )
    assert (
        h.post(
            signal,
            {"kind": "offer", "payload": {"type": "offer", "sdp": "test-only"}},
            format="json",
        ).status_code
        == 201
    )
    received = e.get(path).json()["signals"]
    assert received[0]["kind"] == "offer"
    assert not h.get(path).json()["signals"]
    assert not e.get(path + f"?after={received[0]['id']}").json()["signals"]
    assert e.post(path, {"action": "end"}).json()["status"] == "ended"
    assert not Signal.objects.exists()
    assert (
        h.post(signal, {"kind": "ice", "payload": {"candidate": "test"}}, format="json").status_code
        == 409
    )


def test_expired_requests_are_missed_and_cannot_be_accepted(staff):
    hr, employee, _, _, (h, e, _, _) = staff
    pk = thread(h, employee)
    cid = h.post(f"/api/v1/chat/threads/{pk}/calls/", {"kind": "audio"}).json()["id"]
    Call.objects.filter(pk=cid).update(created_at=timezone.now() - timedelta(minutes=2))
    assert e.post(f"/api/v1/chat/calls/{cid}/", {"action": "accept"}).json()["status"] == "missed"


def test_login_csrf_and_no_customer_access(staff):
    client = APIClient(enforce_csrf_checks=True)
    assert (
        client.post(
            "/api/v1/chat/session/", {"username": "chat-employee", "password": "test-only-password"}
        ).status_code
        == 403
    )
    token = client.get("/api/v1/chat/session/").json()["csrfToken"]
    assert (
        client.post(
            "/api/v1/chat/session/",
            {"username": "chat-employee", "password": "test-only-password"},
            HTTP_X_CSRFTOKEN=token,
        ).status_code
        == 200
    )
    assert client.post("/api/v1/chat/inbox/", {"user_id": staff[0].pk}).status_code == 403


@pytest.mark.django_db(transaction=True)
def test_websocket_session_and_origin_validation(staff):
    from config.asgi import application

    hr, employee, _, _, (h, _, _, _) = staff

    async def run():
        scope = {
            "type": "websocket",
            "path": "/ws/chat/",
            "headers": [
                (b"origin", b"https://evil.example"),
                (b"cookie", f"sessionid={h.cookies['sessionid'].value}".encode()),
            ],
            "query_string": b"",
            "subprotocols": [],
        }
        denied = ApplicationCommunicator(application, scope)
        await denied.send_input({"type": "websocket.connect"})
        assert (await denied.receive_output())["type"] == "websocket.close"
        await denied.wait()
        scope["headers"][0] = (b"origin", b"http://localhost:3000")
        valid = ApplicationCommunicator(application, scope)
        await valid.send_input({"type": "websocket.connect"})
        assert (await valid.receive_output())["type"] == "websocket.accept"
        from channels.layers import get_channel_layer

        await get_channel_layer().group_send(f"chat.user.{hr.pk}", {"type": "chat.changed"})
        assert (await valid.receive_output())["text"] == '{"type": "changed"}'
        await database_sync_to_async(hr.groups.clear)()
        await get_channel_layer().group_send(f"chat.user.{hr.pk}", {"type": "chat.changed"})
        assert (await valid.receive_output())["type"] == "websocket.close"
        await valid.send_input({"type": "websocket.disconnect", "code": 1000})
        await valid.wait()

    asyncio.run(run())


def test_abandoned_calls_expire_and_signal_cache_is_purged(staff):
    from apps.chat.api import expire_calls

    hr, employee, _, _, (h, e, _, _) = staff
    pk = thread(h, employee)
    cid = h.post(f"/api/v1/chat/threads/{pk}/calls/", {"kind": "audio"}).json()["id"]
    e.post(f"/api/v1/chat/calls/{cid}/", {"action": "accept"})
    Call.objects.filter(pk=cid).update(recipient_seen_at=timezone.now() - timedelta(seconds=95))
    signal = Signal.objects.create(
        call_id=cid, sender=hr, kind="ice", payload={"candidate": "test-only"}
    )
    Signal.objects.filter(pk=signal.pk).update(created_at=timezone.now() - timedelta(minutes=6))
    expire_calls()
    assert Call.objects.get(pk=cid).status == "ended"
    assert not Signal.objects.exists()


def test_turn_secret_is_never_returned_to_clients(staff, settings):
    settings.CHAT_TURN_SECRET = "test-only-private-turn-secret"
    settings.CHAT_TURN_URLS = ["turn:relay.example.invalid:3478"]
    hr, employee, _, _, (h, e, _, _) = staff
    pk = thread(h, employee)
    cid = h.post(f"/api/v1/chat/threads/{pk}/calls/", {"kind": "audio"}).json()["id"]
    response = e.get(f"/api/v1/chat/calls/{cid}/").json()
    assert settings.CHAT_TURN_SECRET not in str(response)
    assert response["ice_servers"][0]["username"].endswith(f":{employee.pk}")
    assert response["ice_servers"][0]["credential"]

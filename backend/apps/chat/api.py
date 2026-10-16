import json
from datetime import timedelta
from pathlib import Path

from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Count, Q
from django.http import FileResponse
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from PIL import Image
from redis.exceptions import RedisError
from rest_framework import serializers
from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.products.management_api import (
    LoginSerializer,
    ManagementSession,
    ManagementSessionSerializer,
)

from . import schemas
from .access import ChatPermission, allowed, contacts, conversations
from .ice import ice_servers
from .models import Call, Conversation, Message, Signal
from .realtime import notify


class ChatSession(ManagementSession):
    def envelope(self, request):
        return Response(
            {
                "user": {"username": request.user.get_username()}
                if allowed(request.user)
                else None,
                "csrfToken": get_token(request),
            }
        )

    def post(self, request):
        data = LoginSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        user = authenticate(request=request, **data.validated_data)
        if not user or not allowed(user):
            return Response({"detail": "Invalid employee credentials."}, status=400)
        login(request, user)
        request.user = user
        return self.envelope(request)


class ChatThrottle(UserRateThrottle):
    scope = "chat_write"
    rate = "90/min"

    def allow_request(self, request, view):
        try:
            return super().allow_request(request, view)
        except RedisError:
            error = APIException("Chat rate limiting is unavailable. Please retry shortly.")
            error.status_code = 503
            raise error from None


@method_decorator(never_cache, name="dispatch")
class ChatView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [ChatPermission]

    def get_throttles(self):
        return [ChatThrottle()] if self.request.method == "POST" else []


def person(user):
    return {"id": user.pk, "username": user.username, "name": user.get_full_name() or user.username}


def call_data(call):
    return {
        "id": call.pk,
        "conversation": call.conversation_id,
        "caller": call.caller_id,
        "kind": call.kind,
        "status": call.status,
        "created_at": call.created_at.isoformat(),
    }


def expire_calls():
    now = timezone.now()
    Call.objects.filter(status="ringing", created_at__lt=now - timedelta(seconds=60)).update(
        status="missed", updated_at=now
    )
    Call.objects.filter(status="accepted").filter(
        Q(created_at__lt=now - timedelta(hours=2))
        | Q(caller_seen_at__lt=now - timedelta(seconds=90))
        | Q(recipient_seen_at__lt=now - timedelta(seconds=90))
    ).update(status="ended", updated_at=now)
    Signal.objects.filter(created_at__lt=now - timedelta(minutes=5)).delete()


class Inbox(ChatView):
    def get(self, request):
        expire_calls()
        threads = (
            conversations(request.user)
            .select_related("first", "second")
            .annotate(
                unread=Count(
                    "messages",
                    filter=Q(messages__read_at=None) & ~Q(messages__sender=request.user),
                    distinct=True,
                ),
            )
            .order_by("-updated_at")[:100]
        )
        rows = [
            {
                "id": t.pk,
                "peer": person(t.second if t.first_id == request.user.pk else t.first),
                "unread": t.unread,
            }
            for t in threads
        ]
        calls = Call.objects.filter(
            conversation__in=conversations(request.user), status__in=["ringing", "accepted"]
        ).order_by("-id")[:10]
        latest = (
            Message.objects.filter(conversation__in=conversations(request.user))
            .order_by("-id")
            .values_list("id", flat=True)
            .first()
            or 0
        )
        return Response(
            {
                "me": person(request.user),
                "contacts": [person(u) for u in contacts(request.user).order_by("username")[:500]],
                "conversations": rows,
                "calls": [call_data(c) for c in calls],
                "latest_message": latest,
            }
        )

    def post(self, request):
        data = ContactRequest(data=request.data)
        data.is_valid(raise_exception=True)
        peer = get_object_or_404(contacts(request.user), pk=data.validated_data["user_id"])
        first, second = sorted([peer.pk, request.user.pk])
        thread, _ = Conversation.objects.get_or_create(first_id=first, second_id=second)
        return Response({"id": thread.pk}, status=201)


class ContactRequest(serializers.Serializer):
    user_id = serializers.IntegerField(min_value=1)


class MessageSerializer(serializers.ModelSerializer):
    attachment_url = serializers.SerializerMethodField()

    def get_attachment_url(self, message) -> str:
        return f"/chat/api/files/{message.pk}/" if message.attachment else ""

    class Meta:
        model = Message
        fields = [
            "id",
            "sender_id",
            "client_id",
            "text",
            "filename",
            "size",
            "attachment_url",
            "created_at",
            "read_at",
        ]


class MessageRequest(serializers.Serializer):
    client_id = serializers.UUIDField()
    text = serializers.CharField(max_length=4000, allow_blank=True, required=False, default="")
    file = serializers.FileField(required=False)

    def validate(self, data):
        upload = data.get("file")
        if not data["text"] and not upload:
            raise ValidationError("Write a message or attach a file.")
        if upload:
            if upload.size > 5 * 1024 * 1024:
                raise ValidationError("Attachments must be 5 MB or smaller.")
            extension = Path(upload.name).suffix.lower()
            try:
                if extension in {".png", ".jpg", ".jpeg", ".webp"}:
                    image = Image.open(upload)
                    if (
                        image.format not in {"PNG", "JPEG", "WEBP"}
                        or image.width * image.height > 25_000_000
                    ):
                        raise ValueError()
                    image.verify()
                elif extension == ".pdf":
                    if not upload.read(5).startswith(b"%PDF-"):
                        raise ValueError()
                elif extension == ".txt":
                    content = upload.read()
                    content.decode("utf-8")
                    if b"\x00" in content:
                        raise ValueError()
                else:
                    raise ValueError()
            except Exception as error:
                raise ValidationError(
                    "Use a valid PNG, JPEG, WebP, PDF or UTF-8 text file."
                ) from error
            finally:
                upload.seek(0)
        return data


class Messages(ChatView):
    def get(self, request, pk):
        thread = get_object_or_404(conversations(request.user), pk=pk)
        try:
            before = max(0, int(request.query_params.get("before", "0")))
        except ValueError:
            raise ValidationError("Invalid message cursor.") from None
        query = thread.messages.order_by("-id")
        if request.query_params.get("files") == "1":
            query = query.exclude(attachment="")
        if before:
            query = query.filter(id__lt=before)
        rows = list(query[:50])
        return Response(
            {
                "messages": MessageSerializer(reversed(rows), many=True).data,
                "before": rows[-1].pk if len(rows) == 50 else None,
            }
        )

    def post(self, request, pk):
        thread = get_object_or_404(conversations(request.user), pk=pk)
        data = MessageRequest(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        # Serialize sends for this author so retries never create extra files/messages.
        saved_name = None
        upload = values.get("file")
        try:
            with transaction.atomic():
                User.objects.select_for_update().get(pk=request.user.pk)
                old = Message.objects.filter(
                    sender=request.user, client_id=values["client_id"]
                ).first()
                if old:
                    if old.conversation_id != thread.pk:
                        raise ValidationError("Message identifier is already in use.")
                    return Response(MessageSerializer(old).data)
                message = Message(
                    conversation=thread,
                    sender=request.user,
                    text=values["text"],
                    client_id=values["client_id"],
                )
                if upload:
                    message.filename = Path(upload.name.replace("\\", "/")).name[:180]
                    message.size = upload.size
                    message.attachment.save(upload.name, upload, save=False)
                    saved_name = message.attachment.name
                message.save()
                thread.save(update_fields=["updated_at"])
                notify(thread)
        except Exception:
            if saved_name:
                Message._meta.get_field("attachment").storage.delete(saved_name)
            raise
        return Response(MessageSerializer(message).data, status=201)


class ReadRequest(serializers.Serializer):
    through = serializers.IntegerField(min_value=1)


class ReadMessages(ChatView):
    def post(self, request, pk):
        thread = get_object_or_404(conversations(request.user), pk=pk)
        data = ReadRequest(data=request.data)
        data.is_valid(raise_exception=True)
        thread.messages.filter(id__lte=data.validated_data["through"], read_at=None).exclude(
            sender=request.user
        ).update(read_at=timezone.now())
        notify(thread)
        return Response({"ok": True})


class Attachment(ChatView):
    def get(self, request, pk):
        message = get_object_or_404(Message, pk=pk, conversation__in=conversations(request.user))
        if not message.attachment:
            return Response(status=404)
        try:
            response = FileResponse(
                message.attachment.open("rb"),
                as_attachment=True,
                filename=message.filename,
                content_type="application/octet-stream",
            )
        except FileNotFoundError:
            return Response({"detail": "This attachment is no longer available."}, status=404)
        response["X-Content-Type-Options"] = "nosniff"
        return response


class CallRequest(serializers.Serializer):
    kind = serializers.ChoiceField(choices=["audio", "video"])


class CallThrottle(ChatThrottle):
    scope = "chat_call_requests"
    rate = "30/hour"


class Calls(ChatView):
    def get_throttles(self):
        return [CallThrottle()]

    def post(self, request, pk):
        thread = get_object_or_404(conversations(request.user), pk=pk)
        data = CallRequest(data=request.data)
        data.is_valid(raise_exception=True)
        with transaction.atomic():
            # Lock both participants in stable order to prevent concurrent busy calls.
            list(
                User.objects.select_for_update()
                .filter(pk__in=[thread.first_id, thread.second_id])
                .order_by("pk")
            )
            expire_calls()
            busy = (
                Call.objects.filter(status__in=["ringing", "accepted"])
                .filter(
                    Q(conversation__first_id__in=[thread.first_id, thread.second_id])
                    | Q(conversation__second_id__in=[thread.first_id, thread.second_id])
                )
                .exists()
            )
            if busy:
                return Response(
                    {"detail": "One participant already has an active call."}, status=409
                )
            call = Call.objects.create(
                conversation=thread, caller=request.user, kind=data.validated_data["kind"]
            )
            notify(thread)
        return Response(call_data(call), status=201)


class CallAction(serializers.Serializer):
    action = serializers.ChoiceField(choices=["accept", "decline", "end"])


class CallDetail(ChatView):
    def get(self, request, pk):
        expire_calls()
        call = get_object_or_404(Call, pk=pk, conversation__in=conversations(request.user))
        if call.status == "accepted":
            field = "caller_seen_at" if call.caller_id == request.user.pk else "recipient_seen_at"
            Call.objects.filter(pk=call.pk).update(**{field: timezone.now()})
        try:
            after = max(0, int(request.query_params.get("after", "0")))
        except ValueError:
            raise ValidationError("Invalid signal cursor.") from None
        signals = (
            call.signals.filter(id__gt=after, created_at__gte=timezone.now() - timedelta(minutes=5))
            .exclude(sender=request.user)
            .order_by("id")[:200]
        )
        return Response(
            {
                **call_data(call),
                "signals": list(signals.values("id", "kind", "payload")),
                "ice_servers": ice_servers(request.user, call),
            }
        )

    def post(self, request, pk):
        data = CallAction(data=request.data)
        data.is_valid(raise_exception=True)
        with transaction.atomic():
            call = get_object_or_404(
                Call.objects.select_for_update(),
                pk=pk,
                conversation__in=conversations(request.user),
            )
            action = data.validated_data["action"]
            if call.status not in {"ringing", "accepted"}:
                return Response({"detail": "Call has already finished."}, status=409)
            if action != "end" and (call.caller_id == request.user.pk or call.status != "ringing"):
                return Response(
                    {"detail": "Only the recipient can answer a ringing call."}, status=403
                )
            if call.status == "ringing" and call.created_at < timezone.now() - timedelta(
                seconds=60
            ):
                call.status = "missed"
            else:
                call.status = {"accept": "accepted", "decline": "declined", "end": "ended"}[action]
            if call.status == "accepted":
                call.caller_seen_at = call.recipient_seen_at = timezone.now()
            call.save()
            if call.status in {"ended", "declined", "missed"}:
                call.signals.all().delete()
            notify(call.conversation)
        return Response(call_data(call))


class SignalRequest(serializers.Serializer):
    kind = serializers.ChoiceField(choices=["offer", "answer", "ice"])
    payload = serializers.JSONField()

    def validate(self, data):
        payload = data["payload"]
        if not isinstance(payload, dict) or len(json.dumps(payload)) > 32768:
            raise ValidationError("Invalid signaling payload.")
        if data["kind"] in {"offer", "answer"}:
            if payload.get("type") != data["kind"] or not isinstance(payload.get("sdp"), str):
                raise ValidationError("Invalid session description.")
        elif not isinstance(payload.get("candidate"), str):
            raise ValidationError("Invalid ICE candidate.")
        return data


class Signals(ChatView):
    def get_throttles(self):
        return []  # Per-call durable limit and participant authorization below.

    def post(self, request, pk):
        data = SignalRequest(data=request.data)
        data.is_valid(raise_exception=True)
        with transaction.atomic():
            call = get_object_or_404(
                Call.objects.select_for_update(),
                pk=pk,
                conversation__in=conversations(request.user),
            )
            if call.status != "accepted" or call.updated_at < timezone.now() - timedelta(hours=2):
                return Response({"detail": "Call is not active."}, status=409)
            kind = data.validated_data["kind"]
            if (kind == "offer" and call.caller_id != request.user.pk) or (
                kind == "answer" and call.caller_id == request.user.pk
            ):
                return Response(status=403)
            if call.signals.count() >= 200:
                return Response(
                    {"detail": "Call signal limit reached. Start a new call."}, status=429
                )
            if kind != "ice" and call.signals.filter(kind=kind).exists():
                return Response({"detail": "Description already supplied."}, status=409)
            Signal.objects.create(call=call, sender=request.user, **data.validated_data)
            notify(call.conversation)
        return Response({"ok": True}, status=201)


class MessagePage(serializers.Serializer):
    messages = MessageSerializer(many=True)
    before = serializers.IntegerField(allow_null=True)


ChatSession = extend_schema_view(
    post=extend_schema(request=LoginSerializer, responses=ManagementSessionSerializer)
)(ChatSession)
Inbox = extend_schema_view(
    get=extend_schema(responses=schemas.Inbox),
    post=extend_schema(request=ContactRequest, responses={201: schemas.Identifier}),
)(Inbox)
Messages = extend_schema_view(
    get=extend_schema(
        parameters=[OpenApiParameter("before", int), OpenApiParameter("files", str, enum=["1"])],
        responses=MessagePage,
    ),
    post=extend_schema(request=MessageRequest, responses={201: MessageSerializer}),
)(Messages)
ReadMessages = extend_schema_view(
    post=extend_schema(request=ReadRequest, responses=schemas.Success)
)(ReadMessages)
Attachment = extend_schema_view(get=extend_schema(responses=OpenApiTypes.BINARY))(Attachment)
Calls = extend_schema_view(post=extend_schema(request=CallRequest, responses={201: schemas.Call}))(
    Calls
)
CallDetail = extend_schema_view(
    get=extend_schema(parameters=[OpenApiParameter("after", int)], responses=schemas.CallState),
    post=extend_schema(request=CallAction, responses=schemas.Call),
)(CallDetail)
Signals = extend_schema_view(
    post=extend_schema(request=SignalRequest, responses={201: schemas.Success})
)(Signals)

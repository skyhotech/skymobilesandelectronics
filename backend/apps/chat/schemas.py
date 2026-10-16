from rest_framework import serializers


class Person(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    name = serializers.CharField()


class Thread(serializers.Serializer):
    id = serializers.IntegerField()
    peer = Person()
    unread = serializers.IntegerField()


class Call(serializers.Serializer):
    id = serializers.IntegerField()
    conversation = serializers.IntegerField()
    caller = serializers.IntegerField()
    kind = serializers.ChoiceField(choices=["audio", "video"])
    status = serializers.ChoiceField(choices=["ringing", "accepted", "declined", "ended", "missed"])
    created_at = serializers.DateTimeField()


class Inbox(serializers.Serializer):
    me = Person()
    contacts = Person(many=True)
    conversations = Thread(many=True)
    calls = Call(many=True)
    latest_message = serializers.IntegerField()


class Identifier(serializers.Serializer):
    id = serializers.IntegerField()


class Success(serializers.Serializer):
    ok = serializers.BooleanField()


class Signal(serializers.Serializer):
    id = serializers.IntegerField()
    kind = serializers.ChoiceField(choices=["offer", "answer", "ice"])
    payload = serializers.JSONField()


class CallState(Call):
    signals = Signal(many=True)
    ice_servers = serializers.ListField(child=serializers.JSONField())

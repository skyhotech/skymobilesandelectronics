from django.contrib.auth.models import User
from django.db.models import Q
from rest_framework.permissions import BasePermission


def allowed(user):
    return bool(
        user.is_authenticated
        and user.is_active
        and user.groups.filter(name__in=["HR", "Employees"]).exists()
    )


def hr(user):
    return user.groups.filter(name="HR").exists()


def contacts(user):
    groups = ["HR", "Employees"] if hr(user) else ["HR"]
    return (
        User.objects.filter(is_active=True, groups__name__in=groups).exclude(pk=user.pk).distinct()
    )


def conversations(user):
    from .models import Conversation

    return (
        Conversation.objects.filter(Q(first=user) | Q(second=user))
        .filter(
            first__is_active=True,
            second__is_active=True,
        )
        .filter(Q(first__groups__name="HR") | Q(second__groups__name="HR"))
        .filter(
            first__groups__name__in=["HR", "Employees"],
            second__groups__name__in=["HR", "Employees"],
        )
        .distinct()
    )


class ChatPermission(BasePermission):
    def has_permission(self, request, view):
        return allowed(request.user)

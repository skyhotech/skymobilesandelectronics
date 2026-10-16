import pytest
from django.contrib.auth.models import Group, User
from django.test import Client

from apps.careers.models import JobOpening

pytestmark = pytest.mark.django_db
HR = "/api/v1/hr/careers/"
PUBLIC = "/api/v1/careers/"


def test_careers_crud_publication_and_authorization():
    client = Client(enforce_csrf_checks=True)
    assert client.get(HR).status_code == 403
    user = User.objects.create_user("careers-hr")
    client.force_login(user)
    assert client.get(HR).status_code == 403
    user.groups.add(Group.objects.create(name="HR"))
    payload = {
        "title": "Sales executive",
        "location": "Chennai",
        "employment_type": "full_time",
        "description": "Assist customers",
        "application_email": "jobs@example.com",
    }
    assert client.post(HR, payload).status_code == 403
    client.defaults["HTTP_X_CSRFTOKEN"] = client.get("/api/v1/hr/session/").json()["csrfToken"]
    assert client.post(HR, {**payload, "application_email": "not-email"}).status_code == 400
    assert client.post(HR, {**payload, "title": " "}).status_code == 400
    created = client.post(HR, payload)
    assert created.status_code == 201
    record = JobOpening.objects.get()
    assert record.created_by == user
    assert not record.is_active
    public = Client()
    assert public.get(PUBLIC).json()["count"] == 0
    detail = f"{HR}{record.id}/"
    assert client.get(detail).status_code == 200
    assert (
        client.patch(detail, {"is_active": True}, content_type="application/json").status_code
        == 200
    )
    job = public.get(PUBLIC).json()["results"][0]
    assert job["title"] == payload["title"]
    assert "created_by" not in job
    assert public.post(PUBLIC, payload).status_code == 405
    assert (
        public.patch(detail, {"title": "Attack"}, content_type="application/json").status_code
        == 403
    )
    assert (
        client.patch(detail, {"title": "Updated"}, content_type="application/json").status_code
        == 200
    )
    assert public.get(PUBLIC).json()["results"][0]["title"] == "Updated"
    assert (
        client.patch(detail, {"is_active": False}, content_type="application/json").status_code
        == 200
    )
    assert public.get(PUBLIC).json()["count"] == 0
    assert client.delete(detail).status_code == 204
    assert not JobOpening.objects.exists()

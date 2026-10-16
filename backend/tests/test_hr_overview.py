import pytest
from django.contrib.auth.models import Group, User

from apps.branches.models import Branch
from apps.careers.models import JobOpening
from apps.notifications.models import Broadcast

pytestmark = pytest.mark.django_db


def test_hr_overview_is_authorized_and_counts_real_records(client):
    url = "/api/v1/hr/overview/"
    assert client.get(url).status_code == 403
    user = User.objects.create_user("overview-hr")
    client.force_login(user)
    assert client.get(url).status_code == 403
    user.groups.add(Group.objects.create(name="HR"))
    Branch.objects.create(name="ARNI-1", code="arni-1", city="ARNI")
    Branch.objects.create(name="ARNI-2", code="arni-2", city="ARNI", is_active=False)
    Branch.objects.create(name="HEAD OFFICE", code="head-office")
    for active in [True, False]:
        JobOpening.objects.create(
            title="Sales",
            location="ARNI",
            description="Test",
            application_email="jobs@example.com",
            is_active=active,
        )
    Broadcast.objects.create(title="Meeting", message="Tomorrow", sender=user)
    response = client.get(url)
    data = response.json()
    assert response.status_code == 200
    assert "no-store" in response["Cache-Control"]
    assert data["branches"] == 3
    assert data["active_branches"] == 2
    assert data["jobs"] == 2
    assert data["published_jobs"] == 1
    assert data["broadcasts"] == 1
    assert data["cities"] == [{"city": "", "total": 1}, {"city": "ARNI", "total": 2}]
    assert len(data["recent_jobs"]) == 2
    assert data["recent_broadcasts"][0]["title"] == "Meeting"
    user.groups.clear()
    assert client.get(url).status_code == 403

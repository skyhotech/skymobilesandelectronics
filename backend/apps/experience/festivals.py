from datetime import date

import holidays

from .models import FestivalEvent


def sync_year(year):
    """Import without replacing administrator corrections or assignments."""
    calendar = holidays.country_holidays("IN", subdiv="TN", years=[year], language="en_US")
    count = 0
    for day, name in calendar.items():
        _, created = FestivalEvent.objects.get_or_create(
            date=day,
            name=name,
            region="IN-TN",
            defaults={"source": f"python-holidays {holidays.__version__}; India/Tamil Nadu"},
        )
        count += created
    for month, day, name in [(1, 1, "New Year"), (2, 14, "Valentine's Day"), (12, 25, "Christmas")]:
        _, created = FestivalEvent.objects.get_or_create(
            date=date(year, month, day),
            name=name,
            region="International",
            defaults={"source": "Fixed Gregorian observance"},
        )
        count += created
    return count

from celery import shared_task

from .streetview import purge_expired


@shared_task(soft_time_limit=45, time_limit=60)
def purge_google_location_cache():
    purge_expired()

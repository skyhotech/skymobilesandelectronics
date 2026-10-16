from celery import shared_task


@shared_task(soft_time_limit=30, time_limit=45)
def clean_call_state():
    from .api import expire_calls

    expire_calls()

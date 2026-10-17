FROM python:3.13-slim AS dependencies
WORKDIR /app
COPY requirements/base.txt requirements/base.txt
RUN apt-get update && apt-get install -y --no-install-recommends build-essential pkg-config default-libmysqlclient-dev && rm -rf /var/lib/apt/lists/*
RUN python -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir --require-hashes -r requirements/base.txt
RUN /opt/venv/bin/python -m pip check

FROM python:3.13-slim
ENV PATH="/opt/venv/bin:$PATH" PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 MEDIA_ROOT=/app/media PRIVATE_MEDIA_ROOT=/app/private-media
RUN apt-get update && apt-get install -y --no-install-recommends libmariadb3 && rm -rf /var/lib/apt/lists/* && useradd --create-home --uid 10001 sky
WORKDIR /app
COPY --from=dependencies /opt/venv /opt/venv
COPY --chown=sky:sky . .
USER sky
RUN /opt/venv/bin/python -c "import django, celery, channels, MySQLdb, uvicorn"
EXPOSE 8000
CMD ["/opt/venv/bin/python", "-m", "uvicorn", "config.asgi:application", "--host", "0.0.0.0", "--port", "8000"]

# Platform foundation

The Next.js storefront and administration dashboard use one Django REST API. MySQL will
hold persistent business data. Redis is configured for Celery and the Channels layer.
The API has process liveness and dependency readiness routes; authenticated API permissions
are the default. No business API, custom user model, or consumer is implemented yet.

Reserved app directories follow the master prompt. Add complete Django apps and migrations
incrementally rather than registering empty applications. Frontend feature directories are similarly reserved. Keep pricing, inventory, order, and permission
logic on the backend. Do not implement successful checkout until real payment boundaries exist.

Media originals and optimized variants will remain on the rented server, outside MySQL.
The next media phase must add validated uploads, persistent metadata, queued transformation,
versioned files, and responsive delivery. The current Nginx snippet is development configuration.

There is no running production service or deployment in this initialization.

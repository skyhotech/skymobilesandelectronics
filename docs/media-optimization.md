# Self-hosted media implementation plan

Uploads will be validated server-side, with file-size/pixel-count/type limits. Originals remain
private and persisted on the server. A separate Celery images queue will create bounded-size
WebP variants once; AVIF may be added after measuring processing cost. Keep processing concurrency
low on rented servers, and publish an asset only after its variants are completely written.

Store dimensions, bytes, processing status, and versioned URLs in MySQL. Customer responses
reference optimized variants only. Serve them directly through Nginx from a read-only media mount.
Use responsive image selection and lazy loading below the fold; load the main visible image eagerly.
Use immutable cache headers only when filenames change whenever content changes.

Current files supply the library dependencies, media directories, and an Nginx development snippet.
The upload API, worker tasks, image model, backups, and client image component are not implemented.
Actual speed improvement must be measured after that feature is built.

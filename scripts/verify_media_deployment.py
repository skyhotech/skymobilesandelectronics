"""Explicit upload/retrieval/persistence smoke test against an approved deployment."""

import argparse
import getpass
import hashlib
import http.cookiejar
import json
import os
import struct
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
import zlib


def png():
    def chunk(kind, data):
        return (
            struct.pack("!I", len(data))
            + kind
            + data
            + struct.pack("!I", zlib.crc32(kind + data))
        )

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack("!2I5B", 2, 2, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress((b"\0" + b"\0\x40\x80" * 2) * 2))
        + chunk(b"IEND", b"")
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-base", required=True)
    parser.add_argument("--media-origin")
    parser.add_argument("--allow-http-dev", action="store_true")
    parser.add_argument(
        "--compose", help="Approved compose file, for nginx validation/recreation"
    )
    parser.add_argument(
        "--recreate-backend",
        action="store_true",
        help="Explicitly recreate backend; interrupts service",
    )
    args = parser.parse_args()
    base = args.api_base.rstrip("/") + "/"
    parsed = urllib.parse.urlparse(base)
    if parsed.scheme != "https" and not args.allow_http_dev:
        parser.error("Use HTTPS, or explicitly allow HTTP only for local development.")
    if args.recreate_backend and not args.compose:
        parser.error("Container recreation requires an explicit Compose file.")
    origin = f"{parsed.scheme}://{parsed.netloc}"
    jar = http.cookiejar.CookieJar()
    client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

    def request(path, data=None, headers=None, method=None):
        request = urllib.request.Request(
            urllib.parse.urljoin(base, path),
            data=data,
            headers=headers or {},
            method=method,
        )
        with client.open(request, timeout=20) as response:
            return response.read()

    session = json.loads(request("management/session/"))
    username = os.environ.get("SKY_ADMIN_USERNAME") or input("Owner username: ")
    password = os.environ.get("SKY_ADMIN_PASSWORD") or getpass.getpass(
        "Owner password: "
    )
    session = json.loads(
        request(
            "management/session/",
            json.dumps({"username": username, "password": password}).encode(),
            {
                "Content-Type": "application/json",
                "X-CSRFToken": session["csrfToken"],
                "Origin": origin,
            },
        )
    )
    boundary = uuid.uuid4().hex
    body = (
        (
            f'--{boundary}\r\nContent-Disposition: form-data; name="kind"\r\n\r\nother\r\n--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="storage-smoke.png"\r\nContent-Type: image/png\r\n\r\n'
        ).encode()
        + png()
        + f"\r\n--{boundary}--\r\n".encode()
    )
    asset = json.loads(
        request(
            "management/media/upload/",
            body,
            {
                "Content-Type": f"multipart/form-data; boundary={boundary}",
                "X-CSRFToken": session["csrfToken"],
                "Origin": origin,
            },
        )
    )
    media_url = urllib.parse.urljoin(args.media_origin or origin, asset["image_url"])

    def public_hash():
        with urllib.request.urlopen(media_url, timeout=20) as response:
            if response.headers.get_content_type() != "image/webp":
                raise RuntimeError("Expected a public WebP image")
            return hashlib.sha256(response.read()).hexdigest()

    expected = public_hash()
    print("Owner upload and public optimized-image retrieval passed.")
    if args.compose:
        subprocess.run(
            [
                "docker",
                "compose",
                "-f",
                args.compose,
                "exec",
                "-T",
                "nginx",
                "nginx",
                "-t",
            ],
            check=True,
        )
    if args.recreate_backend:
        subprocess.run(
            [
                "docker",
                "compose",
                "-f",
                args.compose,
                "up",
                "-d",
                "--no-deps",
                "--force-recreate",
                "backend",
            ],
            check=True,
        )
        for attempt in range(30):
            try:
                detail = json.loads(request(f"management/media/{asset['id']}/"))
                if (
                    detail["file_name"] == asset["file_name"]
                    and public_hash() == expected
                ):
                    break
            except (urllib.error.URLError, OSError, ValueError):
                pass
            time.sleep(2)
        else:
            raise RuntimeError("Media persistence verification failed after recreation")
        print(
            "Container recreation preserved database reference and public image bytes."
        )
    # Archive only; never remove a possibly shared physical file.
    request(
        f"management/media/{asset['id']}/",
        headers={"X-CSRFToken": session["csrfToken"], "Origin": origin},
        method="DELETE",
    )
    print("Smoke asset archived. Original and optimized files retained by policy.")


if __name__ == "__main__":
    main()

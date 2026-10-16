import importlib

import pytest
from django.test import override_settings
from django.urls import clear_url_caches
from PIL import Image

from config import urls


@pytest.mark.parametrize("kind", ["products", "brands", "categories", "banners"])
def test_local_public_media_is_served_only_in_debug(client, tmp_path, kind):
    image = tmp_path / kind / "example.webp"
    image.parent.mkdir()
    Image.new("RGB", (2, 2), "white").save(image, format="WEBP")
    try:
        with override_settings(DEBUG=True, MEDIA_ROOT=tmp_path):
            importlib.reload(urls)
            clear_url_caches()
            response = client.get(f"/media/{kind}/example.webp")
            assert response.status_code == 200
            assert response["Content-Type"] == "image/webp"
            assert b"".join(response.streaming_content) == image.read_bytes()
            assert client.get("/media/").status_code == 404
            assert client.get("/media/../private-media/original.webp").status_code == 400
        with override_settings(DEBUG=False, MEDIA_ROOT=tmp_path):
            importlib.reload(urls)
            clear_url_caches()
            assert client.get(f"/media/{kind}/example.webp").status_code == 404
    finally:
        importlib.reload(urls)
        clear_url_caches()

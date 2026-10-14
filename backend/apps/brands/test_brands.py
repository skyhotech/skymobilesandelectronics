import pytest
from django.core.management import call_command
from django.test import Client

from apps.brands.management.commands.import_homepage_brands import HOMEPAGE_BRANDS
from apps.brands.models import Brand


@pytest.mark.django_db
def test_public_brand_feed_lists_only_published_brands_in_order():
    Brand.objects.create(
        name="Second", slug="second", logo="brands/b.webp", show_on_homepage=True, display_order=2
    )
    Brand.objects.create(
        name="First", slug="first", logo="brands/a.webp", show_on_homepage=True, display_order=1
    )
    Brand.objects.create(name="Hidden", slug="hidden", logo="brands/c.webp")
    Brand.objects.create(
        name="Inactive",
        slug="inactive",
        logo="brands/d.webp",
        show_on_homepage=True,
        is_active=False,
    )
    Brand.objects.create(name="No logo", slug="no-logo", show_on_homepage=True)

    response = Client().get("/api/v1/brands/")

    assert response.status_code == 200
    assert [item["slug"] for item in response.json()] == ["first", "second"]
    assert response.json()[0]["logo_url"] == "/media/brands/a.webp"


@pytest.mark.django_db
def test_import_homepage_brands_is_repeatable_and_keeps_admin_edits(tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path / "media"
    source = tmp_path / "logos"
    source.mkdir()
    for index, (_, slug) in enumerate(HOMEPAGE_BRANDS):
        (source / f"{slug}.webp").write_bytes(b"RIFF" + bytes([index]) * 8)

    call_command("import_homepage_brands", source=source)

    brands = list(Brand.objects.all())
    assert [brand.slug for brand in brands] == [slug for _, slug in HOMEPAGE_BRANDS]
    assert all(brand.show_on_homepage and brand.logo for brand in brands)
    assert (tmp_path / "media/brands/logos/apple.webp").is_file()

    Brand.objects.filter(slug="apple").update(name="Apple India", show_on_homepage=False)
    call_command("import_homepage_brands", source=source)

    apple = Brand.objects.get(slug="apple")
    assert apple.name == "Apple India"
    assert Brand.objects.count() == len(HOMEPAGE_BRANDS)

from django.db import migrations

CATEGORIES = [
    {
        "name": "Smartphones",
        "slug": "smartphones",
        "image_url": "/images/homepage/categories-v2/smartphones.webp",
        "badge": "New 5G",
        "description": "120+ models",
        "starting_price": "8999",
        "destination": "#smartphones",
        "display_order": 10,
        "show_on_homepage": True,
        "is_active": True,
    },
    {
        "name": "Laptops & Macs",
        "slug": "laptops-macs",
        "image_url": "/images/homepage/categories-v2/laptops.webp",
        "badge": "Copilot+",
        "description": "MacBook & HP",
        "starting_price": "34990",
        "destination": "#laptops",
        "display_order": 20,
        "show_on_homepage": True,
        "is_active": True,
    },
    {
        "name": "Tablets & iPads",
        "slug": "tablets-ipads",
        "image_url": "/images/homepage/categories-v2/tablets.webp",
        "badge": "Trending",
        "description": "iPad Pro & Tab S",
        "starting_price": "25999",
        "destination": "#laptops",
        "display_order": 30,
        "show_on_homepage": True,
        "is_active": True,
    },
    {
        "name": "Smartwatches",
        "slug": "smartwatches",
        "image_url": "/images/homepage/categories-v2/watches.webp",
        "badge": "Stay connected",
        "description": "AMOLED & Bluetooth calling",
        "starting_price": "1299",
        "destination": "#gadgets",
        "display_order": 40,
        "show_on_homepage": True,
        "is_active": True,
    },
    {
        "name": "TWS Earbuds",
        "slug": "tws-earbuds",
        "image_url": "/images/homepage/categories-v2/earbuds.webp",
        "badge": "Top deal",
        "description": "Active noise cancellation",
        "starting_price": "899",
        "destination": "#gadgets",
        "display_order": 50,
        "show_on_homepage": True,
        "is_active": True,
    },
    {
        "name": "Bluetooth Speakers",
        "slug": "bluetooth-speakers",
        "image_url": "/images/homepage/categories-v2/speakers.webp",
        "badge": "Turn it up",
        "description": "Portable & party audio",
        "starting_price": "790",
        "destination": "#gadgets",
        "display_order": 60,
        "show_on_homepage": True,
        "is_active": True,
    },
    {
        "name": "GaN Chargers",
        "slug": "gan-chargers",
        "image_url": "/images/homepage/categories-v2/chargers.webp",
        "badge": "Fast charging",
        "description": "35W–65W USB-C power",
        "starting_price": "399",
        "destination": "#gadgets",
        "display_order": 70,
        "show_on_homepage": True,
        "is_active": True,
    },
    {
        "name": "Power Banks",
        "slug": "power-banks",
        "image_url": "/images/homepage/categories-v2/power-banks.webp",
        "badge": "Power anywhere",
        "description": "10,000–20,000 mAh",
        "starting_price": "890",
        "destination": "#gadgets",
        "display_order": 80,
        "show_on_homepage": True,
        "is_active": True,
    },
    {
        "name": "4K TVs & Audio",
        "slug": "tvs-audio",
        "image_url": "/images/homepage/categories-v2/televisions.webp",
        "badge": "Big-screen moments",
        "description": "QLED & soundbars",
        "starting_price": "14990",
        "destination": "#entertainment",
        "display_order": 90,
        "show_on_homepage": True,
        "is_active": True,
    },
    {
        "name": "Home Appliances",
        "slug": "home-appliances",
        "image_url": "/images/homepage/categories-v2/appliances.webp",
        "badge": "Smarter living",
        "description": "Air conditioners & fridges",
        "starting_price": "9990",
        "destination": "#entertainment",
        "display_order": 100,
        "show_on_homepage": True,
        "is_active": True,
    },
]


def seed_existing_homepage(apps, schema_editor):
    Category = apps.get_model("categories", "Category")
    for row in CATEGORIES:
        if (
            not Category.objects.filter(name=row["name"]).exists()
            and not Category.objects.filter(slug=row["slug"]).exists()
        ):
            Category.objects.create(**row)


class Migration(migrations.Migration):
    dependencies = [("categories", "0002_alter_category_options_category_badge_and_more")]
    operations = [migrations.RunPython(seed_existing_homepage, migrations.RunPython.noop)]

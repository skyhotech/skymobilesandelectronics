from copy import deepcopy

from django.db import migrations

CONFIG = {
    "tokens": {
        "primary": "#0b1c48",
        "secondary": "#bb0014",
        "background": "#faf8ff",
        "surface": "#ffffff",
        "text": "#131b2e",
        "accent": "#dce1ff",
        "border": "#c6c6d0",
    },
    "radius": 16,
    "font": "Inter",
    "effect": "none",
    "intensity": 12,
    "speed": 12,
    "transition_ms": 450,
    "asset_ids": [],
    "weather": True,
}
PRESETS = [
    ("Deepavali", "deepavali", "#542506", "#8f250c", "#fff8e8", "#ffd166", "lights"),
    ("Pongal", "pongal", "#234e21", "#944300", "#fffbea", "#efbd48", "kolam"),
    ("Navaratri", "navaratri", "#4f184f", "#9b2453", "#fff4fa", "#dbaf46", "flowers"),
    ("Ayudha Pooja", "ayudha-pooja", "#513b0a", "#8f3607", "#fff9eb", "#efb73b", "flowers"),
    ("Christmas", "christmas", "#16452e", "#a32032", "#f4faf7", "#dbbc71", "snow"),
    ("New Year", "new-year", "#191d49", "#67409d", "#f6f5ff", "#e8ca75", "lights"),
    ("Valentine's Day", "valentines-day", "#621e39", "#ad234e", "#fff5f8", "#e6a0b3", "hearts"),
    (
        "Independence Day",
        "independence-day",
        "#173c57",
        "#276138",
        "#f8fcf8",
        "#d7751c",
        "tricolor",
    ),
    ("Republic Day", "republic-day", "#142f57", "#28613c", "#f5fafc", "#e7a458", "tricolor"),
    ("Raksha Bandhan", "raksha-bandhan", "#6b2444", "#944025", "#fff6f0", "#e6b766", "flowers"),
    ("Summer Sale", "summer-sale", "#624109", "#995017", "#fffbed", "#e9b43b", "sun"),
    ("Monsoon Sale", "monsoon-sale", "#153e57", "#245d70", "#f2f9fc", "#76aabe", "rain"),
    ("Winter Sale", "winter-sale", "#263e64", "#415f88", "#f4f8ff", "#9ab5dc", "mist"),
    (
        "Mega Electronics Sale",
        "mega-electronics-sale",
        "#251452",
        "#702ca0",
        "#f7f3ff",
        "#a9c4ff",
        "lights",
    ),
    ("Black Friday", "black-friday", "#181818", "#664d15", "#faf9f5", "#d5ba72", "lights"),
    ("Anniversary Sale", "anniversary-sale", "#48294a", "#8e3a52", "#fff8fb", "#e5c18d", "lights"),
    ("Flash Sale", "flash-sale", "#242442", "#a41e32", "#fff7f7", "#f6ba60", "lights"),
    ("Minimal Luxury", "minimal-luxury", "#191919", "#414141", "#fafaf9", "#aaa48f", "none"),
    ("Modern Gradient", "modern-gradient", "#313473", "#683d8c", "#f7f5ff", "#b8b1ef", "lights"),
]


def seed(apps, schema_editor):
    Theme = apps.get_model("experience", "Theme")
    default, _ = Theme.objects.get_or_create(
        slug="default",
        defaults={
            "name": "Default SKY",
            "category": "system",
            "is_default": True,
            "config": CONFIG,
            "description": "Protected original SKY design and animation.",
        },
    )
    for name, slug, primary, secondary, background, accent, effect in PRESETS:
        config = deepcopy(CONFIG)
        config["tokens"].update(
            primary=primary, secondary=secondary, background=background, accent=accent
        )
        config["effect"] = effect
        Theme.objects.get_or_create(
            slug=slug,
            defaults={
                "name": name,
                "category": "festival" if "Sale" not in name else "campaign",
                "config": config,
                "description": f"{name} palette and accessible {effect} decorations. Promotional content is managed separately.",
            },
        )
    state, _ = apps.get_model("experience", "ExperienceSettings").objects.get_or_create(
        pk=1, defaults={"active_theme": default, "options": {}}
    )
    apps.get_model("experience", "ExperienceRevision").objects.get_or_create(
        revision=1,
        defaults={
            "action": "initial-default",
            "snapshot": {
                "active_theme": default.pk,
                "mode": "manual",
                "options": {},
                "theme": {"id": default.pk, "config": CONFIG},
            },
        },
    )


class Migration(migrations.Migration):
    dependencies = [("experience", "0001_initial")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]

"""Create reserved feature directories without placeholder implementations."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
paths = [
    "frontend/public/images",
    "frontend/public/icons",
    "frontend/public/fonts",
    "frontend/src/hooks",
    "frontend/src/providers",
    "frontend/src/store",
    "frontend/src/types",
    "frontend/src/config",
    "frontend/src/tests",
    "frontend/e2e",
    "backend/api/schema",
    "backend/scripts",
    "backend/tests/integration",
    "backend/tests/security",
    "backend/tests/performance",
    "infrastructure/nginx",
    "infrastructure/monitoring",
    "infrastructure/backups",
    "scripts/verify-environment",
    ".github/workflows",
    "mobile_app/integration_test",
    "mobile_app/lib/app/router",
    "mobile_app/lib/app/theme",
    "mobile_app/lib/shared/widgets",
    "mobile_app/lib/shared/models",
]
groups = {
    "frontend/src/app/(store)": "mobiles laptops gadgets categories brands products search offers cart checkout",
    "frontend/src/app/(customer)": "login register account orders wishlist",
    "frontend/src/app/admin": "dashboard products categories brands inventory banners promotions orders customers branches media roles settings",
    "frontend/src/components": "ui layout products banners cart admin",
    "frontend/src/features": "auth catalog search cart checkout wishlist realtime notifications",
    "frontend/src/lib": "api auth realtime validation utils",
    "backend/apps": "accounts authentication products categories brands inventory branches cart orders payments coupons promotions homepage wishlist reviews media_library notifications realtime audit_logs",
    "backend/common": "exceptions middleware pagination permissions responses validators utilities",
    "mobile_app/assets": "images icons fonts",
    "mobile_app/lib/core": "api auth cache errors network realtime security storage",
    "mobile_app/lib/features": "onboarding authentication home products categories brands search cart checkout orders wishlist profile",
    "docs": "architecture api security operations deployment",
}
for parent, names in groups.items():
    paths.extend(f"{parent}/{name}" for name in names.split())
for relative in paths:
    folder = ROOT / relative
    folder.mkdir(parents=True, exist_ok=True)
    if not any(folder.iterdir()):
        (folder / ".gitkeep").touch()
print("Directories initialized; existing files preserved.")

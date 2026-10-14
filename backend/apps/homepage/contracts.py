import json
import re
from functools import lru_cache
from urllib.parse import unquote, urlsplit

from django.conf import settings
from rest_framework.exceptions import ValidationError


@lru_cache
def manifest():
    return json.loads((settings.BASE_DIR.parent / "contracts/homepage.schema.json").read_text("utf-8"))


def defaults():
    return {"schema_version": 1, "sections": [
        {"id": section["id"], "enabled": True,
         "values": {field["key"]: field["default"] for field in section["fields"]}}
        for section in manifest()["sections"]
    ]}


def safe_url(value, image=False):
    decoded = unquote(value)
    if any(ord(char) < 32 or ord(char) == 127 for char in decoded) or "\\" in decoded:
        return False
    if decoded.startswith("//") or decoded != decoded.strip():
        return False
    if image:
        return bool(re.fullmatch(r"/(?:images|media)/homepage/[\w ./()+@&,-]+\.(?:png|jpe?g|webp|avif|svg)", decoded, re.I)) and ".." not in decoded.split("/")
    parsed = urlsplit(decoded)
    if decoded.startswith(("/", "#")):
        return ".." not in parsed.path.split("/")
    if parsed.scheme == "https":
        return bool(parsed.netloc) and not parsed.username and not parsed.password
    return parsed.scheme in {"mailto", "tel"} and bool(parsed.path)


def validate_document(document):
    def fail(message):
        raise ValidationError({"draft": message})

    if not isinstance(document, dict) or set(document) != {"schema_version", "sections"}:
        fail("Expected schema_version and sections only.")
    if type(document["schema_version"]) is not int or document["schema_version"] != 1:
        fail("Unsupported homepage schema version.")
    sections = document["sections"]
    expected = manifest()["sections"]
    if not isinstance(sections, list) or len(sections) != len(expected):
        fail("Every homepage section must be present exactly once.")
    known = {section["id"]: section for section in expected}
    seen = set()
    for index, section in enumerate(sections):
        if not isinstance(section, dict) or set(section) != {"id", "enabled", "values"}:
            fail("Invalid section properties.")
        key = section["id"]
        if not isinstance(key, str) or key not in known or key in seen:
            fail("Unknown or duplicate homepage section.")
        seen.add(key)
        definition = known[key]
        if not definition["can_reorder"] and expected[index]["id"] != key:
            fail("Fixed sections cannot be moved.")
        if type(section["enabled"]) is not bool:
            fail("Section visibility must be true or false.")
        if not definition["can_hide"] and not section["enabled"]:
            fail("This section cannot be hidden.")
        fields = {field["key"]: field for field in definition["fields"]}
        values = section["values"]
        if not isinstance(values, dict) or set(values) != set(fields):
            fail("All configured fields are required; unknown fields are forbidden.")
        for field, value in values.items():
            if not isinstance(value, str) or len(value) > 5000:
                fail(f"{field}: must be text of at most 5000 characters.")
            kind = fields[field]["kind"]
            if kind in {"image", "link"} and not safe_url(value, image=kind == "image"):
                fail(f"{field}: unsafe or unsupported {kind} URL.")
    return document

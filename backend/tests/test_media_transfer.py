import importlib.util
from pathlib import Path

import pytest


def receiver():
    location = Path(__file__).resolve().parents[2] / "scripts/media_receiver.py"
    spec = importlib.util.spec_from_file_location("media_receiver_test", location)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_receiver_checksums_idempotence_and_no_overwrite(tmp_path):
    module = receiver()
    root = tmp_path / "public"
    root.mkdir()
    stage = module.execute({"operation": "stage"})["temporary"]
    Path(stage).write_bytes(b"media-test-data")
    digest = module.checksum(Path(stage))
    payload = {
        "operation": "commit",
        "root": str(root),
        "name": "products/image.webp",
        "temporary": stage,
        "sha256": digest,
    }
    assert module.execute(payload)["verified"]
    assert (root / "products/image.webp").read_bytes() == b"media-test-data"
    assert (
        module.execute(
            {"operation": "inspect", "root": str(root), "names": ["products/image.webp"]}
        )["products/image.webp"]
        == digest
    )
    stage = module.execute({"operation": "stage"})["temporary"]
    Path(stage).write_bytes(b"conflicting-data")
    payload.update(temporary=stage, sha256=module.checksum(Path(stage)))
    with pytest.raises(ValueError, match="conflict"):
        module.execute(payload)
    assert (root / "products/image.webp").read_bytes() == b"media-test-data"
    module.execute({"operation": "cleanup", "temporary": stage})
    with pytest.raises(ValueError):
        module.target(root, "../private.webp")


def test_receiver_rejects_checksum_failure(tmp_path):
    module = receiver()
    root = tmp_path / "public"
    root.mkdir()
    stage = module.execute({"operation": "stage"})["temporary"]
    Path(stage).write_bytes(b"incomplete-transfer")
    with pytest.raises(ValueError, match="checksum"):
        module.execute(
            {
                "operation": "commit",
                "root": str(root),
                "name": "image.webp",
                "temporary": stage,
                "sha256": "wrong",
            }
        )
    assert not (root / "image.webp").exists()
    module.execute({"operation": "cleanup", "temporary": stage})


def test_compose_storage_mount_contract():
    import yaml

    root = Path(__file__).resolve().parents[2]
    development = yaml.safe_load((root / "compose.dev.yml").read_text())
    production = yaml.safe_load((root / "compose.prod.yml").read_text())
    assert "./data/media:/app/media" in development["services"]["backend"]["volumes"]
    mounts = production["services"]["backend"]["volumes"]
    assert any(
        volume["target"] == "/app/media" and not volume["bind"]["create_host_path"]
        for volume in mounts
    )
    nginx = production["services"]["nginx"]["volumes"]
    assert any(
        isinstance(volume, dict) and volume["target"] == "/srv/media" and volume["read_only"]
        for volume in nginx
    )
    assert not any("private-media" in str(volume) for volume in nginx)

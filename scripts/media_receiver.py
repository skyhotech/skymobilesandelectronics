"""Restricted receiver invoked through SSH by transfer_media.py. No overwrite or tree deletion."""

import hashlib
import json
import os
import re
import sys
import tempfile
from pathlib import Path


def checksum(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def target(root, name):
    base = Path(root).absolute()
    if len(base.parts) < 3 or not base.is_dir() or base.resolve() != base:
        raise ValueError("Provision an absolute, non-symlink media directory first.")
    if (
        not name
        or "\\" in name
        or ":" in name
        or name.startswith("/")
        or any(part in ("", ".", "..") for part in name.split("/"))
    ):
        raise ValueError("Unsafe relative filename")
    path = base / name
    if not path.resolve().is_relative_to(base) or any(
        part.is_symlink() for part in [path, *path.parents] if part.is_relative_to(base)
    ):
        raise ValueError("Symlink or path traversal rejected")
    return path


def staging(path):
    file = Path(path)
    if (
        file.parent != Path(tempfile.gettempdir())
        or not re.fullmatch(r"sky-media-[a-zA-Z0-9_-]+\.part", file.name)
        or file.is_symlink()
    ):
        raise ValueError("Invalid staging file")
    expected_owner = int(
        os.environ.get("SUDO_UID", os.getuid() if hasattr(os, "getuid") else 0)
    )
    if hasattr(os, "getuid") and file.stat().st_uid != expected_owner:
        raise ValueError("Staging file owner mismatch")
    return file


def execute(request):
    operation = request["operation"]
    if operation == "stage":
        descriptor, path = tempfile.mkstemp(prefix="sky-media-", suffix=".part")
        os.close(descriptor)
        return {"temporary": path}
    if operation == "cleanup":
        if not Path(request["temporary"]).exists():
            return {"removed": True}
        staging(request["temporary"]).unlink(missing_ok=True)
        return {"removed": True}
    if operation == "inspect":
        return {
            name: checksum(path) if path.is_file() else None
            for name in request["names"]
            if (path := target(request["root"], name))
        }
    if operation != "commit":
        raise ValueError("Unknown operation")
    source = staging(request["temporary"])
    destination = target(request["root"], request["name"])
    if checksum(source) != request["sha256"]:
        raise ValueError("Transfer checksum mismatch")
    private = bool(request.get("private"))
    directory_mode, file_mode = (0o700, 0o600) if private else (0o755, 0o644)
    missing = []
    parent = destination.parent
    while not parent.exists():
        missing.append(parent)
        parent = parent.parent
    for folder in reversed(missing):
        folder.mkdir(mode=directory_mode)
        if hasattr(os, "chown") and request.get("uid") is not None:
            os.chown(folder, request["uid"], request["gid"])
    # Copy into the destination filesystem, then atomically link without replacing a name.
    descriptor, temporary = tempfile.mkstemp(
        prefix=".transfer-", dir=destination.parent
    )
    os.close(descriptor)
    local_temp = Path(temporary)
    try:
        with source.open("rb") as incoming, local_temp.open("wb") as outgoing:
            for chunk in iter(lambda: incoming.read(1024 * 1024), b""):
                outgoing.write(chunk)
            outgoing.flush()
            os.fsync(outgoing.fileno())
        if checksum(local_temp) != request["sha256"]:
            raise ValueError("Destination checksum mismatch")
        os.chmod(local_temp, file_mode)
        if hasattr(os, "chown") and request.get("uid") is not None:
            os.chown(local_temp, request["uid"], request["gid"])
        try:
            os.link(local_temp, destination)
        except FileExistsError:
            if checksum(destination) != request["sha256"]:
                raise ValueError("Destination conflict; nothing overwritten") from None
    finally:
        local_temp.unlink(missing_ok=True)
    source.unlink()
    return {"verified": True}


if __name__ == "__main__":
    print(json.dumps(execute(json.load(sys.stdin))))

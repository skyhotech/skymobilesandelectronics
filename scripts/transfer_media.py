"""Checksum-verified SSH/SCP migration; dry-run by default, never replaces existing files."""

import argparse
import json
import re
import shlex
import subprocess
from pathlib import Path

from media_receiver import checksum

ROOT = Path(__file__).resolve().parents[1]
RECEIVER = (ROOT / "scripts/media_receiver.py").read_text(encoding="utf-8")


def inventory(root):
    files = {}
    for path in root.rglob("*"):
        if path.is_symlink():
            raise ValueError("Source symlinks are not accepted.")
        if path.is_file():
            files[path.relative_to(root).as_posix()] = {
                "sha256": checksum(path),
                "bytes": path.stat().st_size,
            }
    return files


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--host", required=True, help="SSH user@hostname using existing SSH keys"
    )
    parser.add_argument("--port", type=int, default=22)
    parser.add_argument("--source", type=Path, default=ROOT / "data/media")
    parser.add_argument("--destination", default="/srv/sky/media")
    parser.add_argument("--include-private", action="store_true")
    parser.add_argument(
        "--private-source", type=Path, default=ROOT / "data/private-media"
    )
    parser.add_argument("--private-destination", default="/srv/sky/private-media")
    parser.add_argument(
        "--remote-sudo",
        action="store_true",
        help="Use approved passwordless sudo for destination access",
    )
    parser.add_argument("--uid", type=int, default=10001)
    parser.add_argument("--gid", type=int, default=10001)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Explicitly copy missing files; existing conflicts always fail",
    )
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Read remote checksums without changing files",
    )
    args = parser.parse_args()
    if not re.fullmatch(
        r"[A-Za-z0-9_][A-Za-z0-9_.-]*@[A-Za-z0-9][A-Za-z0-9_.-]*", args.host
    ):
        parser.error("Use a simple SSH user@hostname; set port separately.")
    if not 1 <= args.port <= 65535:
        parser.error("SSH port must be between 1 and 65535.")

    def remote(payload, elevated=True):
        prefix = "sudo -n " if elevated and args.remote_sudo else ""
        result = subprocess.run(
            [
                "ssh",
                "-p",
                str(args.port),
                args.host,
                prefix + "python3 -c " + shlex.quote(RECEIVER),
            ],
            input=json.dumps(payload),
            text=True,
            capture_output=True,
            check=True,
            timeout=120,
        )
        return json.loads(result.stdout)

    trees = [(args.source.resolve(), args.destination, False)]
    if args.include_private:
        trees.append((args.private_source.resolve(), args.private_destination, True))
    for source, destination, private in trees:
        if not source.is_dir():
            raise ValueError(f"Source directory is missing: {source}")
        files = inventory(source)
        print(
            f"{'Private' if private else 'Public'}: {len(files)} files, {sum(row['bytes'] for row in files.values())} bytes"
        )
        if not args.apply and not args.verify_only:
            continue
        existing = remote(
            {"operation": "inspect", "root": destination, "names": list(files)}
        )
        conflicts = [
            name
            for name, row in files.items()
            if existing[name] not in (None, row["sha256"])
        ]
        if conflicts:
            raise ValueError(
                f"Conflicting files; nothing will be replaced: {conflicts}"
            )
        missing = [name for name, row in files.items() if existing[name] is None]
        if args.verify_only:
            if missing:
                raise ValueError(f"Remote files missing: {missing}")
            print("All remote checksums match.")
            continue
        for name in missing:
            temporary = remote({"operation": "stage"}, elevated=False)["temporary"]
            # Temporary receiver names contain only OS-generated safe characters.
            try:
                subprocess.run(
                    [
                        "scp",
                        "-P",
                        str(args.port),
                        str(source / name),
                        f"{args.host}:{temporary}",
                    ],
                    check=True,
                    timeout=120,
                )
                remote(
                    {
                        "operation": "commit",
                        "root": destination,
                        "name": name,
                        "temporary": temporary,
                        "sha256": files[name]["sha256"],
                        "private": private,
                        "uid": args.uid,
                        "gid": args.gid,
                    }
                )
            except (OSError, subprocess.SubprocessError, RuntimeError, ValueError):
                remote({"operation": "cleanup", "temporary": temporary}, elevated=False)
                raise
        verified = remote(
            {"operation": "inspect", "root": destination, "names": list(files)}
        )
        if any(verified[name] != row["sha256"] for name, row in files.items()):
            raise ValueError("Post-transfer verification failed")
        print("Verified. Re-running skips matching files; local source retained.")
    if not args.apply and not args.verify_only:
        print(
            "Dry-run only. Use --apply after approving the target, or --verify-only for a remote audit."
        )


if __name__ == "__main__":
    main()

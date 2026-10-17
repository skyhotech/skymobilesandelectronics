#!/usr/bin/env python
import os
import subprocess
import sys
from pathlib import Path


def prepare_runtime():
    """Use the local environment when invoked with a system Python."""
    root = Path(__file__).resolve().parent
    python = root / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    if sys.prefix == sys.base_prefix and python.is_file():
        raise SystemExit(subprocess.call([str(python), str(root / "manage.py"), *sys.argv[1:]]))
    if sys.version_info[:2] != (3, 13):
        raise SystemExit(
            "SKY requires Python 3.13. Run the repository setup script to create backend/.venv."
        )


if __name__ == "__main__":
    prepare_runtime()
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)

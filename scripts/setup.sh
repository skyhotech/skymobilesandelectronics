#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
python_bin="$root/backend/.venv/bin/python"
if [[ ! -x "$python_bin" ]]; then python_bin="python3.13"; fi
exec "$python_bin" "$root/scripts/project.py" setup "$@"

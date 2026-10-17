import sys
from pathlib import Path
from unittest.mock import patch

import pytest

from manage import prepare_runtime


def test_system_python_delegates_arguments_and_exit_status():
    with (
        patch.object(sys, "prefix", sys.base_prefix),
        patch.object(Path, "is_file", return_value=True),
        patch.object(sys, "argv", ["manage.py", "check", "--database", "default"]),
        patch("manage.subprocess.call", return_value=7) as launch,
        pytest.raises(SystemExit) as result,
    ):
        prepare_runtime()
    assert result.value.code == 7
    command = launch.call_args.args[0]
    assert ".venv" in command[0]
    assert command[2:] == ["check", "--database", "default"]


def test_active_environment_does_not_relaunch():
    with (
        patch.object(sys, "prefix", "active-environment"),
        patch.object(sys, "version_info", (3, 13)),
        patch("manage.subprocess.call") as launch,
    ):
        prepare_runtime()
    launch.assert_not_called()


def test_unsupported_python_without_local_environment_has_actionable_error():
    with (
        patch.object(Path, "is_file", return_value=False),
        patch.object(sys, "version_info", (3, 15)),
        pytest.raises(SystemExit, match="requires Python 3.13"),
    ):
        prepare_runtime()

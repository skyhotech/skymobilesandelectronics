"""Cross-platform dependency setup and foreground development orchestration."""

import argparse
import os
import platform
import secrets
import shutil
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
MOBILE = ROOT / "mobile_app"
WINDOWS = os.name == "nt"
PYTHON = BACKEND / ".venv" / ("Scripts/python.exe" if WINDOWS else "bin/python")


def executable(name):
    command = shutil.which(name + ".cmd" if WINDOWS and name == "npm" else name)
    if not command:
        raise RuntimeError(
            f"Missing {name}. See README.md for official installation links."
        )
    return command


def run(arguments, cwd=ROOT, env=None):
    print(f"Running: {' '.join(map(str, arguments))}", flush=True)
    subprocess.run(list(map(str, arguments)), cwd=cwd, env=env, check=True)


def write_if_missing(path, content):
    if not path.exists():
        with path.open("x", encoding="utf-8", newline="\n") as stream:
            stream.write(content)
        print(f"Created {path.relative_to(ROOT)}")


def configure_environment():
    write_if_missing(
        ROOT / ".env",
        (ROOT / ".env.example")
        .read_text()
        .replace("replace-with-generated-local-password", secrets.token_hex(24))
        .replace("replace-with-generated-root-password", secrets.token_hex(32)),
    )
    values = dict(
        line.split("=", 1)
        for line in (ROOT / ".env").read_text().splitlines()
        if "=" in line and not line.startswith("#")
    )
    content = (BACKEND / ".env.example").read_text()
    content = content.replace(
        "replace-with-a-generated-secret", secrets.token_urlsafe(64)
    )
    content = content.replace(
        "replace-with-local-password", quote(values["MYSQL_PASSWORD"], safe="")
    )
    content = content.replace(
        "mysql://sky:", f"mysql://{quote(values['MYSQL_USER'], safe='')}:"
    )
    content = content.replace(
        "3306/sky_commerce", f"3306/{quote(values['MYSQL_DATABASE'], safe='')}"
    )
    write_if_missing(BACKEND / ".env", content)
    write_if_missing(FRONTEND / ".env.local", (FRONTEND / ".env.example").read_text())
    for kind in ("products", "brands", "categories", "banners", "other"):
        for folder in ("optimized", "thumbnails"):
            (ROOT / "data/media" / kind / folder).mkdir(parents=True, exist_ok=True)
        (ROOT / "data/private-media" / kind / "originals").mkdir(parents=True, exist_ok=True)


def verify_tools():
    print(f"Host: {platform.system()} {platform.machine()}")
    if sys.version_info[:2] != (3, 13):
        raise RuntimeError(
            "Run setup using Python 3.13; other versions are not validated."
        )
    for tool in ("node", "npm", "git", "flutter"):
        run([executable(tool), "--version"])
    version = subprocess.check_output([executable("node"), "--version"], text=True)
    if int(version.strip().lstrip("v").split(".")[0]) not in (22, 24):
        raise RuntimeError("Use Node.js 22 or 24 LTS.")


def services():
    run(
        [
            executable("docker"),
            "compose",
            "-f",
            "compose.dev.yml",
            "up",
            "-d",
            "--wait",
            "--wait-timeout",
            "120",
        ]
    )


def setup(skip_services):
    verify_tools()
    run([sys.executable, "scripts/initialize_structure.py"])
    configure_environment()
    if not PYTHON.exists():
        run([sys.executable, "-m", "venv", BACKEND / ".venv"])
    run(
        [
            PYTHON,
            "-m",
            "pip",
            "install",
            "--require-hashes",
            "-r",
            "requirements/development.txt",
        ],
        BACKEND,
    )
    run([executable("npm"), "ci"], FRONTEND)
    run([executable("flutter"), "pub", "get", "--enforce-lockfile"], MOBILE)
    run([PYTHON, "manage.py", "check"], BACKEND)
    if not skip_services:
        services()
        run([PYTHON, "manage.py", "migrate"], BACKEND)
        run([PYTHON, "manage.py", "import_local_media"], BACKEND)
        run([PYTHON, "manage.py", "index_media"], BACKEND)
    run([executable("npm"), "run", "typecheck"], FRONTEND)
    run([executable("npm"), "run", "lint"], FRONTEND)
    run([executable("flutter"), "analyze"], MOBILE)
    if skip_services:
        print(
            "Dependencies configured. MySQL/Redis startup and migrations were skipped."
        )
    else:
        print("Setup complete. Run scripts/dev.ps1 or bash scripts/dev.sh.")


def check():
    run([PYTHON, "-m", "pip", "check"], BACKEND)
    run([PYTHON, "-m", "ruff", "check", "."], BACKEND)
    run([PYTHON, "manage.py", "check"], BACKEND)
    test_env = {**os.environ, "DJANGO_SETTINGS_MODULE": "config.settings.testing"}
    run(
        [PYTHON, "manage.py", "makemigrations", "--check", "--dry-run"],
        BACKEND,
        test_env,
    )
    run([PYTHON, "-m", "pytest", "-q"], BACKEND, test_env)
    run([executable("npm"), "run", "typecheck"], FRONTEND)
    run([executable("npm"), "run", "lint"], FRONTEND)
    run([executable("npm"), "run", "build"], FRONTEND)
    run(
        [
            executable("dart"),
            "format",
            "--output=none",
            "--set-exit-if-changed",
            "lib",
            "test",
        ],
        MOBILE,
    )
    run([executable("flutter"), "analyze"], MOBILE)
    run([executable("flutter"), "test"], MOBILE)


def dev():
    services()
    for port in (3000, 8000):
        with socket.socket() as probe:
            if probe.connect_ex(("127.0.0.1", port)) == 0:
                raise RuntimeError(f"Development port {port} is already occupied.")
    run([PYTHON, "manage.py", "migrate"], BACKEND)
    worker = [
        PYTHON,
        "-m",
        "celery",
        "-A",
        "config",
        "worker",
        "-l",
        "INFO",
        "-Q",
        "celery,images",
    ]
    worker += ["--pool=solo"] if WINDOWS else ["--concurrency=1"]
    processes = []
    commands = [
        (
            [
                PYTHON,
                "-m",
                "uvicorn",
                "config.asgi:application",
                "--reload",
                "--host",
                "127.0.0.1",
                "--port",
                "8000",
            ],
            BACKEND,
        ),
        ([executable("npm"), "run", "dev", "--", "--hostname", "127.0.0.1"], FRONTEND),
        (worker, BACKEND),
    ]
    try:
        for command, directory in commands:
            processes.append(
                subprocess.Popen(
                    list(map(str, command)),
                    cwd=directory,
                    start_new_session=not WINDOWS,
                )
            )
        print(
            "Website: http://localhost:3000 | API: http://localhost:8000/api/v1/health/live/"
        )
        print(
            "Press Ctrl+C to stop application processes. Database volumes remain intact."
        )
        while True:
            if any(process.poll() is not None for process in processes):
                raise RuntimeError(
                    "A development process stopped; see its output above."
                )
            time.sleep(1)
    finally:
        for process in processes:
            if process.poll() is None:
                if WINDOWS:
                    subprocess.run(
                        ["taskkill", "/PID", str(process.pid), "/T", "/F"], check=False
                    )
                else:
                    os.killpg(process.pid, signal.SIGTERM)
        for process in processes:
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["setup", "check", "dev", "stop", "env"])
    parser.add_argument("--skip-services", action="store_true")
    args = parser.parse_args()
    if args.command == "setup":
        setup(args.skip_services)
    elif args.command == "check":
        check()
    elif args.command == "dev":
        dev()
    elif args.command == "stop":
        run([executable("docker"), "compose", "-f", "compose.dev.yml", "stop"])
        print(
            "Services stopped. Use Ctrl+C in the dev terminal to stop application processes."
        )
    else:
        configure_environment()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Development applications stopped.")
    except (RuntimeError, subprocess.CalledProcessError, OSError) as error:
        print(f"FAILED: {error}", file=sys.stderr)
        sys.exit(1)

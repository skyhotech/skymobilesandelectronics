"""Check the configured local MySQL server; never alter unrelated Windows services."""

import argparse
import os
from pathlib import Path
from urllib.parse import unquote, urlparse

import environ
import MySQLdb

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "action", choices=["start", "status"], nargs="?", default="status"
    )
    parser.parse_args()
    environ.Env.read_env(ROOT / "backend/.env", overwrite=False)
    address = urlparse(os.environ["DATABASE_URL"])
    if address.scheme != "mysql" or address.hostname not in ("127.0.0.1", "localhost"):
        raise SystemExit("This helper requires a local mysql:// DATABASE_URL.")
    try:
        connection = MySQLdb.connect(
            host=address.hostname,
            port=address.port or 3306,
            user=unquote(address.username or ""),
            passwd=unquote(address.password or ""),
            db=unquote(address.path.lstrip("/")),
            charset="utf8mb4",
            connect_timeout=5,
        )
    except MySQLdb.Error as error:
        raise SystemExit(
            f"MySQL connection failed (code {error.args[0]}). "
            "Start your configured MySQL service or Compose, then see docs/LOCAL_DATABASE.md."
        ) from None
    with connection.cursor() as cursor:
        cursor.execute("SELECT VERSION(), DATABASE()")
        version, database = cursor.fetchone()
    connection.close()
    print(f"MySQL {version} is ready; database: {database}.")


if __name__ == "__main__":
    main()

"""Create the configured MySQL schema and scoped application user without replacing data."""

import argparse
import getpass
import os
import re
from pathlib import Path
from urllib.parse import unquote, urlparse

import environ
import MySQLdb

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--grant-test-database", action="store_true")
    arguments = parser.parse_args()
    environ.Env.read_env(ROOT / "backend/.env", overwrite=False)
    environ.Env.read_env(ROOT / ".env", overwrite=False)
    address = urlparse(os.environ["DATABASE_URL"])
    if address.scheme != "mysql" or address.hostname not in ("localhost", "127.0.0.1"):
        raise SystemExit("Provisioning is restricted to local MySQL.")
    database = unquote(address.path.lstrip("/"))
    user = unquote(address.username or "")
    password = unquote(address.password or "")
    if not re.fullmatch(r"[A-Za-z][A-Za-z0-9_]{0,47}", database):
        raise SystemExit("Use a simple database name of at most 48 characters.")
    if not user or not password or user == "root":
        raise SystemExit(
            "DATABASE_URL must specify a separate application user and password."
        )
    administrator = os.environ.get("MYSQL_ADMIN_USER", "root")
    admin_password = os.environ.get("MYSQL_ROOT_PASSWORD") or getpass.getpass(
        "MySQL admin password: "
    )
    connection = MySQLdb.connect(
        host=address.hostname,
        port=address.port or 3306,
        user=administrator,
        passwd=admin_password,
        connect_timeout=5,
        autocommit=True,
    )
    with connection.cursor() as cursor:
        cursor.execute(
            f"CREATE DATABASE IF NOT EXISTS `{database}` "
            "CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs"
        )
        cursor.execute(
            "CREATE USER IF NOT EXISTS %s@'localhost' IDENTIFIED BY %s",
            (user, password),
        )
        # Existing credentials are deliberately never reset by provisioning.
        escaped = database.replace("_", r"\_")
        cursor.execute(
            f"GRANT ALL PRIVILEGES ON `{escaped}`.* TO %s@'localhost'", (user,)
        )
        if arguments.grant_test_database:
            cursor.execute(
                f"GRANT ALL PRIVILEGES ON `test\\_{escaped}`.* TO %s@'localhost'",
                (user,),
            )
    connection.close()
    print(
        f"Schema {database} provisioned. Existing data and user credentials were preserved."
    )


if __name__ == "__main__":
    main()

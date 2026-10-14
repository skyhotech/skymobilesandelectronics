# Local MySQL setup

The backend now uses MySQL, database/schema `sky_commerce`, application user `sky`, at `127.0.0.1:3306`. The requested development password is set only in ignored local environment files. The existing owner login is preserved.

The installed Windows `MySQL80` service runs MySQL 8.0.46. No additional server was installed. Docker development uses MySQL 8.4 and a separate `mysql_data` volume. Do not start both on port 3306. The MySQL Docker image does not import the Windows service data automatically.

## Start and verify

From the project root:

```powershell
backend\.venv\Scripts\python.exe scripts/local_mysql.py status
backend\.venv\Scripts\python.exe scripts/provision_mysql.py --grant-test-database
backend\.venv\Scripts\python.exe backend/manage.py migrate
.\scripts\start-backend.ps1
```

`local_mysql.py start` checks connectivity; it does not control unrelated Windows services. Start the existing MySQL80 service through Windows Services if stopped. Provisioning creates a missing schema/user and grants schema-scoped access without changing existing passwords or data. It reads credentials from ignored environment files or prompts for the administrator password.

The application has no global MySQL administrator privileges. Development tests have privileges only on `test_sky_commerce`; omit that grant in production. Application migrations require DDL privileges in the application schema. Use a separate migration identity and narrower runtime grants before production deployment.

For a clean machine, install MySQL 8.0.16+ (8.4 LTS preferred), configure the environment templates, provision the schema, then apply Django migrations. For Docker use `docker compose -f compose.dev.yml up -d --wait`; it initializes an empty volume from MYSQL_* variables. Container credentials must match the backend connection URL. Never commit real environment files.

## Schema

Django migrations are authoritative. See DATABASE_SCHEMA.md and mysql-schema.sql for the verified database design and schema-only export. Tables use InnoDB, utf8mb4 and utf8mb4_0900_as_cs collation, preserving case-sensitive unique identifiers. Strict SQL mode prevents silent truncation; Django transactions use read committed. Currency uses DECIMAL, never floating point.

## Migration and recovery

On 2026-10-14 the local PostgreSQL data was exported and loaded into MySQL through Django serialization. The following recovery artifacts were preserved outside the project in `E:\sky-platform-archive\run-2026-10-14\` (formerly `.run/`):

- `pre-mysql-backup.dump`: native PostgreSQL backup.
- `postgres-data.json`: portable Django data, including credential hashes; keep private.
- `postgres-source.env`: old connection settings; keep private.
- `pre-mysql-root.env`: previous Compose environment.
- `mysql-migrated-backup.sql`: native MySQL data backup.
- `pre-universal-media.sql`: MySQL backup taken before the universal media migration.
- `postgres-data/`: untouched original PostgreSQL cluster, now stopped.

The old helper is archived there as `legacy-local-postgres.py`; active startup scripts and Python dependencies use MySQL only. PostgreSQL binaries remain available under `E:\sky-platform-tools\postgresql\` for deliberate recovery. Reverting engines requires stopping backend writes, restoring the old connection and deliberately reconciling any new MySQL writes. Merely pointing to the old database would lose access to those new changes.

MySQL backup example (prompts for the password):

```powershell
& 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe' --host=127.0.0.1 --user=sky -p --no-tablespaces --single-transaction --set-gtid-purged=OFF --result-file=backup.sql sky_commerce
```

Store backups outside source control and encrypt off-device copies. Restore only to an explicitly selected empty recovery database after review. The migration backup was restore-tested in a separate temporary database.

Redis was not changed. Its availability is a separate readiness requirement. Named timezone tables have not been provisioned; load the official MySQL timezone data before using database-side named-timezone aggregation. Existing timestamp fields use UTC storage and Django timezone conversion.

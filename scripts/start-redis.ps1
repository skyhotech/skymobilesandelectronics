$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\env.ps1"
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Docker CLI not found. Install/start Docker Desktop, then rerun this script.'
}
& docker info --format '{{.ServerVersion}}'
if ($LASTEXITCODE -ne 0) { throw 'Docker Engine is unavailable. Start Docker Desktop and retry.' }
Push-Location $ProjectRoot
try {
    # Start only Redis: native MySQL and existing application processes stay running.
    & docker compose -f compose.dev.yml up -d --wait --wait-timeout 120 redis
    if ($LASTEXITCODE -ne 0) { throw 'Redis startup failed. Check Docker Desktop and port 6379.' }
    & docker compose -f compose.dev.yml exec -T redis redis-cli ping
    if ($LASTEXITCODE -ne 0) { throw 'Redis health verification failed.' }
} finally { Pop-Location }

param([string]$Address = '127.0.0.1:8000')
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\env.ps1"
& "$PSScriptRoot\start-redis.ps1"
& $BackendPython "$PSScriptRoot\local_mysql.py" start
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Push-Location (Join-Path $ProjectRoot 'backend')
try {
    & $BackendPython manage.py migrate --noinput
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & $BackendPython manage.py runserver $Address
    exit $LASTEXITCODE
} finally {
    Pop-Location
}

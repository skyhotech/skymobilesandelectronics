$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$tools = Join-Path $ProjectRoot '.tools'
$localPaths = Join-Path $tools 'local-paths.json'
if (Test-Path -LiteralPath $localPaths) {
    $configuration = Get-Content -LiteralPath $localPaths -Raw | ConvertFrom-Json
    if (Test-Path -LiteralPath $configuration.tools_alias) {
        $tools = $configuration.tools_alias
    }
}
$node = Get-ChildItem -LiteralPath $tools -Directory -Filter 'node-*-win-x64' -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
if ($node) { $env:PATH = $node.FullName + ';' + $env:PATH }
foreach ($relative in @('git\cmd')) {
    $directory = Join-Path $tools $relative
    if (Test-Path -LiteralPath $directory) { $env:PATH = $directory + ';' + $env:PATH }
}
$BackendPython = Join-Path $ProjectRoot 'backend\.venv\Scripts\python.exe'
$skyDockerBin = Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin'
if (Test-Path -LiteralPath (Join-Path $skyDockerBin 'docker.exe')) {
    $env:PATH = $skyDockerBin + ';' + $env:PATH
}
if (-not (Test-Path -LiteralPath $BackendPython)) { $BackendPython = 'python' }

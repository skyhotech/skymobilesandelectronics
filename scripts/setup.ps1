param([switch]$SkipServices)
. "$PSScriptRoot\env.ps1"
$arguments = @("$PSScriptRoot\project.py", 'setup')
if ($SkipServices) { $arguments += '--skip-services' }
& $BackendPython @arguments
exit $LASTEXITCODE

. "$PSScriptRoot\env.ps1"
& $BackendPython "$PSScriptRoot\project.py" check
exit $LASTEXITCODE

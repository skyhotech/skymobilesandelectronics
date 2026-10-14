. "$PSScriptRoot\env.ps1"
& $BackendPython "$PSScriptRoot\project.py" stop
exit $LASTEXITCODE

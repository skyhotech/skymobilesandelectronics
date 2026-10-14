. "$PSScriptRoot\env.ps1"
& $BackendPython "$PSScriptRoot\project.py" dev
exit $LASTEXITCODE

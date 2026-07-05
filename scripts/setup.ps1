$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent

Set-Location $Root
python -m venv .venv
& "$Root\.venv\Scripts\Activate.ps1"
pip install -r requirements.txt

Set-Location "$Root\dashboard"
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }
npm install

Write-Host "Setup complete."

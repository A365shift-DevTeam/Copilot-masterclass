# Builds the admin UI into Api/wwwroot, then publishes the API (with the admin inside) to .\publish.
# Copy the contents of .\publish to the IIS site folder for learnaiapi.ambot365.com.
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    Push-Location admin
    npm ci
    npm run build
    Pop-Location
    dotnet publish Api -c Release -o publish
    Write-Host "`nPublished to $PSScriptRoot\publish" -ForegroundColor Green
} finally { Pop-Location }

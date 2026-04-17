param(
    [string]$Environment = "dev",   # dev | test | prod
    [string]$ProjectName = "twin"
)
$ErrorActionPreference = "Stop"

Write-Host "Deploying $ProjectName to $Environment ..." -ForegroundColor Green

$root = Split-Path $PSScriptRoot -Parent

# 1. Build Lambda package
Set-Location $root
Write-Host "Building Lambda package..." -ForegroundColor Yellow
Set-Location backend
uv run deploy.py
Set-Location $root

# 2. Terraform workspace & apply
Set-Location terraform
terraform init -input=false
if ($LASTEXITCODE -ne 0) { throw "terraform init failed (exit $LASTEXITCODE)" }

terraform workspace select $Environment 2>$null
if ($LASTEXITCODE -ne 0) {
    terraform workspace new $Environment
}

if ($Environment -eq "prod") {
    terraform apply -var-file="prod.tfvars" -var="project_name=$ProjectName" -var="environment=$Environment" -auto-approve
} else {
    terraform apply -var="project_name=$ProjectName" -var="environment=$Environment" -auto-approve
}
if ($LASTEXITCODE -ne 0) { throw "terraform apply failed (exit $LASTEXITCODE)" }

$tfJson = terraform output -json 2>$null
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($tfJson)) {
    throw "terraform output failed: apply must succeed and state must contain outputs. Check: terraform workspace show"
}
$tfOut = $tfJson | ConvertFrom-Json

$ApiUrl = [string]$tfOut.api_gateway_url.value
$FrontendBucket = [string]$tfOut.s3_frontend_bucket.value
$CfUrl = [string]$tfOut.cloudfront_url.value
$CustomUrl = [string]$tfOut.custom_domain_url.value

if ([string]::IsNullOrWhiteSpace($FrontendBucket)) {
    throw "s3_frontend_bucket output is empty; cannot sync frontend."
}

# 3. Build + deploy frontend
Set-Location ..\frontend

Write-Host "Setting API URL for production..." -ForegroundColor Yellow
# UTF-8 without BOM so Next.js reads NEXT_PUBLIC_API_URL correctly (Out-File utf8 adds BOM on Windows PS 5.x)
$envProd = Join-Path (Get-Location) ".env.production"
[System.IO.File]::WriteAllText($envProd, "NEXT_PUBLIC_API_URL=$ApiUrl`n", [System.Text.UTF8Encoding]::new($false))
# Static export: ship runtime config so chat works even if NEXT_PUBLIC_* is not inlined at build time
$publicDir = Join-Path (Get-Location) "public"
if (-not (Test-Path $publicDir)) { New-Item -ItemType Directory -Path $publicDir | Out-Null }
$apiConfigJson = (@{ apiBase = $ApiUrl } | ConvertTo-Json -Compress)
[System.IO.File]::WriteAllText((Join-Path $publicDir "api-config.json"), $apiConfigJson, [System.Text.UTF8Encoding]::new($false))
# Ensure Next.js build sees the variable (some environments load .env inconsistently)
$env:NEXT_PUBLIC_API_URL = $ApiUrl

npm install
npm run build
aws s3 sync .\out "s3://$FrontendBucket/" --delete
Set-Location $root

# 4. Final summary
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "CloudFront URL : $CfUrl" -ForegroundColor Cyan
if ($CustomUrl) {
    Write-Host "Custom domain  : $CustomUrl" -ForegroundColor Cyan
}
Write-Host "API Gateway    : $ApiUrl" -ForegroundColor Cyan

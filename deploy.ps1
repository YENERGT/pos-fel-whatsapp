# Script de deployment rapido
param(
    [Parameter(Mandatory=$true)]
    [string]$version
)

Write-Host "Iniciando deployment version $version..." -ForegroundColor Green

# Build
Write-Host "Construyendo imagen..." -ForegroundColor Yellow
docker build -t gcr.io/pos-fel-whatsapp/pos-fel-app:v$version .

# Push
Write-Host "Subiendo imagen..." -ForegroundColor Yellow
docker push gcr.io/pos-fel-whatsapp/pos-fel-app:v$version

# Deploy
Write-Host "Desplegando en Cloud Run..." -ForegroundColor Yellow
gcloud run deploy pos-fel-whatsapp --image gcr.io/pos-fel-whatsapp/pos-fel-app:v$version --region us-central1

Write-Host "Deployment completado!" -ForegroundColor Green
Write-Host "URL: https://pos-fel-whatsapp-47741656195.us-central1.run.app/pos" -ForegroundColor Cyan
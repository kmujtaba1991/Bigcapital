# Step 1: Define the version
$version = Get-Date -Format "yyyyMMdd-HHmmss"
Write-Host "Deploying version: $version"

# Step 2: Build and push Docker images
docker build -f .\packages\webapp\Dockerfile -t bigcapitalacr.azurecr.io/webapp:$version .
docker push bigcapitalacr.azurecr.io/webapp:$version

docker build -f .\packages\server\Dockerfile -t bigcapitalacr.azurecr.io/server:$version .
docker push bigcapitalacr.azurecr.io/server:$version

# Step 3: Patch docker-compose.prod.yml (only image lines)
(Get-Content .\docker-compose.prod.yml) | ForEach-Object {
    if ($_ -match "image:\s*bigcapitalacr\.azurecr\.io/webapp") {
        "    image: bigcapitalacr.azurecr.io/webapp:$version"
    } elseif ($_ -match "image:\s*bigcapitalacr\.azurecr\.io/server") {
        "    image: bigcapitalacr.azurecr.io/server:$version"
    } else {
        $_
    }
} | Set-Content .\docker-compose.prod.yml

Write-Host "Updated docker-compose.prod.yml with version $version"

# Step 4: Set ACR credentials (to avoid 401 errors)
$acrUser = "bigcapitalacr"
$acrPass = az acr credential show --name bigcapitalacr --query "passwords[0].value" --output tsv

az containerapp registry set --name webapp --resource-group bigcapital-prod --server bigcapitalacr.azurecr.io --username $acrUser --password $acrPass
az containerapp registry set --name server --resource-group bigcapital-prod --server bigcapitalacr.azurecr.io --username $acrUser --password $acrPass

# Step 5: Update container apps to use the new version
az containerapp update --name webapp --resource-group bigcapital-prod --image bigcapitalacr.azurecr.io/webapp:$version
az containerapp update --name server --resource-group bigcapital-prod --image bigcapitalacr.azurecr.io/server:$version

Write-Host "Deployment complete for version $version"
# Run this from your project root (PELAYANGKONG folder)
# powershell -ExecutionPolicy Bypass -File setup-structure.ps1

# Create folders
New-Item -ItemType Directory -Force -Path "src"
New-Item -ItemType Directory -Force -Path "server\routes"
New-Item -ItemType Directory -Force -Path "dashboard\src\lib"
New-Item -ItemType Directory -Force -Path "dashboard\src\pages"

# Move bot files to src/
$srcFiles = @("index.js", "db.js", "helpers.js", "parser.js", "register.js")
foreach ($f in $srcFiles) {
    if (Test-Path $f) {
        Move-Item -Force $f "src\$f"
        Write-Host "Moved $f -> src\$f"
    }
}

# Move server files
if (Test-Path "server.js") {
    Move-Item -Force "server.js" "server\index.js"
    Write-Host "Moved server.js -> server\index.js"
}
if (Test-Path "standup.js") {
    Move-Item -Force "standup.js" "server\routes\standup.js"
    Write-Host "Moved standup.js -> server\routes\standup.js"
}
if (Test-Path "review.js") {
    Move-Item -Force "review.js" "server\routes\review.js"
    Write-Host "Moved review.js -> server\routes\review.js"
}

# Move dashboard files
$dashFiles = @("App.jsx", "main.jsx", "index.css")
foreach ($f in $dashFiles) {
    if (Test-Path $f) {
        Move-Item -Force $f "dashboard\src\$f"
        Write-Host "Moved $f -> dashboard\src\$f"
    }
}

$pageFiles = @("Dashboard.jsx", "StandupPage.jsx", "ReviewPage.jsx")
foreach ($f in $pageFiles) {
    if (Test-Path $f) {
        Move-Item -Force $f "dashboard\src\pages\$f"
        Write-Host "Moved $f -> dashboard\src\pages\$f"
    }
}

if (Test-Path "api.js") {
    Move-Item -Force "api.js" "dashboard\src\lib\api.js"
    Write-Host "Moved api.js -> dashboard\src\lib\api.js"
}

# Dashboard root files
$dashRootFiles = @("vite.config.js", "index.html")
foreach ($f in $dashRootFiles) {
    if (Test-Path $f) {
        Move-Item -Force $f "dashboard\$f"
        Write-Host "Moved $f -> dashboard\$f"
    }
}

# Handle duplicate package.json — dashboard needs its own
# Check if dashboard\package.json already exists
if (-not (Test-Path "dashboard\package.json")) {
    Write-Host "WARNING: dashboard\package.json not found — create it manually (see README)"
}

Write-Host ""
Write-Host "Done! Final structure:"
Get-ChildItem -Recurse -Depth 3 | Where-Object { !$_.PSIsContainer } | Select-Object FullName

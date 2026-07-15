$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
node (Join-Path $root "scripts\build-region-pages.mjs")
if ($LASTEXITCODE -ne 0) {
  throw "Region page build failed"
}

$targets = @("docs")
$files = @(
  "index.html",
  "app.js",
  "styles.css",
  "data.js",
  "firebase-config.js",
  "analytics-config.js",
  "analytics.js",
  "favicon.svg"
)

$directories = @(
  "config",
  "tokyo"
)

foreach ($target in $targets) {
  $targetPath = Join-Path $root $target
  if (-not (Test-Path $targetPath)) {
    New-Item -ItemType Directory -Path $targetPath | Out-Null
  }

  foreach ($file in $files) {
    $sourcePath = Join-Path $root $file
    if (-not (Test-Path $sourcePath)) {
      throw "Missing source file: $sourcePath"
    }

    $destinationPath = Join-Path $targetPath $file
    Copy-Item $sourcePath $destinationPath -Force
  }

  foreach ($directory in $directories) {
    $sourcePath = Join-Path $root $directory
    if (-not (Test-Path $sourcePath)) {
      throw "Missing source directory: $sourcePath"
    }

    $destinationPath = Join-Path $targetPath $directory
    if (-not (Test-Path $destinationPath)) {
      New-Item -ItemType Directory -Path $destinationPath | Out-Null
    }

    Copy-Item (Join-Path $sourcePath "*") $destinationPath -Recurse -Force
  }
}

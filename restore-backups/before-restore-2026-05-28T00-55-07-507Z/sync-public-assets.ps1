$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$targets = @("docs")
$files = @(
  "index.html",
  "store.html",
  "app.js",
  "store-page.js",
  "styles.css",
  "data.js",
  "firebase-config.js",
  "favicon.svg",
  "sitemap.xml",
  "robots.txt"
)

node "$root\generate-store-pages.mjs"

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

  $assetsSourcePath = Join-Path $root "assets"
  if (Test-Path $assetsSourcePath) {
    $assetsDestinationPath = Join-Path $targetPath "assets"
    if (-not (Test-Path $assetsDestinationPath)) {
      New-Item -ItemType Directory -Path $assetsDestinationPath | Out-Null
    }
    Copy-Item (Join-Path $assetsSourcePath "*") $assetsDestinationPath -Recurse -Force
  }
}

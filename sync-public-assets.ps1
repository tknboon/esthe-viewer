$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$targets = @("docs", "site")
$files = @(
  "index.html",
  "app.js",
  "styles.css",
  "data.js",
  "firebase-config.js",
  "favicon.svg"
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
}

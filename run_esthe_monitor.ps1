$ErrorActionPreference = "Stop"

$workspace = "C:\Users\tknbo\Documents\Codex\2026-04-28\new-chat"
$scriptPath = Join-Path $workspace "monitor_esthe_ranking.mjs"
$runnerLogPath = Join-Path $workspace "esthe_ranking_runner.log"
$htmlCachePath = Join-Path $workspace "esthe_ranking_source.html"
$detailDirPath = Join-Path $workspace "esthe_ranking_detail_pages"
$targetUrl = "https://www.esthe-ranking.jp/toyota/asian/"

Set-Location $workspace

function Resolve-NodePath {
  $candidates = @(
    "C:\Program Files\nodejs\node.exe",
    "C:\Program Files (x86)\nodejs\node.exe"
  )

  $command = Get-Command node -ErrorAction SilentlyContinue
  if ($command -and $command.Source) {
    $candidates += $command.Source
  }

  $candidates = $candidates | Where-Object { $_ } | Select-Object -Unique

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  throw "node.exe was not found"
}

function Write-RunnerLog {
  param([string]$Message)

  $timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssK"
  $line = "[$timestamp] $Message"
  [System.IO.File]::AppendAllText($runnerLogPath, $line + [Environment]::NewLine, [System.Text.Encoding]::UTF8)
}

function Get-SourceHtml {
  param(
    [string]$Url,
    [string]$OutputPath
  )

  try {
    Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 30 -OutFile $OutputPath
    return "Invoke-WebRequest"
  } catch {
    Write-RunnerLog "Invoke-WebRequest failed: $($_.Exception.Message)"
  }

  try {
    & curl.exe -L --fail --silent --show-error --max-time 30 $Url --output $OutputPath
    if ($LASTEXITCODE -eq 0 -and (Test-Path $OutputPath)) {
      return "curl.exe"
    }
    throw "curl.exe exited with code $LASTEXITCODE"
  } catch {
    Write-RunnerLog "curl.exe failed: $($_.Exception.Message)"
  }

  throw "HTMLの取得に失敗しました"
}

function Get-DetailUrls {
  param([string]$HtmlPath)

  $raw = Get-Content -Path $HtmlPath -Raw -Encoding UTF8
  $matches = [regex]::Matches($raw, 'href="(?<href>/toyota/shop-detail/[a-z0-9-]+/)"', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  $urls = foreach ($match in $matches) {
    "https://www.esthe-ranking.jp" + $match.Groups["href"].Value
  }
  return $urls | Select-Object -Unique
}

function Save-DetailPages {
  param(
    [string[]]$Urls,
    [string]$OutputDir
  )

  if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
  }

  $successCount = 0
  $failureCount = 0

  foreach ($url in $Urls) {
    if ($url -notmatch '/shop-detail/([a-z0-9-]+)/') {
      continue
    }

    $detailId = $Matches[1]
    $outputPath = Join-Path $OutputDir ($detailId + ".html")

    try {
      $method = Get-SourceHtml -Url $url -OutputPath $outputPath
      Write-RunnerLog "fetched detail via ${method}: $detailId"
      $successCount += 1
    } catch {
      Write-RunnerLog "detail fetch failed ($detailId): $($_.Exception.Message)"
      $failureCount += 1
    }
  }

  return @{
    Success = $successCount
    Failure = $failureCount
  }
}

$nodePath = Resolve-NodePath

try {
  Write-RunnerLog "using node: $nodePath"
  Write-RunnerLog "scheduled run started"

  $fetchMethod = Get-SourceHtml -Url $targetUrl -OutputPath $htmlCachePath
  Write-RunnerLog "fetched listing via: $fetchMethod"

  $detailUrls = Get-DetailUrls -HtmlPath $htmlCachePath
  Write-RunnerLog "found detail urls: $($detailUrls.Count)"

  $detailResult = Save-DetailPages -Urls $detailUrls -OutputDir $detailDirPath
  Write-RunnerLog "detail fetch summary: success=$($detailResult.Success) failure=$($detailResult.Failure)"

  $env:ESTHE_MONITOR_HTML_PATH = $htmlCachePath
  $env:ESTHE_MONITOR_DETAIL_DIR = $detailDirPath
  & $nodePath $scriptPath 2>&1 | Tee-Object -FilePath $runnerLogPath -Append
  Remove-Item Env:ESTHE_MONITOR_HTML_PATH -ErrorAction SilentlyContinue
  Remove-Item Env:ESTHE_MONITOR_DETAIL_DIR -ErrorAction SilentlyContinue

  Write-RunnerLog "scheduled run finished"
  exit 0
} catch {
  Write-RunnerLog "scheduled run failed: $($_.Exception.Message)"
  throw
}

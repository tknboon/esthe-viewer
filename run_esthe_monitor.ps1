$ErrorActionPreference = "Stop"

$workspace = "C:\Users\tknbo\Documents\Codex\2026-04-28\new-chat"
$scriptPath = Join-Path $workspace "monitor_esthe_ranking.mjs"
$runnerLogPath = Join-Path $workspace "esthe_ranking_runner.log"
$publishStatusPath = Join-Path $workspace "esthe_publish_status.json"
$htmlCachePath = Join-Path $workspace "esthe_ranking_source.html"
$detailDirPath = Join-Path $workspace "esthe_ranking_detail_pages"
$targetUrl = "https://www.esthe-ranking.jp/toyota/asian/"

# Auto publish settings
$autoPublishEnabled = $true
$gitPathOverride = ""
$gitRemoteName = "origin"
$gitBranchName = "main"
$gitPushTarget = "https://github.com/tknboon/esthe-viewer.git"
$expectedRemoteUrl = "https://github.com/tknboon/esthe-viewer.git"
$autoPublishFiles = @(
  "data.js",
  "toyota_esthe_map_points_ja.csv",
  "toyota_esthe_legacy_rows.csv",
  "esthe_ranking_snapshot.json",
  "esthe_ranking_report.md",
  "esthe_ranking_status.json"
)

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

function Resolve-GitPath {
  $candidates = @()

  if ($gitPathOverride) {
    $candidates += $gitPathOverride
  }

  if ($env:ESTHE_GIT_PATH) {
    $candidates += $env:ESTHE_GIT_PATH
  }

  $candidates += @(
    "C:\Program Files\Git\cmd\git.exe",
    "C:\Program Files\Git\bin\git.exe",
    "C:\Program Files (x86)\Git\cmd\git.exe",
    "C:\Program Files (x86)\Git\bin\git.exe"
  )

  $command = Get-Command git -ErrorAction SilentlyContinue
  if ($command -and $command.Source) {
    $candidates += $command.Source
  }

  $desktopGitRoots = @(
    (Join-Path $env:LOCALAPPDATA "GitHubDesktop"),
    (Join-Path $env:LOCALAPPDATA "GitHub Desktop")
  )

  foreach ($root in $desktopGitRoots) {
    try {
      $matches = Get-ChildItem -Path $root -Directory -ErrorAction Stop |
        Sort-Object Name -Descending |
        ForEach-Object { Join-Path $_.FullName "resources\app\git\cmd\git.exe" }
      $candidates += $matches
    } catch {
      continue
    }
  }

  $candidates = $candidates | Where-Object { $_ } | Select-Object -Unique

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  throw "git.exe was not found"
}

function Write-RunnerLog {
  param([string]$Message)

  $timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssK"
  $line = "[$timestamp] $Message"
  [System.IO.File]::AppendAllText($runnerLogPath, $line + [Environment]::NewLine, [System.Text.Encoding]::UTF8)
}

function Write-PublishStatus {
  param(
    [bool]$Ok,
    [string]$Stage,
    [string]$Message,
    [string]$PublishTarget = "",
    [string]$RemoteUrl = ""
  )

  $payload = [ordered]@{
    checkedAt = (Get-Date).ToString("o")
    ok = $Ok
    stage = $Stage
    message = $Message
    autoPublishEnabled = $autoPublishEnabled
    publishTarget = $PublishTarget
    localRemote = $RemoteUrl
  }

  $json = $payload | ConvertTo-Json -Depth 3
  [System.IO.File]::WriteAllText($publishStatusPath, $json + [Environment]::NewLine, [System.Text.Encoding]::UTF8)
}

function Write-MonitorSummary {
  param([string]$JsonText)

  if (-not $JsonText) {
    return
  }

  try {
    $result = $JsonText | ConvertFrom-Json
    Write-RunnerLog "monitor fetchedAt: $($result.fetchedAt)"
    Write-RunnerLog "monitor matched stores: $($result.totalMatchedStores)"
    if ($null -ne $result.detailPageCount) {
      Write-RunnerLog "monitor detail pages: $($result.detailPageCount)"
    }
    if ($null -ne $result.detailedStoreCount) {
      Write-RunnerLog "monitor detailed stores: $($result.detailedStoreCount)"
    }

    $addedCount = @($result.added).Count
    $removedCount = @($result.removed).Count
    $changedCount = @($result.changed).Count
    Write-RunnerLog "monitor diff summary: added=$addedCount removed=$removedCount changed=$changedCount"

    foreach ($name in @($result.added)) {
      Write-RunnerLog "added: $name"
    }
    foreach ($name in @($result.removed)) {
      Write-RunnerLog "removed: $name"
    }
    foreach ($item in @($result.changed)) {
      Write-RunnerLog "changed: $item"
    }
  } catch {
    Write-RunnerLog "monitor raw output:"
    [System.IO.File]::AppendAllText($runnerLogPath, $JsonText + [Environment]::NewLine, [System.Text.Encoding]::UTF8)
  }
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

function Invoke-GitAutoPublish {
  param(
    [string]$GitPath,
    [string]$RemoteName,
    [string]$BranchName,
    [string[]]$FilesToStage
  )

  $remoteUrl = ""
  $pushTarget = ""

  $remoteLookup = & $GitPath -C $workspace remote get-url $RemoteName 2>$null
  if ($LASTEXITCODE -eq 0 -and $remoteLookup) {
    $remoteUrl = ($remoteLookup | Select-Object -First 1).Trim()
    Write-RunnerLog "local remote ($RemoteName): $remoteUrl"
    if ($expectedRemoteUrl -and ($remoteUrl -ne $expectedRemoteUrl)) {
      Write-RunnerLog "local remote differs from publish target"
    }
  } else {
    Write-RunnerLog "local remote lookup skipped for: $RemoteName"
  }

  if ($gitPushTarget) {
    $pushTarget = $gitPushTarget
  } elseif ($remoteUrl) {
    $pushTarget = $remoteUrl
  } else {
    Write-PublishStatus -Ok $false -Stage "publish" -Message "git push target was not found" -RemoteUrl $remoteUrl
    throw "git push target was not found"
  }

  foreach ($relativePath in $FilesToStage) {
    $absolutePath = Join-Path $workspace $relativePath
    if (Test-Path $absolutePath) {
      & $GitPath -C $workspace add -- $relativePath
      if ($LASTEXITCODE -ne 0) {
        Write-PublishStatus -Ok $false -Stage "publish" -Message "git add failed for $relativePath" -PublishTarget $pushTarget -RemoteUrl $remoteUrl
        throw "git add failed for $relativePath"
      }
    }
  }

  & $GitPath -C $workspace diff --cached --quiet --exit-code
  if ($LASTEXITCODE -eq 0) {
    Write-RunnerLog "auto publish skipped: no staged changes"
    Write-PublishStatus -Ok $true -Stage "publish" -Message "no staged changes" -PublishTarget $pushTarget -RemoteUrl $remoteUrl
    return
  }

  $commitMessage = "Auto update esthe data ({0})" -f (Get-Date -Format "yyyy-MM-dd HH:mm")
  & $GitPath -C $workspace commit -m $commitMessage
  if ($LASTEXITCODE -ne 0) {
    Write-PublishStatus -Ok $false -Stage "publish" -Message "git commit failed" -PublishTarget $pushTarget -RemoteUrl $remoteUrl
    throw "git commit failed"
  }

  Write-RunnerLog "auto publish target: $pushTarget"
  & $GitPath -C $workspace push $pushTarget "HEAD:$BranchName"
  if ($LASTEXITCODE -ne 0) {
    Write-PublishStatus -Ok $false -Stage "publish" -Message "git push failed" -PublishTarget $pushTarget -RemoteUrl $remoteUrl
    throw "git push failed"
  }

  Write-RunnerLog "auto publish finished"
  Write-PublishStatus -Ok $true -Stage "publish" -Message "auto publish finished" -PublishTarget $pushTarget -RemoteUrl $remoteUrl
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
  $monitorOutput = & $nodePath $scriptPath 2>&1 | Out-String
  Write-MonitorSummary -JsonText $monitorOutput
  Remove-Item Env:ESTHE_MONITOR_HTML_PATH -ErrorAction SilentlyContinue
  Remove-Item Env:ESTHE_MONITOR_DETAIL_DIR -ErrorAction SilentlyContinue

  if ($autoPublishEnabled) {
    $gitPath = Resolve-GitPath
    Write-RunnerLog "using git: $gitPath"
    Invoke-GitAutoPublish -GitPath $gitPath -RemoteName $gitRemoteName -BranchName $gitBranchName -FilesToStage $autoPublishFiles
  } else {
    Write-RunnerLog "auto publish disabled"
    Write-PublishStatus -Ok $true -Stage "publish" -Message "auto publish disabled"
  }

  Write-RunnerLog "scheduled run finished"
  exit 0
} catch {
  Write-PublishStatus -Ok $false -Stage "run" -Message $_.Exception.Message
  Write-RunnerLog "scheduled run failed: $($_.Exception.Message)"
  throw
}

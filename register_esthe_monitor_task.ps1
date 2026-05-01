$ErrorActionPreference = "Stop"

$taskName = "EstheMonitorLocal"
$runTime = "09:00"
$workspace = "C:\Users\tknbo\Documents\Codex\2026-04-28\new-chat"
$runnerScript = Join-Path $workspace "run_esthe_monitor.ps1"
$powershellPath = "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
$schtasksPath = "C:\Windows\System32\schtasks.exe"

if (-not (Test-Path $runnerScript)) {
  throw "run_esthe_monitor.ps1 が見つかりません: $runnerScript"
}

if (-not (Test-Path $schtasksPath)) {
  throw "schtasks.exe が見つかりません: $schtasksPath"
}

$taskCommand = "`"$powershellPath`" -ExecutionPolicy Bypass -File `"$runnerScript`""

& $schtasksPath /Create /SC DAILY /ST $runTime /TN $taskName /TR $taskCommand /F
& $schtasksPath /Query /TN $taskName /V /FO LIST

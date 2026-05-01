# タスク スケジューラ登録メモ

この環境からは Windows タスクの直接登録で権限拒否になったため、手元の通常 PowerShell から登録します。

## 使うファイル

- `run_esthe_monitor.ps1`
- `register_esthe_monitor_task.ps1`

## 登録手順

1. `register_esthe_monitor_task.ps1` を右クリック
2. `PowerShell で実行` を選ぶ

うまくいくと、毎日 `09:00` に `run_esthe_monitor.ps1` が動きます。

## 実行後に見る場所

- `esthe_ranking_status.json`
- `esthe_ranking_failure.log`
- `esthe_ranking_report.md`
- `esthe_ranking_runner.log`

## 補足

- 登録名は `EstheMonitorLocal`
- 実行時刻を変えたいときは `register_esthe_monitor_task.ps1` の `$runTime` を変えてから実行してください

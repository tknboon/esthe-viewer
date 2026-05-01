# GitHub自動反映メモ

`run_esthe_monitor.ps1` には、更新後に GitHub へ自動反映する仕組みを入れてあります。

## いまの状態

- 巡回と `data.js` / CSV 更新: 自動
- GitHub への `commit` / `push`: オン

## 設定場所

`run_esthe_monitor.ps1` の上のほうにある設定です。

```powershell
$autoPublishEnabled = $true
$gitPathOverride = ""
$gitRemoteName = "origin"
$gitBranchName = "main"
$gitPushTarget = "https://github.com/tknboon/esthe-viewer.git"
$expectedRemoteUrl = "https://github.com/tknboon/esthe-viewer.git"
```

## いまの動き

1. 巡回して HTML を取得
2. `data.js` や CSV を更新
3. Git を見つける
4. 対象ファイルだけ `commit`
5. `https://github.com/tknboon/esthe-viewer.git` へ `push`

## なぜ `gitPushTarget` があるのか

ローカルの `origin` が別リポジトリを向いていても、公開用の送り先を固定するためです。

## 自動反映されるファイル

- `data.js`
- `toyota_esthe_map_points_ja.csv`
- `toyota_esthe_legacy_rows.csv`
- `esthe_ranking_snapshot.json`
- `esthe_ranking_report.md`
- `esthe_ranking_status.json`

## うまくいったか見る場所

- `esthe_ranking_runner.log`
- `esthe_ranking_status.json`

`esthe_ranking_runner.log` に次のどれが出たかで状態が分かります。

- `auto publish disabled`
- `auto publish skipped: no staged changes`
- `auto publish finished`

# 自動巡回メモ

- 対象ページ: `https://www.esthe-ranking.jp/toyota/asian/`
- 対象範囲: `西三河・豊田・岡崎エリア` のアジアンエステ一覧
- 実行スクリプト: `monitor_esthe_ranking.mjs`
- 更新対象:
  - `toyota_esthe_map_points_ja.csv`
  - `data.js`
  - `esthe_ranking_snapshot.json`
  - `esthe_ranking_report.md`
  - `esthe_ranking_status.json`
  - `esthe_ranking_failure.log`

## 今の動き

- 掲載ページを巡回する
- 一覧カードから店舗名、最寄駅、電話番号、営業時間、掲載URLを自動抽出する
- 既存CSVの同名店舗または同じ掲載URLの行に上書きする
- CSVにない店舗が見つかったら仮行として追加する
- 画面表示用の `data.js` を自動で再生成する
- 前回との差分レポートを残す
- 成功 / 失敗の状態を `esthe_ranking_status.json` に残す
- 失敗時は `esthe_ranking_failure.log` に追記する
- 通常実行では `run_esthe_monitor.ps1` 側が `Invoke-WebRequest -> curl.exe` の順でHTMLを取得する
- `monitor_esthe_ranking.mjs` は取得済みHTMLファイルを読んで更新処理を進める

## 注意

- 座標、住所、備考は既存CSVの内容を優先して残します
- 掲載ページに載っていない詳細住所や座標までは自動補完しません
- HTML構造が大きく変わると、抽出ロジックの調整が必要です
- この作業画面からの手動実行は、外部接続制限で止まることがあります
- 自動巡回が失敗しても、次回からはワークスペース内に失敗理由が残ります

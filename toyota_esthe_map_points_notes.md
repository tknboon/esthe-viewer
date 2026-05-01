# Google My Maps 取り込みメモ

- 対象ファイル: `toyota_esthe_map_points.csv`
- 店舗名として使う列: `store_name`
- 位置情報として使う列: `address_or_coordinates`
- 補足表示に向いている列: `branch_or_room`, `nearest_station`, `notes`

## 補足

- `address_or_coordinates` に住所が入っている行は、そのまま取り込みやすいです。
- 緯度経度が入っている行も、そのまま地図に反映されやすいです。
- 駅名だけが入っている行は、取り込み後に手動で場所調整が必要になる場合があります。
- 複数ルームの店舗は `1拠点1行` で分けてあります。

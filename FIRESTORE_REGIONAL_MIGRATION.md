# Firestore 地域分離メモ

目的: 既存の `sharedState/{docId}` を、地域別の `regions/aichi/sharedState/{docId}` にコピーする。

この段階ではアプリ本体の読み書き先はまだ変更しない。先に移行スクリプトで件数とコピー結果を確認する。

## 対象ドキュメント

- `reviews`
- `storeProfiles`
- `favorites`
- `excluded`

## 事前バックアップ

本番実行前に Firebase / Google Cloud 側で Firestore export を取る。

```powershell
gcloud firestore export gs://YOUR_BUCKET/firestore-backup-aichi-YYYYMMDD
```

## 準備

Firebase Console でサービスアカウント JSON を作成し、リポジトリ外の安全な場所に保存する。

例:

```text
C:\Users\tknbo\Documents\Secrets\esthe-viewer-service-account.json
```

`firebase-admin` はローカル実行時だけ使う。

```powershell
npm install --no-save firebase-admin
```

## dry-run

まずは必ず dry-run で確認する。

```powershell
node .\scripts\migrate-firestore-to-regional.mjs `
  --service-account "C:\Users\tknbo\Documents\Secrets\esthe-viewer-service-account.json" `
  --dry-run
```

表示される内容:

- 旧パスにドキュメントがあるか
- 新パスに既にドキュメントがあるか
- `payload` のキー数
- コピー対象になるか

## 本番コピー

dry-run の結果が問題なければ `--execute` を付ける。

```powershell
node .\scripts\migrate-firestore-to-regional.mjs `
  --service-account "C:\Users\tknbo\Documents\Secrets\esthe-viewer-service-account.json" `
  --execute
```

新パスに既にドキュメントがある場合はスキップする。上書きしたい場合だけ `--overwrite` を付ける。

## 新旧payload比較

二重書き込み期間中や読み込み切り替え前に、旧パスと新パスの `payload` を比較する。

```powershell
node .\scripts\migrate-firestore-to-regional.mjs `
  --service-account "C:\Users\tknbo\Documents\Secrets\esthe-viewer-service-account.json" `
  --verify
```

`updatedAt` は旧パスと新パスで差が出るため、比較対象は `payload` のみ。

## 次の実装ステップ

1. app.js に旧パス + 新パスの二重書き込みを入れる
2. 読み込みは旧パスのまま 1週間ほど様子を見る
3. 問題なければ読み込みも `regions/aichi/sharedState/{docId}` に切り替える
4. 二重書き込みを外す

旧 `sharedState` はすぐ削除しない。

# Netlify公開メモ

このフォルダは、そのまま `Netlify` に公開できます。

## 使うファイル

- `index.html`
- `app.js`
- `styles.css`
- `data.js`
- `netlify.toml`

## いちばん簡単な公開手順

1. Netlify にログイン
2. `Add new site` を開く
3. `Deploy manually` を選ぶ
4. 上の5ファイルをまとめてアップロードする

## 公開後に必ずやること

Google Maps の APIキーは、Netlify の公開URLだけで使えるように制限してください。

例:

- `https://your-site-name.netlify.app/*`
- 独自ドメインを使うなら `https://example.com/*`

## 補足

- レビューはブラウザ保存なので、端末やブラウザごとに別管理です
- `data.js` を差し替えると店舗一覧が更新されます
- 公開後に見た目が変わらないときは、ブラウザ再読み込みをしてください

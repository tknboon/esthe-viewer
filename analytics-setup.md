# アクセス解析の設定

このサイトは Cloudflare Web Analytics を読み込めるようにしています。

## 有効化手順

1. Cloudflare ダッシュボードで Web Analytics を開く
2. `www.aichi-esthe.com` 用の Site Token を作成する
3. `analytics-config.js` の `cloudflareToken` に Site Token を入れる
4. `sync-public-assets.ps1` を実行して `docs` へ同期する
5. commit / push する

## 現在の状態

`cloudflareToken` が空なので、解析スクリプトは読み込まれません。
トークンを入れるまでは公開サイトの動作は変わりません。

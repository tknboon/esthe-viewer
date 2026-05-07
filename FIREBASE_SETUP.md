# Firebase 共有設定メモ

このサイトは、Firebase の設定値を入れると

- レビュー
- 店舗情報
- 確認済み
- 除外

を Google ログイン経由で複数端末から共有できます。

## 1. Firebase プロジェクトを作る

1. Firebase Console を開く
2. `プロジェクトを追加`
3. 名前を決めて作成

公式:
https://firebase.google.com/docs/web/setup

## 2. Web アプリを登録する

1. プロジェクト画面で `</>` を押す
2. Web アプリ名を入れて登録
3. 表示された設定値を控える

必要なのはこの6つです。

- `apiKey`
- `authDomain`
- `projectId`
- `storageBucket`
- `messagingSenderId`
- `appId`

## 3. Google ログインを有効化する

1. 左メニュー `Authentication`
2. `始める`
3. `Sign-in method`
4. `Google`
5. 有効化して保存

公式:
https://firebase.google.com/docs/auth/web/google-signin

## 4. Firestore を有効化する

1. 左メニュー `Firestore Database`
2. `データベースの作成`
3. リージョンを選んで作成

公式:
https://firebase.google.com/docs/firestore/quickstart

## 5. ルールを入れる

Firestore の `ルール` に、まずはこの内容を入れます。

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sharedState/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

公式:
https://firebase.google.com/docs/firestore/security/get-started

## 6. このフォルダの設定ファイルに値を入れる

編集するのはこのファイルです。

`C:\Users\tknbo\Documents\Codex\2026-04-28\new-chat\firebase-config.js`

`enabled` を `true` にして、Firebase の値を入れます。

```js
window.firebaseAppConfig = {
  enabled: true,
  apiKey: "ここに貼る",
  authDomain: "ここに貼る",
  projectId: "ここに貼る",
  storageBucket: "ここに貼る",
  messagingSenderId: "ここに貼る",
  appId: "ここに貼る",
};
```

## 7. 反映後の見え方

- 左上に `Googleで共有` が出る
- ログインすると `〇〇 と共有中` に変わる
- 保存したレビューや店舗情報が他端末でも見える

## 共有対象

- レビュー
- 店舗情報
- 確認済み
- 除外

## 補足

Firebase の設定値を入れるまでは、今までどおりこの端末内保存のままです。

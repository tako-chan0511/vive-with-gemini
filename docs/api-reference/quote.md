---
title: 名言ジェネレーター API
description: ランダムに心に響く名言を返す、CORS対応の公開APIエンドポイント仕様です。
---

# 名言ジェネレーター (`/api/quote`)

システムに内蔵された名言リストから、ランダムに一つの名言と作者を返却します。

## エンドポイント

- **Method:** `GET`
- **Path:** `/api/quote`

### ベースURL

エンドポイントのパスの前に、以下のベースURLを付けてアクセスします。

-   **本番環境:** `https://quoted-api.vercel.app`
-   **ローカル開発環境:** `http://localhost:3000`

**完全なURLの例（本番）:**
`https://quoted-api.vercel.app/api/quote`

## CORSポリシー

このAPIは、全てのオリジン（ドメイン）からのクロスオリジンリクエストを許可しています。

-   `Access-Control-Allow-Origin: *`

これにより、どのようなウェブサイトやアプリケーションからでも、自由にこのAPIを呼び出すことが可能です。

## レスポンス

### 成功時 (200 OK)

リクエストが成功すると、以下の構造を持つJSONオブジェクトが返されます。

**レスポンスボディの例:**

```json
{
  "quote": "The only way to do great work is to love what you do.",
  "author": "Steve Jobs"
}
```

**フィールド詳細**

返却されるJSONオブジェクトは、以下のキーと値のペアで構成されています。

| キー名 (`key`) | データ型 (`type`) | 内容 (`description`) |
| :--- | :--- | :--- |
| `quote` | `String` | ランダムに選ばれた名言の全文が入ります。 |
| `author` | `String` | その名言の作者名が入ります。 |

### 失敗時 (500 Internal Server Error)

サーバー内部で予期せぬエラーが発生した場合、ステータスコード`500`と共にエラーメッセージが返されることがあります。

```json
{
  "error": "Internal Server Error"
}
```

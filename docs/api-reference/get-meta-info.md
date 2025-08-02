---
title: 統計メタ情報取得API
description: e-Statの統計表IDからメタ情報（分類情報）を取得するAPIエンドポイント。
---

# 統計メタ情報取得API (`/api/get-meta-info`)

このAPIは、e-Statの統計表ID（statsDataId）を指定して、分類（CLASS_INF）に関するメタ情報を取得します。

## エンドポイント

- **Method:** `GET`
- **Path:** `/api/get-meta-info`
- **クエリパラメータ:**
  - `statsDataId` (必須): e-Statの統計表ID

## 環境変数

- `ESTAT_APP_ID`（e-StatのアプリケーションID）が必要です。これが設定されていないとエラーになります。

## レスポンス例

成功時 (`200 OK`):

```json
[
  {
    "@id": "cat01",
    "CLASS": [
      {
        "@code": "001",
        "@name": "総数"
      },
      ...
    ]
  }
]
```

失敗時（例: `400 Bad Request`, `500 Internal Server Error`）:

```json
{
  "error": "エラーメッセージ"
}
```

## 注意事項

- statsDataIdは必須で、文字列形式で渡す必要があります。
- e-Stat APIがエラーを返した場合は、そのメッセージが含まれます。

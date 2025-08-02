---
title: テスト環境API
description: テスト用のAPI。環境変数の読み込み結果を返す。
---

# テスト環境API `/api/test-env`

テスト用のAPIで、環境変数などの情報を返します。

## エンドポイント

- **Method:** `GET`
- **Path:** `/api/test-env`

## レスポンス

### 成功時（200 OK）

```json
{
  "message": "Environment variables loaded successfully",
  "env": {
    "EXAMPLE_KEY": "example_value"
  }
}
```

### エラー時（500 Internal Server Error）

```json
{
  "error": "Failed to load environment variables"
}
```

## 解説

このAPIは開発・デバッグ時に使用され、サーバー側の設定が正しく行われているか確認するためのエンドポイントです。

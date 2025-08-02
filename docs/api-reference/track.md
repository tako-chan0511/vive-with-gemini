---
title: Track API
description: track.ts に基づく API 仕様書
---

# track.ts - API仕様書

このAPIはアクセス数（トラック）情報を取得または記録するためのエンドポイントです。

## エンドポイント

- **Method:** `POST`
- **Path:** `/api/track`

## リクエストボディ

```json
{
  "type": "string (必須, 例: 'like' または 'view')",
  "slug": "string (必須, 対象ページのID)"
}
```

| パラメータ | 型 | 説明 |
|------------|----|------|
| `type`     | string | `like` または `view`。どのイベントかを指定。 |
| `slug`     | string | 対象となるページIDやスラッグ。 |

## レスポンス

### 成功時 (200 OK)

```json
{
  "success": true
}
```

### エラー時 (400 / 500)

```json
{
  "error": "エラーメッセージ"
}
```

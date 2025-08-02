---
title: 統計検索 API
description: 検索語句に対応する政府統計データセットの一覧を取得するAPI仕様です。
---

# 統計検索 API `/api/search-stats`

検索キーワードをもとに、e-Stat統計データセットを検索します。

## エンドポイント

- **Method**: `GET`
- **Path**: `/api/search-stats`

## クエリパラメータ

| パラメータ名 | 型     | 必須 | 説明                    |
|--------------|--------|------|-------------------------|
| `query`      | string | ○    | 検索対象のキーワード     |

## レスポンス

### 成功時: 200 OK

```json
[
  {
    "id": "0003412312",
    "title": "人口動態統計",
    "source": "総務省",
    "updatedAt": "2023-07-01"
  },
  ...
]
```

| フィールド名 | 型     | 説明                      |
|--------------|--------|---------------------------|
| `id`         | string | 統計データセットのID       |
| `title`      | string | 統計の名称                |
| `source`     | string | 提供元（省庁など）         |
| `updatedAt`  | string | 最終更新日（ISO形式）      |

### 失敗時: 500 Internal Server Error

```json
{
  "error": "Internal Server Error"
}
```

## 備考

このAPIは、e-Stat APIなどの外部政府統計データベースと連携して動作します。

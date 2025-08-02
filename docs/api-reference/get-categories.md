# 統計表の分類取得API `/api/get-categories`

e-Statの統計表に関連する「分類（カテゴリ）」を取得するエンドポイントです。

## エンドポイント

- **Method:** `GET`
- **Path:** `/api/get-categories`

## クエリパラメータ

| パラメータ名 | 必須 | 型   | 説明 |
|--------------|------|------|------|
| `statsDataId` | ✔   | `string` | 統計表ID（例: `0003212345`）。e-Statの統計データに付与されているユニークIDです。 |

## レスポンス仕様（成功時）

### ステータス: `200 OK`

```json
{
  "categories": [
    {
      "id": "cat01",
      "name": "人口分類",
      "values": [
        { "code": "001", "label": "男性" },
        { "code": "002", "label": "女性" }
      ]
    },
    {
      "id": "cat02",
      "name": "年齢階層",
      "values": [
        { "code": "101", "label": "0〜14歳" },
        { "code": "102", "label": "15〜64歳" }
      ]
    }
  ]
}
```

## エラーレスポンス

### `400 Bad Request`

```json
{
  "error": "Missing statsDataId parameter"
}
```

### `500 Internal Server Error`

```json
{
  "error": "Failed to fetch data from e-Stat API"
}
```

---

このAPIは、e-Statの提供する統計情報からカテゴリ（分類）構造を動的に取得するためのエンドポイントです。統計分析・可視化アプリのカテゴリ選択UIの自動構築などに利用できます。
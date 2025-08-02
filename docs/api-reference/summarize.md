---
title: 政策情報サマリー API
description: 各政党の政策URLを対象にテキストを取得し、テーマごとに要約・分析結果を返すAPI
---

# 政策情報サマリー API

指定された政党の政策URLから内容を取得し、定義されたテーマごとに分析・要約された結果を返します。結果はキャッシュされ、リクエストの重複を避けます。

## エンドポイント

- **Method:** `POST`
- **Path:** `/api/summarize`

## リクエスト形式

```json
{
  "parties": [
    {
      "id": "party1",
      "name": "政党A",
      "policyUrl": "https://example.com/policy-a"
    },
    ...
  ],
  "themes": [
    {
      "key": "economy",
      "label": "経済政策"
    },
    ...
  ],
  "freeformQuestion": "子育て支援の方針は？" // 任意
}
```

## レスポンス例（成功時）

```json
{
  "analysis": {
    "party1": {
      "economy": "政党Aの経済政策の要約…",
      "education": "政党Aの教育政策の要約…"
    },
    "party2": {
      "economy": "政党Bの経済政策の要約…"
    }
  },
  "freeformAnswer": {
    "question": "子育て支援の方針は？",
    "answer": "各政党の子育て支援策をまとめた内容…"
  },
  "fromCache": false
}
```

## エラーレスポンス

- **405 Method Not Allowed**

```json
{ "error": "Method Not Allowed" }
```

- **400 Bad Request**

```json
{ "error": "不正なリクエストです。" }
```

- **500 Internal Server Error**

```json
{ "error": "APIキーがサーバー側で設定されていません。" }
```

## 補足

- 同一URL群・質問に対してはキャッシュ（`Vercel KV`）が効き、API呼び出し回数を削減。
- URLからのポリシーテキスト抽出には `cheerio` を使用。
- Gemini API をバックエンドで呼び出し、自然言語による要約・分析を実施。

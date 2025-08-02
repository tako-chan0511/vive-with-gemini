---
title: 統計データ分析API
description: e-StatデータとGemini APIを使って複数の観点から統計分析を行うAPI
---

# analyze-stats API

統計データIDと複数の分析観点を指定し、e-Stat APIから取得したデータをGemini APIを使って分析します。

## エンドポイント

- **Method:** `POST`
- **Path:** `/api/analyze-stats`

## リクエスト

### パラメータ（JSON形式）

| パラメータ名 | 型 | 必須 | 説明 |
|--------------|----|------|------|
| `statsDataId` | string | ✔ | e-Statで使用する統計データのID |
| `analyses` | array | ✔ | 分析対象の配列（観点名とフィルター情報を含む） |
| `question` | string | ✔ | Geminiに投げる質問文（自然言語） |
| `geminiApiKey` | string | ✔ | Gemini APIのキー（ユーザー側で設定） |

例：

```json
{
  "statsDataId": "0003422312",
  "analyses": [
    {
      "filters": { "area": "01100" },
      "filterNames": { "area": "札幌市" }
    }
  ],
  "question": "地域ごとの傾向を教えてください。",
  "geminiApiKey": "your-gemini-api-key"
}
```

## レスポンス

- 成功時（200 OK）：Gemini APIから得られた分析結果を返します。
- 失敗時：
  - `400 Bad Request`: パラメータ不足や形式不備
  - `405 Method Not Allowed`: POST以外のリクエスト
  - `500 Internal Server Error`: 外部API呼び出し失敗やGeminiの解析失敗など

## 使用技術・外部API

- [e-Stat API](https://www.e-stat.go.jp/api/)
- [Gemini Pro API (Google AI)](https://ai.google.dev/)

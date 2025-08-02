---
title: 株価情報取得API
description: 指定した証券コードのリアルタイム株価を取得するAPIです。
---

# 株価情報取得 API (`/api/fetch-stock-quote`)

指定した証券コードに対応するリアルタイムの株価情報を取得します。

## エンドポイント

- **Method:** `GET`
- **Path:** `/api/fetch-stock-quote`
- **Query Parameter:**
  - `symbol` (必須): 取得したい株式の証券コード（例: `AAPL`, `GOOGL`）

## ベースURL

- 本番: `https://your-domain.vercel.app`
- ローカル: `http://localhost:3000`

完全なURL例:
```
https://your-domain.vercel.app/api/fetch-stock-quote?symbol=AAPL
```

## CORS

このAPIはクロスオリジンリクエストに対応しています（`Access-Control-Allow-Origin: *`）。

## レスポンス

### 成功時: `200 OK`

```json
{
  "c": 180.62,      // 現在の株価
  "h": 181.4,       // 当日の最高値
  "l": 179.35,      // 当日の最安値
  "o": 180.2,       // 当日の始値
  "pc": 178.85,     // 前日の終値
  "t": 1625151600   // タイムスタンプ
}
```

### エラー時

- `400 Bad Request`: symbolが指定されていない
- `500 Internal Server Error`: APIキーが設定されていない or 外部APIとの通信エラー

## 説明

このエンドポイントは、[Finnhub](https://finnhub.io/) の株価APIを利用して、リアルタイムの株式情報を返します。

## 最終更新日

2025-08-02

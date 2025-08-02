# API仕様書：企業ニュース要約分析API

---
title: analyze-company-news API
description: 指定された企業名に関する最新ニュースを取得し、AIで要約・要因分析を行うエンドポイントです。
---

## 概要

このAPIは、指定された企業名に関連するニュースを検索し、その中から直近の重要な記事を抽出、AIを用いて要約と要因分析を行い、クライアントに返却します。

## エンドポイント

- **メソッド:** `GET`
- **パス:** `/api/analyze-company-news`

## クエリパラメータ

| パラメータ名 | 型     | 必須 | 説明                             |
|--------------|--------|------|----------------------------------|
| `company`    | string | はい | 分析対象の企業名（例：ソニー）   |

## レスポンス

### 成功時（200 OK）

```json
{
  "summary": "ソニーは新たにEV事業への参入を発表し、株価が上昇しました。",
  "analysis": "EV市場の成長と他社との提携が好材料と見られています。"
}
```

| フィールド名 | 型     | 説明                           |
|--------------|--------|--------------------------------|
| `summary`    | string | ニュースの要約                 |
| `analysis`   | string | 要因や背景に関するAIの分析結果 |

### エラー時（400 / 500）

```json
{
  "error": "Invalid request"
}
```

## 注意事項

- このAPIは外部ニュース検索APIとAIモデル（Gemini）を利用しています。
- リクエストのたびにニュース取得とAI要約処理が発生するため、応答に数秒要します。

## ソースコード（抜粋）

```ts
// api/analyze-company-news.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';
import { kv } from '@vercel/kv';

// ヘルパー関数：指定されたURLから本文を抽出する（変更なし）
async function scrapeArticleText(url: string): Promise<string> {
  try {
    const articleResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    i...
```

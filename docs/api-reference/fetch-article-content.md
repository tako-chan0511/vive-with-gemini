---
title: fetch-article-content API
description: 記事URLからコンテンツを抽出するAPIの仕様
---

# fetch-article-content API仕様

## エンドポイント

- **メソッド:** POST
- **パス:** `/api/fetch-article-content`

## 概要

この記事URLを受け取り、テキストコンテンツと要素（例：見出しや段落）を抽出するAPI。

## パラメータ（リクエストボディ）

```json
{
  "url": "https://example.com/news/article"
}
```

| パラメータ | 型     | 必須 | 説明                       |
|------------|--------|------|----------------------------|
| url        | string | ✅   | 記事ページのURL            |

## レスポンス（成功）

```json
{
  "title": "記事タイトル",
  "content": "本文テキスト",
  "elements": [ ... ]
}
```

## レスポンス（失敗）

```json
{
  "error": "Invalid URL"
}
```

## 実装コード（TypeScript）

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "POST method required." });
  }

  const { articleUrl } = req.body;

  if (!articleUrl || typeof articleUrl !== 'string') {
    return res.status(400).json({ error: '記事のURLが必要です。' });
  }

  try {
    // 記事のURLからHTMLを取得
    console.log(`[Info] Fetching article HTML from: ${articleUrl}`);
    const articleResponse = await fetch(articleUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });

    if (!articleResponse.ok) {
      throw new Error(`記事ページの取得に失敗しました: ${articleResponse.status}`);
    }
    const html = await articleResponse.text();

    const $ = cheerio.load(html);

    // ★★★ ここからが修正箇所 ★★★
    // 最初に不要な要素（スクリプト、スタイル、ヘッダー、フッターなど）を削除
    $('script, style, noscript, nav, footer, header, aside, form').remove();

    // 残ったものから本文テキストを抽出（body全体から取得することで、より多くの本文を捉える）
    const articleText = $('body').text();
    // 連続する空白や改行を整形
    const cleanedText = articleText.trim().replace(/\s{2,}/g, '\n\n');
    // ★★★ ここまでが修正箇所 ★★★

    console.log(`[Info] Extracted text length: ${cleanedText.length}`);

    if (cleanedText.length < 100) {
        throw new Error('記事から十分なテキストを抽出できませんでした。');
    }

    res.status(200).json({ articleText: cleanedText });

  } catch (error: any) {
    console.error('An error occurred in fetch-article-content handler:', error);
    res.status(500).json({ error: error.message || 'サーバーでエラーが発生しました。' });
  }
}
```

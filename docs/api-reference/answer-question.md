---
title: answer-question API
description: Gemini APIを用いてユーザーの質問に回答するAPI
---

# answer-question API

このAPIは、Geminiモデルを使用して、指定された質問と背景情報に基づいて回答を生成します。

## エンドポイント

- **Method**: POST  
- **Path**: `/api/answer-question`

## リクエストボディ

```json
{
  "question": "string",
  "context": "string"
}
```

| パラメータ | 型     | 説明                     |
|------------|--------|--------------------------|
| question   | string | ユーザーからの質問       |
| context    | string | 回答の背景となる追加情報 |

## レスポンス

成功時には、質問に対するAIの回答を含むJSONオブジェクトが返されます。

```json
{
  "result": "string"
}
```

| フィールド | 型     | 説明           |
|------------|--------|----------------|
| result     | string | AIが生成した回答 |

## 実装概要

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "POST method required." });
  }

  // フロントからAPIキーを受け取るのをやめる
  const { articleText, question } = req.body;
  // サーバーの環境変数から直接APIキーを読み込む
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!articleText || !question) {
    return res.status(400).json({ error: '記事本文と質問の両方が必要です。' });
  }
  if (!geminiApiKey) {
    // エラーメッセージを分かりやすく変更
    return res.status(500).json({ error: 'Gemini APIキーがサーバーに設定されていません。' });
  }
  try {
    // ★★★ ここからが修正箇所 ★★★
    const prompt = `
      あなたは、与えられた「記事本文」を深く理解し、自身の持つ広範な専門知識と組み合わせて洞察を提供する、優秀な専門アナリストです。

      ユーザーからの「質問」に対して、以下の指示に従って回答を生成してください。

      1.  まず、「記事本文」に書かれている情報を最優先の根拠（一次情報）としてください。
      2.  その上で、あなたの持つ専門知識（LLMの知識）を補足情報として活用し、より深く、多角的な視点からの回答を生成してください。
      3.  記事に直接書かれていない推論や予測（例：「日本への影響」など）を行う際は、それがあなた自身の専門家としての考察であることを明確に示してください。
      4.  **回答の形式は必ずMarkdownを使用してください。見出し、太字、箇条書きリストなどを効果的に使い、情報を構造化して読みやすく記述してください。**

      ---記事本文---
      ${articleText}
      
      ---質問---
      ${question}
      
      ---回答---
    `;
    // ★★★ ここまでが修正箇所 ★★★
    
  // サーバーのキーを使用
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`;
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    if (!apiResponse.ok) throw new Error(`AI APIがエラー: ${apiResponse.status}`);
    
    const responseData = await apiResponse.json();
    const answer = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!answer) throw new Error('AIからの応答が空です。');

    res.status(200).json({ answer: answer.trim() });

  } catch (error: any) {
    console.error('An error occurred in answer-question handler:', error);
    res.status(500).json({ error: error.message || 'サーバーでエラーが発生しました。' });
  }
}
```

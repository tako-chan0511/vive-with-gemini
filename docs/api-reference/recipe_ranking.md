# 📘 API仕様：レシピランキング取得 `/api/recipe-ranking`

## 🔗 エンドポイント
```
GET /api/recipe-ranking
```

## 📄 概要
楽天レシピAPIを使用して、指定されたカテゴリIDに基づくレシピランキングを取得します。

## 🔧 クエリパラメータ
| パラメータ       | 型     | 必須 | 説明                         |
|----------------|--------|------|------------------------------|
| `categoryId`   | string | ✅   | 楽天カテゴリID（例: "30-1"） |

## 📥 リクエスト例
```bash
curl -X GET "https://your-domain.vercel.app/api/recipe-ranking?categoryId=30-1"
```

## 📤 レスポンス形式（JSON）
```json
{
  "recipes": [
    {
      "title": "簡単チャーハン",
      "url": "https://recipe.rakuten.co.jp/recipe/123456",
      "imageUrl": "https://image.example.com/img.jpg",
      "description": "誰でもできる定番チャーハンの作り方",
      "rank": 1
    },
    ...
  ]
}
```

## ⚠️ エラーハンドリング
| ステータスコード | 内容                             |
|------------------|----------------------------------|
| 400              | `categoryId` が未指定             |
| 500              | API呼び出し失敗や環境変数エラー    |


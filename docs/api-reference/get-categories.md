# API仕様書：カテゴリ取得エンドポイント `/api/get-categories`

## 概要
楽天レシピAPIを用いて、料理の大カテゴリと中カテゴリの一覧を取得するAPI。

## メソッド
`GET`

## エンドポイント
`/api/get-categories`

## 説明
環境変数に設定された `RAKUTEN_APP_ID` を利用し、楽天レシピAPIのエンドポイントにアクセスしてカテゴリデータを取得。

## レスポンス形式（JSON）
```json
{
  "result": {
    "large": [
      {
        "categoryId": "10",
        "categoryName": "主食"
      },
      ...
    ],
    "medium": [
      {
        "categoryId": "10-101",
        "categoryName": "ごはんもの"
      },
      ...
    ]
  }
}
```

## 環境変数
| 変数名         | 説明                     |
|----------------|--------------------------|
| `RAKUTEN_APP_ID` | 楽天APIアクセス用アプリID |

## エラー時のレスポンス
- 楽天APIからのレスポンスに`result`が含まれない場合、または取得失敗時は以下のようなエラーメッセージが返却されます：

```json
{
  "error": "楽天APIからカテゴリ情報を取得できませんでした。"
}
```

## 実装例
FastAPI における `get_categories.py` の内容
```python
import os
import requests
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()

@router.get("/get-categories")
def get_categories():
    app_id = os.getenv("RAKUTEN_APP_ID")
    endpoint = "https://app.rakuten.co.jp/services/api/Recipe/CategoryList/20170426"
    params = {"applicationId": app_id}
    res = requests.get(endpoint, params=params)
    data = res.json()

    if "result" not in data:
        return JSONResponse(status_code=500, content={"error": "楽天APIからカテゴリ情報を取得できませんでした。"})

    return {"result": data["result"]}
```

## 備考
- `.env` に `RAKUTEN_APP_ID` を設定していることを確認してください。
- 本APIは `/api/get-categories` としてVercelにデプロイされます。


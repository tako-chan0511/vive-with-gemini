
# Python FastAPI × Vue 3 API連携ガイド

本ガイドでは、TypeScript (Vercel Function) ベースで構築された API を Python (FastAPI) に移行し、Vue 3 + Vite + Vercel 環境で動作させる手順を解説します。

## 🎯 背景

- 元の構成：`get-categories.ts` / `recipe-ranking.ts` による Vercel Serverless API
- 新構成：Python (FastAPI) による REST API サーバ
- 目的：保守性・拡張性の高い構成に変更し、今後の AI 機能や外部連携にも柔軟に対応する

## 📦 プロジェクト構成（Monorepo）

```
my-recipes/
├── frontend/              # Vue3 + Vite + TypeScript
├── api/                  # Python FastAPI API群
│   ├── get_categories.py
│   ├── recipe_ranking.py
│   └── main.py
├── .env                  # FastAPI 用 環境変数
├── vite.config.ts        # フロントエンド用設定
└── ...
```

## ✅ ステップバイステップ導入手順

### 1. `get-categories.ts` → `get_categories.py` に変換

```py
# api/get_categories.py
import os
import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.get("/get-categories")
async def get_categories():
    app_id = os.getenv("RAKUTEN_APP_ID")
    if not app_id:
        raise HTTPException(status_code=500, detail="APIキー未設定")

    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"https://app.rakuten.co.jp/services/api/Recipe/CategoryList/20170426",
                params={"format": "json", "applicationId": app_id},
            )
            res.raise_for_status()
            data = res.json()
            return {
                "large": data["result"]["large"],
                "medium": data["result"]["medium"]
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### 2. `main.py` にルーター登録＋`.env` 読み込み

```py
# api/main.py
from fastapi import FastAPI
from dotenv import load_dotenv
from .get_categories import router as categories_router
from .recipe_ranking import router as ranking_router

load_dotenv()

app = FastAPI()
app.include_router(categories_router, prefix="/api")
app.include_router(ranking_router, prefix="/api")
```

### 3. `.env` に環境変数を追加

```env
# .env
RAKUTEN_APP_ID=1036462693905654360
```

### 4. `vite.config.ts` に proxy を設定

```ts
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8686',
        changeOrigin: true
      },
    },
  },
});
```

### 5. 起動コマンド

```bash
# FastAPI 側
uvicorn api.main:app --reload --port 8686 --host 0.0.0.0

# Vue 側
npm run dev
```

## ✅ 結果

- `/api/get-categories` にアクセス可能に（カテゴリメニュー表示OK）
- `/api/recipe-ranking?categoryId=30` によってランキング情報を取得
- Vue アプリが FastAPI を透過的に利用可能に

## 🧠 Tips

- Vite → FastAPI 連携では `/api` prefix を揃えるのが要
- `.env` は Python 用と Vite 用で別々に管理すること

## 🚀 関連リンク

- [楽天レシピAPI公式ドキュメント](https://webservice.rakuten.co.jp/documentation/recipe/)
- [FastAPI公式](https://fastapi.tiangolo.com/)
- [Vite公式](https://vitejs.dev/)

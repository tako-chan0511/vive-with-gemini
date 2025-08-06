
# Vue + FastAPI 開発時の Proxy 設定と起動方法まとめ

本ドキュメントでは、Vue3 + Vite + FastAPI をローカル開発環境で連携させる際の注意点や正しい起動手順について解説します。

---

## 📁 ディレクトリ構成の前提

```
my-project/
├── src/                # Vue プロジェクトルート
│   ├── App.vue
│   ├── main.ts
│   ├── vite-env.d.ts
│   ├── components/
│   └── views/
├── api/                # FastAPIバックエンド
│   ├── main.py
│   ├── get_categories.py
│   └── recipe_ranking.py
├── .env
├── package.json
├── vite.config.ts
└── README.md
```

---

## ✅ 起動方法（ローカル開発）

### 1. FastAPI の起動

ルートディレクトリで以下を実行：

```
uvicorn api.main:app --reload --port 8686 --host 0.0.0.0
```

FastAPI 側は `/api/xxx` 形式でルーティングされている想定です（`include_router(..., prefix="/api")`）。

### 2. Vue (Vite) の起動

Vue プロジェクトが `src/` 配下にあるため、必ず以下のように `src/` に移動してから起動：

```
cd src
npm run dev
```

📌 **これを間違えると `vite.config.ts` が無視され、proxy 設定が効かず、API エラーが発生します。**

---

## 🔧 vite.config.ts の記述（ルート直下に設置）

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  root: './src',
  base: './',
  build: {
    outDir: '../dist'
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8686',
        changeOrigin: true,
        // rewrite は不要。FastAPI 側で `/api` を吸収しているため。
      }
    }
  }
})
```

---

## ✅ FastAPI 側のルーティング例

```python
# api/main.py
from fastapi import FastAPI
from .get_categories import router as categories_router
from .recipe_ranking import router as ranking_router
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

@app.get("/debug")
async def debug():
    return {"status": "ok"}

app.include_router(categories_router, prefix="/api")
app.include_router(ranking_router, prefix="/api")

print("📌 FastAPI registered routes:")
for route in app.routes:
    print(f"{route.path} → {route.name}")
```

---

## ✅ .env ファイルの位置

`.env` はプロジェクトの **ルート直下** に配置してください（`uvicorn` を実行する場所と一致）。

---

## 🔍 よくあるミスと対処

| ミス例 | 原因 | 対処 |
|--------|------|------|
| `GET /get-categories 404` | `/api` が抜けている | API 側に prefix `/api` を設定しているか確認 |
| Proxy が効かない | `vite.config.ts` 無視されている | `src/` 配下で `npm run dev` を実行する |
| `.env` が読み込まれない | ファイル位置が誤り or `load_dotenv()` がない | `.env` はルート直下、`load_dotenv()` を `main.py` に書く |

---

## ✅ 結論

- `vite.config.ts` は **ルート直下** に置く。
- Vue (Vite) を起動する際は **`src/` に移動してから `npm run dev`** を叩く。
- FastAPI は **ルートで `uvicorn api.main:app`** を起動。
- これで Vue → FastAPI の `/api/xxx` リクエストが正常に連携される。

---

以上の点を守れば、Vue + FastAPI のローカル連携は安定して動作します。


# FastAPI バックエンド API：TypeScript → Python リファクタリングと Vercel デプロイ手順

Vue 3 + FastAPI の構成において、既存の TypeScript バックエンドを Python（FastAPI）に置き換える際の作業ログと、Vercel によるリモートデプロイまでの手順を記録します。

---

## ✅ 1. ローカル開発環境の構築（FastAPI）

### 📁 ディレクトリ構成

```
my-recipes/
├── api/
│   ├── main.py
│   ├── get_categories.py
│   ├── recipe_ranking.py
│   └── __init__.py
├── src/
│   ├── App.vue（Vue3）
│   └── その他コンポーネント
├── .env.local
├── vite.config.ts
└── vercel.json
```

### 🔧 main.py の例

```python
from fastapi import FastAPI
from .get_categories import router as categories_router
from .recipe_ranking import router as ranking_router
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
app.include_router(categories_router, prefix="/api")
app.include_router(ranking_router, prefix="/api")
```

---

## ✅ 2. Vue3 側の設定（vite.config.ts）

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8686',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
    },
  },
})
```

---

## ✅ 3. .env.local

```
VITE_RAKUTEN_APP_ID=あなたのアプリID
```

---

## ✅ 4. 起動方法（ローカル）

```bash
uvicorn api.main:app --reload --port 8686 --host 0.0.0.0
npm run dev  # 別ターミナルで Vue フロントエンド
```

---

## ✅ 5. よくあるローカルエラーと解決方法

- `ModuleNotFoundError: No module named 'get_categories'`
  → `from .get_categories import ...` と相対インポートに修正

- `404 Not Found` on `GET /get-categories`
  → `prefix="/api"` の漏れ、または `/api/get-categories` でアクセスしていない

---

## ✅ 6. リモート環境（Vercel）にデプロイする

### 🔧 必須ファイル：vercel.json

```json
{
  "functions": {
    "api/**/*.py": {
      "runtime": "python3.9",
      "maxDuration": 10
    }
  },
  "builds": [],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/main.py"
    }
  ]
}
```

### 📁 .gitignore の注意点

- `dist/` フォルダは Git に**含める必要はありません**。通常通り `.gitignore` に記載されたままで OK です。
- なぜなら、**Vercel 側がデプロイ時に `npm run build` を自動実行し、`dist/` を生成する**からです。
- よって、手動で `dist/` をコミット・push する必要は **ありません**。

---

## ✅ 7. Vercel デプロイ手順

1. `.env.local` に `VITE_RAKUTEN_APP_ID` を記載
2. GitHub に push
3. Vercel ダッシュボードからプロジェクトを作成
4. `RAKUTEN_APP_ID` を Vercel の環境変数に設定
5. `npm run build` が Vercel 上で自動実行される
6. フロント画面が表示される

---

## ✅ 8. 実際に詰まったポイント（Tips）

- ✅ **.env.local の位置**：
  プロジェクトルート直下にないと読み込まれない

- ✅ **router の prefix 漏れ**：
  `/api/～` で呼び出すなら `include_router(..., prefix="/api")` を忘れずに！

- ✅ **ローカルとリモートで表示されるが API 通らないケース**：
  Vercel のログで `500` エラー調査 → `dotenv` の import 忘れ、環境変数未設定が多い

- ✅ **キャッシュ**：
  ブラウザのキャッシュが悪さする → `Ctrl + Shift + R` でリロード

- ✅ **Vite の proxy 設定ミス**：
  `/api` の rewrite が無いと、FastAPI 側が `/get-categories` と解釈してしまう

---

## ✅ 9. 今後の運用アドバイス

- `@vercel/python` で構成する際は `vercel.json` のルーティングを慎重に
- `.gitignore` で `dist/` を無理に外す必要はない（Vercel がビルドするため）
- エラー時は Vercel の Functions ログを確認

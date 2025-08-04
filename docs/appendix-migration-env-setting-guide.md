
# Vue3 + TypeScript → Vue3 + FastAPI 移行時の環境ファイル設定の違いと対応手順

このドキュメントでは、Vue3 + TypeScript 環境から、Vue3 + FastAPI 環境へ移行する際の環境ファイルに関する設定変更のポイントを解説します。
実際に動作した設定ファイルのサンプルも掲載しています。

---

## 🔄 変更ポイント比較表

| 項目 | TypeScript 時代 | FastAPI（Python）時代 | 補足 |
|------|------------------|------------------------|------|
| **API 実装言語** | `api/*.ts` | `api/*.py`（例: main.py） | 使用ランタイムが異なる |
| **環境変数ファイル** | `.env.local` | `.env.local` or `.env` | Pythonでは `load_dotenv()` 必須 |
| **Vercel 設定** | `@vercel/node` | `@vercel/python` | `vercel.json` の `builds` 構成が異なる |
| **vite.config.ts** | port: `3000` | port: `8686` | proxy先を変更 |
| **.gitignore** | `dist/` を無視 | `dist/` を無視のままでOK | Git管理不要 |
| **npm run build** | 必要な場合あり | Vercelが自動実行 | ローカル動作確認には実行推奨 |

---

## 📁 実際の設定ファイルサンプル

### .env.local（共通）

```env
RAPID_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### vite.config.ts

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

### vercel.json

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/main.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    { "src": "/api/get-categories", "dest": "api/main.py" },
    { "src": "/api/recipe-ranking", "dest": "api/main.py" }
  ]
}
```

---

### .gitignore（変更なしでOK）

```gitignore
node_modules/
dist/
.env*
.vscode/
```
※ `dist/` を Git に含める必要はありません。Vercel が自動で生成します。

---

## 💡Tips

- `.env.local` の内容は Git に含めないよう `.gitignore` に記載しておく。
- Python 側では以下のように読み込みます：

```py
from dotenv import load_dotenv
load_dotenv(".env.local")
```

- `vite.config.ts` の `rewrite()` を忘れると `/api/api/～` などのエラーに繋がります。
- API が 404 となる場合は FastAPI 側の prefix 設定や `include_router()` の記述順を確認。
- `vercel dev` でのテスト時は `.env.local` が適用されているか確認。

---

## ✅ 手順まとめ

1. `vite.config.ts` の proxy target を `8686` に変更
2. `vercel.json` を Python 用に置換
3. `.env.local` を `.env` または `load_dotenv()` 対応に合わせる
4. `.gitignore` に `dist/` を残す（Gitに含めない）
5. Vercel に Push（main か任意ブランチ）
6. デプロイ完了後、ログで API 動作を確認

---

以上が環境ファイルの差分と具体的な修正手順です。

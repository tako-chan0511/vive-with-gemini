# Render Blueprint で構築する簡易 CI/CD 手順（Vue + FastAPI + Docker）

Vue3 + Vite（フロントエンド）と FastAPI（バックエンド）を統合し、Render に 1コンテナでデプロイする簡易 CI/CD を構築した手順をまとめます。

---

## 🏗️ 全体構成

```plaintext
my-recipes/
├── api/                    # FastAPI バックエンド
│   ├── main.py
│   └── ...
├── src/                    # Vue3 + Vite フロントエンド
│   └── ... 
├── dist/                  # フロントビルド後に生成される静的ファイル（自動生成）
├── Dockerfile             # 本番ビルド用
├── render.yaml            # Render BluePrint 設定
├── .env                   # 環境変数（ローカル開発用）
└── README.md
````

---

## 🔧 Dockerfile（1コンテナ構成）

```Dockerfile
# フロントエンドのビルド
FROM node:20 as frontend

WORKDIR /app

COPY ./src ./src
COPY package*.json ./
COPY vite.config.ts ./
RUN npm install
RUN npm run build

# バックエンド + フロントエンドの公開
FROM python:3.11-slim

WORKDIR /app

# Python FastAPI側
COPY ./api ./api
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# フロントエンドビルド成果物をdistに配置
COPY --from=frontend /app/dist ./dist

# 環境変数対応（必要に応じて）
ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "10000"]
```

---

## 📄 render.yaml（Blueprintの要）

```yaml
services:
  - type: web
    name: my-recipes-app
    env: docker
    plan: free
    region: singapore
    dockerfilePath: ./Dockerfile
    autoDeploy: true
    envVars:
      - key: PYTHONUNBUFFERED
        value: "1"
```

---

## 📂 FastAPI 側：main.py

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from dotenv import load_dotenv

# ルーターインポート（例）
from .get_categories import router as categories_router
from .recipe_ranking import router as ranking_router

load_dotenv()

app = FastAPI()

# APIルーター
app.include_router(categories_router, prefix="/api")
app.include_router(ranking_router, prefix="/api")

# フロントエンド静的ファイルのルート設定
dist_path = Path(__file__).resolve().parent.parent / "dist"
app.mount("/", StaticFiles(directory=dist_path, html=True), name="static")
```

---

## 🚀 CI/CD 自動化の流れ

1. GitHub に push すると
2. Render が `render.yaml` を検知し
3. Dockerfile をもとにビルド＆デプロイ
4. 自動で Live URL に公開される！

✅ 完全に手離れした自動化構成です。

---

## ❗ よく詰まるポイント（Tips）

| 問題                         | 解決策                                                                              |
| -------------------------- | -------------------------------------------------------------------------------- |
| `dist` ディレクトリがない           | Dockerfile で `npm run build` を確実に実行する                                            |
| `main.py` で `dist` が見つからない | `Path` 解決を `resolve()` で確実にする。 `Path(__file__).resolve().parent.parent / "dist"` |
| `/api/xxx` が 404           | `app.include_router(..., prefix="/api")` を必ずつける & frontend 側も `/api/xxx` でアクセスする |
| port が違う                   | `uvicorn` のポートを 10000 などに固定して `render.yaml` に合わせる                                |
| `vite.config.ts` の場所       | 必ず `project-root` に置く（`src/`に置くとプロキシ効かない）                                        |

---

## 🧪 ローカル開発時の起動方法

```bash
# フロントエンド（src配下で）
cd src
npm run dev

# バックエンド（ルートで）
uvicorn api.main:app --reload --port 8686 --host 0.0.0.0
```

---

## 📝 今回の学び（まとめ）

* Render Blueprint を使えば GitHub 連携のみで CI/CD を実現できる
* Dockerfile の構成に注意すれば Vue + FastAPI を 1コンテナで統合可能
* `render.yaml` が **Renderのビルド・デプロイをコントロールする設定ファイル**
* push するだけで「勝手に公開される」世界は非常に快適！

---

## 🔗 サンプルURL（デプロイ後）

> [https://my-recipes-app.onrender.com](https://my-recipes-app.onrender.com)

---





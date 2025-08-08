# Vue + FastAPI on Render CI/CD Guide

このドキュメントは、my-recipesプロジェクト（Vue.js + FastAPI）を [Render.com](https://www.google.com/search?q=%E3%82%92Render.com) にデプロイし、最終的に GitHub Actions を用いた CI/CD パイプラインを構築するまでの技術的な道のりを記録したものです。

当初の複雑な構成で発生した数々の問題と、それらをいかにしてシンプルで堅牢な単一コンテナ構成へと昇華させたか、その具体的な手順と設計思想を共有します。

## このドキュメントが解決する課題

- Vue.js + FastAPI 構成のアプリケーションを、Dockerを使ってPaaS（Render）にデプロイする方法
- Renderの環境で頻発する、よくある落とし穴とその回避策
- テストが成功した場合にのみ自動デプロイが実行される、信頼性の高いCI/CDパイプラインの構築

## デプロイ戦略の変遷

### ❌ 失敗した戦略：2コンテナ + Nginxリバースプロキシ

当初、以下の構成を目指しました：

- フロントエンド: Vue.jsをビルドし、Nginxコンテナで静的ファイルを配信
- バックエンド: FastAPIをUvicornで実行する、別のコンテナ

**問題点：**

- 起動順序の問題：バックエンドが起動する前にフロントエンドが起動し接続エラー
- ネットワークの問題：コンテナ間の名前解決が不安定
- 設定の複雑さ：render.yaml, Dockerfile (x2), nginx.conf, entrypoint.sh など管理対象が多い

---

### ✅ 成功した戦略：単一コンテナ（FastAPIによる静的ファイル配信）

#### 構成概要

1. Dockerfile内で、まずVue.jsをビルドする（マルチステージビルド）
2. ビルドされた静的ファイル(dist)を FastAPI コンテナへコピー
3. FastAPI が `/api` では API を、その他のパスでは `dist` の静的ファイルを配信

**メリット（KISS原則）：**

- シンプル：サービスは1つ、Nginx不要
- 堅牢：起動順序や通信問題が解消
- 管理が容易：設定ファイルは Dockerfile と render.yaml の2つのみ

---

## 🛠 構築手順

### 1. ローカル環境の再構築

#### 1.1 `vite.config.ts` の最適化

```ts
// frontend/vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: resolve(__dirname, '../backend/dist'),
    emptyOutDir: true,
  },
})
```

#### 1.2 App Factoryパターンの導入 (`backend/api/main.py`)

```py
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path

def create_app(mount_static_files: bool = True) -> FastAPI:
    app = FastAPI()
    # app.include_router(...) などルーター追加

    if mount_static_files:
        dist_path = Path(__file__).parent.parent / "dist"
        if dist_path.exists():
            app.mount("/", StaticFiles(directory=dist_path, html=True), name="static")
    return app

app = create_app()
```

---

### 2. `Dockerfile` の最終形

```dockerfile
# --- ステージ1: フロントエンドのビルド ---
FROM node:20 AS frontend-builder
WORKDIR /app
COPY frontend/ ./frontend/
WORKDIR /app/frontend
RUN npm install && npm run build

# --- ステージ2: アプリケーション本体 ---
FROM python:3.11-slim
WORKDIR /app
COPY backend/ ./backend/
COPY --from=frontend-builder /app/backend/dist ./backend/dist/
RUN pip install --no-cache-dir -r backend/requirements.txt
WORKDIR /app/backend
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8686"]
```

---

### 3. Render 設定ファイル（`render.yaml`）

```yaml
services:
  - type: web
    name: my-recipes
    env: docker
    plan: free
    dockerfilePath: ./Dockerfile
    autoDeploy: false
    branch: hara_20250808_CI
    startCommand: uvicorn api.main:app --host 0.0.0.0 --port 8686
```

---

### 4. GitHub Actions による CI/CD

```yaml
# .github/workflows/ci.yml
name: CI/CD for my-recipes

on:
  push:
    branches: [ "hara_20250808_CI" ]

jobs:
  test-and-build:
    runs-on: ubuntu-latest
    steps:
      # チェックアウト、依存関係、ビルド、テスト...
      - name: Run FastAPI tests
        env:
          PYTHONPATH: ./backend
          RAKUTEN_APP_ID: ${{ secrets.RAKUTEN_APP_ID }}
        run: pytest backend/tests

  deploy-to-render:
    needs: test-and-build
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Render Deploy
        run: curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK_URL }}
```

---

## 💡 Tips & 学び

1. **Render の `$PORT` は必ず使うこと**  
   固定ポートではなく、環境変数 `$PORT` に従う必要あり。

2. **ビルドコンテキスト ≠ ローカルのファイル群**  
   `dist` を含めたビルドが必要な場合、`.gitignore` から除外してGitに含める。

3. **App Factory パターンの活用**  
   `create_app()` 関数を使うことで、テストと本番の責務を明確に分離可能。

4. **デバッグは「証拠」を見ること**  
   `RUN ls -laR` を仕込んで COPY やビルド結果を確かめるのが有効。

---

## 📘 おわりに

PaaS 環境ではまず「最小構成」で始めること。  
複雑化せず、KISS原則に従うことが最も再現性と保守性に優れた構成を実現する鍵となります。
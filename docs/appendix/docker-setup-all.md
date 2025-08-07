# Vue3 & FastAPI Docker化 完全ガイド

このドキュメントは、Vue3とFastAPIで構成されたWebアプリケーションを、Dockerを用いてコンテナ化するための完全な手順を記したものです。ホットリロード対応の**開発環境**と、Nginxリバースプロキシを採用した**本番環境**の2つの構成を構築します。

## 最終的なアーキテクチャ

* **開発環境**: フロントエンドとバックエンドがそれぞれのコンテナで起動し、ホットリロードにより快適な開発を実現します。
* **本番環境**: フロントエンドのNginxコンテナを唯一の窓口とし、APIへのリクエストは内部的にバックエンドコンテナへ転送（リバースプロキシ）することで、シンプルでセキュアな構成を実現します。

## 1. プロジェクト構成の整理

### 1.1. 目指す構成

まず、プロジェクト全体を以下のディレクトリ構成に整理します。これにより、関心事が明確に分離され、Dockerのビルド効率も向上します。

```text
my-recipes/
├── backend/
│   ├── api/
│   │   └── main.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.ts
│
├── docker-compose.yml
└── docker-compose.dev.yml
````

### 1.2. 既存構成からの移行手順

当初の混在構成から、上記の構成に移行するための考え方と具体的なコマンドです。

#### ファイル・ディレクトリの選定基準

  * **`frontend/` に移動するもの**: ブラウザで動作するUIに関連するすべて。
      * Vueのソースコード (`src/`)
      * 静的ファイル (`public/`, `index.html`)
      * Node.jsの依存関係とスクリプト (`package.json`, `package-lock.json`)
      * ViteやTypeScriptのビルド設定 (`vite.config.ts`, `tsconfig.*.json`)
  * **`backend/` に移動するもの**: サーバーサイドで動作するAPIに関連するすべて。
      * FastAPIのソースコード (`api/`)
      * Pythonの依存関係 (`requirements.txt`)
  * **ルート直下に残すもの**: プロジェクト全体に関わるもの。
      * バージョン管理設定 (`.gitignore`など)
      * ドキュメント (`README.md`など)
      * Dockerの全体設定 (`docker-compose.yml`など)

#### 具体的なコマンド

1.  **ディレクトリの作成:**

    ```bash
    mkdir frontend backend
    ```

2.  **ファイルの移動:**

    ```bash
    # フロントエンド関連のファイルを "frontend" へ移動
    mv src public index.html package.json package-lock.json vite.config.ts tsconfig*.json frontend/

    # バックエンド関連のファイルを "backend" へ移動
    mv api requirements.txt backend/
    ```

## 2\. 開発環境の構築

ホットリロードに対応した快適な開発環境を構築します。

### 2.1. 設定ファイル

#### `backend/Dockerfile`

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ./api ./api
EXPOSE 8686
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8686"]
```

#### `backend/requirements.txt`

```text
fastapi
httpx
python-dotenv
uvicorn[standard]
```

#### `backend/.env`

::: danger 注意
このファイルは`.gitignore`に追加し、Gitで管理しないでください。
:::

```env
RAKUTEN_APP_ID=ここにあなたの楽天アプリIDを入力
```

#### `frontend/Dockerfile`

```dockerfile
# --- ビルドステージ (開発/本番で共通利用) ---
FROM node:20-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- プロダクションステージ ---
FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### `frontend/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0', 
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://backend:8686',
        changeOrigin: true
      }
    }
  }
});
```

::: tip なぜこの設定が必要？

  * **`host: '0.0.0.0'`**: コンテナ外部（ホストPC）のブラウザからアクセスできるようにします。
  * **`target: 'http://backend:8686'`**: Dockerコンテナ同士はサービス名で通信します。`frontend`コンテナから`backend`コンテナへ正しくリクエストを転送するために必要です。
    :::

#### `docker-compose.dev.yml`

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
    ports:
      - "8686:8686"
    volumes:
      - ./backend:/app
    command: uvicorn api.main:app --reload --host 0.0.0.0 --port 8686
    env_file:
      - ./backend/.env

  frontend:
    build:
      context: ./frontend
      target: build-stage
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev
```

### 2.2. 起動とアクセス

  * **起動コマンド**: `docker-compose -f docker-compose.dev.yml up --build`
  * **フロントエンドURL**: `http://localhost:5173`
  * **バックエンドURL**: `http://localhost:8686/docs`

## 3\. 本番環境の構築

Nginxリバースプロキシを導入した、最適化された本番環境を構築します。

### 3.1. 設定ファイル

開発環境で作成したファイルに加え、以下の2ファイルを修正します。

#### `frontend/nginx.conf`

リバースプロキシ設定を追記します。

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # APIリクエストをバックエンドコンテナへ転送する設定
    location /api/ {
        proxy_pass http://backend:8686;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### `docker-compose.yml`

`backend`サービスのポート公開を削除し、窓口を`frontend`サービスに一本化します。

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    restart: always
    # portsセクションを削除
    command: uvicorn api.main:app --host 0.0.0.0 --port 8686
    env_file:
      - ./backend/.env

  frontend:
    build: ./frontend
    restart: always
    ports:
      - "8080:80"
```

### 3.2. 起動とアクセス

  * **起動コマンド**: `docker-compose up --build -d`
  * **アクセスURL**: `http://localhost:8080` (このURLですべて完結)

## 4\. 今後の展望

  * **CI/CDの導入**: GitHub Actionsなどを使い、デプロイを自動化する。
  * **データベースの永続化**: `volumes`を使い、データベースコンテナのデータを永続化する。

-----


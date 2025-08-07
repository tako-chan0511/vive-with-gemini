# ローカル開発環境のDocker化手順

このドキュメントは、Vite(Vue3)製のフロントエンドとFastAPI製のバックエンドから成る`my-recipes`プロジェクトを、Docker Composeを用いてローカル開発環境で起動するための手順をまとめたものです。

## なぜDocker化するのか？

* **環境の統一:** 誰が実行しても同じ環境が再現されるため、「自分のPCでは動くのに他の人のでは動かない」といった問題を防止できます。
* **セットアップの簡略化:** `node`や`python`のバージョンを気にすることなく、`docker-compose`コマンド一発で開発環境を起動できます。
* **本番環境への移行:** 開発環境と本番環境の構成を近づけることで、デプロイ時のトラブルを減らせます。

## 前提

以下のツールがインストールされていることを前提とします。

* Docker
* Docker Compose

## 1. プロジェクト構成

まず、プロジェクト全体を以下のディレクトリ構成に整理します。これにより、フロントエンドとバックエンドの関心事が明確に分離され、Dockerのビルド効率も向上します。

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

### 1.1. 既存構成からの移行手順

当初のプロジェクトは、フロントエンドとバックエンドのファイルがルートディレクトリに混在していました。それを上記の構成に整理するための考え方と手順です。

#### ファイル・ディレクトリの選定基準

  * **`frontend/` に移動するもの**: ブラウザで動作するUI（ユーザインタフェース）に関連するすべて。

      * Vueのソースコード (`src/`)
      * 静的ファイル（画像など） (`public/`, `index.html`)
      * Node.jsの依存関係とスクリプト (`package.json`, `package-lock.json`)
      * ViteやTypeScriptのビルド設定 (`vite.config.ts`, `tsconfig.*.json`)
      * エディタの設定 (`.vscode/`)

  * **`backend/` に移動するもの**: サーバーサイドで動作するAPIに関連するすべて。

      * FastAPIのソースコード (`api/`)
      * Pythonの依存関係 (`requirements.txt`)

  * **ルート直下に残すもの**: プロジェクト全体に関わるもの。

      * バージョン管理設定 (`.git/`, `.gitignore`)
      * ドキュメント (`README.md`, `docs/`)
      * Dockerの全体設定 (`docker-compose.yml`, `docker-compose.dev.yml`)

#### 具体的なコマンド

プロジェクトのルートディレクトリで以下のコマンドを順に実行します。

1.  **ディレクトリの作成:**

    ```bash
    mkdir frontend backend
    ```

2.  **ファイルの移動:**

    ```bash
    # フロントエンド関連のファイルを "frontend" へ移動
    mv src public index.html package.json package-lock.json vite.config.ts tsconfig.json tsconfig.node.json tsconfig.app.json .vscode frontend/

    # バックエンド関連のファイルを "backend" へ移動
    mv api requirements.txt backend/
    ```

## 2\. 各種設定ファイル

開発環境の起動（`docker-compose.dev.yml`）に必要なファイルです。

### バックエンド (`backend/`)

#### `backend/Dockerfile`

Python環境を構築し、FastAPIアプリケーションを起動します。

```dockerfile
# Pythonの公式イメージをベースにする
FROM python:3.11-slim

# 作業ディレクトリを設定
WORKDIR /app

# 依存関係ファイルをコピーしてインストール
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# アプリケーションコードをコピー
COPY ./api ./api

# ポート8686を公開
EXPOSE 8686

# コンテナ起動時に実行するコマンド (本番用)
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8686"]
```

#### `backend/requirements.txt`

FastAPIサーバーの実行に必要なPythonライブラリを定義します。

```text
fastapi
httpx
python-dotenv
uvicorn[standard]
```

#### `backend/.env`

APIキーなどの機密情報を環境変数として定義します。

::: danger 注意
この`.env`ファイルは、`.gitignore`に追加してGitリポジトリにコミットしないようにしてください。
:::

```env
RAKUTEN_APP_ID=ここにあなたの楽天アプリIDを入力
```

### フロントエンド (`frontend/`)

#### `frontend/Dockerfile`

`npm run dev` を実行するためのNode.js環境を定義します。（開発時は`build-stage`のみが使用されます）

```dockerfile
# --- ビルドステージ ---
FROM node:20-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# buildスクリプトを実行 (本番用)
RUN npm run build

# --- プロダクションステージ ---
FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### `frontend/vite.config.ts`

Vite開発サーバーの設定です。Dockerコンテナ内での利用にはいくつかの重要な変更点があります。

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    // コンテナ外（ホストPC）からのアクセスを許可
    host: '0.0.0.0', 
    port: 5173,
    proxy: {
      '/api': {
        // APIリクエストの転送先をDockerサービス名に変更
        target: 'http://backend:8686',
        changeOrigin: true
      }
    }
  }
});
```

::: tip なぜ設定変更が必要？

  * **`host: '0.0.0.0'`**: デフォルトの`localhost`のままだと、コンテナ内部からしかアクセスできません。`0.0.0.0`に設定することで、ホストPCのブラウザから`http://localhost:5173`でアクセスできるようになります。
  * **`target: 'http://backend:8686'`**: `docker-compose`で起動したコンテナ群は、独自のネットワークを形成します。コンテナ同士は`localhost`ではなく、`docker-compose.dev.yml`で定義した**サービス名**（今回は`backend`）で通信します。
    :::

### ルートディレクトリ

#### `docker-compose.dev.yml`

開発環境における各サービス（コンテナ）の振る舞いを定義するオーケストレーションファイルです。

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

::: tip `volumes` と `env_file`

  * **`volumes`**: ホストPCのディレクトリをコンテナ内のディレクトリに同期させます。これにより、コードを修正した際にコンテナを再起動することなく、変更が即座に反映されます（ホットリロード）。
  * **`env_file`**: 指定した`.env`ファイルの内容を、環境変数としてコンテナに渡します。
    :::

## 3\. 起動方法

プロジェクトのルートディレクトリで以下のコマンドを実行します。

```bash
docker-compose -f docker-compose.dev.yml up --build
```

  * `--build`: 初回起動時や`Dockerfile`に変更があった場合にイメージを再構築します。

## 4\. アクセス方法

コンテナ起動後、以下のURLにブラウザでアクセスします。

  * **フロントエンド画面:** `http://localhost:5173`
  * **バックエンドAPIドキュメント:** `http://localhost:8686/docs`

<!-- end list -->

```
```
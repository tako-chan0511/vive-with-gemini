# Vue 3 + Python (FastAPI) Monorepo開発環境ガイド

Vue 3 (Vite) と Python (FastAPI) を一つのリポジトリで管理し、Vercelにデプロイするための、フロントエンドとバックエンドが連携する開発環境の構築手順です。

---

## 1. 前提ツール

開発を始める前に、お使いのPCに以下のツールがインストールされていることを確認してください。

* **Node.js** (LTS版を推奨)
* **Python** (3.9以上)
* **Git**
* **VSCode**

---

## 2. プロジェクトの初期設定

まず、プロジェクトの土台となるフォルダと、Pythonの仮想環境を準備します。

1.  **プロジェクトフォルダ作成と移動**
    ```bash
    mkdir memosphere
    cd memosphere
    ```

2.  **Git初期化**
    ```bash
    git init
    ```

3.  **Python仮想環境の作成と有効化**
    ```bash
    # 仮想環境作成
    python -m venv .venv
    
    # 有効化 (Windows)
    .venv\Scripts\activate
    
    # 有効化 (Mac/Linux)
    source .venv/bin/activate
    ```

4.  **.gitignoreの作成**
    不要なファイルがGitに登録されないように、`.gitignore`ファイルを作成して以下の内容を記述します。
    ```gitignore
    # .gitignore

    # Python
    .venv/
    __pycache__/
    *.pyc

    # Node.js
    node_modules/
    dist/
    .DS_Store

    # Editor
    .vscode/

    # Env
    .env
    ```

---

## 3. バックエンド (FastAPI) の設定

次に、APIサーバーを準備します。

1.  **`requirements.txt`の作成**
    必要なPythonライブラリを定義します。
    ```text
    # requirements.txt
    fastapi
    uvicorn[standard]
    sqlalchemy
    psycopg2-binary
    python-dotenv
    ```
2.  **ライブラリのインストール**
    ```bash
    pip install -r requirements.txt
    ```
3.  **APIフォルダとファイルの作成**
    Vercelの作法に従い、プロジェクトルートに`api`フォルダを作成し、その中に`index.py`を作成します。
    
    **`api/index.py`**:
    ```python
    from fastapi import FastAPI
    # from api.routers import memos # ←後で機能追加時に利用

    app = FastAPI()
    
    # app.include_router(memos.router) # ←後で機能追加時に利用
    ```

---

## 4. フロントエンド (Vue 3) の設定

画面側のアプリケーションを準備します。

1.  **Vueプロジェクト作成**
    プロジェクトルートで以下のコマンドを実行し、`frontend`フォルダを作成します。
    ```bash
    npm create vite@latest frontend -- --template vue-ts
    ```
2.  **依存関係インストール**
    ```bash
    cd frontend
    npm install
    ```
3.  **開発サーバーのプロキシ設定**
    ローカル開発時にAPIリクエストをバックエンドに転送するための設定です。
    
    **`frontend/vite.config.ts`**:
    ```typescript
    import { defineConfig } from 'vite'
    import vue from '@vitejs/plugin-vue'

    export default defineConfig({
      plugins: [vue()],
      server: {
        proxy: {
          '/api': {
            target: '[http://127.0.0.1:8000](http://127.0.0.1:8000)', // ローカルFastAPIサーバー
            changeOrigin: true,
          }
        }
      }
    })
    ```

---

## 5. ローカルでの開発ワークフロー

開発中は、バックエンドとフロントエンド、**2つのサーバーを同時に起動**する必要があります。VSCodeのターミナルを2つ開いて、それぞれで実行します。

* **ターミナル1（バックエンド用）**
    プロジェクトルートで実行します。
    ```bash
    uvicorn api.index:app --reload
    ```
* **ターミナル2（フロントエンド用）**
    `frontend` ディレクトリに移動して実行します。
    ```bash
    cd frontend
    npm run dev
    ```

---

## 6. デプロイ設定 (Vercel)

作成したアプリをVercelにデプロイするための設定です。

1.  **リポジトリ名を統一**
    Vercelの命名規則（小文字のみ）に合わせて、GitHubリポジトリ名やローカルのフォルダ名を`memosphere`のように小文字に統一します。

2.  **`vercel link`コマンド実行**
    ターミナルで`vercel link`を実行し、対話形式で以下のように設定します。
    * **Project name**: `memosphere` （小文字）
    * **Directory with code**: `frontend`

3.  **環境変数の設定**
    Vercelのプロジェクト設定画面の「Environment Variables」で、`.env`ファイルに記載した`DATABASE_URL`や`SUPABASE_KEY`などを設定します。

---

## Tips & トラブルシューティング

### `requirements.txt`の文字コードエラー
* **症状**: `pip install -r requirements.txt`実行時に`UnicodeDecodeError`が発生する。
* **原因**: ファイルが`UTF-8`形式で保存されていない。
* **解決策**:
    1.  VSCodeの右下ステータスバーからエンコーディングを確認し、「エンコード付きで保存」→「UTF-8」で保存し直す。
    2.  **（推奨）** ライブラリを直接インストールした後、`pip freeze > requirements.txt`コマンドでファイルを自動生成する。この方法はバージョンも固定され、最も確実です。

### APIリクエストが応答なし（ペンディング）になる
* **症状**: ブラウザでAPIのURLにアクセスしても画面が真っ白で、ネットワークタブではリクエストが完了しない。
* **原因**: バックエンドサーバー（FastAPI/uvicorn）が起動していない。
* **解決策**: フロントエンド（Vite）とバックエンド（uvicorn）の**両方のサーバーが、別々のターミナルで起動しているか**確認する。

### Vercelのプロジェクト名でエラー
* **症状**: `vercel link`実行時にプロジェクト名に関するエラーが出る。
* **原因**: Vercelのプロジェクト名に大文字が含まれている。
* **解決策**: プロジェクト名をすべて小文字にする（例: `memoSphere` → `memosphere`）。
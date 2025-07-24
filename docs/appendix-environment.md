# 付録：環境構築ガイド

このページでは、「AIマーケットアナリスト」のようなVue3 + Vite + Vercel Functions構成のプロジェクトをゼロから立ち上げるための、具体的な手順を解説します。

---
## 1. 前提条件

-   [Node.js](https://nodejs.org/) (LTS版) がインストールされていること
-   [VSCode](https://code.visualstudio.com/) などのコードエディタがインストールされていること
-   [GitHub](https://github.com/)のアカウントを持っていること
-   [Vercel](https://vercel.com/)のアカウントをGitHub連携で作成していること

---
## 2. 構築ワークフロー

### フェーズ1：ローカル環境のセットアップ

1.  **Vite + Vue3プロジェクト作成**
    * PC上にプロジェクト用の空のフォルダを作成し、VSCodeで開きます。
    * VSCodeのターミナルで以下のコマンドを実行し、Vue3+TypeScriptのプロジェクトを作成します。
        ```bash
        npm create vite@latest . -- --template vue-ts
        npm install
        ```

2.  **ローカルGitリポジトリの初期化**
    * 同じターミナルで、Gitリポジトリを作成し、最初のコミットを行います。
        ```bash
        git init
        git add .
        git commit -m "Initial commit"
        ```

3.  **テスト環境 (Vitest) のセットアップ**
    * TDDを実践するため、テストフレームワーク`Vitest`と関連ライブラリをインストールします。
        ```bash
        npm install -D vitest @vitest/ui happy-dom @vue/test-utils
        ```
    * `vite.config.ts`を編集し、Vitestの設定を追加します。（`defineConfig`のインポート元を`vitest/config`に変更するのがポイントです）
        ```typescript
        import { defineConfig } from 'vitest/config'
        import vue from '@vitejs/plugin-vue'

        export default defineConfig({
          plugins: [vue()],
          test: {
            globals: true,
            environment: 'happy-dom',
          },
        })
        ```
    * `package.json`の`scripts`に、テスト実行用のコマンドを追加します。
        ```json
        "scripts": {
          "dev": "vite",
          "build": "vue-tsc -b && vite build",
          "preview": "vite preview",
          "test": "vitest",
          "test:ui": "vitest --ui"
        },
        ```

4.  **プロジェクト固有の設定**
    * ここから、私たちの「AIマーケットアナリスト」を開発するために必要な、具体的な設定を追加していきます。

    #### **`vite.config.ts` (ローカル開発用プロキシ設定)**
    ローカル開発中に、フロントエンドから`/api/`へのリクエストをバックエンドのVercel Functionsへ転送し、CORSエラーを回避するために、以下のプロキシ設定を追加します。

    ```typescript
    import { defineConfig } from 'vitest/config'
    import vue from '@vitejs/plugin-vue'

    export default defineConfig({
      plugins: [vue()],
      // Vitestの設定と共存させる
      test: {
        globals: true,
        environment: 'happy-dom',
      },
      server: {
        proxy: {
          '/api': {
            // ローカルでVercel Functionsを動かす際のデフォルトポート
            target: 'http://localhost:3000', 
            changeOrigin: true,
          },
        },
      },
    })
    ```

    #### **`tsconfig.json` (パスエイリアスの設定)**
    コード内で`@/components/`のようなきれいなパスを使えるように、`compilerOptions.paths`を設定します。

    ```json
    {
      "compilerOptions": {
        // ... 他の設定 ...
        "paths": {
          "@/*": ["./src/*"]
        }
      },
      // ...
    }
    ```

### フェーズ2：GitHubとの連携

1.  **リモートリポジトリの作成**
    * GitHubにアクセスし、新しいリポジトリを作成します。（リポジトリ名はプロジェクトに合わせてください）

2.  **ローカルとリモートの連携**
    * 作成したGitHubリポジトリのページに表示されるコマンドを参考に、ローカルリポジトリにリモート接続先を追加します。
        ```bash
        git remote add origin [https://github.com/あなたのユーザ名/リポジトリ名.git](https://github.com/あなたのユーザ名/リポジトリ名.git)
        git branch -M main
        git push -u origin main
        ```

### フェーズ3：Vercelとの連携と設定

1.  **Vercel CLIのインストールとログイン**
    * まだインストールしていない場合は、以下のコマンドでVercel CLIを導入し、ログインします。
        ```bash
        npm install --global vercel
        vercel login
        ```

2.  **プロジェクトのリンク**
    * ローカルのプロジェクトとVercel上のプロジェクトを連携させます。
        ```bash
        vercel link
        ```
    * `Link to existing project?` には `n` (No) と答え、新しいプロジェクト名を設定します。

3.  **APIキーの管理**
    * プロジェクトのルートに `.env.local` ファイルを作成し、ローカル開発用のAPIキーを記述します。（このファイルは`.gitignore`に含まれているため、Gitにはアップロードされません）
        ```
        GEMINI_API_KEY="ここにあなたのAPIキー"
        ```
    * Vercelの本番環境にAPIキーを登録し、ローカルに設定を同期させます。
        ```bash
        vercel env add GEMINI_API_KEY
        vercel pull
        ```

4.  **Vercel用設定ファイルの作成**
    * 本番環境でAPIルートを正しく処理するため、プロジェクトのルートに`vercel.json`を作成します。

    **`vercel.json`**
    ```json
    {
      "rewrites": [
        {
          "source": "/api/:path*",
          "destination": "/api/:path*"
        }
      ]
    }
    ```

### フェーズ4：開発とデプロイ

1.  **ローカルでの開発**
    * `vercel dev`コマンドで開発サーバーを起動します。`http://localhost:3000`で動作確認をしながら開発を進めます。

2.  **本番環境へのデプロイ**
    * 変更内容をコミットし、GitHubにプッシュすることで、Vercelが自動的にデプロイを開始します。
        ```bash
        git add .
        git commit -m "変更内容のメッセージ"
        git push
        
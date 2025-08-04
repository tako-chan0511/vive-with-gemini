# 🛠 VSCode + Backlog + TortoiseGit 環境設定と利用Tipsまとめ

## ✅ 前提条件

* Backlog アカウントとプロジェクトが作成済み
* Git リポジトリが Backlog 上に存在
* 以下ツールがインストール済み：

  * Visual Studio Code
  * Git for Windows
  * TortoiseGit
  * （任意）PuTTY + Pageant（SSH鍵利用時）

---

## 🪪 1. Backlog での Git URL の確認

1. Backlog の対象プロジェクトを開く
2. 上部メニューから「Git」 > 対象リポジトリ名をクリック
3. 表示された Git リポジトリ URL（HTTPS または SSH）をコピー

例：

```
HTTPS: https://yourspace.backlog.jp/git/yourproject/yourrepo.git
SSH:    git@yourspace.backlog.jp:/yourproject/yourrepo.git
```

---

## 🧷 2. TortoiseGit でクローン

1. 任意のフォルダで右クリック > `Git Clone...`
2. URL に Backlog の Git URL を貼り付け
3. ディレクトリを指定
4. 認証設定（HTTPS: ユーザ＋APIキー or パスワード / SSH: Pageant）
5. クローン成功後、右クリックで通常の Git 操作可能

---

## 🖥 3. VSCode で開発を開始

1. VSCode を起動し、クローン済みフォルダを開く
2. Git 機能（左バー）を使ってコミット・プッシュなどが可能
3. 拡張機能：

   * GitLens: コミット履歴可視化
   * Backlog for VSCode: Issue連携可能（別途設定）

---

## 🔐 4. 認証の注意点

### ✅ HTTPS の場合

* Backlog の「ユーザID + パスワード」または「APIキー」
* APIキーは「個人設定 > API > 発行」から取得

### ✅ SSH の場合（推奨）

1. ローカルで SSH 鍵を作成（ssh-keygen or PuTTYgen）
2. 公開鍵を Backlog の「個人設定 > SSH公開鍵」に登録
3. 秘密鍵を Pageant に登録し常駐

---

## 💡 Tips & トラブル対応

| 症状                   | 対策                                           |
| -------------------- | -------------------------------------------- |
| push 時に 403 エラー      | HTTPS 認証情報の誤り。APIキーの使用を推奨                    |
| SSH 接続できない           | 鍵の形式が OpenSSH or PuTTY か確認。Pageant が起動しているか？ |
| コミットユーザー名が不一致        | `git config user.name` などで再設定                |
| VSCode で Git 操作ができない | VSCode 側に Git パスが通っているか確認                    |

---

## 🚀 応用編：Backlog CLI / API 連携

### 🧩 backlog-cli

* コマンドラインで課題作成や一覧取得が可能
* GitHub: [https://github.com/nulab/backlog-cli](https://github.com/nulab/backlog-cli)

例：

```sh
backlog issue list -p <プロジェクトID>
backlog issue create -p <プロジェクトID> -s Bug -t "バグ修正"
```

### 🔗 Backlog API

* REST API によってチケット、Wiki、ファイル等の操作が可能
* ドキュメント: [https://developer.nulab.com/ja/docs/backlog/api/](https://developer.nulab.com/ja/docs/backlog/api/)

#### 主な用途：

* CI/CD 連携（GitHub ActionsやVercelからチケット更新）
* 自動レポート生成
* 課題テンプレートの作成スクリプト

---

## 📁 よく使うファイル構成例（TypeScript → Pythonリファクタリング後）

```
my-recipes/
├── .gitignore
├── .env
├── api/              ← FastAPIエンドポイント
│   ├── main.py
│   ├── get_categories.py
│   └── recipe_ranking.py
├── public/
├── src/              ← Vue3 アプリケーション
│   ├── App.vue
│   └── components/
├── dist/             ← Vercel 自動生成（Gitには含めない）
├── vite.config.ts
└── vercel.json
```

---

## 🔚 まとめ

| ツール         | 役割                   |
| ----------- | -------------------- |
| VSCode      | 開発・編集                |
| Git         | バージョン管理              |
| TortoiseGit | GUI Git クライアント       |
| Backlog     | プロジェクト管理 + Gitホスティング |
| Vercel      | 静的／API デプロイ先         |

今後 CI/CD や自動化の拡張を考えるなら Backlog API の活用は非常に有効です。


# 🔐 Git連携におけるSSH鍵の概要と主要ツールでの設定方法

## 📘 概要：SSH鍵認証とは？

SSH（Secure Shell）鍵認証は、Gitリポジトリへの安全なアクセス方法の1つです。
パスワードではなく「秘密鍵」と「公開鍵」のペアを使用して認証します。

- **公開鍵（public key）**：リモート（Backlogなど）に登録する
- **秘密鍵（private key）**：ローカル環境で保持。絶対に漏洩厳禁

---

## 🔧 1. SSH鍵の生成

```bash
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
# 保存先例: ~/.ssh/id_rsa（秘密鍵）と ~/.ssh/id_rsa.pub（公開鍵）
```

---

## 🖥️ 2. VSCode でのSSH設定

### 🔹設定方法

1. **拡張機能**：「Remote - SSH」などをインストール
2. **`.ssh/config` に設定追加**（例：`~/.ssh/config`）

```bash
Host backlog
  HostName yourteam.backlog.jp
  User git
  IdentityFile ~/.ssh/id_rsa
  IdentitiesOnly yes
```

3. Git操作（pull/push）時に自動で秘密鍵が使用される

---

## 🧰 3. TortoiseGitでの設定

### 🔹秘密鍵の登録

1. `PuTTYgen` で秘密鍵を `.ppk` に変換（必要に応じて）
2. TortoiseGit → Settings → Git → Remote → `Putty/SSH`
3. SSH client: `TortoisePlink.exe` を指定
4. 「Load Putty Key」欄に `.ppk` ファイルを指定

---

## 🚀 4. Backlog への公開鍵の登録

1. Backlogにログイン → [個人設定] → [SSH公開鍵]
2. 公開鍵（`id_rsa.pub` の中身）を貼り付けて登録

※複数鍵の管理も可能。用途ごとに命名して管理するとよい

---

## 📁 5. 鍵ファイルの管理ベストプラクティス

| 種類     | 推奨配置                          | 備考 |
|--------|-------------------------------|------|
| 秘密鍵   | `~/.ssh/id_rsa` などローカル専用     | `.gitignore`で管理外にする |
| 公開鍵   | `~/.ssh/id_rsa.pub` + Backlogに登録 | チーム共有は社内Wikiなどで |
| config | `~/.ssh/config`               | 接続先の別名定義など        |

---

## ⚠️ セキュリティTips

- **秘密鍵は絶対に共有しない**
- **`.ssh/` や鍵ファイルは `.gitignore` に含める**
- 鍵を分けて管理したい場合、プロジェクト別に `~/.ssh/xxx_id_rsa` を設定し、`config`で切替可能

---

## 🔄 応用：プロジェクトごとに鍵を使い分けたいとき

```bash
Host backlog-projectA
  HostName projectA.backlog.jp
  IdentityFile ~/.ssh/id_rsa_projectA

Host backlog-projectB
  HostName projectB.backlog.jp
  IdentityFile ~/.ssh/id_rsa_projectB
```

---

## ✅ まとめ

| ツール         | 秘密鍵の設定方法                           | 公開鍵の登録場所              |
|--------------|---------------------------------------|---------------------------|
| VSCode       | `.ssh/config` or システム標準               | Backlogユーザー設定画面       |
| TortoiseGit  | `.ppk`形式でGUI設定                         | Backlogユーザー設定画面       |
| CLI (Git Bash) | `ssh-agent` or `~/.ssh/config`         | Backlogユーザー設定画面       |

---

## 💡補足：Backlog CLIやAPIとの連携

- [backlog-cli](https://github.com/nulab/backlog-cli) を使えば、Issue連携・コメント・CI連携なども可能
- `.backlogrc` に設定を書いてCLIからIssue管理可能

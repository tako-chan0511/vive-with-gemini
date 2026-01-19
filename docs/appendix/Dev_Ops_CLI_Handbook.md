## 1 Linuxフルサイクル開発：全体像

![LD1.Linuxフルサイクル開発ーCLIを武器にDevからOpsを制御する実務手引き](/images/gamehub/LD1.Linuxフルサイクル開発ーCLIを武器にDevからOpsを制御する実務手引き.jpg)

### 要点

* CLI を主武器にして、Dev（開発）〜Ops（運用）を同じ流儀で回す
* WSL2 + VSCode を起点に「調査・自動化・運用」を一気通貫にする

### 初心者向け解説

GUI での操作は速そうに見えて、再現性（同じ手順をもう一度）が弱く、チーム共有もしづらいです。CLI は **履歴・スクリプト化・Git 管理**で「資産化」しやすいのが強みです。
この資料は「現場で使える CLI を、作業フロー（探索→自動化→運用）として使い倒す」ことがテーマです。

---

## 2 なぜCLIか：再現性・共通言語・速度

![LD2.DevとOpsの境界を超える武器＝CLI](/images/gamehub/LD2.DevとOpsの境界を超える武器＝CLI.jpg)

### 要点

* **再現性**：手順をスクリプト化して資産にできる
* **共通言語**：WSL2（ローカル）→ Cloud（AWS/Azure 等）でも同じ発想
* **速度**：GUIの待ち時間を減らし、思考速度で操作できる
* フルサイクルの範囲：①環境構築 ②探索 ③自動化 ④ネットワーク ⑤可観測性 ⑥IaC

### コマンド例（まずは「思考を止めない」基本）

```bash
# 現在地
pwd

# 目的の場所へ（ディレクトリ移動）
cd ~/projects

# まず一覧を見る
ls -la
```

---

## 3 WSL2最適化：.wslconfig（リソース枯渇を防ぐ）

![LD3.WSL2最適化：リソース枯渇を防ぐ（.wslconfig）](/images/gamehub/LD3.WSL2最適化：リソース枯渇を防ぐ（.wslconfig）.jpg)

### 要点

* WSL2 は「軽量VM」なので、放置するとメモリを掴み続けることがある（Memory Hog）
* **.wslconfig で CPU/メモリ上限を設定**して安定化
* I/O は **Linux 側（`~/`）に置く**のが基本（`/mnt/c` は遅くなりがち）
* 設定反映には `wsl --shutdown` が必要

### 設定例（Windows側：`%UserProfile%\.wslconfig`）

```ini
[wsl2]
memory=4GB
processors=2
swap=0
```

### 反映（PowerShell）

```powershell
wsl --shutdown
```

### 初心者向けポイント

* 「遅い」「VSCodeが重い」「ビルドが突然止まる」の原因が **WSL2のリソース飽和**のことがあります。まず上限を決めて安定させると切り分けが楽です。

---

## 4 最強の基盤：.bashrc とパッケージ管理

![LD4.最強の基盤づくり：.bashrcとパッケージ管理](/images/gamehub/LD4.最強の基盤づくり：.bashrcとパッケージ管理.jpg)

### 要点

* 履歴は資産：`HISTSIZE` / `HISTFILESIZE` を増やす、重複を抑止
* apt は定期的に掃除（`autoremove`）
* Docker は「Docker Desktop 以外（Engine直）」も選択肢（軽量化）

### 例：履歴設定（`~/.bashrc`）

```bash
export HISTSIZE=10000
export HISTFILESIZE=20000
export HISTCONTROL=ignoreboth  # 先頭スペース行 + 重複を抑止（環境で挙動差あり）
source ~/.bashrc
```

### apt の整理

```bash
sudo apt update
sudo apt upgrade -y
sudo apt autoremove -y
```

---

## 5 高速検索：grep を超える rg（ripgrep）

![LD5.高速検索：Grepを超えるrg（ripgrep）](/images/gamehub/LD5.高速検索：Grepを超えるrg（ripgrep）.jpg)

### 要点

* Rust製で高速、並列処理
* `.gitignore` を自動尊重（node_modules 等を無視しやすい）
* 出力が見やすい（色、行番号）

### よく使う例

```bash
# "Error" を検索（まずこれ）
rg "Error"

# ファイル名だけ出す（-l）
rg -l "TODO"

# 特定拡張子だけ（-t）
rg "import" -t py

# 大文字小文字：賢く（--smart-case）
rg --smart-case "error"
```

---

## 6 移動と絞り込み：zoxide（z）& fzf

![LD6.思考の速度でいどうするfzf＆zoxide](/images/gamehub/LD6.思考の速度でいどうするfzf＆zoxide.jpg)

### 要点

* `zoxide`：履歴学習する次世代 `cd`（例：`z pro` で projects へ）
* `fzf`：対話的なあいまい検索（パイプライン途中で候補選択）

### セットアップ例（bash）

```bash
# zoxide
eval "$(zoxide init bash)"

# fzf（導入済みなら不要。未導入なら apt などで導入）
# sudo apt install -y fzf
```

### 使い方例

```bash
# zoxide：過去に行った場所へ学習ジャンプ
z pro

# fzf：プロセスを選んで kill（例）
ps -ef | fzf
```

---

## 7 可視化：tree（構造）& bat（中身）

![LD7.可視化：構造と中身を瞬時に把握tree＆bat](/images/gamehub/LD7.可視化：構造と中身を瞬時に把握tree＆bat.jpg)

### 要点

* `tree`：ディレクトリ構造を一瞬で把握（巨大リポジトリは深さ制限）
* `bat`：`cat` の上位互換（行番号・シンタックスハイライト・Git差分表示）

### 例

```bash
# 2階層まで、node_modules除外
tree -L 2 -I "node_modules"

# ファイルを見やすく表示（行番号・色）
bat src/main.py
```

---

## 8 演習：探索と可視化の基本（rg→fzf→bat）

![LD8.演習：探索と可視化の基本](/images/gamehub/LD8.演習：探索と可視化の基本.jpg)

### ミッション（やること）

1. カレント配下の `.log` を探す
2. そこから `ERROR` を含む行を探す
3. `fzf` で選び、プレビューで `bat` 表示

### 解答例（ワンライナー）

```bash
rg "ERROR" -l --glob "*.log" \
  | fzf --preview 'bat --color=always {}'
```

### 初心者向け補足

* `rg ... -l` は「該当した **ファイル名だけ**」出します
* `|`（パイプ）は「左の出力を右へ渡す」
* `fzf --preview ...` は「選択中の対象を右側にプレビュー」する機能です

---

## 9 手順書を捨てる：Shell Script（繰り返しは自動化）

![LD9.手順書を捨て、スクリプトを残そう（ShellScript）](/images/gamehub/LD9.手順書を捨て、スクリプトを残そう（ShellScript）.jpg)

### 要点

* 3回以上繰り返す作業はスクリプト化（ただし壊れやすいので「安全装置」必須）
* ベストプラクティス：`set -e`、引数チェック、実行権限

### 例：安全寄りテンプレ

```bash
#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-}"
if [[ -z "$TARGET_DIR" ]]; then
  echo "Usage: $0 <directory>" >&2
  exit 1
fi

tar -czf backup.tar.gz "$TARGET_DIR"
echo "Backup completed."
```

### 実行権限

```bash
chmod +x backup.sh
./backup.sh ./mydir
```

---

## 10 自動化のエンジン：Cron & Makefile

![LD10.自働化のエンジン：Cron＆Makefile](/images/gamehub/LD10.自働化のエンジン：Cron＆Makefile.jpg)

### 要点

* Cron：時間起動（バックアップ・ローテ等）
* Makefile：タスクランナー（プロジェクトの定型作業を `make xxx` で統一）
* Cron はログインシェルと環境が違う → **フルパス・環境変数・ログ出し**が重要

### Cron例

```bash
crontab -e
# 毎日2時に実行（ログも残す）
0 2 * * * /home/user/scripts/backup.sh >> /home/user/logs/backup.log 2>&1
```

### Makefile例

```makefile
.PHONY: backup deploy

backup:
	@echo "Starting backup..."
	./scripts/backup.sh ./data

deploy:
	@echo "Deploying..."
	./scripts/deploy.sh
```

---

## 11 演習：自動化の第一歩（logger.sh + Makefile）

![LD11.演習：自働化の第一歩](/images/gamehub/LD11.演習：自働化の第一歩.jpg)

### ミッション

1. 現在時刻をファイルに追記する `logger.sh` を作る
2. `Makefile` を作り `make log` で起動
3. 実行のたびに追記されることを確認

### 解答例

**logger.sh**

```bash
#!/usr/bin/env bash
set -euo pipefail
date >> execution.log
```

**Makefile**

```makefile
.PHONY: log
log:
	@chmod +x ./logger.sh
	@./logger.sh
```

---

## 12 接続確認のアーミーナイフ：curl

![LD12.接続確認のアーミーナイフ（Curl）](/images/gamehub/LD12.接続確認のアーミーナイフ（Curl）.jpg)

### 要点

* curl は「DLツール」ではなく通信診断の基本
* `-I`（ヘッダだけ）/ `-L`（リダイレクト追従）
* `-w`（時間計測）で DNS/TCP/TLS のどこが遅いかを見る

### 例

```bash
# リダイレクト追従 + ヘッダ確認
curl -IL https://google.com

# レイテンシ内訳（DNS/TCP/TLSなど）を表示
curl -o /dev/null -s -w \
'DNS:%{time_namelookup}s Connect:%{time_connect}s TLS:%{time_appconnect}s Start:%{time_starttransfer}s Total:%{time_total}s\n' \
https://example.com
```

---

## 13 見えない線を見る：dig / ss / nc

![LD13.見えない線を見る：DNSとポート（digとss）](/images/gamehub/LD13.見えない線を見る：DNSとポート（digとss）.jpg)

### 要点

* `dig`：DNSの正しさを見る（名前解決ミスはまずここ）
* `ss`：待ち受けポート/接続状態を見る（`netstat`の後継）
* `nc`：TCP/UDP疎通テスト

### 例

```bash
# DNS確認（IPだけ）
dig +short example.com

# 待ち受けポート一覧（TCP）
ss -lntp

# 疎通（TCP）
nc -vz example.com 443
```

---

## 14 演習：トラブルシューティング入口（DNS→TCP→HTTP）

![LD14.演習：トラブルシューティングの入口](/images/gamehub/LD14.演習：トラブルシューティングの入口.jpg)

### ミッション例

1. 目的サイトのIPを `dig` で調べる
2. そのIPへ `nc` で 80/443 の接続確認
3. `curl -I` でHTTPヘッダ確認（サーバ側か、ネットワークか切り分け）

### 解答例

```bash
dig +short google.com
nc -vz google.com 443
curl -I https://google.com
```

### 初心者向け補足

* **DNSで失敗**：ドメインが引けない（設定/ネットワーク/DNS障害）
* **TCPで失敗**：FW/セキュリティグループ/経路
* **HTTPで失敗**：アプリ/リバプロ/証明書/設定

---

## 15 システムの声を聞く：journalctl

![LD15.システムの声を聞く（journalctl）](/images/gamehub/LD15.システムの声を聞く（journalctl）.jpg)

### 要点

* Linuxの標準サービスログは systemd/journal に集約されがち
* 動かない時はまずログ（リアルタイム追尾 `-f`）
* `-u` でサービス指定、`--since` で時間絞り込み

### 例

```bash
# nginx のログ追尾
sudo journalctl -u nginx -f

# 直近1時間
sudo journalctl --since "1 hour ago"

# 直近100行
sudo journalctl -n 100
```

---

## 16 構造化ログを制する：jq

![LD16.構造化ログを制する（jq）](/images/gamehub/LD16.構造化ログを制する（jq）.jpg)
### 要点

* JSONログが標準になりつつある → `jq` は必須級
* Pretty print と抽出（select/filter）
* `-r`（Raw）でダブルクォート無し出力

### 例

```bash
# 整形表示
cat app.log | jq '.'

# status が error のものだけ
cat app.log | jq 'select(.status=="error")'

# message だけ（raw出力）
cat app.log | jq -r '.message'
```

---

## 17 演習：ログからの事象特定（status==500 を抽出）

![LD17.演習：ログからの事象特定](/images/gamehub/LD17.演習：ログからの事象特定.jpg)
### ミッション

1. `access.json` を作り、200/500 を混在させる
2. `jq` で `status==500` だけ抽出する

### 解答例

```bash
cat > access.json << 'EOF'
[
  {"status":200,"path":"/"},
  {"status":500,"path":"/api"}
]
EOF

cat access.json | jq '.[] | select(.status==500)'
```

---

## 18 IaC & CI/CD：手動オペから卒業（ClickOpsはアンチパターン）

![LD18.IacとCICD：手動オペレーションからの卒業](/images/gamehub/LD18.IacとCICD：手動オペレーションからの卒業.jpg)

### 要点

* ClickOps（画面ポチポチ）は再現性が弱く、ドリフト（設定差分）を生む
* IaC（Terraform/CDK 等）で **コード管理 + レビュー + 自動テスト + 自動デプロイ**へ

### 実務に落とす観点

* 変更は PR でレビューできる状態にする
* “誰が・いつ・何を変えたか” を Git で追えるようにする

---

## 19 CI/CD に組み込む：Pipeline の基本形

![LD19.CICDパイプラインに組み込む](/images/gamehub/LD19.CICDパイプラインに組み込む.jpg)

### 要点

* 「私の環境では動いた」を潰す：コードもインフラも自動チェック
* 流れ例：Push → Validate → Plan → Review → Apply
* 典型コマンド（Terraform例）：`fmt` / `validate` / `plan`

### 例

```bash
terraform fmt -check
terraform validate
terraform plan
```

---

## 20 演習：コードとしてのインフラ検証（terraform fmt）

![LD20.演習：コードとしてのインフラ検証](/images/gamehub/LD20.演習：コードとしてのインフラ検証.jpg)

### ミッション

1. わざとフォーマットを崩した `main.tf` を作る
2. `terraform fmt` で自動修正されることを確認
3. “保存→フォーマット→検証” を開発ループに組み込む

### 解答例

```bash
terraform fmt
terraform validate
```
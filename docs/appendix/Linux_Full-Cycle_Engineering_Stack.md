# 1.VSCODE+WSL2+Cloud-Linuxフル活用ガイド

![L1.VSCODE+WSL2+Cloud-Linuxフル活用ガイド](/images/gamehub/L1.VSCODE+WSL2+Cloud-Linuxフル活用ガイド.jpg)

## このページの主旨

表紙は「VSCode + WSL2 + Cloud: Linuxフル活用ガイド」。ローカル開発（VSCode/WSL2）を中心に、Git/Docker/CLI、さらに Vercel/Supabase/Upstash のようなマネージドサービスまで含めて、**“作って終わり”ではなく運用まで面倒を見るフルサイクル**の技術スタックを俯瞰しています。

## 実務に落とす要点（CLI観点）

* **VSCode + WSL2**：開発端末の“Linux化”で、クラウド運用と同じ作法（bash/ssh/curl/log）を日常化する。
* **bash / make**：作業を「再現可能なコマンド」にして資産化（後続の CI/CD につながる）。
* **git / docker**：変更管理と実行環境の固定化で、ローカルと本番の差異を潰す。

## 例：WSL2を“開発OS”として使う最低限の習慣

```bash
# どのディストリが動いているか
wsl.exe -l -v

# Linux側の環境確認
uname -a
lsb_release -a || cat /etc/os-release

# 開発物は原則 Linux ホーム配下へ
mkdir -p ~/work && cd ~/work
```

---

# 2.なぜ今Linux環境の進化が必要なのか

![L2.なぜ今Linux環境の進化が必要なのか](/images/gamehub/L2.なぜ今Linux環境の進化が必要なのか.jpg)

## このページの主旨

「なぜ Linux環境の深化が必要なのか」。Traditional Dev から Full-Cycle Engineer への移行において、**Linux/CLI Mastery** が中心スキルになる、というメッセージです。

## 重要ポイント（現場で効く順）

1. **フルサイクルへの進化**
   コードだけでなく、インフラ・デプロイ・監視・運用（障害調査）まで扱う。
2. **クラウドの操作盤**
   Vercel/Supabase 等の運用は UI もあるが、最終的に CLI（curl/ssh/log/trace）で詰める。
3. **生産性のボトルネック解消**
   例：WSL2 I/O、検索・移動の遅さ、ログ調査の非効率をコマンドで解消する。

## 例：クラウド障害調査に直結する“Linuxの作法”

```bash
# まず疎通（HTTP）
curl -sS -o /dev/null -w "%{http_code}\n" https://example.com

# DNS を疑う
dig example.com +short

# TCP/ポートを疑う
nc -zv example.com 443
```

---

# 3.Phase1-基盤の最適化（WSL2PerformanceTuning）

![L3.Phase1-基盤の最適化（WSL2PerformanceTuning）](/images/gamehub/L3.Phase1-基盤の最適化（WSL2PerformanceTuning）.jpg)

## このページの主旨（Phase 1: WSL2 Performance Tuning）

WSL2 の性能最適化。特に **/mnt/c 配下は I/O が遅くなりやすい**ため、プロジェクトを **Linux側（~/home 配下）** に置くのが基本、という話です。また `.wslconfig` で WSL2 のリソース配分を調整します。

## 実務での結論

* Gitリポジトリや node_modules / venv が絡む開発は、**/mnt/c（Windows FS）に置くと遅い**
  → `~/work` など Linux側へ移動
* `.wslconfig` は **WSL2全体** の CPU/メモリ/Swap を制御する（Windows側のユーザーディレクトリ配下に置くのが一般的）

## 例：遅さの切り分け（置き場所が原因か確認）

```bash
# Windows側: /mnt/c（遅くなりがち）
cd /mnt/c/work/myrepo
time find . -maxdepth 3 -type f >/dev/null

# Linux側: ~/work（速いことが多い）
cd ~/work/myrepo
time find . -maxdepth 3 -type f >/dev/null
```

## 例：プロジェクトを Linux側へ移す（安全なやり方）

```bash
# Windows側にあるrepoを Linux側へコピー（初回のみ）
mkdir -p ~/work
rsync -a --info=progress2 /mnt/c/work/myrepo/ ~/work/myrepo/

cd ~/work/myrepo
git status
```

---

# 4.Phase2-高速化する検索と移動（ModernCLI-SPEED＆Navigation）

![L4.Phase2-高速化する検索と移動（ModernCLI-SPEED＆Navigation）](/images/gamehub/L4.Phase2-高速化する検索と移動（ModernCLI-SPEED＆Navigation）.jpg)

## このページの主旨（Phase 2: Speed & Navigation）

従来の `grep/find/cd` を、Rust系のモダンツールで置換して速度と体験を改善：

* `rg`（ripgrep）: 爆速検索、.gitignore考慮
* `fzf` : 履歴・候補からのあいまい検索
* `zoxide` : “賢い cd”（学習型ジャンプ）

## 導入（Ubuntu/WSL2想定）

```bash
sudo apt update
sudo apt install -y ripgrep fzf

# zoxide は公式手順が推奨（配布形態が複数あるため）
# 例（curlインストーラ方式の一例）:
# curl -sS https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | bash
```

## rg（ripgrep）例：現場で使う形

```bash
# 文字列検索（配下まるごと）
rg "TODO" .

# 拡張子を絞る
rg "timeout" -g'*.ts' .

# 除外（node_modules 等を明示）
rg "API_KEY" . -g'!node_modules/**' -g'!.venv/**'

# 行番号付きで表示
rg -n "error" .
```

## fzf 例：よく効く2パターン

```bash
# ファイルをあいまい検索して開く（例：less）
fzf | xargs -r less

# 履歴検索（bashなら Ctrl+R が fzf に置き換え可能）
# .bashrc で fzf の key-bindings を有効化することが多い
```

## zoxide 例：移動を“単語”にする

```bash
# 初期化（.bashrc に eval を入れるのが定番）
# eval "$(zoxide init bash)"

# 一度行ったディレクトリへ「z」でジャンプ
z work
z myrepo
```

---

# 5.Phase2-情報の可視化と理解（ModernCLI-Visualization）

![L5.Phase2-情報の可視化と理解（ModernCLI-Visualization）](/images/gamehub/L5.Phase2-情報の可視化と理解（ModernCLI-Visualization）.jpg)

## このページの主旨（Phase 2: Visualization）

標準出力（cat/ls）を、見やすい出力へ置換：

* `eza`（modern ls）: アイコン/ツリー/ git 状態表示など
* `bat`（modern cat）: シンタックスハイライト、行番号、diff 表示
* `tree -L 2` : ディレクトリ構造を浅く把握

## bat（Ubuntu注意：コマンド名が batcat のことがある）

```bash
sudo apt install -y bat
batcat --version
```

### bat の実務例

```bash
# 例：設定ファイルを行番号つきで読む
batcat -n ~/.bashrc

# 例：JSONを読みやすく（jq と合わせる）
cat data.json | jq . | batcat -l json
```

## tree 例（“深掘りしない”のがコツ）

```bash
sudo apt install -y tree
tree -L 2
tree -L 2 -I "node_modules|.venv|__pycache__"
```

## eza（導入はディストリ/方法で差が出るため注意）

もし導入できる環境なら、`ls` の置き換えとして非常に強力です。導入後の代表例：

```bash
# “見たい情報”を1発で
eza -lah --git --group-directories-first

# ツリー表示
eza -T -L 2
```

---

# 6.Phase3-操作の「資産家」（AutomationStrategy）

![L6.Phase3-操作の「資産家」（AutomationStrategy）](/images/gamehub/L6.Phase3-操作の「資産家」（AutomationStrategy）.jpg)

## このページの主旨（Phase 3: Automation Strategy）

手入力は“消費”、スクリプトは“投資（資産）”。
特に以下を推奨しています：

* 繰り返す作業は `.sh` に切り出す
* 安全策（失敗時に止める、ログを残す）
* `.bashrc` に関数として仕込んで“ワンコマンド化”

## 例：安全なシェルスクリプト雛形（事故を減らす）

```bash
#!/usr/bin/env bash
set -Eeuo pipefail

log() { printf "[%s] %s\n" "$(date +'%F %T')" "$*" >&2; }

main() {
  log "start"
  # ここに処理
  log "done"
}

main "$@"
```

## 例：.bashrc に関数を置いて作業を“固定化”

```bash
# ~/.bashrc
sync-projects() {
  set -Eeuo pipefail
  rsync -av --delete --exclude node_modules/ --exclude .venv/ \
    ~/work/src/ /mnt/d/backup/src/
}
```

---

# 7.Phase3-タスクランナとしてのMakefile

![L7.Phase3-タスクランナとしてのMakefile](/images/gamehub/L7.Phase3-タスクランナとしてのMakefile.jpg)

## このページの主旨（Phase 3: Makefile）

Makefile を「ビルド」だけでなく **タスクランナー**として使い、プロジェクト固有コマンドを `make dev` のように統一する。

## 例：最低限の Makefile（現場でそのまま使える形）

```make
.PHONY: help dev test clean

help:
	@echo "make dev   - start local dev"
	@echo "make test  - run tests"
	@echo "make clean - cleanup"

dev:
	docker compose up -d
	npm run dev

test:
	npm test

clean:
	docker compose down -v
```

## 使い分けの勘所

* **個人最適**：シェル関数（.bashrc）でもよい
* **チーム最適**：Makefile（誰が見ても入口が同じ）
* **CI/CD最適**：Makefile を CI から呼べる（後続ページへ接続）

---

# 8.Phase4-ネットワークとしての透明化（NetworkDebuggingConnectivity）

![L8.Phase4-ネットワークとしての透明化（NetworkDebuggingConnectivity）](/images/gamehub/L8.Phase4-ネットワークとしての透明化（NetworkDebuggingConnectivity）.jpg)

## このページの主旨（Phase 4: Network Debugging - Connectivity）

「見えないものは直せない」。疎通不良を DNS / TCP / FW の層に分けて観測する。

## DNSデバッグ（dig / nslookup）

```bash
# A/AAAA の解決確認（短く）
dig api.example.com +short

# CNAME を含めて追う（DNSレイヤの原因切り分け）
dig api.example.com CNAME +noall +answer
```

## ポート疎通（nc）

```bash
# TCP で繋がるか（タイムアウト/拒否の切り分け）
nc -zv api.example.com 443
```

## ローカル待受の確認（ss）

```bash
# どのプロセスが何番ポートをLISTENしているか
ss -lntp
```

---

# 9.Phase4-APIレイテンシの解剖（NetworkDebugging：LatencyAnalysis）

![L9.Phase4-APIレイテンシの解剖（NetworkDebugging：LatencyAnalysis）](/images/gamehub/L9.Phase4-APIレイテンシの解剖（NetworkDebugging：LatencyAnalysis）.jpg)

## このページの主旨（Phase 4: Latency Analysis）

レイテンシは「遅い」で終わらせず、**DNS / TCP / TLS / サーバ処理（TTFB）/ 転送**に分解して測る。

## 例：curlで時間分解（現場で最も手軽）

```bash
curl -o /dev/null -sS \
  -w "dns=%{time_namelookup}s connect=%{time_connect}s tls=%{time_appconnect}s ttfb=%{time_starttransfer}s total=%{time_total}s\n" \
  https://example.com
```

## 追加の切り分け

```bash
# 経路の問題（ルーティング/遅延）を疑う
traceroute example.com

# 継続観測（パケットロスや揺らぎ）
mtr -rw example.com
```

---

# 10.Phase5-オブザーバビリティの３本柱（ThreePillarsOfObservability）

![L10.Phase5-オブザーバビリティの３本柱（ThreePillarsOfObservability）](/images/gamehub/L10.Phase5-オブザーバビリティの３本柱（ThreePillarsOfObservability）.jpg)

## このページの主旨（Phase 5: Observability 3本柱）

Observability（可観測性）= 外部出力からシステム内部状態を推測する力。柱は：

* Logs（何が起きたか）
* Metrics（どれくらい起きているか）
* Traces（どこで起きたか）

## Linuxコマンドでの“入口”（ログ観測の基本）

```bash
# systemd 管理サービスのログを見る
journalctl -u your-service --since "1 hour ago" -f

# ファイルログを追う
tail -f /var/log/yourapp/app.log
```

---

# 11.Phase5-ログからトレースへの進化

![L11.Phase5-ログからトレースへの進化](/images/gamehub/L11.Phase5-ログからトレースへの進化.jpg)

## このページの主旨（Logs → Traces）

フロント 200ms / API 150ms / DB 120ms のように、総時間を「部品」に分けてボトルネック特定する。実務の要は **相関ID（Correlation ID）**。

## 例：相関IDでログを串刺し（CLIでできる）

```bash
# 例：request_id で全ログから拾う
rg "request_id=abc123" /var/log/yourapp/*.log

# JSONログなら jq で抽出
cat /var/log/yourapp/app.jsonl | jq 'select(.request_id=="abc123")'
```

## 実務TIP

* APIの入口で `X-Request-Id` を採番→全ログに出す
* DBクエリにも同じIDを埋める（可能なら）

---

# 12.Phase6-インフラのコード化（InfrastructureAsCode）

![L12.Phase6-インフラのコード化（InfrastructureAsCode）](/images/gamehub/L12.Phase6-インフラのコード化（InfrastructureAsCode）.jpg)

## このページの主旨（Phase 6: IaC）

手作業設定はドリフト（現物と定義のズレ）を招く。IaCで「状態」をコード化し、Gitで差分管理する。

* Declarative（Terraform/HCL）
* Imperative（CDK/CDKTF/TypeScript）

## CLI例：Terraformの最低限ループ

```bash
terraform fmt -recursive
terraform validate
terraform plan
terraform apply
```

## “差分を見る”文化（ドリフト対策）

```bash
# plan をレビュー対象にする（CIで plan を出す運用に繋がる）
terraform plan -out=tfplan
terraform show -no-color tfplan | less
```

---

# 13.Phase6-自働化パイプラインの構築（CICDPipeline）

![L13.Phase6-自働化パイプラインの構築（CICDPipeline）](/images/gamehub/L13.Phase6-自働化パイプラインの構築（CICDPipeline）.jpg)

## このページの主旨（CI/CD Pipeline）

ローカルの自動化資産（Makefile/Script）を、そのまま CI に持ち込むと強い。
流れ：Local Code → GitHub → GitHub Actions → Production

## 例：CIから `make test` を呼ぶ思想

* ローカルでもCIでも入口が同じ
* 「CIだけ通る」「手元だけ動く」を減らせる

## ローカルでCIを寄せる（事故予防）

```bash
# “CIでやること”を普段から同じコマンドで回す
make test
make lint
```

---

# 14.Linuxフル活用チェックリスト（MasteryChecklist）

![L14.Linuxフル活用チェックリスト（MasteryChecklist）](/images/gamehub/L14.Linuxフル活用チェックリスト（MasteryChecklist）.jpg)

## このページの主旨（Mastery Checklist）

これまでの要点をチェックリスト化：

* [Foundation] WSL2最適化（.wslconfig）
* [Tools] grep/ls を rg/eza/bat へ
* [Automation] 定型作業をスクリプト化・Makefile化
* [Network] curl/dig で疎通とレイテンシを説明できる
* [Observability] ログだけでなくトレース/メトリクスも意識
* [IaC] 変更をコード化しレビュー可能に

## すぐ使える“確認コマンド”セット

```bash
# 置き場所（/mnt/c と ~/work の使い分けを徹底できているか）
pwd

# 検索ツールが揃っているか
command -v rg fzf

# ネットワーク基礎が打てるか
command -v curl dig nc ss
```

---

# 15.環境を「使う」から「エンジニアリングする」へ

![L15.環境を「使う」から「エンジニアリングする」へ](/images/gamehub/L15.環境を「使う」から「エンジニアリングする」へ.jpg)

## このページの主旨（まとめ）

「環境を使う」から「エンジニアリングする」へ。
Linux/WSL2/クラウドは別物ではなく、同一線上の作法でつながる。最初の一歩は **.bashrc**（関数・alias・環境変数）から。

## 例：今日から効く .bashrc 改善（最小）

```bash
# よく使うコマンドを短く・安全に
alias ll='ls -lah'
alias gs='git status'

# 探索の高速化（rg）
alias rgi='rg -n --hidden -g "!.git/**"'
```

---

## 付録：この資料を“参考書化”する場合のおすすめ構成（VitePress）

* `docs/linux-full-cycle/` 配下に `L01.md`〜`L15.md`
* 各 md の先頭に `![Lxx](.../pagexx.jpg)` を置く（今回の形式）
* 章立て例：

  * L03: WSL2最適化
  * L04–L05: 探索・可視化（rg/fzf/zoxide/bat/eza/tree）
  * L08–L09: ネットワーク（疎通→レイテンシ分解）
  * L10–L11: 観測（Logs→Traces、相関ID）
  * L12–L13: IaC/CI/CD（ローカル自動化の再利用）

次のステップとして **各ページを「コマンド索引（例：rg/grep/awk/sed/jq/curl/dig/nc/ss）」付きに再編集**した“参考書版テンプレート”作成予定（この回答の内容を崩さず、索引と練習問題を足す形で作成可能です）。

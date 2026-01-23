## １ Git × fzf：開発者体験を変える10の神コマンド

![gi1.Git×fzf開発者を変える１０の紙コマンド](/images/gamehub/gi1.Git×fzf開発者を変える１０の紙コマンド.jpg)

### 図の要旨

Git操作の「暗記（ハッシュ/長いブランチ名/複雑な引数）」を、fzfにより「選択」に置き換え、**思考速度で作業する**発想を提示する表紙。

### 詳細解説

* Gitは強力だが、実務では「候補の探索」「コピペ」「やり直し」が摩擦になりやすい。
* fzf（Fuzzy Finder）は、標準入力を**インタラクティブに絞り込むUI**に変換する。
* 以降の10ケースは、覚えるコマンドの数を増やすのではなく、**作業のボトルネック（移動/調査/運用）**を減らす構成。

### Tips（導入の勝ち筋）

* まずは「ブランチ移動」「ファイル特定」「diff確認」だけを身体に入れると、残りが連鎖して効きます。
* ゴールは“コマンド暗記”ではなく、**パイプ（|）で候補をつなぐ型**を覚えることです。

---

## ２ CLIの「摩擦」をゼロにする

![gi2.CLIの「摩擦」をゼロにする](/images/gamehub/gi2.CLIの「摩擦」をゼロにする.jpg)

### 図の要旨

`git log` / `git branch` などの出力を、`fzf`が**リアルタイム検索＆選択**のUIに変換し、選んだ結果を次のアクション（checkout/show/diff）へ渡す流れを示す。

### 詳細解説

* 基本形は次の3段です。
  1) **候補を出す**（例：`git branch --all`）
  2) **fzfで選ぶ**（例：`... | fzf`）
  3) **選択結果をコマンドへ渡す**（例：`... | xargs git checkout`）
* fzfは「曖昧検索」なので、完全一致ではなく断片（例：`fea log`）で候補が出せる。
* 「探す時間を作る時間へ」は、探索/判断コストの削減を指す（DX改善）。

### Tips（基本テンプレ）

* “候補→fzf→実行”の最小テンプレ：
  ```bash
  <list_command> | fzf | <action_command>
  ```

* プレビュー付きテンプレ（選択しながら中身確認）：

  ```bash
  <list_command> | fzf --preview '<preview_command>'
  ```

---

## ３ 01. Navigation（迷わない移動）：迷わないブランチ移動

![gi3.01.Navigation（迷わない移動）](/images/gamehub/gi3.01.Navigation（迷わない移動）.jpg)

### 図の要旨

ブランチ一覧（ローカル/リモート）から曖昧検索で選び、そのままcheckout（switch）まで一気通貫にする。

### 詳細解説

* 基本コマンド（スライドの型）：

  ```bash
  git branch --all | fzf | xargs git checkout
  ```
* ただし `remotes/origin/...` の接頭辞が邪魔になりやすいため、`sed`で整形してから渡す：

  ```bash
  git branch --all | fzf | sed 's#remotes/##' | xargs -r git checkout
  ```
* `fzf`の曖昧検索により、長いブランチ名でも断片入力で到達できる（例：`fea log`）。

### Tips（実務向けの安全版）

* 推奨は `git checkout` より `git switch`（意図が明確）：

  ```bash
  git branch --all | fzf | sed 's#remotes/##' | xargs -r git switch
  ```
* macOSの `xargs` は `-r` 非対応の場合があります。その場合は関数化してガードするのが堅い：

  ```bash
  b="$(git branch --all | fzf | sed 's#remotes/##')"
  [ -n "$b" ] && git switch "$b"
  ```
* 作業ツリーが汚れていると切替に失敗します。先に `git status -sb` で確認、必要ならstashへ。

---

## ４ 02. Navigation（迷わない移動）：ディレクトリ階層のワープ（zoxide）

![gi4.02.Navigation（迷わない移動）](/images/gamehub/gi4.02.Navigation（迷わない移動）.jpg)

### 図の要旨

`cd`の代わりに `z`（zoxide）で移動履歴を学習し、頻出ディレクトリへ一瞬でジャンプする。必要に応じてfzfで履歴選択も可能。

### 詳細解説

* `z <query>` は過去の移動履歴から最適候補へジャンプする（スライド例：`z conf` → `~/work/config`）。
* `zi` を使うと、履歴候補をfzfで選べる（環境により提供される）。
* Git×fzf文脈では「リポジトリ間移動」「src/components直行」などが高速化ポイント。

### Tips（プロジェクト移動の型）

* 複数リポジトリを抱える場合、`~/work` 配下へ集約＋`z`で移動が強い。
* `zi` がない環境は、次のように自作も可能：

  ```bash
  cd "$(dirs -p | fzf)"
  ```

  ※ `dirs` はシェルのディレクトリスタック依存。zoxide導入が最短です。

---

## ５ 03. Navigation（迷わない移動）：プロジェクトファイルの瞬時特定

![gi5.03.Navigation（迷わない移動）](/images/gamehub/gi5.03.Navigation（迷わない移動）.jpg)

### 図の要旨

`git ls-files` で「追跡対象ファイル一覧」を出し、fzfで目的ファイルへ即到達する（巨大リポでも速い）。

### 詳細解説

* スライドのキーコマンド：

  ```bash
  git ls-files | fzf
  ```
* `git ls-files` は `.gitignore` を踏まえ、追跡対象中心に絞れるため、`node_modules` 等を最初から排除できる。
* Git管理外も含めたい場合は `fd` を使う：

  ```bash
  fd --type f | fzf
  ```

### Tips（エディタ連携：実務で効く形）

* Vim/Neovimで開く：

  ```bash
  nvim "$(git ls-files | fzf)"
  ```
* VSCodeで開く：

  ```bash
  code "$(git ls-files | fzf)"
  ```
* ファイル名の断片＋ディレクトリ断片（例：`user model`）で高速に狙えます。

---

## ６ 04. Archaeology（高速な調査）：コミットログの高速ブラウジング

![gi6.04.Archaeology（高速な調査）](/images/gamehub/gi6.04.Archaeology（高速な調査）.jpg)

### 図の要旨

`git log --oneline` をfzfで選び、右側プレビューで `git show` を表示して差分を即確認する。

### 詳細解説

* スライドのキーコマンド：**（とても便利です）**

  ```bash
  git log --oneline | fzf --preview 'git show {1}'
  ```
* `{1}` はfzfのプレースホルダ（選択行の第1フィールド＝コミットハッシュ想定）。
* コミットハッシュをコピペせずに、上下移動だけで「原因コミット」に到達できる。

### Tips（実務の拡張）

* 表示を見やすく（作者/日時/装飾）：

  ```bash
  git log --pretty=oneline --abbrev-commit --decorate | fzf --preview 'git show {1}'
  ```
* `delta` を入れている場合、`git show` の見栄えが上がる（導入は後段参照）。

---

## ７ 05. Archaeology（高速な調査）：変更ファイルごとのDiff確認

![gi7.05.Archaeology（高速な調査）](/images/gamehub/gi7.05.Archaeology（高速な調査）.jpg)

### 図の要旨

`git diff` 全体を眺めるのではなく、まず「変更ファイル一覧」に落としてから、見たいファイルだけ差分をプレビューする。

### 詳細解説

* スライドのキーコマンド：

  ```bash
  git diff --name-only | fzf --preview 'git diff --color=always -- {1}'
  ```
* `--name-only` でファイルリスト化し、fzfで絞り込むことで、差分の過視認（見落とし/疲労）を減らす。
* `--color=always` はプレビューで色を保持するための定石。

### Tips（ステージング差分／コミット間差分）

* ステージング済み（index）の差分を見る：

  ```bash
  git diff --name-only --cached | fzf --preview 'git diff --cached --color=always -- {1}'
  ```
* ブランチ間差分（例：mainとの差分）：

  ```bash
  git diff --name-only main...HEAD | fzf --preview 'git diff main...HEAD --color=always -- {1}'
  ```

---

## ８ 06. Archaeology（高速な調査）：「タイムマシン」機能（Reflog）

![gi8.06.Archaeology（高速な調査）](/images/gamehub/gi8.06.Archaeology（高速な調査）.jpg)


### 図の要旨

`git reflog` をfzfで検索し、過去のHEAD位置（reset/checkout前）へ戻るための“保険”を実用化する。

### 詳細解説

* スライドのキーコマンド：

  ```bash
  git reflog | fzf --preview 'git show {1}'
  ```
* reflogは「ブランチの履歴」ではなく「HEADがどこを指していたかの履歴」なので、事故復旧に強い。
* `reset` や `rebase` で迷子になった時、reflogから“あの時点”を見つけて復帰できる。

### Tips（復旧の実務手順）

* 見つけたハッシュ（または `HEAD@{n}`）へ戻す：

  ```bash
  git reset --hard <hash_or_HEAD@{n}>
  ```

  ※ `--hard` は作業ツリーを破壊します。まずは `--soft` / `--mixed` を検討し、必要なら退避（stash/branch作成）。
* “保険ブランチ”を切ってから作業すると安全：

  ```bash
  git branch rescue/<name> <hash>
  ```

---

## ９ 07. Archaeology（高速な調査）：コード内容のリアルタイム検索（Rg + Fzf）

![gi9.07.Archaeology（高速な調査）](/images/gamehub/gi9.07.Archaeology（高速な調査）.jpg)

### 図の要旨

`rg -n` の検索結果（ファイル:行:内容）をfzfでさらに絞り、`bat`で該当行をハイライト表示する。

### 詳細解説

* スライドのキーコマンド：

  ```bash
  rg -n "pattern" . | fzf --delimiter : --preview 'bat --highlight-line {2} {1}'
  ```
* `--delimiter :` で `file:line:...` を分解し、`{1}`=ファイル、`{2}`=行番号として利用する。
* “grep→候補が多すぎる”を、fzfで「目視選別」に落とす。

### Tips（開発者がよく使う拡張）

* 隠しファイル/バイナリ除外やglob指定はrg側で制御：

  ```bash
  rg -n "pattern" -g'*.ts' -g'*.vue' .
  ```
* VSCodeの行ジャンプに繋ぐ（選択行を `file:line` に整形して `code -g`）：

  ```bash
  rg -n "pattern" . \
    | fzf --delimiter : --preview 'bat --highlight-line {2} {1}' \
    | awk -F: '{print $1 ":" $2}' \
    | xargs -r code -g
  ```

  ※ `xargs -r` は環境差に注意（必要ならシェル変数でガード）。

---

## １０ 08. Operations（高度な操作）：スタッシュの中身を見て適用

![gi10.08.Operations（高度な操作）](/images/gamehub/gi10.08.Operations（高度な操作）.jpg)
### 図の要旨

`git stash list` をfzfで選び、プレビューで中身（patch）を確認してから適用する。stash番号を覚える必要をなくす。

### 詳細解説

* スライドのキーコマンド（そのままだと環境により微調整が必要）：

  ```bash
  git stash list | fzf --preview 'git stash show -p {1}'
  ```
* 目的は「いつのstashか」ではなく「何を退避したか」を見て判断すること。
* stashが溜まる現場（並行作業/割込み対応）ほど効果が大きい。

### Tips（確実に動く安全版：コロン除去）

* `stash@{0}:` の末尾 `:` が邪魔になることがあるため、確実版：

  ```bash
  git stash list \
    | fzf --preview 'git stash show -p $(echo {} | cut -d: -f1)'
  ```
* 適用（apply）まで行う場合は、まずプレビューで確認→別コマンドで適用が安全：

  ```bash
  s="$(git stash list | fzf | cut -d: -f1)"
  [ -n "$s" ] && git stash apply "$s"
  ```

---

## １１ 09. Operations（高度な操作）：コマンド履歴の完全掌握（Ctrl-R）

![gi11.09.Operations（高度な操作）](/images/gamehub/gi11.09.Operations（高度な操作）.jpg)

### 図の要旨

シェル履歴をfzfで検索し、過去に実行した複雑なコマンド（Docker/curl等）を断片入力で呼び戻す。

### 詳細解説

* スライドのキーコマンド：

  ```bash
  history | fzf
  ```
* 実運用では、fzfの標準キーバインド（導入スクリプト）により `Ctrl-R` で履歴検索が開くことが多い。
* “完全一致で思い出す”のではなく、“断片で見つける”運用が前提。

### Tips（履歴から即実行）

* fzfの設定によっては選んだ履歴をそのままプロンプトに貼り付けられます（Enterで確定→実行）。
* 履歴がノイズ化している場合、プロジェクト別に prefix（例：`proj:`）を付けて運用すると検索性が上がります。

---

## １２ 10. Operations（高度な操作）：変更箇所に限定した影響調査

![gi12.10.Operations（高度な操作）](/images/gamehub/gi12.10.Operations（高度な操作）.jpg)

### 図の要旨

「リポジトリ全体を検索」ではなく、「今回の差分（git diff）の追加行」に限定してキーワード探索する。影響調査のスコープを意図的に狭める。

### 詳細解説

* スライドのキーコマンド：

  ```bash
  git diff -U0 | rg '^\+[^+]' | fzf
  ```
* `git diff -U0` はコンテキスト行を0にして、差分の“変更行”中心にする。
* `rg '^\+[^+]'` は diff の “追加行（+）” を抽出（`+++ b/file` のようなメタ行を除外する狙い）。
* これにより「今日自分が書いたコードの中で、特定キーワードがどこにあるか」を瞬時に洗い出せる。

### Tips（レビュー前セルフチェックに強い）

* 例：`TODO` や `console.log` の置き忘れ検知：

  ```bash
  git diff -U0 | rg '^\+[^+]' | rg 'TODO|console\.log' | fzf
  ```
* 例：セキュリティ観点で `password|token` を差分追加行だけチェック：

  ```bash
  git diff -U0 | rg '^\+[^+]' | rg -i 'password|token|secret' | fzf
  ```

---

## １３ すぐに導入するには（Install / Recommended Tools）

![gi13.すぐに導入するには](/images/gamehub/gi13.すぐに導入するには.jpg)
### 図の要旨

fzfのインストール方法と、開発体験を上げる周辺ツール（bat/rg/delta/fzf-git.sh）、およびシェル設定（.bashrc/.zshrc）を提示する。

### 詳細解説

* インストール（例）：

  * macOS：

    ```bash
    brew install fzf
    ```
  * Linux（Debian/Ubuntu系）：

    ```bash
    sudo apt install fzf
    ```
* 推奨ツール：

  * `bat`：シンタックスハイライト付きcat（fzf preview と相性が良い）
  * `ripgrep (rg)`：高速全文検索
  * `delta`：Git diff 表示改善（見やすい差分）
  * `fzf-git.sh`：Git×fzfの統合スクリプト群
* シェル初期化例（スライドの意図）：

  ```bash
  # .bashrc / .zshrc
  [ -f ~/.fzf.bash ] && source ~/.fzf.bash
  source ~/fzf-git.sh
  bind -x '"\C-p": git log --oneline | fzf'
  ```

### Tips（運用で詰まりやすい点）

* `~/.fzf.bash` は導入方法によって生成/配置が異なります（パッケージ管理 or 公式インストーラ）。
* `bind -x` はbash向けです。zshは `bindkey` を使うため、シェルに合わせてキーバインド方式を変えてください。
* チームで揃えるなら「共通の関数/エイリアス」をdotfiles化し、レビュアブルに運用すると事故が減ります。

---

## １４ Workflow Accelerator チートシート

![gi14.WorkflowAcceleratorチートシート](/images/gamehub/gi14.WorkflowAcceleratorチートシート.jpg)

### 図の要旨

Navigation / Archaeology / Operations の3フェーズに整理し、キーコマンドを“一覧”として再提示する。

### 詳細解説

* Navigation

  * Branch Switcher：`git branch | fzf`
  * Directory Jump：`z | fzf`（環境により `zi`）
  * File Finder：`git ls-files | fzf`
* Archaeology

  * Commit Browser：`git log | fzf`
  * Diff Viewer：`git diff | fzf`
  * Reflog：`git reflog | fzf`
  * Interactive Grep：`rg | fzf`
* Operations

  * Stash Manager：`git stash | fzf`
  * History Recall：`Ctrl-R`
  * Context Search：`git diff | rg | fzf`

### Tips（チームに配るなら）

* “そのまま打てる形”にエイリアス化して配布すると普及します（例：`gco`/`glog`/`gdiffp`）。
* チートシートは短いほど使われるため、まずこの1枚だけを壁紙的に貼るのが有効です。

---

## １５ まとめ：開発者体験（DX）は、ツール選びで劇的に変わる

![gi15.開発体験（DX）は、ツール選びで劇的に変わる](/images/gamehub/gi15.開発体験（DX）は、ツール選びで劇的に変わる.jpg)

### 図の要旨

fzfによりターミナル操作を直感的フローへ寄せ、開発速度と品質（調査/復旧/影響確認）を同時に上げる、という結論。

### 詳細解説

* “探す・選ぶ・実行する”を型として持つと、緊急対応やレビュー前調査が速くなる。
* Gitの強力さはそのままに、**UI（選択）**を足して人間の負担を減らすのがポイント。
* 今日からの最小導入は「fzf導入＋ブランチ/ファイル/差分の3点セット」。

### Tips（次の一手）

* まずは以下3つを関数化して `.bashrc` に入れ、毎日使う状態を作る：

  * ブランチ切替（Slide 3）
  * 変更ファイル別diff（Slide 7）
  * rg+fzfプレビュー検索（Slide 9）
* 使い始めると「この一覧もfzfにしたい」が必ず出ます。そこで初めて自作の“候補→fzf→実行”を増やすのが最短です。


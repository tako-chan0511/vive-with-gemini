## １　導入：開発効率を劇的に変える fzf 活用術

![fz1.開発効率を劇的に変えるfzf活用術](/images/gamehub/fz1.開発効率を劇的に変えるfzf活用術.jpg)

### 図の要旨

「初心者でも即戦力になる」ことを前提に、fzfの厳選ユースケース（10選）で、開発の“探す時間”を減らすのが狙いです。

### 詳細解説

fzfは「何かを探して選ぶ」行為を、**キーボード中心の高速UI**に変換します。特に実務では、次の3領域が劇的に変わります。

* **Search**：ファイル/コード/ログを瞬時に探す
* **Context**：プレビューで文脈を確認して迷いを消す
* **Git**：ブランチ/コミット/差分を対話的に操作する

### Tips

* まずは「fzf単体」ではなく、**“一覧を出すコマンド + fzf”** の形で覚えると定着が早いです（例：`rg | fzf`, `git branch | fzf`）。

---

## ２　問題提起：コマンドライン操作の「摩擦」

![fz2.コマンドライン操作の「摩擦」](/images/gamehub/fz2.コマンドライン操作の「摩擦」.jpg)

### 図の要旨

* **The Problem**：長いパス、typo、`ls` と `cd` の繰り返しで時間が溶ける
* **With fzf**：`code $(fzf)` のように“曖昧検索→即移動”が可能
```bash
①fzf：候補一覧から 1行選ぶ（選んだ行を標準出力に出す）
②$( ... )：コマンド置換
→ カッコ内コマンドの出力（文字列）を、外側コマンドの引数として差し込む
③code <選んだ文字列>：VS Codeで開く
```


### 詳細解説

開発時間の多くは「書く」より「探す」に奪われがちです。fzfはその“摩擦”を、次のように削ります。

* **入力コスト削減**：完全一致ではなく「あいまい一致」でヒットさせる
* **試行回数削減**：候補一覧を見ながら選ぶのでミスが減る
* **移動の短縮**：探してその場でアクション（open/checkout/show）

### Tips（初心者が最初に得るべき体験）

```bash
# まずは「ファイル一覧をfzfで選ぶ」体験
find . -type f | fzf
```

選んだ結果が標準出力に出るだけですが、「一覧→絞り込み→確定」が体に入ります。

---

## ３　fzfとは何か：stdin→絞り込み→stdout

![fz3.fzfとは何か？](/images/gamehub/fz3.fzfとは何か？.jpg)

### 図の要旨

fzfは **標準入力（stdin）で受け取ったリストをインタラクティブに絞り込み、選択結果を標準出力（stdout）へ返す**フィルタ。

### 詳細解説（これが分かると一気に強くなる）

* **入力**：何でもよい（ファイル名、grep結果、gitブランチ、コマンド履歴…）
* **fzf**：候補を絞って「1つ（または複数）」選ぶ
* **出力**：次のコマンドに渡す（open/checkout/show など）

### Tips：覚えるべき基本形（3パターン）

```bash
# 1) 一覧を表示して選ぶ
<list_command> | fzf

# 2) 選んだ1行を次のコマンドへ渡す
<list_command> | fzf | xargs -r <action_command>

# 3) 選んだ行を「フィールド分解」して使う（後で重要）
<list_command> | fzf --delimiter ':' ...
```

---

## ４　Case 1：高速Grep検索（rg → fzf）

![fz4.Case1：高速Grep検索](/images/gamehub/fz4.Case1：高速Grep検索.jpg)

### 図の要旨

静的に検索結果を流すだけでなく、その場で絞り込む基本形：

```bash
rg -n "pattern" . | fzf
```

### コマンド分解

* `rg -n "pattern" .`：行番号付きで検索結果を出す（`file:line:content` 形式になりやすい）
* `| fzf`：候補（ヒット行）を対話的に絞り込み

### Tips（“検索→確定→次の行動”に繋げる）

* 結果が多すぎるときは **rg側で先に絞る**（ファイル種別、ディレクトリ除外）

```bash
rg -n "pattern" -g'*.py' -g'!node_modules/**' . | fzf
```

* 色付き（ANSI）を活かしたい場合：

```bash
rg --color=always -n "pattern" . | fzf --ansi
```

---

## ５　Case 2：検索結果からエディタへ直行

![fz5.Case2：検索結果からエディタへ直行](/images/gamehub/fz5.Case2：検索結果からエディタへ直行.jpg)

### 図の要旨

パスのコピー不要。「検索→選択→開く」をパイプライン化：

```bash
rg ... | fzf | cut -d: -f1 | xargs -r code
```

### コマンド分解（重要）

* `cut -d: -f1`：`file:line:...` の **ファイル名だけ**を取り出す
* `xargs -r code`：ファイル名を `code <file>` にして開く（`-r` は空入力なら実行しない）

### Tips（より実務的：行番号までジャンプ）

VSCode は `code -g file:line` が使えるので、こうすると「該当行」に飛べます。

```bash
rg -n "pattern" . \
| fzf \
| awk -F: '{print $1 ":" $2}' \
| xargs -r -I{} code -g "{}"
```

---

## ６　Case 3：変更ファイルに絞った検索（git diff → rg → fzf）

![fz6.Case3：変更ファイルに絞った検索](/images/gamehub/fz6.Case3：変更ファイルに絞った検索.jpg)

### 図の要旨

「修正中のファイルだけ」を対象に検索し、デバッグ/レビュー速度を上げる。

### 代表パターン（安全な形）

```bash
git diff --name-only \
| xargs -r rg -n "pattern" \
| fzf
```

### Tips（ファイル名にスペースが含まれる可能性がある場合）

NULL区切りを使うと事故が減ります。

```bash
git diff --name-only -z \
| xargs -0 -r rg -n "pattern" \
| fzf
```

### 実務での使い所

* バグ修正中：「触った箇所に関連する実装」を高速に再発見
* PRレビュー前：「差分に含まれる文字列」を横断確認

---

## ７　Case 4：ファイル内容のプレビュー（fd → fzf --preview bat）

![fz7.Case4：ファイル内容のプレビュー](/images/gamehub/fz7.Case4：ファイル内容のプレビュー.jpg)

### 図の要旨

ファイルを開く前に中身を確認して、調査効率を跳ね上げる。

```bash
fd -t f . | fzf --preview 'bat --style=numbers --color=always {}'
```

### コマンド分解

* `fd -t f .`：ファイル一覧（`find` より高速/シンプルになりがち）
* `--preview '...'`：右側にプレビュー表示
* `{}`：fzfが選択している行（= ファイルパス）に展開されるプレースホルダ

### Tips（実務で効くpreview設定）

```bash
fd -t f . \
| fzf --preview 'bat --style=numbers --color=always --line-range :200 {}' \
      --preview-window 'right,60%,wrap'
```

* `--line-range :200`：巨大ファイルのプレビュー負荷を抑える
* `wrap`：横長行を折り返して可読性アップ

---

## ８　：文脈付きGrepプレビュー（ハイライト付き）

![fz8.Case5：文脈付Grepプレビュー](/images/gamehub/fz8.Case5：文脈付Grepプレビュー.jpg)

### 図の要旨

「どの関数の中か」「前後に何があるか」を一瞬で把握。行番号を使ってピンポイント表示。

### 代表パターン（図の意図を汲んだ形）

```bash
rg -n "pattern" . \
| fzf --delimiter : \
      --preview 'bat --style=numbers --color=always --highlight-line {2} {1}'
```

### 重要ポイント

* `--delimiter :`：`file:line:content` を `:` で分割
* `{1}`：1列目（ファイル）
* `{2}`：2列目（行番号）
* `--highlight-line {2}`：該当行をハイライト

### Tips（前後も見たい）

```bash
rg -n "pattern" . \
| fzf --delimiter : \
      --preview 'bat --style=numbers --color=always --highlight-line {2} --line-range $(({2}-30)):$(({2}+30)) {1}'
```

※シェル計算を使うため環境差が出ます。まずは「ハイライトだけ」から導入が安全です。

---

## ９　Case 6：ブランチへ高速チェックアウト

![fz9.Case6：ブランチへの高速チェックアウト](/images/gamehub/fz9.Case6：ブランチへの高速チェックアウト.jpg)

### 図の要旨

正確なブランチ名を覚えていなくても、一覧から選んで移動できる。

### 代表パターン

```bash
git branch --all \
| fzf \
| sed 's#remotes/[^/]*/##' \
| xargs -r git checkout
```

### Tips（安全性）

* checkout前に現在ブランチを確認する習慣があると事故が減ります。

```bash
git status -sb
```

* リモート追跡ブランチを選んだ場合、checkoutが失敗することがあるため、`sed` の整形や `git switch` を使う流派もあります。

---

## １０　Case 7：コミットログのインタラクティブ閲覧（選んでgit show）

![fz10.Case7：コミットログのインタラクティブ閲覧](/images/gamehub/fz10.Case7：コミットログのインタラクティブ閲覧.jpg)

### 図の要旨

コミット一覧を見ながら「この変更の中身」を素早く確認する。

### 代表パターン

```bash
git log --oneline --decorate \
| fzf \
| awk '{print $1}' \
| xargs -r git show
```

### Tips（プレビュー化すると“好きになる”）

別ウィンドウを開かず、選択中のコミットを右で見られるようにすると強いです。**（便利です）**

```bash
git log --oneline --decorate \
| fzf --preview 'echo {} | awk "{print \$1}" | xargs -r git show --color=always | sed -n "1,200p"' \
      --preview-window 'right,70%,wrap'
```

---

## １１　Case 8：変更差分の確認（ステージ前レビュー）

![fz11.Case8：変更差分の確認](/images/gamehub/fz11.Case8：変更差分の確認.jpg)

### 図の要旨

「全部diff」ではなく、**1ファイルずつ**確実にレビューする。**（便利）**

### 代表パターン

```bash
git diff --name-only \
| fzf \
| xargs -r git diff --
```

### Tips

* `--` は「ここから先はファイル名」という区切りで、パスが `-` から始まる場合などの事故を防ぎます。
* staged（`git add` 後）を見たいなら：

```bash
git diff --cached --name-only | fzf | xargs -r git diff --cached --
```

---

## １２　Case 9：コマンド履歴の検索（Ctrl-R を fzf に）

![fz12.Case9：コマンド履歴の検索](/images/gamehub/fz12.Case9：コマンド履歴の検索.jpg)

### 図の要旨

「あの時打った長いコマンド」を、履歴（historyの最新逆順に）から一瞬で呼び出す。キーは **Ctrl-R**。

### 代表的な導入（bash の例）

fzfパッケージ/設定により差はありますが、概念としては「シェルにキーバインドを追加」します。

#### 例：fzfのキーバインドを読み込む（Ubuntuでよくある）

```bash
# ~/.bashrc に追記（環境によってパスは異なる）
# [ -f ~/.fzf.bash ] && source ~/.fzf.bash
```

### Tips（実務での価値）

* Docker/DB/デプロイ系の“長い一撃コマンド”を、忘れても復元できる
* ミスが減る（再入力が減る＝typoが減る）

---

## １３　Case 10：エイリアスで「自分専用ツール化」

![fz13.Case10：エイリアスで「自分専用ツール」化](/images/gamehub/fz13.Case10：エイリアスで「自分専用ツール」化.jpg)

### 図の要旨

毎回長いパイプラインを打たず、`.bashrc/.zshrc` にまとめて「自分用コマンド」にする。**（例：Ctrl＋Gは自分で定義必要です）**

### 例：gitブランチ切替を関数化（bash向け）

```bash
fco() {
  git branch --all \
  | fzf \
  | sed 's#remotes/[^/]*/##' \
  | xargs -r git checkout
}
```

### Tips（運用）

* 関数にしておくと「将来の改良（プレビュー追加、整形変更）」が容易
* チーム共有するなら `scripts/` 配下に置き、READMEに導線を作るのも有効

---

## １４　検索構文チートシート（覚えると精度が上がる）

![fz14.fzf検索構文チートシート](/images/gamehub/fz14.fzf検索構文チートシート.jpg)

### 図の要旨（必修5つ）

fzfのクエリ入力は、単なる“文字列”ではなく、検索モードを切り替えられます。

| 構文      | 意味            | 例        |
| ------- | ------------- | -------- |
| `word`  | あいまい一致（fuzzy） | `model`  |
| `'word` | 完全一致（exact）   | `'model` |
| `^word` | 先頭一致（prefix）  | `^main`  |
| `word$` | 末尾一致（suffix）  | `.json$` |
| `!word` | 除外（inverse）   | `!test`  |

### Tips（組み合わせが強い）

例：Goファイルを含み、testを除外

```text
^core .go$ !test
```

* “include” と “exclude” を同時に使えるのがfzfの強みです。

---

## １５　今日から始める「加速」：Search / Context / Git

![fz15.今日から始める「加速」](/images/gamehub/fz15.今日から始める「加速」.jpg)

### 図の要旨

3本柱で段階的に導入すると、短期間で効果が出る。

* **Search**：探すのを速く
* **Context**：プレビューで迷わない
* **Git**：履歴・差分・ブランチ操作を直感化

### おすすめ導入順（失敗しない）

1. **Ctrl-R（履歴検索）**：毎日使うので定着が最速
2. **`rg | fzf`（検索）**：調査速度が上がる
3. **プレビュー**：ミスと往復が減って“好き”になりやすい
4. **Git系エイリアス化**：自分用ツールとして完成

---

# 付録：この一冊で“fzfが好きになる”ための実戦Tips集

## 1) fzfを「常用ツール」にする環境変数

`~/.bashrc` などに入れる定番（例）です。

```bash
# fd があるなら「ファイル一覧のデフォルト」を高速化
export FZF_DEFAULT_COMMAND='fd -t f -H'
export FZF_DEFAULT_OPTS='--height 60% --layout=reverse --border'
```

## 2) まず覚えるべき fzf オプション（最小）

* `--ansi`：色付き入力を崩さない（`rg --color=always | fzf --ansi`）
* `--preview 'cmd {}'`：プレビュー（最強の体験）
* `--delimiter ':'`：grep結果などを列として扱う
* `--preview-window 'right,60%,wrap'`：見やすさ調整

## 3) “事故防止”の実務作法

* `xargs -r`：空入力で誤実行しない
* `-z`/`-0`：ファイル名に空白があっても壊れない（NULL区切り）

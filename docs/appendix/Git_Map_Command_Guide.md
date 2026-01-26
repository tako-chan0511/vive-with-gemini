# Git/GitHub 状態遷移とコマンド完全ガイド
「コマンド暗記」ではなく「データ移動（状態遷移）」として理解するための地図です。

---

## １ 全体地図：4領域で理解するGit/GitHub

![GC1.GitとGitHub状態遷移とコマンド完全ガイド](/images/github/GC1.GitとGitHub状態遷移とコマンド完全ガイド.jpg)

### 図の要旨
- Git操作は「データがどこにあるか」と「どこへ動かしたいか」を **4つの領域**で捉えると迷わない。
- `add → commit → push`（外へ出す）と、`fetch/pull`（取り込む）の流れが一本のラインで表現されている。

### 詳細解説
- このスライドは「Gitの管理とは、“今どこにいるか” と “どこへ進めたいか” を把握すること」と言っています。
- Gitはコマンドが多く見えますが、**実態は領域間の移動**です。
  - Work → Stage：コミット対象の“梱包”
  - Stage → Local Repo：履歴として確定
  - Local → Remote：共有（公開）
  - Remote → Local/Work：受信・統合

### Tips（実務）
- 迷った瞬間にやる順番（事故が減ります）
  1) `git status -sb`（現在地）
  2) `git diff` / `git diff --cached`（何がどこにあるか）
  3) `git log --oneline --graph --decorate -n 20`（履歴の形）
- 「地図が頭に入る」ほど、`reset/restore/stash` の使い分けも自然になります。

---

## ２ Gitを構成する「4つの領域」

![GC2.Gitを構成する「４つの領域」](/images/github/GC2.Gitを構成する「４つの領域」.jpg)

### 図の要旨
- Git/GitHubは次の4領域で成立している：
  1) Working Tree（作業ツリー）
  2) Staging Area / Index（ステージ）
  3) Local Repository（ローカル履歴）
  4) Remote Repository（共有履歴：GitHub等）

### 詳細解説
- **Working Tree**：あなたが編集している実ファイル。未追跡の新規ファイルもここに出現する。
- **Staging Area（Index）**：次のコミットに含める変更を“選別”して置く場所。ここがあるため「Aだけコミット、Bは保留」が可能。
- **Local Repository（.git）**：確定したコミット履歴（スナップショット）が保存される本体。
- **Remote Repository（GitHub）**：チーム共有の履歴置き場。レビューやCIの起点にもなる。

### Tips（実務）
- 「GitHubに上げた＝保存した」は誤解の源です。
  - `commit` は **ローカル保存**
  - `push` で **共有（公開）**
- **“状態”を言語化**すると理解が進みます：
  - 「いま Work が汚れている」「Stage に積んだ」「Local には確定済」「Remote は未反映」など。

---

## ３ 現在地を知る羅針盤：`git status`

![GC3.現在地を知る羅針盤（git_status）](/images/github/GC3.現在地を知る羅針盤（git_status）.jpg)

### 図の要旨
- `git status` の3ブロックを読めると、次の一手が決まる：
  - Changes not staged（未ステージ）
  - Changes to be committed（ステージ済）
  - Untracked files（未追跡）

### 詳細解説
- **Changes not staged**：Workに変更はあるが、Stageへ送っていない（＝コミット候補として未選別）。
- **Changes to be committed**：Stageに積まれた状態（＝コミット待ち）。
- **Untracked**：Gitがまだ追跡していない新規ファイル。`.gitignore` 対象は原則ここにも出ない。

### Tips（実務）
- 状態 → 次の一手（最短ルート）
  - 未ステージがある → `git add <file>`（選別）
  - ステージ済 → `git commit -m "..."`（確定）
  - untracked → 追跡したいなら `git add`、不要なら `.gitignore`
- “色”で覚えると早い：赤（未ステージ）→緑（ステージ）→コミット。

---

## ４ 保存への第一歩：選別と登録 `git add`

![GC4.保存への第一歩：選別と登録（git_add）](/images/github/GC4.保存への第一歩：選別と登録（git_add）.jpg)

### 図の要旨
- `git add` は **Work → Stage** のコピー。
- 「重要：addした“時点の内容”がステージされる」ため、add後に再編集すると差分がズレる。

### 詳細解説
- `git add <file>`：特定ファイルだけをコミット対象にする。
- `git add .` / `git add -A`：まとめてステージ（運用ルールがあるなら従う）。
- add後に同じファイルを編集すると、**ステージ済み内容とWorkの内容が分離**します（`git diff` と `git diff --cached` で差が見える）。

### Tips（実務）
- 事故を減らす“上級の基本”：
  - `git add -p`（差分の塊単位で選別。小さなコミットにできる）
- 「レビューしやすいPR」に直結します：1コミット＝1意図（変更理由が一つ）を目指す。

---

## ５ 履歴の確定：スナップショット作成 `git commit`

![GC5.履歴の確定：スナップショットの作成（git_commit）](/images/github/GC5.履歴の確定：スナップショットの作成（git_commit）.jpg)

### 図の要旨
- commitは「差分の記録」ではなく「スナップショットの確定」。
- 内部では `blob/tree/commit` オブジェクトを作り、最後に **HEAD（現在地）** を新コミットへ進める。

### 詳細解説
- `git commit -m "message"`：Stageの内容をLocal Repoへ確定。
- 図の流れ：
  - **Blob**：ファイル内容
  - **Tree**：ディレクトリ構造
  - **Commit**：メタ情報＋Tree参照＋親Commit参照
- 「スナップショット」なので、履歴の切り替え（別コミットへ移動）が“状態の展開”として自然に行えます。

### Tips（実務）
- コミットメッセージの最低限の型（レビュー効率が上がる）：
  - 1行目：何をしたか（命令形）
  - 2行目以降：なぜしたか（背景・制約・影響）
- 「コミット粒度が大きい」ほど後で `revert` や `cherry-pick` が辛くなります。

---

## ６ 並行世界を作る：ポインタとしてのブランチ

![GC6.並行世界を作る：ポインタとしてのブランチ](/images/github/GC6.並行世界を作る：ポインタとしてのブランチ.jpg)

### 図の要旨
- ブランチの実体は「コミットを指すポインタ（付箋）」。
- HEADは「現在作業しているブランチ」を指す（通常は **ポインタのポインタ**）。

### 詳細解説
- `git switch -c feature/x`：新しい付箋（ブランチ）を作り、HEADをそこへ移す。
- ブランチ切替は、Workのファイルを **そのブランチ先端コミットの状態**へ差し替える（未コミットがあると衝突することがある）。

### Tips（実務）
- 用語を整理すると迷いが減ります：
  - **コミット**：実体（保存点）
  - **ブランチ**：実体を指す付箋
  - **HEAD**：いま自分が乗っている付箋（またはコミット）を指すしるし
- “ブランチは軽い”ので、作業開始時に切るのが安全 **（mainを汚さない）**。

---

## ７ 世界への公開：リモートへ転送 `git push`

![GC7.世界への公開：リモートへの転送（git_push）](/images/github/GC7.世界への公開：リモートへの転送（git_push）.jpg)

### 図の要旨
- pushは「ローカルにあるコミットをリモートへ転送し、リモート側のブランチポインタを進める」。

### 詳細解説
- `git push origin <branch>`：`origin`（リモート名）へブランチを送る。
- 図のとおり、コミットCがリモートに存在しない場合、それを送って `origin/main` 等の参照を更新します。
- リモートの履歴が自分の履歴の祖先である場合は **fast-forward** で安全に進みます。

### Tips（実務）
- pushできない典型 **（non-fast-forward）** は「リモートが先に進んだ」状態。
  - まず `git fetch` → 差分確認 → `git pull`（またはmerge/rebase方針に従う）
- PR運用なら、基本は `main` へ直接pushせず、作業ブランチをpushしてPR作成。

---

## ８ 受信と同調：`fetch` と `pull` の決定的違い

![GC8.受信と同期：fetchとpullの決定的違い](/images/github/GC8.受信と同期：fetchとpullの決定的違い.jpg)

### 図の要旨
- `fetch` は安全（取り込むだけ、Workは変えない）
- `pull` は統合（取り込んでWorkも変わり得る、コンフリクトリスク）

### 詳細解説
- `git fetch origin`：
  - リモート追跡ブランチ（例：`origin/main`）だけ更新
  - 自分のWork/現在ブランチは基本そのまま
- `git pull origin main`：
  - 実質 `fetch + merge`（またはrebase設定）
  - Workが書き換わる可能性があり、衝突が発生し得ます

### Tips（実務）
- **慣れるまでは「fetch→確認→統合」が安全です**：
  1) `git fetch origin`
  2) `git log --oneline --graph --decorate main..origin/main`
  3) `git merge origin/main`（チーム方針がrebaseならそれに従う）

---

## ９ 履歴の統合：`merge` vs `rebase`

![GC9.歴史の統合：マージvsリベース](/images/github/GC9.歴史の統合：マージvsリベース.jpg)

### 図の要旨
- merge：分岐・合流を残す（マージコミットができる）
- rebase：履歴を付け替えて直線化する（コミットIDが変わる＝履歴改変）

### 詳細解説
- `git merge feature`：
  - 2つの履歴を「統合」し、必要に応じてマージコミットを作る
  - “何が起きたか”が履歴に残りやすい
- `git rebase main`（例）：
  - 自分のコミット列を別の基点へ付け替える
  - 見た目は綺麗だが、公開済みコミットを触ると他人の履歴と食い違う

### Tips（実務）
- 図の警告どおりの鉄則：
  - **Push済み（公開済み）のコミットはrebaseしない**
- チームで決めるべきポイント：
  - 「PR前はrebaseで整える」or「mergeで合流履歴を残す」
  - どちらでも良いが、混在が最悪（事故の原因）です。

---

## １０ 時間操作①：やり直し `git reset`（soft/mixed/hard）

![GC10.時間操作①：やり直し（git_reset）](/images/github/GC10.時間操作①：やり直し（git_reset）.jpg)

### 図の要旨
- resetは「HEADを過去へ動かす」コマンドで、**Stage/Workをどう扱うか**が3モードで違う。

### 詳細解説
- `--soft`：HEADだけ戻す（StageもWorkも保持）
  - 「コミットをやり直したい（メッセージ/まとめ方）」に向く
  - commitメッセージのWIP（仕掛中）の場合の取り戻しなどに向く
- `--mixed`（デフォルト）：HEAD戻す＋Stageを解除（Workは保持）
  - 「addをやり直したい（選別し直す）」に向く
- `--hard`：HEAD戻す＋Stage/Workも破棄
  - 保存していない変更が消える（危険）

### Tips（実務）
- 迷ったらまず `--mixed`、`--hard` は最後の手段。
- “安全確認”の癖：
  - reset前に `git status` と `git diff`、必要なら `git stash`。

---

## １１ 時間操作②：変更の取り消し `restore / checkout`

![GC11.時間操作②：変更の取り消し（restoreとcheckout）](/images/github/GC11.時間操作②：変更の取り消し（restoreとcheckout）.jpg)

### 図の要旨
- `restore` は「ステージ解除」や「作業変更破棄」を明示的に行える。
- 旧来の `checkout` は多機能すぎるため、近年は `switch/restore` へ分離されている。

### 詳細解説
- ステージ解除（Unstage）：
  - `git restore --staged <file>`（内容はWorkに残る）
- 作業変更の破棄（Discard Changes）：
  - `git restore <file>`（元に戻る＝戻せないことがあるので注意）
- 直前コミットの修正：
  - `git commit --amend`（ステージ内容を直前コミットに積み直す）

### Tips（実務）
- “捨てる前に”確認：
  - `git diff` で何を捨てるか見てから `restore`
- 「戻せない」が怖い場合は、まず退避：
  - `git stash -u`（未追跡も含め退避）

---

## １２ 一時退避：作業机の片付け `git stash`

![GC12.一時退避：作業机の片付け（git_stash）](/images/github/GC12.一時退避：作業机の片付け（git_stash）.jpg)

### 図の要旨
- stashは「コミットしたくないが、今の変更を退避したい」時の避難場所。
- 内部的にはコミット相当のオブジェクトとして保存される。

### 詳細解説
- `git stash`：退避（Modified/Stagedを片付けてWorkを綺麗に）
- `git stash list`：一覧
- `git stash apply`：復元（stashは残る）
- `git stash pop`：復元＋stash削除

### Tips（実務）
- 割り込み対応の定番フロー：
  1) `git stash -u`（未追跡も含めると事故が減る）
  2) ブランチ切替して対応
  3) `git stash pop` で戻す
- stashは“何を退避したか”が曖昧になりやすいので、メッセージ推奨：
  - `git stash push -m "WIP: before refactor"`

---

## １３ コンフリクト（競合）の解決フロー

![GC13.コンフリクト（競合）の解決フロー](/images/github/GC13.コンフリクト（競合）の解決フロー.jpg)

### 図の要旨
- 競合は「どちらかを選ぶ」ではなく「両方を統合して正しい状態にする」作業。
- 手順は基本的に **修正 → add → commit**。

### 詳細解説
- 発生条件：merge/pullなどで、同一ファイルの同一箇所を別々に変更していた。
- Gitはファイルに競合マーカー（`<<<<<<<` 等）を入れ、手動解決を促します。
- 解決の型：
  1) マーカーを探して正しい内容に編集
  2) `git add <file>`（解決済としてステージ）
  3) `git commit`（統合コミット作成）

### Tips（実務）
- 解決を早くするコツ：
  - 競合したファイルを「小さく」「責務分離」しておく（巨大ファイルは地獄）
  - PRを小さく刻む（衝突面積が減る）
- 競合の“前兆”は `fetch` 後の差分確認で見えます。

---

## １４ 管理の裏側：`.git` と `.gitignore`

![GC14.管理の裏側：.gitと.gitignore](/images/github/GC14.管理の裏側：.gitと.gitignore.jpg)

### 図の要旨
- `.git` はGitの本体（履歴・参照・オブジェクトがある）。消すと履歴が消える。
- `.gitignore` は「追跡したくないファイルのルール」。ただし **既に追跡済みには効かない**。

### 詳細解説
- `.git/`：コミット履歴、HEAD情報、オブジェクト、設定等が格納される。
- `.gitignore`：OS生成物、ビルド成果物（例：`node_modules/`）、秘密情報（`.env`）などを除外する。
- 重要：すでに追跡されているファイルは `.gitignore` に書いても止まりません。

### Tips（実務）
- 追跡済みを追跡解除（ファイルは残す）：
  - `git rm -r --cached <path>`
  - `git commit -m "Stop tracking <path>"`
- 初期コミット前に `.gitignore` を整えると、履歴が綺麗に保てます。

---

## １５ Gitコマンド・マップ（最終まとめ）

![GC15.Gitコマンドとマップ](/images/github/GC15.Gitコマンドとマップ.jpg)

### 図の要旨
- 忘れたらこの地図に戻る：「データはいまどこ？どこへ動かす？」→コマンドが決まる。
- （絵にはないがgit reset --soft HEAD~1はgit commitの逆方向）

### 詳細解説
- Work ⇄ Stage：`add` / `restore --staged`
- Stage → Local：`commit`
- Local → Remote：`push`
- Remote → Local：`fetch`
- Remote →（統合して）Work：`pull`
- Local → Work：`reset/checkout/restore`（過去状態へ戻す・やり直す）
- Work → Stash：`stash`（一時退避）

### Tips（実務）
- “地図”を使う最短の思考テンプレ：
  1) **いま**：Work/Stage/Local/Remote のどこがズレてる？
  2) **したい**：確定？共有？取り込み？取り消し？退避？
  3) **対応コマンド**：地図の矢印を辿る
- 初心者の安定運用は「fetch→確認→merge/pull」。慣れてからrebaseやreset-hard。


## 追記メモ（reflog）について

## reflogは「失われたはずの履歴」を取り戻すために使います

**reflog（参照ログ）** は、コミット履歴（`git log`）とは別に、あなたのローカルで **HEADやブランチ先端が“どこを指していたか”の移動履歴**を記録しています。
そのため、`reset`・`rebase`・`checkout` などで「行方不明に見えるコミット」を救出する用途が主です。


## 典型的な活用シーン（いつ使うか）

### 1) `reset --hard` で戻し過ぎた（やらかした）

* 症状：ファイルが戻ってしまい、コミットも消えたように見える
* reflogで「戻す前のHEAD」を探して戻せます

よく使う流れ：

```bash
git reflog
# 例: HEAD@{3}: reset: moving to HEAD~1
# 例: <hash> HEAD@{4}: commit: add feature X

git switch -c rescue/<name> <hash>
# または
git reset --hard <hash>
```


### 2) rebaseで履歴を改変して、元のコミット列を見失った

* 症状：rebase前のコミットが `log` から消えたように見える
* reflogに rebase前のHEADが残るので、そこから救出できます

```bash
git reflog
git switch -c rescue/pre-rebase <hash>
```


### 3) Detached HEADでコミットしてしまい、戻ったら“消えた”

* 症状：detachedで作ったコミットがブランチから辿れない
* reflogは「HEADがそこにいた」証拠を持っているので拾えます

```bash
git reflog
git switch -c rescue/detached <hash>
```


### 4) `commit --amend` で前のコミットを上書きしたが、元に戻したい

* `--amend` はコミットIDが変わる（旧コミットが見えなくなる）
* reflogで旧コミットに戻せます


### 5) ブランチを消した（`git branch -D`）が、コミット自体は残っているはず

* ブランチ（付箋）は消えても、コミットはすぐには消えません
* reflog（またはそのコミットID）から復元できます


## reflogで“何が記録されるか”（重要）

* 記録されるのは **ローカルの参照移動**（HEAD、各ブランチ先端など）
* 例：checkout/switch、commit、reset、merge、rebase、pull など
* **他人のPCの操作や、GitHub上の参照ログは基本見えません**
* **保持期限**がある（ずっと無限ではない）ので、気づいたら早めに救出が安全です


## 最小で覚えるコマンド（これだけで救出できる）

```bash
git reflog
```

→ 出てきた「戻したい時点の `<hash>`」に対して

**安全な救出（推奨）**：

```bash
git switch -c rescue/<name> <hash>
```

「完全に巻き戻す」（影響が大きいので慎重に）：

```bash
git reset --hard <hash>
```


## まとめ

* reflogは **「参照（HEAD/ブランチ）がどこを指していたかの履歴」**
* 主な用途は **事故（reset/rebase/amend/detached/branch削除）からの復旧**
* まず `git reflog` → 見つけたハッシュで `git switch -c rescue/... <hash>` が安全

# Gitのメンタルモデル
### ・コマンドの暗記から、仕組みの理解へ
### ・Gitが内部でどのようにデータを管理し、動いているかを理解することが重要

---

## １　メンタルモデルを持つとGitは怖くない

![Git1.Gitのメンタルモデル](/images/github/Git1.Gitのメンタルモデル.jpg)

### 図の要旨
- Gitは「コマンドの暗記」ではなく「データ構造（履歴の持ち方）」を理解すると急に扱いやすくなる。

### 詳細解説
- 多くの混乱は「Gitが何を保存しているか」をイメージできていないことから起きます。
- 以降のスライドは、Gitが **“差分” ではなく “スナップショット”** を保存し、**ポインタ（参照）**　で世界を作っていることを段階的に示します。

### Tips（実務）
- 迷ったら「いま何がどこにあるか」を `git status` と `git log --oneline --decorate --graph` で確認する癖を付けると安定します。

---

## ２ 差分ではなく、スナップショットを記録する

![Git2.差分ではなく、スナップショットを記録する](/images/github/Git2.差分ではなく、スナップショットを記録する.jpg)

### 図の要旨
- SVN等の「差分（delta）」中心の考え方と違い、Gitは各コミットで **ファイル集合のスナップショット**を扱う。

### 詳細解説
- Gitは「毎回全部コピー」しているわけではありません。
- **変更のないファイルは“前の内容へのリンク（参照）”**　として再利用されるため、履歴が増えても効率が出ます。
- これにより、ブランチ切替・履歴参照が高速かつ自然になります（“状態の切替”が本質）。

### Tips（実務）
- 「なぜブランチ切替が速いのか？」はこのページが答えです。
- 内部を覗く（余力があれば）：
  - `git show --name-only HEAD`
  - `git cat-file -p HEAD`（コミットオブジェクトの中身）

---

## ３ ローカルにおける3つの作業エリア

![Git3.ローカルにおける3つの作業エリア](/images/github/Git3.ローカルにおける3つの作業エリア.jpg)

### 図の要旨
- Git操作は、基本的に **Working Tree / Staging Area / Repository** の3領域で理解できる。

### 詳細解説
- **Working Tree（作業ディレクトリ）**：あなたが編集している実ファイル
- **Staging Area（ステージ）**：次のコミットに入れる変更を選ぶ場所（配送台）
- **Repository（.git）**：確定した履歴（スナップショット）が保存される場所（アルバム）

### Tips（実務）
- 「コミットに入れる/入れない」を分けたいなら、必ずステージを使います。
  - `git add <file>`（選別）
  - `git add -p`（部分的に選別：差分単位で対話）

---

## ４ コマンドはエリア間の移動指示である

![Git4.コマンドはエリア間の移動指示である](/images/github/Git4.コマンドはエリア間の移動指示である.jpg)

### 図の要旨
- Gitコマンドは「3エリア間でデータをどう動かすか」の命令とみなせる。

### 詳細解説
- `git add`：Working Tree → Staging
- `git commit`：Staging → Repository（履歴確定）
- `git checkout / git switch`：Repositoryのあるスナップショットを Working Tree に展開（状態を切り替える）
- そして `git status` が「いまどの状態か」を示す羅針盤。

### Tips（実務）
- “安全運用の型”：
  1) `git status`
  2) `git diff`（未ステージ差分）
  3) `git diff --cached`（ステージ差分）
  4) `git commit -m "..."`

---

## ５ コミットは数珠繋ぎのグラフである（DAG）

![Git5.コミットは数珠つなぎのグラフである](/images/github/Git5.コミットは数珠つなぎのグラフである.jpg)

### 図の要旨
- コミットは「変更点」ではなく、**親へのリンクを持つノード**で、履歴はグラフ構造になる。

### 詳細解説
- コミットは概念的に次を含みます：
  - `tree`（その時点のファイル集合）
  - `parent`（親コミット：1つ以上）
  - `author` / `message`
- したがって、履歴は一直線だけでなく分岐・合流します（ブランチ/マージの正体）。

### Tips（実務）
- まずは見える化：
  - `git log --oneline --decorate --graph --all`
- 「どのコミットに何が入ったか」を追うなら：
  - `git show <commit>`（内容の確定確認）

---

## ６ ブランチの実体は「付箋」である（ファイルのコピーではない）

![Git6.ブランチの実体は「付箋」である](/images/github/Git6.ブランチの実体は「付箋」である.jpg)

### 図の要旨
- ブランチは「ファイルの複製」ではなく **特定コミットを指すポインタ**（付箋）である。

### 詳細解説
- ブランチ名（例：`main`）は、あるコミットを指しているだけ。
- つまりブランチ作成は重くなく、「付箋を1枚増やす」イメージ。

### Tips（実務）
- 「ブランチ＝コピー」と誤解すると、操作が全部怖くなります。
- ポインタを“意図的に動かす”例（上級寄り）：
  - `git branch -f main <commit>`（mainを特定コミットへ付け替え）

---

## ７ HEADは「現在の場所」を示すポインタ（ポインタのポインタ）

![Git7.HEADは「現在の場所」を示すポインタ](/images/github/Git7.HEADは「現在の場所」を示すポインタ.jpg)

### 図の要旨
- HEADは「今作業しているブランチ（またはコミット）」を指す参照。

### 詳細解説
- 通常、HEADはブランチを指します（例：HEAD → `main` → あるコミット）。
- GitはHEADを見ることで、「次のコミットでどのブランチが進むべきか」を判断します。

### Tips（実務）
- “今どこ？”を確認：
  - `git branch --show-current`
  - `git rev-parse --short HEAD`
  - `git status -sb`（ブランチ名とahead/behindが見やすい）

---

## ８ ブランチ切替＝HEADの移動＋作業ツリーの書き換え

![Git8.ブランチの切り替えとHEADの移動](/images/github/Git8.ブランチの切り替えとHEADの移動.jpg)

### 図の要旨
- `git checkout testing`（または `git switch testing`）でHEADが移動し、作業ディレクトリがそのスナップショットに切り替わる。

### 詳細解説
- ブランチを切り替える行為は、「作業フォルダのファイル群を別スナップショットへ差し替える」こと。
- ここで未コミットの変更があると、切替できない／競合することがある。

### Tips（実務）
- 切替前の定石：
  - `git status` で汚れを確認
  - 必要なら `git stash`（退避）→切替→`git stash pop`

---

## ９ Detached HEAD状態とは（付箋のない場所に立つ）

![Git9.DetachedHEAD状態とは](/images/github/Git9.DetachedHEAD状態とは.jpg)

### 図の要旨
- 特定コミットを直接チェックアウトすると、HEADがブランチから外れる（Detached）。

### 詳細解説
- Detached HEAD では、新しいコミットを作っても“付箋（ブランチ）”がないため、後で見失いやすい。
- ただし「過去状態の調査」には有用（バグ再現、比較など）。

### Tips（実務）
- 過去コミットを試すなら「ブランチを切ってから」が安全：
  - `git switch -c investigate/<name> <commit>`
- もし作業してしまった後でも救える：
  - `git reflog` → 失ったHEAD位置を探す → ブランチを付ける
- 用語を“1行定義”で再整理
  - コミット（commit）：保存されたスナップショット（実体）。親コミットを指して履歴になる
  - ブランチ（branch）：あるコミットを指す“名前付き参照”（付箋）
  - HEAD：自分が今作業している位置を表す参照（通常はブランチ名を指す）
  - ポインタ（pointer）：コミットを指す参照の総称（ブランチやHEADなど）
  - 付箋：ブランチを直感的に表す比喩（貼り替わって進む）


## １０ ローカルとリモートは「鏡合わせ」の世界

![Git10.ローカルとリモートは「鏡合わせ」の世界](/images/github/Git10.ローカルとリモートは「鏡合わせ」の世界.jpg)

### 図の要旨
- ローカルにも完全な履歴があり、リモート（GitHub）にも履歴がある。“鏡”のように対応する。

### 詳細解説
- ネットワークがなくても作業できるのは、ローカルに履歴（コミット）が揃っているから。
- `origin/main` は「GitHub上main」そのものではなく、**ローカルに保存されたリモート追跡ブランチ**（鏡像）。

### Tips（実務）
- リモート状況を安全に更新：
  - `git fetch origin`
- 差分を見る：
  - `git log --oneline main..origin/main`（リモートにあってローカルにない）
  - `git log --oneline origin/main..main`（ローカルにあってリモートにない）

---

## １１ 同期の基本：Fetch（安全）と Pull（統合）

![Git11.同期の基本：Fetch（安全）とPull（統合）](/images/github/Git11.同期の基本：Fetch（安全）とPull（統合）.jpg)

### 図の要旨
- Fetchは「取ってくるだけ」＝安全。Pullは「取ってきて統合」＝注意が必要。

### 詳細解説
- `git fetch`：リモート情報をローカルの“鏡”へ更新するだけ（作業ツリーは基本不変）
- `git pull`：`fetch` ＋ 現在ブランチへ統合（merge/rebase）→作業ツリーも変わる可能性がある

### Tips（実務）
- 初心者の安定手順はこれです：
  1) `git fetch`
  2) `git status -sb`（behind/ahead確認）
  3) 必要なら `git pull`（または `git merge origin/main`）

---

## １２ Push と Pull Request によるコラボレーション

![Git12.PushとPullRequestによるコラボレーション](/images/github/Git12.PushとPullRequestによるコラボレーション.jpg)

### 図の要旨
- ローカルの作業をリモートへPushし、PRでレビュー→mainへ統合するのが基本の協業モデル。

### 詳細解説
- Push：自分の履歴（コミット）をGitHubへ共有
- Pull Request：差分のレビューと統合（マージ）の提案手続き
- PRは「履歴（ノート）を提出し、採用（マージ）をお願いする」行為と捉えると分かりやすい

### Tips（実務）
- “PR前に最低限やる”：
  - `git status -sb`（汚れとahead確認）
  - `git log --oneline origin/main..HEAD`（PRに入るコミット一覧）
  - `git diff origin/main...HEAD`（PR差分）

---

## １３ 不要ファイルを追跡から除外する（.gitignore）

![Git13.不要なファイルを追跡から除外する（.gitignore）](/images/github/Git13.不要なファイルを追跡から除外する（.gitignore）.jpg)

### 図の要旨
- `.gitignore` は「まだ追跡されていないファイル」に対して有効。不要物をステージへ入れない“フィルタ”。

### 詳細解説
- `node_modules/`, `.env`, `build/`, `.DS_Store` などは追跡対象にしないのが普通。
- 重要：**一度追跡したファイルは `.gitignore` だけでは止まらない**（追跡解除が必要）。

### Tips（実務）
- 追跡解除（ファイルは残してGitだけ外す）：
  - `git rm -r --cached node_modules/`
  - `git commit -m "Stop tracking node_modules"`
- 初期コミット前に `.gitignore` を作るのが最も安全（差分汚染が減る）

---

## １４ 迷った時の羅針盤：git status

![Git14.迷った時の羅針盤（git_status）](/images/github/Git14.迷った時の羅針盤（git_status）.jpg)

### 図の要旨
- `git status` の出力は「次に打つべきコマンド」をほぼ直接示している。

### 詳細解説（状態 → 次の一手）
- `working tree clean`：新しい作業／push/pullの判断へ
- `Changes not staged`：`git add`
- `Changes to be committed`：`git commit`
- `ahead of origin/...`：`git push`
- `behind origin/...`：`git fetch` / `git pull`

### Tips（実務）
- 迷ったらこの順：
  1) `git status -sb`
  2) `git diff`
  3) `git diff --cached`
  4) `git log --oneline --decorate --graph -n 20`

---

## １５ Gitマスターへの道のり（この5点を持ち帰る）

![Git15.Gitマスターへの道のり](/images/github/Git15.Gitマスターへの道のり.jpg)

### 図の要旨
- Gitの本質を5つのキーワードで総復習：
  - Snapshot / Three States / Branch / HEAD / Remote

### 詳細解説
- Snapshot：差分ではなくスナップショット（参照で節約）
- Three States：Working / Stage / Repo
- Branch：移動するポインタ（付箋）
- HEAD：現在地（ポインタのポインタ）
- Remote：共有の鏡（fetch/pull/pushで同期）

### Tips（実務）
- “理解が一段上がる”最小の追加観点：
  - `reflog`（事故復旧の保険）
  - `stash`（割込み作業の退避）
  - `add -p`（ステージを分割して品質を上げる）


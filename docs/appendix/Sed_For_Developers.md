# sed コマンド活用術（開発者向けユースケース10選）解説 + 実務Tips

> sed = Stream Editor（ストリーム編集）
> 1行ずつ読みながら「置換・削除・抽出・整形」を行う、テキスト変換の中核ツール。

---

## １　sedコマンド活用術（開発者向けユースケース10選）

![se1.sedコマンド活用術：開発者向けユースケース１０選](/images/gamehub/se1.sedコマンド活用術：開発者向けユースケース１０選.jpg)

### 図の要旨
「ログ解析〜リファクタリング」まで、sed を使って“ストリーム編集の真価”を引き出すユースケース集。

### 詳細解説
sed は「ファイルを開いて編集する」のではなく、**入力ストリーム（標準入力やファイル）を流しながら変換して出力**します。
- パイプラインに載せやすい（他コマンドと合成しやすい）
- 巨大ファイルでもメモリを食いにくい（原則1行処理）
- 置換ルールを “再現可能な作業” としてスクリプト化できる

### Tips（最初に覚える3本柱）
```bash
# 1) 置換：s///（最頻出）
sed 's/old/new/g' file.txt

# 2) 抽出：-n + p（grepのように必要行だけ）
sed -n '/ERROR/p' app.log

# 3) 削除：d（ノイズ除去）
sed '/^#/d' config.conf
````

---

## ２ sed（Stream Editor）とは？

![se2.sed（StreamEditor）とは？](/images/gamehub/se2.sed（StreamEditor）とは？.jpg)

### 図の要旨

* **軽量＆高速**：巨大ログをメモリ圧迫せずに処理
* **自動化**：シェルスクリプトに組み込み、繰り返し作業を自動化
* **万能**：単純置換〜セキュリティ観点の検知まで対応

### 詳細解説

sed の価値は「編集」ではなく **“変換（transform）”** です。
よくある誤解として「sedは置換だけ」と思われがちですが、実務で効くのは次の2点です。

1. **出力制御（必要なものだけ出す）**
   `-n` と `p` を使うと「一致した行だけ表示」などが可能。
2. **アドレス指定（どの行に適用するか）**
   行番号・正規表現・開始/終了範囲で対象を絞れます。

### Tips（sedの“対象指定”だけ覚える）

```bash
# 行番号で対象指定（1〜10行目だけ表示）
sed -n '1,10p' file.txt

# パターンで対象指定（ERROR行だけ）
sed -n '/ERROR/p' app.log

# 範囲指定（BEGIN〜ENDまで）
sed -n '/BEGIN/,/END/p' file.txt
```

---

## ３ Case 1：基本中の基本：文字列の置換（Basic Substitution）

![se3.基本中の基本：文字列の置換（BasicSubstitution）](/images/gamehub/se3.基本中の基本：文字列の置換（BasicSubstitution）.jpg)

### 図の要旨

`sed 's/oldstring/newstring/g' file.txt`

* `s`：substitute（置換）
* `g`：global（行内の全一致を置換）

### 詳細解説

`s/old/new/` は「1行につき最初の一致だけ」を置換、`g` を付けると「その行の全一致」を置換します。

* **置換の単位は“行”**：`g` は “ファイル全体” ではなく “その行の全一致” の意味です。
* **デフォルト出力**：sed は処理後の行を自動で出力します（`-n` を付けると止まる）。

### Tips（パスの置換は区切り文字を変える）

`/` を含む置換は `#` を使うと読みやすく事故が減ります。

```bash
sed 's#/old/path#/new/path#g' file.txt
```

---

## ４ Case 2：ファイルの直接編集（In-Place Editing）

![se4.ファイルの直接編集（In-PlaceEditing）](/images/gamehub/se4.ファイルの直接編集（In-PlaceEditing）.jpg)

### 図の要旨

* `-i`：ファイルをその場で書き換える（in-place）
* `-i.bak`：バックアップを作ってから書き換える

### 詳細解説

`-i` は強力ですが、**事故ると元に戻せません**。したがって実務では原則 `-i.bak` を推奨します。

* `sed -i 's/ver=1.0/ver=2.0/g' config.conf`
  → 直接書き換え（危険）
* `sed -i.bak 's/ver=1.0/ver=2.0/g' config.conf`
  → `config.conf.bak` を残してから編集（安全）

### Tips（本番作業の安全手順）

```bash
# 1) まずは差分確認（in-placeしない）
sed 's/ver=1.0/ver=2.0/g' config.conf | diff -u config.conf -

# 2) 問題なければバックアップ付きで反映
sed -i.bak 's/ver=1.0/ver=2.0/g' config.conf
```

---

## ５ Case 3：不要な行の削除（Deleting Lines）

![se5.不要な行の削除（DeletingLines）](/images/gamehub/se5.不要な行の削除（DeletingLines）.jpg)

### 図の要旨

コメント行や空行など “ノイズ” を削除し、可読性を上げる。
例：`sed '/^#/d' config.conf`

### 詳細解説

* `d` は delete（その行を出力しない）
* `/^#/` は「行頭が # の行」

構成ファイル・ログの「ノイズ除去」に極めて有効です。

### Tips（空行も含めて削除したい）

```bash
# コメント行と空行を両方削除
sed -e '/^[[:space:]]*#/d' -e '/^[[:space:]]*$/d' config.conf
```

---

## ６ Case 4：特定行の抽出（Filtering/Extraction）

![se6.特定行の抽出（Filtering＆Extraction）](/images/gamehub/se6.特定行の抽出（Filtering＆Extraction）.jpg)

### 図の要旨

grepのように「関心のある行だけ」を取り出す。
例：`sed -n '/error/p' app.log`

* `-n`：自動出力を止める
* `p`：一致行だけ明示的に出力

### 詳細解説

sedで抽出する際の定石は **「-n + p」** です。

* `-n` が無いと、全行が出力されてしまいノイズになります
* `p` は print（出力）

### Tips（大文字小文字を気にせず抽出したい：GNU sed）

```bash
# GNU sed: I フラグ（case-insensitive）
sed -n '/error/Ip' app.log
```

※ macOS(BSD sed) などでは挙動差があるため、環境混在なら `grep -i` と使い分けが安全です。

---

## ７ Case 5：正規表現とキャプチャ（Regex & Capture Groups）

![se7.正規表現とキャプチャ（Regex＆CaptureGruops）](/images/gamehub/se7.正規表現とキャプチャ（Regex＆CaptureGruops）.jpg)

### 図の要旨

行全体ではなく「行中の特定部分だけ」を抜き出して整形する。
例：`sed -r 's/User: (.*)/\1/' users.txt`

* `-r`（または `-E`）：拡張正規表現
* `(.*)`：キャプチャ
* `\1`：1番目のキャプチャ参照

### 詳細解説

キャプチャを使うと「欲しい部分だけを抽出して再構成」できます。
ログからユーザー名、ID、URLパスなどを抜くのに有効です。

* 拡張正規表現が使えると括弧が素直になります（GNUなら `-E` も一般的）
* 置換先で `\1`, `\2`… を使い、抽出した要素を並べ替えできます

### Tips（実務でよくある“抜き出し”）

```bash
# 例：User: JohnDoe から JohnDoe だけ取り出す
sed -E 's/^User:[[:space:]]*(.*)$/\1/' users.txt

# 例：key=value から value だけ取り出す
sed -E 's/^[^=]+=//' .env
```

---

## ８ Case 6：セキュリティ解析：SQLインジェクション検知

![se8.セキュリティ解析：SQLインジェクション検知](/images/gamehub/se8.セキュリティ解析：SQLインジェクション検知.jpg)

### 図の要旨

アクセスログから SQLキーワード（SELECT/UNION など）を含む不審リクエストを抽出。
例：`sed -n '/SELECT/p' access.log`

### 詳細解説

sed単体で“検知”を完結させるというより、**初期トリアージ（怪しい行の抽出）**に向きます。

* まず `-n + /pattern/p` で候補抽出
* 次に `awk` や `jq` で項目分解、件数集計へ

### Tips（キーワード群で拾う／誤検知を抑える）

```bash
# UNION / SELECT / OR 1=1 などをまとめて抽出（拡張正規表現）
sed -nE '/(UNION[[:space:]]+SELECT|OR[[:space:]]+1=1|SELECT[[:space:]])/p' access.log
```

---

## ９ Case 7：機密情報の特定：パスワード漏洩チェック

![se9.機密情報の特定：パスワード漏洩チェック](/images/gamehub/se9.機密情報の特定：パスワード漏洩チェック.jpg)

### 図の要旨

ログに `password` が出ていないか抽出して点検。
例：`sed -n '/password/p' auth.log`

### 詳細解説

“漏洩の有無”を調べる最初の一歩は **露出ワードを抽出して確認**です。

* `password`
* `token`
* `secret`
* `authorization`
* `apikey` など

### Tips（抽出だけでなく“マスクして共有”もセットで）

```bash
# password=xxxxx を password=*** に置換（簡易マスク）
sed -E 's/(password=)[^[:space:]]+/\1***/g' auth.log
```

---

## １０ Case 8：データの整形・サニタイズ（Data Sanitization）

![se10.データの整形とサニタイズ（DataSanitization）](/images/gamehub/se10.データの整形とサニタイズ（DataSanitization）.jpg)

### 図の要旨

`username=John` のように「キー名を落として値だけ」にする等、解析しやすい形に洗う。
例：`sed 's/username=//' access.log`

### 詳細解説

ログやクエリ文字列は “キー=値” 形式が多く、解析では「値だけ」にした方が扱いやすいケースがあります。
sedは **「不要な接頭辞・装飾を落とす」** のが得意です。

### Tips（複数キーをまとめて落とす）

```bash
# username= / id= / role= を削る（値だけ残す）
sed -E 's/(username=|id=|role=)//g' access.log
```

---

## １１ Case 9：メタデータの削除（Metadata Cleanup）

![se11.メタデータの削除（MetadataCleanup）](/images/gamehub/se11.メタデータの削除（MetadataCleanup）.jpg)

### 図の要旨

ヘッダーや説明文を削り、生データ（Raw Data）だけ取り出す。
図の例：

* 行頭の `>` を削る（FASTA形式など）
* 最初のスペース以降（説明文）を削る

### 詳細解説

“ヘッダや注釈が混ざったデータ”を、後段処理に渡しやすいように整えます。

* `^`：行頭
* `.*`：任意の文字列（貪欲）
* ` `（スペース）以降を落とすと「IDだけ残す」等が可能

### Tips（定番2パターン）

```bash
# 1) 行頭の '>' を除去（FASTAヘッダの例）
sed 's/^>//' file.txt

# 2) 最初のスペース以降を削除（ID以外を落とす）
sed 's/ .*//' file.txt
```

---

## １２ Case 10：パイプライン連携（Chaining Tools）

![se12.パイプライン連携（ChainingTools）](/images/gamehub/se12.パイプライン連携（ChainingTools）.jpg)

### 図の要旨

grep / awk / sed を組み合わせ、複雑な処理をワンライナーで実現。
図の例（概念）：

1. grep：対象行を絞る
2. awk：必要列を抜く
3. sed：文字列を置換して仕上げる

### 詳細解説

この「役割分担」が身につくと、ログ解析や一次調査の速度が上がります。

* grep/rg：I/Oを減らす（対象行だけ通す）
* awk：構造化（列抽出・条件・集計）
* sed：変換（置換・マスク・クリーニング）

### Tips（実務で効く“最小の三段活用”）

```bash
# 例：特定IPの行だけ → 日時とステータスだけ → error を ALERT に
rg '192\.168\.' access.log \
| awk '{print $1, $9, $7}' \
| sed 's/error/ALERT/g'
```

※ `rg` を `grep` に置き換えても同様です。

---

## １３ まとめ：sed活用のポイント

![se13.まとめ：sed活用のポイント](/images/gamehub/se13.まとめ：sed活用のポイント.jpg)

### 図の要旨

1. 置換：`s/old/new/g` が基本にして最強
2. フィルタ：`d` / `p` で必要行だけ残す／ノイズを消す
3. 正規表現：キャプチャで“抽出＆再構成”できる
4. 自動化：`-i` で手作業をゼロに（ただしバックアップ推奨）
5. 連携：pipeで grep/awk と組み合わせると強い

### 詳細解説

sedを「置換ツール」で終わらせず、**変換パイプラインの“仕上げ担当”**として使うと効果が最大化します。

### Tips（習熟のロードマップ）

* まずは `s///g`（置換）と `-n + /pat/p`（抽出）を手に馴染ませる
* 次に “ノイズ削除” の `d` と “範囲抽出” を覚える
* 慣れたらキャプチャ `\1` と `-E` を使って「抽出→再構成」へ
* 最後に `-i.bak` と `-f`（sedスクリプト）で自動化・再現性を確立する

---

# 付録：sedの安全運用・実務チートシート

## A. in-place編集（安全版）

```bash
# 差分確認してから
sed 's/foo/bar/g' file.txt | diff -u file.txt -
# 問題なければバックアップ付きで反映
sed -i.bak 's/foo/bar/g' file.txt
```

## B. 「抽出」は -n と p の組を基本に

```bash
sed -n '/ERROR/p' app.log
sed -nE '/(WARN|ERROR)/p' app.log
```

## C. 「削除」は d の一点突破で効く

```bash
# コメントと空行を消す
sed -e '/^[[:space:]]*#/d' -e '/^[[:space:]]*$/d' config.conf
```

## D. キャプチャで“抜く・並べ替える”

```bash
# "User: JohnDoe" → "JohnDoe"
sed -E 's/^User:[[:space:]]*(.*)$/\1/' users.txt
```


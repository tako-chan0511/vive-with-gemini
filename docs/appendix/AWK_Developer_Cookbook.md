# AWK Developer Cookbook 解説 + 実務Tips集

> 目的：ログ解析・データ整形・抽出を「ワンライナー〜小スクリプト」で完結させる。
> AWKは“行を読み、列に分解し、条件に応じて処理する”テキスト処理のポケットナイフ。

## １ 表紙：AWKによるデータ処理（開発者のための高付加価値レシピ10選）

![aw1.AWKによるデータ処理：開発者のための高付加価値レシピ１０選](/images/gamehub/aw1.AWKによるデータ処理：開発者のための高付加価値レシピ１０選.jpg)

### 図の要旨
大量ログ・データを「整形・抽出・集計」まで一気通貫で処理するための、AWKレシピ集（10選）。

### 詳細解説
AWKは、UNIXパイプラインの中で特に強い領域があります。

- **整形（format）**：必要な列だけ抜き出して見やすくする
- **抽出（filter）**：条件に合う行だけ通す
- **集計（aggregate）**：sum / avg / count / group-by を高速に回す
- **軽い変換（transform）**：置換・マスキング・異常検出

`grep/rg` が「探す」、`sed` が「編集する」なら、**awkは「処理する」**担当です（後半のエコシステム図にも対応）。

### Tips（最初に覚える“最小セット”）
```bash
# 1) 列抽出
awk '{print $1, $3}'

# 2) 条件フィルタ
awk '$3==500 {print}'

# 3) 集計（ENDでまとめ）
awk '{sum+=$10} END{print sum}'
````

---

## ２ 前提：AWKのメンタルモデル（Read → Split → Process）

![aw2.AWKのメンタルモデル](/images/gamehub/aw2.AWKのメンタルモデル.jpg)

### 図の要旨

AWKは「行（Record）を読み、列（Field）に分解し、処理を当てる」。
Excelの“行×列”をコマンドラインで再現するイメージ。

### 詳細解説

AWKの基本はこの形です。

```awk
pattern { action }
```

* 1行読むたびに `$1, $2, ...`（列）が更新される
* `pattern` が真なら `action` 実行（省略すると全行真）
* `BEGIN{}` は開始前、`END{}` は終了後に1回だけ動く

よく使う組み込み変数：

* `NR`：全体の行番号（Number of Records）
* `NF`：その行の列数（Number of Fields）
* `FS`：入力の区切り（Field Separator：デフォルトは空白）
* `OFS`：出力の区切り（Output Field Separator）

### Tips（“列”がズレる原因の8割）

* ログが **空白区切りではない**（CSV/TSV/区切りが複数/可変）
* `-F` で区切りを先に正すのが最優先

---

## ３ Recipe 1：The Surgeon（必要な列だけを抽出する）

![aw3.Recipe1：TheSurgeon（必要な列だけを摘出する）](/images/gamehub/aw3.Recipe1：TheSurgeon（必要な列だけを摘出する）.jpg)

### 図の要旨

巨大ログから「URLとステータス」など、必要列だけ切り出す。

### 詳細解説

`print` は指定フィールドのみ出力できます。

```bash
awk '{print $1, $4}'
```

* `$1`：1列目
* `$4`：4列目
* 省略すると `$0`（行全体）

**出力区切り（OFS）はデフォルト空白**なので、TSV/CSVにしたいなら `BEGIN{OFS=","}` などを使います。

### Tips（printfで“整形”が一段上がる）

```bash
# 列幅を揃える（ログ読みやすさUP）
awk '{printf "%-15s %s\n", $1, $4}'
```

---

## ４  Recipe 2：The Filter（条件に合う行だけ通す）

![aw4.Recipe2：TheFilter（条件に合う行だけを通す）](/images/gamehub/aw4.Recipe2：TheFilter（条件に合う行だけを通す）.jpg)

### 図の要旨

例：Status 500 の行だけ抽出する（条件フィルタ）。

### 詳細解説

代表パターンは2系統です。

1. **比較条件**

```bash
awk '$9 == 500 {print}'
```

2. **正規表現マッチ**

```bash
awk '/ERROR/ {print}'
```

`{print}` は省略可能なので、短く書けます。

```bash
awk '$9==500'
awk '/ERROR/'
```

### Tips（数値比較で事故らない）

ログは文字列として入ってくることがあるため、数値として扱いたいときは **強制数値化**が安全です。

```bash
# +0　は文字列を数値に強制変換するテクニック
# 文字列比較の場合は"500"のように表現する
awk '($9+0)==500'
```

---

## ５  Recipe 3：The Accountant（数値を集計・計算する）

![aw5.Recipe3：TheAccountant（数値を集計＆計算する）](/images/gamehub/aw5.Recipe3：TheAccountant（数値を集計＆計算する）.jpg)

### 図の要旨

行ごとに加算し、最後に合計を出す（ENDで1回）。

### 詳細解説

AWKは変数宣言不要で、未初期化は 0（数値文脈）として扱われます。

```bash
awk '{sum += $10} END{print sum}'
```

平均や件数も簡単です。

```bash
awk '{sum += $10; n++} END{print "avg=" sum/n, "n=" n}'
```

### Tips（min/maxも“ワンパス”で取れる）

```bash
awk 'NR==1{min=max=$10}
     {v=$10; if(v<min)min=v; if(v>max)max=v}
     END{print "min",min,"max",max}'
```

---

## ６  Recipe 4：The Translator（CSVや異なる区切り文字を扱う）

![aw6.Recipe4：TheTranslator（CSVや異なる区切り文字を扱う）](/images/gamehub/aw6.Recipe4：TheTranslator（CSVや異なる区切り文字を扱う）.jpg)

### 図の要旨

デフォルト空白区切りではなく、CSV（カンマ）等を正しく扱う。

### 詳細解説

区切りは `-F`（FS指定）で変えます。

```bash
awk -F',' '{print $1, $2}'
```

TSVなら：

```bash
awk -F'\t' '{print $1, $2}'
```

**FSは正規表現**なので、複数区切りにもできます。

```bash
awk -F'[, ]+' '{print $1, $2}'
```

### Tips（CSVの“引用符”があるとAWK単体は難しくなる）

`"New York, NY"` のように **カンマを含む値**があるCSVは、素朴な `-F,` だと割れます。
その場合は次のどれかが堅実です。

* `gawk` のCSVモード（環境依存）
* `csvkit` / `xsv` など専用ツールを使う
* どうしてもAWKなら `FPAT`（フィールドパターン）を使う（中級）

---

## ７  Recipe 5：The Analyst（頻度分布・Group By 集計）

![aw7.Recipe5：TheAnalyst（頻度分布＆GroupBy集計）](/images/gamehub/aw7.Recipe5：TheAnalyst（頻度分布＆GroupBy集計）.jpg)

### 図の要旨

IPごとにカウントするなど、キー別集計（連想配列）を使う。

### 詳細解説

AWKの連想配列（associative array）が本領です。

```bash
awk '{count[$1]++}
     END{for (k in count) print k, count[k]}'
```

* `count[$1]`：キーが文字列でよい（IPやユーザIDなど）
* 1パスで集計可能（巨大ログに強い）

### Tips（上位Nだけ出す：sort連携が実務的）

```bash
awk '{count[$1]++}
     END{for(k in count) print count[k], k}' access.log \
| sort -nr \
| head -10
```

---

## ８  Recipe 6：The Cleaner（重複を排除する）

![aw8.Recipe6：TheCleaner（重複を排除する）](/images/gamehub/aw8.Recipe6：TheCleaner（重複を排除する）.jpg)

### 図の要旨

最初の出現だけ残して重複行を除去する（“初出のみ通す”）。

### 詳細解説

定番イディオム：

```bash
awk '!seen[$0]++'
```

* 初回：`seen[$0]` は 0 → `!0` が真 → 出力 → その後 `++` で1に
* 2回目以降：`seen[$0]` は 1以上 → `!1` が偽 → 出力されない

### Tips（“最後の出現だけ残す”なら発想を逆にする）

最後だけ残すには、全行を覚えて最後に出す（メモリ消費に注意）。

```bash
awk '{line[$0]=NR} END{for(k in line) print line[k], k}' \
| sort -n | cut -d' ' -f2-
```

---

## ９  Recipe 7：The Masker（データマスキング・文字列置換）

![aw9.Recipe7：TheMasker（データのマスキング＆文字列置換）](/images/gamehub/aw9.Recipe7：TheMasker（データのマスキング＆文字列置換）.jpg)

### 図の要旨

共有用ログで個人情報（例：IPの末尾）を伏せる。`gsub` で全置換。

### 詳細解説

`sub` は最初の1回、`gsub` は全て置換です。

```bash
awk '{gsub(/[0-9]+$/, "xxx", $4); print}'
```

上記は「第4列の末尾の数字列」を `xxx` に置換する例（図の意図：末尾だけ伏せる）。

### Tips（IP全体のマスク：ログ共有の定番）

```bash
# 例：IPv4を x.x.x.x に置換
awk '{gsub(/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/, "x.x.x.x"); print}'
```

---

## １０  Recipe 8：The Inspector（異常に長い行を検知）

![aw10.Recipe8：TheInspector（異常な長さの行を検知）](/images/gamehub/aw10.Recipe8：TheInspector（異常な長さの行を検知）.jpg)

### 図の要旨

長すぎる行（攻撃/破損/想定外）を検知する。

### 詳細解説

`length($0)` は行全体の文字数です。

```bash
awk 'length($0) > 100'
```

### Tips（“何が長いのか”を調査できる出力にする）

```bash
awk 'length($0)>100 {print "len="length($0), "line="NR}'
```

---

## １１ Recipe 9：The Slicer（行番号で範囲を指定）

![aw11.Recipe9：TheSlicer（行番号で範囲を指定する）](/images/gamehub/aw11.Recipe9：TheSlicer（行番号で範囲を指定する）.jpg)

### 図の要旨

100〜200行目だけ切り出す。`NR` と条件でスライス可能。

### 詳細解説

```bash
awk 'NR>=100 && NR<=200'
```

* `NR` は全体の行番号
* 複数ファイル入力時、ファイルごとの行番号が欲しければ `FNR` を使う（File Number of Records）

### Tips（ヘッダ行だけ通す/スキップ）

```bash
# 1行目（ヘッダ）だけ
awk 'NR==1'

# 2行目以降
awk 'NR>1'
```

---

## １２ Recipe 10：The Reporter（フォーマットを整えて出力）

![aw12.Recipe10：TheReporter（フォーマットを整えて出力）](/images/gamehub/aw12.Recipe10：TheReporter（フォーマットを整えて出力）.jpg)

### 図の要旨

スペース区切りログをCSVに変換するなど、出力整形を行う。

### 詳細解説

`OFS` を変えると、`print $1,$2,$3` の区切りが変わります。

```bash
awk 'BEGIN{OFS=","} {print $1,$2,$3}'
```

### Tips（ヘッダを付けて“そのまま配れるCSV”に）

```bash
awk 'BEGIN{OFS=","; print "col1","col2","col3"}
     {print $1,$2,$3}'
```

---

## １３ ツールチェーンにおける役割分担（The Ecosystem）

![aw13.ツールチェーンにおける役割分担（TheEcosystem）](/images/gamehub/aw13.ツールチェーンにおける役割分担（TheEcosystem）.jpg)

### 図の要旨

* **Grep/Ripgrep**：検索（高速に探す）
* **AWK**：処理（列抽出・集計・条件分岐）
* **Sed**：編集（置換）

### 詳細解説（実務の黄金パターン）

例：アプリログからERROR行を抽出し、要点だけ整形して出力。

```bash
rg 'ERROR' app.log \
| awk '{print $1, $2, $NF}'
```

“検索→処理→編集”の流れは、次のように整理すると強いです。

* まず `rg` で **対象を狭める**（I/O削減）
* `awk` で **列・条件・集計**を完結させる
* 最後に `sed` で **仕上げ置換**（必要なときだけ）

### Tips（行番号付き検索結果を“列”として扱う）

```bash
rg -n 'ERROR' . \
| awk -F: '{print $1, $2, $3}'
```

---

## １４ よくある「詰まり」と解決策（Common Pitfalls）

![aw14.よくある「詰まり」と解決策（CommonPitfalls）](/images/gamehub/aw14.よくある「詰まり」と解決策（CommonPitfalls）.jpg)

### 図の要旨

1. 区切り文字が合わない
2. 数値比較の失敗（文字列比較になっている等）
3. CSVの引用符問題（カンマを含む値）

### 詳細解説 + Fix

#### 1) 区切り文字が合わない

症状：`$1` に行全体が入る
Fix：`-F` / `BEGIN{FS=...}` で揃える

```bash
awk -F',' '{print $1}'
```

#### 2) 数値比較が失敗

症状：文字列比較で意図しない結果
Fix：`+0` で数値化して比較

```bash
awk '($3+0) > 100'
```

#### 3) CSV引用符問題

症状：`"New York, NY"` が分割される
Fix：専用ツール（csvkit/xsv）か gawkの高度機能（FPAT等）

---

## １５ The Ultimate AWK Cheat Sheet（保存版）

![aw15.TheUltimateAWSCheatSheet（保存版）](/images/gamehub/aw15.TheUltimateAWSCheatSheet（保存版）.jpg)

### 図の要旨（頻出ワンライナー集）

* 列抽出：`awk '{print $1, $3}'`
* CSV：`awk -F',' '{print $1}'`
* 条件：`awk '$3>100'`
* 正規表現：`awk '/ERROR|WARN/'`
* 合計：`awk '{s+=$1} END{print s}'`
* 集計：`awk '{c[$1]++} END{for(k in c) print k,c[k]}'`
* 重複排除：`awk '!seen[$0]++'`
* 文字数フィルタ：`awk 'length($0)>80'`
* 範囲指定：`awk 'NR>=10 && NR<=20'`

### Tips（“参考書”としての次のステップ）

* ワンライナーが長くなったら `-f script.awk` に退避（保守性が上がる）
* `-v name=value` で外部からパラメータ注入（再利用性が上がる）
* 大量データは「rgで絞ってからawk」「awk単体で完結（外部コマンド呼び出しを減らす）」が高速

---

# 付録：実務テンプレ（コピペ用）

## A) BEGIN / 本体 / END の基本骨格

```bash
awk -v TH=100 '
BEGIN{FS=" "; OFS="\t"}
$3+0 > TH {cnt++; sum += $3}
END{print "cnt",cnt,"sum",sum}
' input.log
```

## B) “ログからTopN”の定番

```bash
rg 'ERROR' app.log \
| awk '{c[$NF]++} END{for(k in c) print c[k], k}' \
| sort -nr | head
```

## C) “マスクして共有”の定番

```bash
awk '{gsub(/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/,"x.x.x.x"); print}' app.log
```
## C) “文字列置換（sed代替例）

```bash
#1行につき最初の1箇所だけ置換（sed 's/a/b/' 相当）
awk '{sub(/foo/, "bar"); print}'
awk '{sub(/foo/, "bar")}1'      #アクション{}があるので'1'を書く
#全箇所置換（sed 's/a/b/g' 相当）
awk '{gsub(/foo/, "bar"); print}'
#特定列だけ置換（列を壊さない）
awk '{$3="***"; print}'
#4列目の末尾だけ置換（IDの下4桁を伏せる等）
awk '{sub(/[0-9][0-9][0-9][0-9]$/, "****", $4); print}'
#複数置換（sedで s を重ねるのと同等）
awk '{
  gsub(/ERROR/, "E");
  gsub(/WARN/,  "W");
  print
}'
```
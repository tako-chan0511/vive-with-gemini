# 閉域網 curl 完全攻略ガイド

プロキシの壁を越え、通信の真実を見る「魔術師」のツール


## この資料の読み方（最重要）

閉域網での「繋がらない」は、だいたい次の3系統に分類できます。

1. **プロキシの壁**（そもそも外に出られない／認証で止まる）
2. **SSL/TLSの検問**（証明書が信用できず止まる／SSLインスペクション）
3. **名前解決の封鎖**（DNSが引けず止まる／内部名・外部名のズレ）

そして、curl は “ダウンロードツール” ではなく **通信のどこで詰まっているかを切り分ける診断器**として使います。

---

## 1. 表紙：閉域網 curl 完全攻略ガイド

![curl1.閉域網curl完全攻略ガイド](/images/network/curl1.閉域網curl完全攻略ガイド.jpg)

### 図の要旨

* このガイドは、閉域網（イントラネット・強制プロキシ環境など）で **curl を使って通信障害の原因を切り分ける**ことが目的です。
* “インターネットでは当たり前”の設定が、閉域網では当たり前ではありません。

### 詳細解説（用語）

* **閉域網**：インターネットから分離、または厳しく制御されたネットワーク。出口が限定され、通信には制約が多い。
* **プロキシ**：端末の代わりに外部へアクセスする“門番”。多くの閉域網では必須経路。
* **curl**：HTTP/HTTPS を中心に、DNS/TCP/TLS/HTTP の各段階を観測できるツール。

### Tips（実務）

* 最初から「全部直す」より、**“どの段階で止まってるか” を特定**すると復旧が早いです（次ページ以降の型で進めます）。

---

## 2. なぜ、あなたの curl は通らないのか？

![curl2.なぜ、あなたのcurlは通らないのか？](/images/network/curl2.なぜ、あなたのcurlは通らないのか？.jpg)

### 図の要旨

閉域網でよくある失敗は、主にこの3つです。

1. **プロキシの壁**：認証が必要／プロキシ未設定
2. **SSL/TLSの検問**：証明書が信用できない（SSLインスペクション）
3. **名前解決の封鎖**：DNS が引けない（社内DNS/外部DNSの差）

### 典型エラー（見たら即分類）

* **プロキシ系**

  * `407 Proxy Authentication Required`（認証が必要）
  * `Failed to connect to proxy`（到達できない）
* **証明書系**

  * `SSL certificate problem: self signed certificate in certificate chain`
  * `unable to get local issuer certificate`
* **DNS系**

  * `Could not resolve host`
  * `Name or service not known`

### Tips（実務）

* “インターネット側の当たり前”は、閉域網では“異常”になることが多いです。
  **まずは環境（プロキシ・証明書・DNS）を疑う**のが近道です。

---

## 3. curl は「ダウンローダー」ではない。「聴診器」だ。

![curl3.curlは「ダウンローダー」ではない.「聴診器」だ](/images/network/curl3.curlは「ダウンローダー」ではない.「聴診器」だ.jpg)

### 図の要旨

通信は、だいたいこの4段階で進みます。

1. **DNS Lookup**（名前 → IP）
2. **TCP Connect**（IP:Port に接続）
3. **TLS Handshake**（HTTPS の暗号・証明書）
4. **Data Transfer**（HTTP リクエスト/レスポンス）

どこで止まるかで、犯人が絞れます。

### 詳細解説（用語）

* **DNS Lookup**：`example.com` のような名前を、実際のIPに引く処理
* **TCP Connect**：ネットワークとして到達できるか（FW/Proxy/経路）
* **TLS Handshake**：証明書の検証・暗号方式の合意
* **Data Transfer**：HTTPとして成立しているか（ヘッダ、認証、API仕様）

### Tips（実務）

* 体感で「遅い／繋がらない」を語ると迷走します。
  **curl で“どの段階で止まったか”を証拠化**すると、対応者（NW/Proxy/セキュリティ）に一発で伝わります。

---

## 4. Level 1：プロキシの城壁を越える（環境変数の設定）

![curl4.Level1：プロキシの城壁を超える（環境変数の設定）](/images/network/curl4.Level1：プロキシの城壁を超える（環境変数の設定）.jpg)

### 図の要旨

多くのツールは、まず環境変数（http_proxy / https_proxy / no_proxy）を見ます。
ここが未設定だと、閉域網では外に出られません。

### コマンド解説（Linux/macOS：bash/zsh）

```bash
# 小文字が推奨されることが多い（ツールの実装差・古い脆弱性対策等）
export http_proxy="http://user:pass@proxy.example.co.jp:8080"
export https_proxy="http://user:pass@proxy.example.co.jp:8080"

# プロキシを通さない宛先（社内システム、localhost等）
export no_proxy="localhost,127.0.0.1,.example.co.jp"
```

#### それぞれの意味

* `http_proxy`：HTTP 用（平文通信）
* `https_proxy`：HTTPS 用（現代の主流なので必須級）
* `no_proxy`：例外リスト。ここを間違えると **社内宛がプロキシへ吸われて失敗**します。

### コマンド解説（Windows：PowerShell）

PowerShell は“現在のセッションだけ”ならこう書けます。

```powershell
$env:HTTP_PROXY  = "http://user:pass@proxy.example.co.jp:8080"
$env:HTTPS_PROXY = "http://user:pass@proxy.example.co.jp:8080"
$env:NO_PROXY    = "localhost,127.0.0.1,.example.co.jp"
```

### Tips（実務）

* まず `no_proxy` を最小から始めるのが安全です（例：`localhost,127.0.0.1`）。
  いきなり社内ドメインを大量に入れると、想定外の迂回が増え、切り分けが難しくなります。

---

## 5. Level 2：認証情報の罠（URLエンコード）

![curl5.Level2：認証情報の罠（URLエンコード）](/images/network/curl5.Level2：認証情報の罠（URLエンコード）.jpg)

### 図の要旨

プロキシパスワードに `@` `:` `!` などが含まれると、URLとして解釈が壊れます。
→ **URLエンコード（%40 など）** が必要です。

### 具体例（Bad → Good）

* Bad（`@` が区切りに見えて壊れる）

  * `http://user:P@ssword@proxy...:8080`
* Good（`@` を `%40` に変換）

  * `http://user:P%40ssword@proxy...:8080`

### 安全な書き方（履歴にパスワードを残しにくい）

* プロキシ指定：`-x`（または `--proxy`）
* プロキシ認証：`-U`（または `--proxy-user`）

```bash
curl -x http://proxy.example.co.jp:8080 -U "user:pass" https://example.com
```

### Tips（実務）

* URLに直書きは事故りやすいです。特に **端末ログ/シェル履歴/スクショ**に残ります。
  実務では `-U` や `.netrc`（後述）に寄せると安全です。

---

## 6. Level 3：SSL/TLSの検問（MITM/SSLインスペクションへの対処）

![curl6.Level3：SSL＆TLSの検問（MITM攻撃への対処）](/images/network/curl6.Level3：SSL＆TLSの検問（MITM攻撃への対処）.jpg)

### 図の要旨

閉域網では、通信を一度復号して検査する **SSLインスペクション**があり得ます。
その場合、ツールが社内ルート証明書を信頼していないと SSL エラーで止まります。

### コマンド解説（危険な回避：Devil’s Path）

```bash
curl -k https://example.com
# または
curl --insecure https://example.com
```

* 証明書検証を無効化して“強引に通す”方法です。
* **本番・機密データでは絶対に使わない**（事故の温床）。

### コマンド解説（正攻法：Angel’s Path）

```bash
curl --cacert /path/to/company-root.crt https://example.com
```

* 社内ルート証明書を指定して、正しく検証できるようにします。

### 詳細解説（用語）

* **MITM（Man-in-the-Middle）**：通信途中に割り込み、復号/検査/再暗号化する（攻撃にも同様の手法がある）
* **ルート証明書**：検証の起点。“これを信頼する”という前提がないと証明書チェーンが成立しない

### Tips（実務）

* 証明書ファイル（`.crt`/`.pem`）は **インフラ担当から正式配布されたもの**を使うのが鉄則。
* 「curl は通るが他ツールが通らない」は、**ツールごとに信頼ストアが違う**のが原因のことがあります（OS信頼/独自信頼）。

---

## 7. Windowsユーザーへの警告（PowerShellの罠）

![curl7.Windowsユーザへの警告（PowerShellの罠）](/images/network/curl7.Windowsユーザへの警告（PowerShellの罠）.jpg)

### 図の要旨

PowerShell の `curl` は、しばしば **curl(本体)ではなく `Invoke-WebRequest` のエイリアス**です。
結果として、Linux想定のコマンドがそのまま動きません。

### 典型症状

```powershell
curl https://google.com
```

* IE エンジン関連のエラーが出る／期待した `-v` などが効かない、等。

### 解決策（実務で効く順）

1. **本物を呼ぶ**

```powershell
curl.exe https://example.com
```

2. **エイリアスを削除（セッション内）**

```powershell
Remove-Item alias:curl
```

3. **別シェルを使う**

* `cmd.exe`、Git Bash、WSL（Ubuntu）など

### Tips（実務）

* チーム内で「PowerShell前提」か「WSL前提」かが混在すると事故ります。
  “手順書の前提シェル” を明記すると、問い合わせが激減します。

---

## 8. 魔術師の眼：詳細ログ（-v）を読む

![curl8.魔術師の眼：詳細ログ（-ｖ）を読む](/images/network/curl8.魔術師の眼：詳細ログ（-ｖ）を読む.jpg)

### 図の要旨

`-v`（verbose）で、**どこまで進んだか**が分かります。
閉域網では特に「プロキシに届いたか」「CONNECTが通ったか」「TLSで死んだか」が重要です。

### コマンド

```bash
curl -v https://example.com
```

### ログの読み方（見どころ）

* `Trying ...`

  * DNS→IPが引けて、接続を試みた
* `Connected to proxy ...`

  * **プロキシ到達OK**
* `CONNECT example.com:443 HTTP/1.1`

  * プロキシへ「トンネル掘って」と依頼（HTTPSの典型）
* `HTTP/1.1 200 Connection established`

  * **トンネル成功（ここまで来れば“壁は越えた”）**
* その後の `TLS handshake` / `certificate` 付近で止まる

  * **証明書・TLSの問題**が濃厚

### Tips（実務）

* “どの行で止まったか”をメモすると、担当切り分けが一瞬です。

  * CONNECT前で死ぬ → NW/Proxy
  * CONNECTは通るがTLSで死ぬ → 証明書/SSLインスペクション
  * TLS後に 401/403 → アプリ/API仕様/認証

---

## 9. 時間の支配：ボトルネックを特定する（-w）

![curl9.時間の支配：ボトルネックを特定する](/images/network/curl9.時間の支配：ボトルネックを特定する.jpg)

### 図の要旨

“遅い”の犯人が **DNSなのか、接続（プロキシ）なのか、サーバなのか**を数字で分解します。

### コマンド（代表形）

```bash
 curl.exe -w "DNS: %{time_namelookup} Connect: %{time_connect} Total: %{time_total}" -o NUL -s https://google.com
```

### 各値の意味

* `time_namelookup`：DNSにかかった時間
* `time_connect`：TCP接続（プロキシ含むことが多い）にかかった時間
* `time_total`：全体（レスポンス完了）までの時間

### Tips（実務）

* DNSが遅い → **社内DNSの混雑/経路/名前解決ポリシー**が疑わしい
* connectが遅い → **プロキシ混雑/経路問題/回線**が疑わしい
* totalだけが遅い → **サーバ側処理/API**の疑いが強い

---

## 10. 現実の書き換え：DNSオーバーライド（--resolve / --connect-to）

![curl10.現実の書き換え：DNSオーバーライド](/images/network/curl10.現実の書き換え：DNSオーバーライド.jpg)

### 図の要旨

hosts を書き換えずに、curl だけ “一時的に” 送り先を変えられます。
LB配下の特定ノード検証、切替前の疎通確認に効きます。

### `--resolve`（名前→IPを固定する）

```bash
curl --resolve example.com:443:10.0.0.1 https://example.com
```

* `example.com` はそのまま使い、接続先IPだけ固定
* **SNI/証明書検証と相性が良い**（名前は変えないため）

### `--connect-to`（接続先だけ差し替える）

```bash
curl --connect-to example.com:443:new-host:443 https://example.com
```

* リクエスト上のホストは維持しつつ、接続先を差し替えるイメージ

### Tips（実務）

* “切替前の新サーバ”を社内検証するのに強いです。
* ただし **証明書が対象ホスト名を満たしているか**は要チェックです（TLSで落ちます）。

---

## 11. APIとの対話：ヘッダーとデータ（-H / -d / -X）

![curl11.APIとの対話：ヘッダーとデータ](/images/network/curl11.APIとの対話：ヘッダーとデータ.jpg)

### 図の要旨

APIは「URLを叩く」だけではなく、**ヘッダー（認証/形式）**と **ボディ（JSON等）**が本体です。

### コマンド解説（基本形）

```bash
curl -X POST https://api.example.com/v1/endpoint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"key":"value"}'
```

#### オプションの意味

* `-X POST`：HTTPメソッドを指定（GET/POST/PUT/DELETE…）
* `-H`：ヘッダー追加（認証、Content-Type、独自ヘッダーなど）
* `-d`：送信データ（多くはJSON）。指定するとPOST扱いになることが多い
* `-i`：レスポンスヘッダーも表示（デバッグに便利）
* `--fail-with-body`（環境によっては `--fail`）：HTTPエラー時に失敗扱い（CIで便利）

### Windowsの改行（超重要）

* bash の `\` は Windows CMD では使えません（PowerShellは別ルール）。
* PowerShell は行継続にバッククォート `` ` `` を使います（ただしコピペ事故が起きやすい）。
  実務では「1行で書く」「WSL/Git Bash を使う」が安全です。

### Tips（実務）

* APIの切り分けでは、まず `-i` を付けて **HTTPステータスと認証ヘッダー**を確認すると最短です。
* “通らない”の多くは、実はネットワークではなく **401/403（認証/権限）**です。

---

## 12. 秘密の管理：.netrc と .curlrc（履歴と漏洩を減らす）

![curl12.秘密の管理：.netrcと.curlrc](/images/network/curl12.秘密の管理：.netrcと.curlrc.jpg)

### 図の要旨

* URLやコマンドに認証情報を直書きすると、**履歴・ログ・スクショ**に残ります。
* `.netrc` や `.curlrc` を使うと、コマンドを安全に保ちやすくなります。

### `.netrc`（認証情報を保存：Home配下）

例（概念）：

```text
machine proxy.example.co.jp
login user
password secret
```

#### 重要：権限

```bash
chmod 600 ~/.netrc
```

* **自分だけ読める**状態にするのが必須（漏洩防止）。

#### 使い方例

```bash
curl -n https://example.com
```

* `-n`：`.netrc` を参照して認証情報を自動投入

### `.curlrc`（curlのデフォルト設定）

例（概念）：

```text
proxy = http://proxy.example.co.jp:8080
```

### Tips（実務）

* “便利”は“漏洩リスク”と表裏一体です。
  共有端末・チーム端末では `.netrc` の運用ルール（保管・配布・削除）を決めましょう。

---

## 13. アーティファクトの転送（Nexus/Artifactory等）

![curl13.アーティファクトの転送（Nexus＆Artifactory）](/images/network/curl13.アーティファクトの転送（Nexus＆Artifactory）.jpg)

### 図の要旨

閉域網では、成果物（zip/jar/wheel等）の **アップロード/ダウンロード**を repo に対して行う場面が多いです。
curl の基本呪文だけ覚えると強いです。

### 主要コマンド（Key Spells）

#### Upload（アップロード：`-T`）

```bash
curl -T app.zip -u "user:pass" https://repo.local/app.zip
```

#### Download（ダウンロード：`-O`）

```bash
curl -O https://repo.local/app.zip
```

#### Redirect追従（`-L`）

```bash
curl -L -O https://repo.local/app.zip
```

#### 途中再開（`-C -`）

```bash
curl -C - -O https://repo.local/app.zip
```

### Tips（実務）

* CI/CD や自動化では、次をセットにすると安定します。

  * `--retry 3 --retry-delay 2`（一時的な混雑対策）
  * `--connect-timeout 10`（ぶら下がり防止）
  * `--fail`（HTTP 4xx/5xx を失敗扱い）

---

## 14. 魔術師のグリモワール（Cheat Sheet）

![curl14.魔術師のグリモワール（CheatSheet）](/images/network/curl14.魔術師のグリモワール（CheatSheet）.jpg)

### 図の要旨（“分類”で覚える）

#### 診る（観測）

* `-v`：詳細ログ（最重要）
* `-I`：ヘッダーだけ（疎通と仕様確認）

#### 越える（壁を越える）

* `-x`：プロキシ指定
* `-U`：プロキシユーザー（認証）

#### 信じる（証明書）

* `--cacert`：ルート証明書を指定（正攻法）
* `-k`：検証無効（※開発用途限定）

#### 操る（リクエストを作る）

* `-H`：ヘッダー追加（認証・形式）
* `-d`：データ送信（JSON等）
* `-L`：リダイレクト追従

#### 測る（性能・原因切り分け）

* `-w`：時間計測（DNS/Connect/Total）
* `--resolve`：DNS上書き（検証の切り札）

#### 隠す（秘密を残さない）

* `-n`：`.netrc` を使う
* `-K`：設定ファイルを使う（環境に応じて）

### Tips（実務）

* “困ったら `-v`” が最強です。
  それでも迷ったら、次の順で潰します：
  **DNS → Proxy到達 → CONNECT → TLS → HTTPステータス**

---

## 15. 最後の戒律：力には責任が伴う

![curl15.最後の戒律：力には責任が伴う](/images/network/curl15.最後の戒律：力には責任が伴う.jpg)

### 図の要旨

* ログは武器ですが、**貼り方を間違えると事故**になります。
* `-k / --insecure` は“通す力”が強すぎて、**本番に混入すると致命傷**です。

### 実務の鉄則（そのままチェックリストにしてOK）

* **ログを共有する前に削る**

  * APIキー、Bearerトークン、Cookie
  * 社内IP、ホスト名、ユーザー名、メール
  * プロキシURL（認証情報付き）
* **`-k` を本番コード/手順書に残さない**

  * “一時回避”を恒久策にしない（将来の情報漏洩原因）
* **正攻法は `--cacert`（またはOS/ツールに正規証明書を登録）**

  * セキュリティ担当・NW担当と整合を取る

### Tips（実務）

* “貼って良いログ”のテンプレを決めると安全です。例：

  * `curl -v` のうち、**認証ヘッダーやトークンをマスク**したもの
  * 失敗行（`CONNECT`、`SSL certificate problem`、`Could not resolve host` 等）周辺だけ抜粋
  * 発生時刻、ネットワーク種別（自宅/社内/テザリング）、VPN有無、プロキシ有無


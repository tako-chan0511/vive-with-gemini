# プロの netsh テクニック（閉域網サバイバル）
description: WinHTTP/Interface IP/PortProxy/WLAN診断/curl を使って、閉域網の「繋がらない」を切り分け・解決する実務ガイド

# プロの netsh テクニック：閉域網を支配するネットワーク操作術

閉域網（イントラネット・強制プロキシ・SSLインスペクション等）では、**GUIだけ**で頑張るほど迷走します。  
このドキュメントは、Windows標準装備の **netsh** を中心に、**「設定」→「検証」→「後始末」** までを、現場で再現できる形でまとめたものです。

## この資料の読み方（最重要）

閉域網のトラブルは、だいたい次のどれか（または複合）です。

1. **プロキシ問題**：通すべき通信がプロキシに届いていない／認証で止まる  
2. **証明書問題**：SSL/TLS の検査（SSLインスペクション）で証明書が信用できず止まる  
3. **名前解決・経路問題**：DNSが引けない／FWやポート制限／仮想NWのせいで到達できない  

そして重要なのは順番です。

- **(A) 設定**：netsh で OS/ネットワークの状態を正す  
- **(B) 検証**：curl 等で「本当に通るか」を証拠化する  
- **(C) 後始末**：portproxy など “開けた穴” は必ず閉じる（セキュリティ）

## 1. 表紙：プロの netsh テクニック

![netsh1.プロのnetshテクニック：閉域網を制覇する](/images/network/netsh1.プロのnetshテクニック：閉域網を制覇する.jpg)

### 図の要旨
- 閉域網では「普通のネット接続の常識」が通用しない  
- そこで、**標準装備の netsh** を “サバイバルナイフ” として使いこなす

### 用語メモ
- **netsh**：Windowsのネットワーク設定をコマンドで表示・変更できる標準ツール  
- **標準装備**：インストール不要（＝閉域網でも導入しやすい）  

---

## 2. 閉域網という「荒野」の現実

![netsh2.閉域網（ClosedNetwork）という「荒野」の現実](/images/network/netsh2.閉域網（ClosedNetwork）という「荒野」の現実.jpg)

### 図の要旨
閉域網では、次が同時に起きがちです。

- インターネットへの出口が **プロキシ固定**
- 通信が **SSLインスペクション**（復号→検査→再暗号化）
- 許可ポートが限定され、ツールによって挙動が変わる

### よくある症状（典型）
- ブラウザは見れるのに、`docker pull` / `npm install` / `pip install` が失敗
- Windows Update や Store だけ “接続エラー”
- WSL2/Docker 内のサービスを、同僚PCから開けない

### Tips（現場の考え方）
- 「ブラウザで見える」は **合格証ではない**  
  → OSサービスやCLIツールは **別系統**で通信します（次章へ）

---

## 3. あなたのサバイバルナイフ：「netsh」

![netsh3.あなたのサバイバルナイフ：「netsh」](/images/network/netsh3.あなたのサバイバルナイフ：「netsh」.jpg)

### 図の要旨
netsh は、ネットワークの“裏側”を直接操作する道具です。

- プロキシ（WinHTTP）
- IPアドレス切替（interface ip）
- ポート転送（portproxy）
- 無線診断（wlan）

### 用語メモ
- **Network Shell**：ネットワーク設定を操作する “シェル（操作環境）”
- **システム設定**：ユーザー単位でなく、OS全体へ効く設定も扱う

---

## 4. Skill #1：プロキシの罠を断ち切る（WinHTTP vs WinINet）

![netsh4.Skill1：プロキシの罠を断ち切る（WinHTTPとWinINet）](/images/network/netsh4.Skill1：プロキシの罠を断ち切る（WinHTTPとWinINet）.jpg)

### 図の要旨（ここが最大の落とし穴）
- **WinINet（ユーザー設定）**：主にブラウザ系（IE/Edge/Chrome など）
- **WinHTTP（システム設定）**：Windows Update / Store / バックグラウンドサービス等

つまり…

> ブラウザでOKでも、OSサービスは失敗する（世界が違う）

### 症状の例
- ✅ ブラウザ閲覧はOK  
- ❌ Windows Update が失敗  
- ❌ ライセンス認証や一部インストーラが失敗  

---

## 5. WinHTTPの魔術：import proxy（必修コマンド）

![netsh5.WinHTTPの魔術：import_proxy](/images/network/netsh5.WinHTTPの魔術：import_proxy.jpg)

### まず確認（現状把握）
```bat
netsh winhttp show proxy
````

#### 見方（重要）

* `Direct access (no proxy server).`
  → **WinHTTP側はプロキシ未設定**（閉域網では失敗しがち）
* `Proxy Server(s) : ...`
  → WinHTTP側は設定済み。別原因（証明書/DNS/FW）を疑う

### 最短で同期（推奨）

```bat
netsh winhttp import proxy source=ie
```

#### これは何をしている？

* “IEの設定”と書かれていますが、実態は **WinINet側（ユーザーのプロキシ設定）** を
  **WinHTTP（OS側）へコピー**するコマンドです。

### 手動で設定（上級者向け）

```bat
netsh winhttp set proxy proxy-server="proxy.example.com:8080" bypass-list="*.local"
```

* `proxy-server=`：プロキシのホスト:ポート
* `bypass-list=`：プロキシを通さない宛先（社内/ローカルなど）

### 後始末（リセット）

```bat
netsh winhttp reset proxy
```

---

## 6. Skill #2：場所への適応（IPアドレスの瞬時切り替え）

![netsh6.Skill2：場所への適応（IPアドレスの瞬時切替え）](/images/network/netsh6.Skill2：場所への適応（IPアドレスの瞬時切替え）.jpg)

### 図の要旨

* 検証ルーム：固定IPが必須
* 自席：DHCP（自動取得）

GUIで毎回切替すると、**ミス・遅延・設定漏れ**が起きます。
→ コマンド1発＋（可能なら）バッチ化で解決します。

### 事前に「インターフェース名」を確認

多くの例では `Ethernet` ですが、環境により異なります。

```bat
netsh interface show interface
```

---

## 7. 実践：ワンクリックで環境切替（バッチファイル）

![netsh7.実践：ワンクリックで環境切替（バッチファイル）](/images/network/netsh7.実践：ワンクリックで環境切替（バッチファイル）.jpg)

### 検証ルーム（固定IP）例：`lab.bat`

```bat
netsh interface ip set address "Ethernet" static 192.168.1.50 255.255.255.0 192.168.1.1
```

* `static`：固定設定にする
* `192.168.1.50`：自分のIP（現場で指定された値）
* `255.255.255.0`：サブネットマスク（同上）
* `192.168.1.1`：デフォルトゲートウェイ（外へ出る出口）

### 自席（DHCP）例：`desk.bat`

```bat
netsh interface ip set address "Ethernet" dhcp
```

#### 追加Tips：DNSも切り替えが必要な現場

ネットワークによっては DNS を固定指定することがあります。

* DHCPでDNSも自動に戻す：

```bat
netsh interface ip set dns "Ethernet" dhcp
```

* 固定DNSにする（例）：

```bat
netsh interface ip set dns "Ethernet" static 192.168.1.53 primary
```

---

## 8. Skill #3：仮想と現実の架け橋（PortProxy）

![netsh8.Skill3：貸そうと現実の架け橋（PortProxy）](/images/network/netsh8.Skill3：貸そうと現実の架け橋（PortProxy）.jpg)

### 図の要旨

WSL2/Docker は **仮想ネットワーク**に居るため、

* 自分のWindowsからは見えても
* **同僚PC（LAN上）からは直接届かない**

という状況が起きます。

### 典型ユースケース

* 自分のPCで動かしているWeb（例：Dify、社内デモ）を、隣の席の人に触ってもらいたい

### 解決方針

* Windowsが受けた通信（例：80番）を、WSLのIP:ポート（例：3000番）へ転送する
  → `netsh interface portproxy`

---

## 9. ポートフォワーディングの設定（Add / Show / Delete）

![netsh9.ポートフォワーディングの設定](/images/network/netsh9.ポートフォワーディングの設定.jpg)

### 架け橋を作る（Add）

```bat
netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=3000 connectaddress=[WSL_IP]
```

#### パラメータの意味（超重要）

* `v4tov4`：IPv4 → IPv4 の転送
* `listenaddress=0.0.0.0`：Windowsの全NICで待ち受け（＝LANから入ってくる）
* `listenport=80`：Windows側の入口ポート
* `connectaddress=[WSL_IP]`：転送先（WSLのIP）
* `connectport=3000`：転送先ポート（WSL/Docker内のサービスのポート）

### 確認する（Show）

```bat
netsh interface portproxy show all
```

### 橋を落とす（Delete：必須）

```bat
netsh interface portproxy delete v4tov4 listenport=80 listenaddress=0.0.0.0
```

#### 追加Tips：Windows Defender Firewall の注意

portproxy を作っても、FWで塞がれていると外部から繋がりません。
**“無効化” ではなく、必要最小限の許可**（受信規則）を、ルールに従って設定してください。

---

## 10. Skill #4：不可視な電波を可視化する（WLAN診断）

![netsh10.Skill4：不可視な電波を可視化する（WLAN診断）](/images/network/netsh10.Skill4：不可視な電波を可視化する（WLAN診断）.jpg)

### 図の要旨

「Wi-Fiが遅い／切れる」は主観情報だけだと対処できません。
**数字で診断**します。

### コマンド1：今の接続状態（強度・速度など）

```bat
netsh wlan show interfaces
```

#### ここを見る

* `Signal`：受信強度（%）

  * 目安：80%台＝良好、40%台＝不安定になりやすい
* `Receive rate (Mbps)` / `Transmit rate (Mbps)`：リンク速度の目安
* `Channel`：今使っているチャンネル

### コマンド2：周囲APの混雑（干渉）を見る

```bat
netsh wlan show networks mode=bssid
```

#### 用語メモ

* **BSSID**：アクセスポイント（AP）の実体（MACアドレス）
* **Channel**：同じ/近いチャンネル同士は干渉しやすい（特に2.4GHz）

---

## 11. 頼れる相棒：「curl」（聴診器）

![netsh11.頼れる相棒：「curl」（聴診器）](/images/network/netsh11.頼れる相棒：「curl」（聴診器）.jpg)

### 図の要旨

netsh で設定したら、次は **本当に通るか**を確認します。
ブラウザは便利ですが、キャッシュやリダイレクト、認証などを“勝手に処理”してしまい、**生の通信が見えません**。

### 基本動作（生存確認）

```bash
curl -I https://google.com
```

* `-I`：ヘッダーだけ取得（最速チェック）
* レスポンスが返る＝少なくとも「DNS→TCP→TLS→HTTP」が一定進んでいる証拠

---

## 12. 閉域網のための curl 実践テクニック（4つの型）

![netsh12.閉域網のためのcurl実践テクニック](/images/network/netsh12.閉域網のためのcurl実践テクニック.jpg)

### 1) SSLエラーを無視する（MITM対策の“最終手段”）

```bash
curl -k https://example.com
```

### 2) プロキシを一時的に通す（環境変数なしで試す）

```bash
curl -x http://user:pass@proxy.example.com:8080 https://google.com
```

### 3) リダイレクトを追う（301/302で止まらない）

```bash
curl -L https://google.com
```

### 4) 詳細デバッグ（止まっている場所を可視化）

```bash
curl -v https://google.com
```

* DNS解決で止まったのか
* TCP接続で止まったのか
* TLSハンドシェイクで止まったのか
  がログで分かります。

---

## 13. 魔術師の掟：環境変数（HTTP_PROXY / HTTPS_PROXY / NO_PROXY）

![netsh13.魔術師の掟：環境変数（EnvironmentVariables）](/images/network/netsh13.魔術師の掟：環境変数（EnvironmentVariables）.jpg)

### 図の要旨

ツール（Git / Python / Docker / npm 等）は、まず環境変数を見ます。
閉域網では、この3点セットが “最低限の通行手形” になりがちです。

### 1) HTTP_PROXY / HTTPS_PROXY

* プロキシURLを設定します（認証ありの場合は user/pass を含むことも）

例（PowerShell：現在のセッションのみ）

```powershell
$env:HTTP_PROXY  = "http://user:pass@proxy.example.com:8080"
$env:HTTPS_PROXY = "http://user:pass@proxy.example.com:8080"
```

#### 注意：パスワードの特殊文字はURLエンコードが必要

* `@` はURLの区切りに見えるため、`%40` にする等（例：`P@ss` → `P%40ss`）

### 2) NO_PROXY（最重要）

プロキシを通してはいけない宛先リストです。

```powershell
$env:NO_PROXY = "localhost,127.0.0.1,.internal.corp"
```

#### なぜ最重要？

* これを忘れると、`localhost` 宛の通信までプロキシに吸われて迷子になります
  → 例：ローカルで動かすAPI、Docker/WSLの開発サーバが突然つながらない

---

## 14. 魔術師の責任（Security & Ethics）

![netsh14.魔術師の責任（Security＆Ethics）](/images/network/netsh14.魔術師の責任（Security＆Ethics）.jpg)

### 要点

netsh は **システム全体を変える強力コマンド**です。
強い道具ほど、後始末と理解が必須です。

### 鉄の掟（現場で必ず守る）

1. **後始末**：使った portproxy は必ず delete（開けっぱなし＝穴）
2. **理解**：意味が分からないコマンド（特にFW無効化）をコピペしない
3. **規約遵守**：現場のセキュリティポリシーに従い、Shadow-IT化しない

---

## 15. まとめ：閉域網の「魔術師」になれ

![netsh15.閉域網の「魔術師」になれ](/images/network/netsh15.閉域網の「魔術師」になれ.jpg)

### ここまでの武器（整理）

* **WinHTTP**：OSの通信を救う（ブラウザOKでもOSが死ぬ問題を潰す）
* **Interface IP**：場所（検証室/自席）を一瞬で切替える
* **PortProxy**：仮想（WSL/Docker）と現実（LAN）を繋ぐ
* **curl**：通信の真実を診る（証拠化して切り分ける）

### 最後に（現場で強い人の共通点）

制限された環境を嘆くより、**コマンドラインで状況を把握し、証拠を出し、再現できる手順に落とす**。
それが、閉域網で最も信頼されるエンジニアの動き方です。

> さあ、ターミナルを開こう。


# 閉域網サバイバルガイド（Windows CLI完全攻略）
## description: プロキシ・SSLインスペクション・GPO制限下でも、開発者がコマンドラインで原因切り分けと環境構築を進めるための実務ガイド

## 1. 表紙：閉域網サバイバルガイド

![Prc1.閉域網サバイバルガイド](/images/network/Prc1.閉域網サバイバルガイド.jpg)

### 図の要旨

* 閉域網（イントラネット）では、**プロキシ**・**SSL検査**・**GPO（端末制限）** が当たり前で、GUIが使えなくても **CLIで突破する**のが主題です。
* “Windowsコマンドライン完全攻略”として、現場で詰まりやすいポイントを最短で切り分ける構成になっています。

### 詳細解説（用語）

* **閉域網**：インターネットへ自由に出られないネットワーク。外部通信は基本「許可制」。
* **CLI**：Command Line Interface。コマンドで操作する。GUI制限下で強い。
* **GPO**：Group Policy Object。企業PCの設定を一括で縛る仕組み（機能無効化・設定画面ブロック等）。

### Tips（実務）

* まずは「**ネットワーク疎通**」「**プロキシ設定**」「**証明書（MITM）**」の3点を疑うのが最短です。
* GUIが閉じられても、**コマンドで同等情報を抜ける**（後述）ので、遠慮なくCLIへ寄せます。

---

## 2. 閉域網（ダンジョン）の過酷な現実

![Prc2.閉域網（ダンジョン）の過酷な現実](/images/network/Prc2.閉域網（ダンジョン）の過酷な現実.jpg)

### 図の要旨

* オープン環境（Easy Mode）は「PC → Cloud」で直通しがち。
* 閉域網（Hard Mode）は途中に「**Proxy認証**」「**SSL Inspection (MITM)**」「**GPO制限**」が入り、次が頻発します：

  * `npm install` / `docker pull` 失敗
  * 設定・タスクマネージャなどGUIツールが起動不可
  * `SELF_SIGNED_CERT_IN_CHAIN` など証明書エラー

### 詳細解説（用語）

* **Proxy Authentication**：プロキシ利用時のユーザー認証。設定しても「資格情報の形式ミス」で弾かれます。
* **SSL Inspection (MITM)**：通信を一度復号して検査し、再暗号化して転送する仕組み。ツール側は「社内証明書」を信頼しないとエラーになります。
* **Shadow IT**：会社が許可していないツール/経路の利用。技術的に詰まるだけでなく、規約上も危険（後述）。

### Tips（実務）

* 「ブラウザは見れるのに、npm/dockerだけ死ぬ」→ **プロキシの二重人格（WinINet/WinHTTP）** を疑う（5〜6章）。
* 「証明書エラー」→ **社内ルート証明書の配布/設定** を疑う（13章）。

---

## 3. 生存確認：ネットワーク診断の基本呪文

![Prc3.生存確認：ネットワーク診断の基本呪文](/images/network/Prc3.生存確認：ネットワーク診断の基本呪文.jpg)

### 図の要旨

* 最初に `ipconfig /all` で **IP取得状況・DNS・MAC** を確認。
* `ping [target]` で疎通（ただしICMP遮断の可能性あり）。
* VPN切替後などで名前解決が怪しいときは `ipconfig /flushdns`。

### 詳細解説（用語）

* **DHCP**：IPアドレス等を自動配布する仕組み。`DHCP Enabled: Yes` は「自動取得」。
* **MACアドレス**：端末の物理アドレス。社内ネットワークで「端末登録」や「アクセス制御」に使われることがあります。
* **DNS**：ドメイン名（例: `intranet.corp`）をIPに変換する仕組み。閉域網では「社内DNS」を向いていないと詰みます。

### コマンド詳細（何をしているか）

```bat
ipconfig /all
```

* 見るべき代表項目

  * `DHCP Enabled`：自動取得か
  * `IPv4 Address` / `Default Gateway`：社内セグメントに居るか、出口（GW）があるか
  * `DNS Servers`：社内DNSになっているか（ここが外部DNSだと社内ドメインが引けない）

```bat
ping <target>
```

* 使い方例

  * `ping 192.168.1.1`（ゲートウェイ）→ 近距離確認
  * `ping internal-portal.corp`（社内名）→ DNS+疎通確認
* 注意：企業ネットワークは **ICMP（ping）を遮断**していることがあります。`Request timed out`＝即ダウンとは限りません。

```bat
ipconfig /flushdns
```

* DNSキャッシュをクリアし、VPN切替やネットワーク変更後の「古い解決結果」を捨てます。

### Tips（実務）

* まずは **「DNS Servers」** を見て、社内DNSになっているかを最優先で確認すると無駄が減ります。
* pingが死んでいても、HTTPは生きていることがあるので、次章の `nslookup` / `tracert` へ進めます。

---

## 4. 経路探索：パケットの行方を追う

![Prc4.経路探索：パケットの行方を追う](/images/network/Prc4.経路探索：パケットの行方を追う.jpg)

### 図の要旨

* `tracert -d`：どの区間（ローカルルータ / FW / プロキシ）で詰まるか探す
* `nslookup`：社内ドメインが正しい社内IPに解決されるか確認
* `netstat -ano`：特定ポート（例: 8080）を占有するプロセスIDを特定

### 詳細解説（用語）

* **traceroute / tracert**：経路上の中継点（ホップ）を列挙するツール。
* **DNS解決**：ドメイン → IPの変換。閉域網の「社内ドメイン」は社内DNSでしか引けないことが多い。
* **ポート占有**：ローカル開発（8080/3000等）で別プロセスが先に掴んで起動できない状態。

### コマンド詳細（何をしているか）

```bat
tracert -d <destination>
```

* `-d`：DNS解決をしない（高速化）。閉域網では逆引きが遅かったり失敗するので **-d推奨**。
* 見方のコツ

  * 早い段で `* * *` が続く → FWで遮断、もしくはICMP制限
  * 途中まで行って止まる → その区間（例：社内FW→Proxy）が怪しい

```bat
nslookup <domain>
```

* 例：`nslookup internal-portal.corp`
* 出力で見る点

  * “Server:” が社内DNSになっているか
  * “Address:” が期待する社内IP帯になっているか

```bat
netstat -ano
```

* `-a`：全接続/全待受を表示
* `-n`：名前解決しない（高速・正確）
* `-o`：PID（プロセスID）を表示
* 例：8080占有犯を探す流れ

  * `netstat -ano | findstr :8080`
  * 出てきたPIDを `tasklist /FI "PID eq <pid>"` で名前へ（9章と連携）

### Tips（実務）

* `tracert` が使いづらい環境（ICMP制限強め）では、`nslookup` と「プロキシ経由のHTTP確認」（後述）で攻める方が速いです。
* ポート競合は「原因がネットワークに見える」ことがあるので、`netstat -ano` は常備です。

---

## 5. プロキシの「二重人格」問題（WinINet vs WinHTTP）

![Prc5.プロキシの「二重人格」問題](/images/network/Prc5.プロキシの「二重人格」問題.jpg)

### 図の要旨

* ブラウザ（ユーザーセッション）はGUI設定（WinINet）でプロキシを使えるのに、
* システムサービス（WinHTTP）は既定で **DIRECT（プロキシなし）** になりがち → 閉域網で失敗。
* 現在のWinHTTPプロキシ状態を `netsh winhttp show proxy` で確認する。

### 詳細解説（用語）

* **WinINet**：主にユーザーアプリ（ブラウザ等）が参照するプロキシ設定。
* **WinHTTP**：主にシステムサービスや一部ツールが参照するプロキシ設定。
* 典型症状：**「ブラウザはOK、Windows Update / 一部ツールがNG」**。

### コマンド詳細（何をしているか）

```bat
netsh winhttp show proxy
```

* WinHTTP（システム側）のプロキシ設定を表示します。
* 代表的な出力パターン

  * `Direct access (no proxy server).` → 閉域網だと詰みやすい
  * `Proxy Server(s) : http=...;https=...` → 設定あり
  * `Bypass List : <local>;*.corp` → 社内宛先は直通にする除外設定

### Tips（実務）

* `npm install` や `docker pull` が死ぬとき、まずこれで **WinHTTPがDIRECTになってないか** を確認します。
* ここが直通だと、環境変数を入れても「ツールによってはWinHTTP優先」で効かないことがあります。

---

## 6. WinHTTPを支配する最強の呪文（import / set / reset）

![Prc6.WinHTTPを支配する最強の呪文](/images/network/Prc6.WinHTTPを支配する最強の呪文.jpg)

### 図の要旨

* `netsh winhttp import proxy source=ie` で **ブラウザ設定をWinHTTPへコピー**。
* 固定環境（サーバ等）では `netsh winhttp set proxy ...` で手動設定。
* 直結環境へ戻ったら `netsh winhttp reset proxy` で解除。

### 詳細解説（用語）

* **import proxy source=ie**：IE（≒WinINet/インターネットオプション）側の設定をWinHTTPへ移します。
* **Bypass List**：プロキシを通さない宛先。社内ドメインや`localhost`が重要。

### コマンド詳細（何をしているか）

```bat
netsh winhttp import proxy source=ie
```

* 「GUIで設定できる人」はこれが最短。
* 注意：環境により **管理者権限** が必要です。

```bat
netsh winhttp set proxy proxy.example.com:8080 "<local>;*.corp"
```

* 例の意味

  * `proxy.example.com:8080`：プロキシのホストとポート
  * `"<local>;*.corp"`：除外（ローカル/社内ドメイン）
* `<local>`：ホスト名にドットが無いローカル名等を除外対象にする定番

```bat
netsh winhttp reset proxy
```

* 「自宅に戻った」「別ネットワークに移った」などで、設定が邪魔になったときの解除。

### Tips（実務）

* “importしても直らない”場合は、社内側が「PAC」や「認証形式」を要求しているケースがあります。インフラ担当に **正しい形式（PAC URL/例外リスト/認証方式）** を確認すると早いです。
* 逆に、会社の設定のまま持ち帰ると自宅で詰むので、`reset proxy` を覚えておくと事故が減ります。

---

## 7. 開発ツールの共通言語：3つの環境変数（HTTP(S)_PROXY / NO_PROXY）

![Prc7.開発ツールの共通言語：３つの環境変数](/images/network/Prc7.開発ツールの共通言語：３つの環境変数.jpg)

### 図の要旨

* 多くの開発ツールが参照する「共通設定」が環境変数。

  * `HTTP_PROXY` / `HTTPS_PROXY`：外向き通信をプロキシへ
  * `NO_PROXY`：プロキシ除外（社内・ローカル）
* **重要：NO_PROXYに`localhost`が無いとローカル開発が死ぬ**（ループ/接続不可）

### 詳細解説（用語）

* **環境変数**：プロセスが参照できる設定値。ツール横断で効くことが多い。
* **URLエンコード**：プロキシのパスワードに `@` `:` などが含まれるとURLとして壊れるため `%40` 等に変換が必要。

### 実務での設定例（Windows）

> ここは会社の指示（形式・認証）を必ず優先してください。

PowerShell（カレントセッションだけ）：

```powershell
$env:HTTP_PROXY  = "http://user:pass@proxy.example.com:8080"
$env:HTTPS_PROXY = "http://user:pass@proxy.example.com:8080"
$env:NO_PROXY    = "localhost,127.0.0.1,.corp"
```

永続化（ユーザー環境変数。再ログインが必要な場合あり）：

```bat
setx HTTP_PROXY  "http://user:pass@proxy.example.com:8080"
setx HTTPS_PROXY "http://user:pass@proxy.example.com:8080"
setx NO_PROXY    "localhost,127.0.0.1,.corp"
```

### Tips（実務）

* `NO_PROXY` は **入れ忘れが一番痛い**です。`localhost` と `127.0.0.1` は基本セット。
* ツールによって `NO_PROXY` のワイルドカード解釈が違うため、社内ドメインは `.corp`（サフィックス形式）なども混ぜると安定します。

---

## 8. 資産・構成情報の隠密調査（GUIがブロックされている時の代替手段）

![Prc8.資産＆構成情報の隠密調査](/images/network/Prc8.資産＆構成情報の隠密調査.jpg)

### 図の要旨

* GUI（設定画面）が封じられても、CLIで以下を取得できる：

  * `systeminfo`：OS/稼働時間/Hotfix
  * `wmic product get name,version`：インストール済みソフト
  * `wmic qfe list`：セキュリティパッチ一覧
  * `whoami /all`：ユーザーSID・所属グループ・権限

### 詳細解説（用語）

* **Hotfix (KB)**：Windows更新プログラム番号。脆弱性対応や機能差の判定に使います。
* **SID**：Windowsのユーザー/グループ識別子。権限調査で頻出。
* **Privilege**：OSが許す特権（例：管理者操作に必要な権限）。

### コマンド詳細（何をしているか）

```bat
systeminfo
```

* OSバージョン、インストール日、起動時間（Uptime）、適用KBの概略が取れます。

```bat
wmic product get name,version
```

* インストール済みソフト一覧（環境差調査に便利）。
* 注意：環境によっては遅い/制限されることがあります（代替：PowerShellのCIM系）。

```bat
wmic qfe list
```

* 適用済みHotfix（KB）を一覧化。

```bat
whoami /all
```

* 所属グループ（管理者/特権グループ）や有効権限を確認できます。

### Tips（実務）

* “なぜこの操作ができない？”の答えは、`whoami /all` のグループ/特権に出ます。申請・問い合わせ時の材料にもなるので、スクショではなく**テキストで保存**しておくと強いです。

---

## 9. プロセスの完全掌握（タスクキル）

![Prc9.プロセスの完全掌握（タスクキル）](/images/network/Prc9.プロセスの完全掌握（タスクキル）.jpg)

### 図の要旨

* `tasklist /svc`：どの`svchost.exe`がどのサービスを動かしているか特定
* `taskkill /F /PID <pid>`：PID指定で強制終了
* “スタートメニューが反応しない”などGUI不調でも、タスクマネージャ経由で復旧ルートがある

### 詳細解説（用語）

* **PID**：Process ID。Windowsでプロセスを一意に識別する番号。
* **svchost.exe**：複数サービスをまとめて動かす「入れ物」。どのサービスが紐づくか調査が必要。
* **強制終了 (/F)**：プロセスに終了を命令し、応答がなくても落とす（影響が大きいので注意）。

### コマンド詳細（何をしているか）

```bat
tasklist /svc
```

* サービス名 ↔ プロセス（PID）の対応が見えます。
* 例：ポート占有（4章の `netstat -ano`）で出たPIDが「どのサービス由来か」を突き止めるのに使えます。

```bat
taskkill /F /PID 5678
```

* `/PID`：対象をPIDで指定
* `/F`：強制終了（最後の手段）

### The Secret Backdoor（図の手順を噛み砕く）

* スタートメニューが反応しない等で詰んだら：

  1. `Ctrl + Shift + Esc` で **タスクマネージャ** を開く
  2. **Ctrlキーを押しながら**「新しいタスクの実行」をクリック（環境によって挙動差あり）
  3. コマンドプロンプトを起動し、必要な `.msc` / `.cpl` や診断コマンドを実行

### Tips（実務）

* まずは強制終了する前に、`tasklist /fi "PID eq <pid>"` で対象名を確認し、影響範囲を見積もる癖をつけると事故が減ります。

---

## 10. 高速ログ解析：wevtutil（GUIのイベントビューアを開かず原因特定）

![Prc10.高速ログ解析：wevtutil](/images/network/Prc10.高速ログ解析：wevtutil.jpg)

### 図の要旨

* GUIイベントビューアが重い/禁止でも、`wevtutil` でイベントログを直接引ける。
* 例：`wevtutil qe System /c:50 /rd:true /f:text`

  * Systemログから最新50件をテキストで出す

### 詳細解説（用語）

* **イベントログ**：Windowsの稼働状況・エラー・サービス停止等の記録。
* **Systemログ**：OS/ドライバ/サービス系の重要ログが入る代表カテゴリ。
* **Event ID**：イベントの種類を表す番号。停止・再起動理由等の特定に使う。

### コマンド詳細（何をしているか）

```bat
wevtutil qe System /c:50 /rd:true /f:text
```

* `qe`：query events（イベント検索）
* `System`：対象ログ
* `/c:50`：件数（最新50件）
* `/rd:true`：Reverse Direction（新しい順）
* `/f:text`：XMLではなく読みやすいテキストで出力

### もう一歩：実務で便利な使い方

* 出力が長いときはファイルへ：

```bat
wevtutil qe System /c:200 /rd:true /f:text > system_log.txt
```

* よく見るイベント例（環境差あり）

  * シャットダウン/起動系
  * サービスのクラッシュ/停止
  * セキュリティ製品のブロック痕跡

### Tips（実務）

* “なぜ突然落ちた？”は、GUIが封じられているほど `wevtutil` が刺さります。まずは `/c` を増やして直近の流れを掴むのが早いです。

---

## 11. GUI制限の緊急回避テクニック（設定アプリが封じられた時の裏口 .msc / .cpl）

![Prc11.GUI制限の緊急回避テクニック](/images/network/Prc11.GUI制限の緊急回避テクニック.jpg)

### 図の要旨

* 「設定」アプリがGPOで封じられても、**Win+R** や **CMD** から `.msc` / `.cpl` を直接起動できることがある。
* 代表例：

  * `services.msc`（サービス管理）
  * `compmgmt.msc`（コンピュータの管理）
  * `ncpa.cpl`（ネットワークアダプタ）
  * `appwiz.cpl`（プログラムと機能）
  * `control`（旧コントロールパネル）
  * `eventvwr.msc`（イベントビューア）

### 詳細解説（用語）

* **.msc**：Microsoft Management Consoleのスナップイン。管理ツールのショートカット。
* **.cpl**：コントロールパネル項目のモジュール。
* GPOは「メニューを隠す」場合があり、**直接指定起動**で開けるケースがあります（ただし環境により禁止されます）。

### 実行例

```bat
services.msc
compmgmt.msc
ncpa.cpl
appwiz.cpl
control
eventvwr.msc
```

### Tips（実務）

* “開けたら勝ち”ではなく、変更が必要な場合は必ず社内ルールに従いましょう（勝手な変更は監査で詰みます）。
* ネットワーク周りは `ncpa.cpl` が開けるだけで、アダプタ状態・VPN差分の確認が一気に楽になります。

---

## 12. 開発ツールの「方言」を理解する（システムプロキシ無視ツールの個別設定）

![PPrc12.開発ツールの「方言」を理解する](/images/network/Prc12.開発ツールの「方言」を理解する.jpg)

### 図の要旨

* システム設定だけでは足りず、ツール固有の“方言”設定が必要になる：

  * Git：`git config --global http.proxy [url]`
  * npm：`npm config set proxy [url]`
  * Docker：**ビルド時**と**実行時**で設定場所が違う（最難関）

### 詳細解説（用語）

* **グローバル設定**：ユーザー全体に効く設定（プロジェクト単位で上書きされることも）。
* **Docker Daemon**：イメージをpull/buildする側の常駐プロセス。
* **Container Runtime**：コンテナ内で動くアプリが外へ出るための設定（プロキシ/証明書）。

### コマンド詳細（何をしているか）

Git（例）：

```bat
git config --global http.proxy  http://user:pass@proxy.example.com:8080
git config --global https.proxy http://user:pass@proxy.example.com:8080
```

* 確認：

```bat
git config --global -l | findstr proxy
```

npm（例）：

```bat
npm config set proxy       http://user:pass@proxy.example.com:8080
npm config set https-proxy http://user:pass@proxy.example.com:8080
```

Docker（図のポイント整理）

* **Daemon(Pull/Build) 側**：ホスト（Linux/WSL）のsystemd設定など

  * 例（Linux系でよくあるパス）：`/etc/systemd/system/docker.service.d/http-proxy.conf`
* **Container(Run) 側**：ユーザーのDocker設定

  * 例：`~/.docker/config.json`

`~/.docker/config.json` の例（概念）：

```json
{
  "proxies": {
    "default": {
      "httpProxy":  "http://user:pass@proxy.example.com:8080",
      "httpsProxy": "http://user:pass@proxy.example.com:8080",
      "noProxy":    "localhost,127.0.0.1,.corp"
    }
  }
}
```

### Tips（実務）

* Dockerが難しい理由は「**pullできない**」と「**コンテナ内のpip/npmが外へ出られない**」が別問題だからです。詰まったら **フェーズ分解**（Pull/Build/Run）で切り分けると速いです。

---

## 13. 「信頼できない証明書」の罠（SSL/MITM）

![Prc13.「信頼できない証明書」の罠（SSL＆MITM）](/images/network/Prc13.「信頼できない証明書」の罠（SSL＆MITM）.jpg)

### 図の要旨

* SSL検査（MITM）で、ツールは `SELF_SIGNED_CERT_IN_CHAIN` 等を出しがち。
* 対策は「社内ルート証明書（.crt）を各ツールのトラストストアへ入れる」。
* 代表例：

  * Python：`pip config set global.cert /path/to/company.crt`
  * Node：`NODE_EXTRA_CA_CERTS`
  * Git：`git config --global http.sslCAInfo ...`

### 詳細解説（用語）

* **ルート証明書**：その証明書を信頼すると、その配下の証明書も信頼する「親」。
* **トラストストア**：信頼する証明書を保存している場所（OS/ツールで別）。
* **MITM**：中間者方式。企業では「検査」のため合法的に使われることがあるが、ツール側から見ると“偽の証明書”に見える。

### コマンド詳細（何をしているか）

Python（pip）：

```bat
pip config set global.cert "C:\path\to\company.crt"
```

* 追加でプロキシも必要な環境では、pip側プロキシ設定を求められる場合があります（社内手順に従う）。

Node.js：

```bat
setx NODE_EXTRA_CA_CERTS "C:\path\to\company.crt"
```

Git：

```bat
git config --global http.sslCAInfo "C:\path\to\company.crt"
```

### Tips（実務）

* “証明書ファイルをどこで入手？”が最大のボトルネックになりがちです。インフラ担当へ **Base64形式の.crt/.pem** を依頼し、社内手順のとおりに配置してください。
* 最終手段として `sslVerify false` のような回避策が紹介されがちですが、監査/セキュリティ上の地雷になりやすいので、原則やらない前提で設計しましょう。

---

## 14. 閉域網での生成AI活用ルール（Shadow IT禁止／許可ルートを使う）

![Prc14.閉域網での生成AI活用ルール](/images/network/Prc14.閉域網での生成AI活用ルール.jpg)

### 図の要旨

* 外部AIツール（例：`npm install -g @anthropic-ai/claude-code`）は **Blocked/Prohibited** になりがち。

  * 理由：プロキシ遮断、認証リダイレクト失敗、セキュリティポリシー違反
* 正解は **Authorized Path（許可された経路）**：

  1. GitHub Copilot Enterprise（VS Codeの `http.proxy` 経由で設定）
  2. 社内LLM（tsuzumi/Azure等）：**社内APIエンドポイント**を使う

### 詳細解説（用語）

* **Authorized Path**：会社が許可した通信経路・ツール・アカウントの組み合わせ。
* **認証リダイレクト**：OAuth等でログイン画面へ飛ぶ仕組み。閉域網プロキシで壊れやすい。

### Tips（実務）

* “AIに設定を書かせる”のは有効ですが、投入する情報は **秘匿情報（URL/社内構成/認証情報）を伏せた形** にしましょう。
* Copilot等は「アカウントがある＝使える」ではなく、別途 **ライセンス割り当て** が必要なことが多いので、着任時にPMへ確認すると手戻りが減ります。

---

## 15. プロキシの魔術師となれ：The Engineer’s Cheat Sheet

![Prc15.プロキシの魔術師になれ](/images/network/Prc15.プロキシの魔術師になれ.jpg)

### 図の要旨

* これまでのコマンドをカテゴリ別に再掲した早見表。
* 閉域網は「制限」ではなく「攻略すべき要塞」。CLIを武器に進める。

### 早見表（図の内容をMarkdown化）

| Category  | Command                                         | Key Flag / Note              |
| --------- | ----------------------------------------------- | ---------------------------- |
| Network   | `ipconfig /all` / `tracert -d` / `netstat -ano` | IP全体把握、DNS解決省略、接続とPID表示      |
| Proxy     | `netsh winhttp import proxy source=ie`          | IE/WinINetのプロキシ設定をWinHTTPへ移す |
| System    | `systeminfo` / `wmic qfe` / `whoami /all`       | OS詳細、パッチ、ユーザー権限              |
| Process   | `tasklist /svc` / `taskkill /F /PID`            | サービス↔プロセス対応、PID指定で強制終了       |
| Logs      | `wevtutil qe System /c:50`                      | Systemログ直近50件を取得             |
| Variables | `HTTP_PROXY` / `NO_PROXY`                       | プロキシ設定の共通言語                  |

### Tips（実務）

* 困ったらこの順で当てると速いです：

  1. `ipconfig /all`（DNS/ゲートウェイ確認）
  2. `netsh winhttp show proxy`（WinHTTPがDIRECTか？）
  3. 証明書エラーなら社内CA設定（13章）
  4. ポート競合なら `netstat -ano` → `tasklist`/`taskkill`


## 16. まとめ
![Prc16.イントラネット、コマンド、サバイバルガイド](/images/network/Prc16.イントラネット、コマンド、サバイバルガイド.jpg)
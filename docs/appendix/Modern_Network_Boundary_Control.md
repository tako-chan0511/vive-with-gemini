# ゲートを守る：現代インフラの境界制御（Proxy / API Gateway / Bastion）
## description: 境界が消える時代に、User Ingress・Admin Access・Outbound Proxy をどう設計し、どう運用するか

## 1. 全体像：3つのゲートで守る

![MNB1.ゲートを守る：現代インフラの境界制御](/images/network/MNB1.ゲートを守る：現代インフラの境界制御.jpg)

### 図の要旨
現代インフラでは「境界」を**物理（FW）だけで守る**のが難しくなり、トラフィックの種類ごとに “門番” を分けて統治します。

- **User Access（ユーザー流入）**：アプリ利用者の入口（主に Web / API）
- **Admin Access（運用者の入口）**：管理者だけが入れる特権経路（SSH/RDP 等）
- **Outbound Access（外向き通信）**：内部から外部へ出る通信（更新・依存DL・外部API）

### 詳細解説（用語）
- **境界制御（Boundary Control）**：システムの内外を区切り、誰が・どこへ・何をできるかを制御すること。
- **ゲート（Gate）**：入口/出口を一本化して、監視・認証・遮断を集中させる設計パターン。
- **トラフィックの方向（Direction）**：`Inbound（外→内）` と `Outbound（内→外）` は、必要な対策が別物です。

### Tips（実務）
- 最初に「境界」を線で考えるのをやめて、**“通る目的”** で分けるのがコツです。  
  例：ユーザーの閲覧（User）／運用の作業（Admin）／更新や依存取得（Outbound）

---

## 2. 境界線の消失：モノリス→マイクロサービス

![MNB2.境界線の消失と混沌](/images/network/MNB2.境界線の消失と混沌.jpg)


### 図の要旨
- モノリス時代：FW（L3/L4）で “外から内への境界” を作れば守れた
- マイクロサービス時代：境界が **アプリ層（L7）へシフト**し、ゲート設計が難しくなる

### 重要課題（この3つに収束）
- **認証・認可（Who）**：誰を通すべきか？
- **ルーティング（Where）**：どこへ導くべきか？
- **可視化（What）**：何が起きているか？（監査・追跡）

### 詳細解説（用語）
- **L3/L4**：IP/ポート中心の制御（FW、セキュリティグループなど）
- **L7**：HTTP/JSON/JWT/ヘッダ等、アプリの意味を理解して制御する層
- **ボトルネック**：すべてを単一ゲートに集約すると、性能/運用が詰まりやすい

### Tips（実務）
- 「全部を1か所で守る」のではなく、**目的別のゲート**に分割するとスケールします。  
  例：User入口はWAF/API Gateway、Admin入口はSSM/Modern Bastion、OutboundはForward Proxy

---

## 3. ユーザー入口の2大守護者：Reverse Proxy と API Gateway

![MNB3.ユーザーアクセスの守護者](/images/network/MNB3.ユーザーアクセスの守護者.jpg)


### 図の要旨
User Ingress（ユーザーからシステムに入ってくる通信データ） には大きく2系統があります。

- **リバースプロキシ（The Shield）**：サーバの前で守る・捌く
- **APIゲートウェイ（The Concierge）**：APIの入口で認証/統制/変換をする

### 詳細解説（用語と役割）
#### リバースプロキシ（Nginx / HAProxy / Envoy など）
- **負荷分散（Load Balancing）**：複数バックエンドに振り分け
- **SSL終端（TLS Termination）**：HTTPSを入口で復号して内部をHTTPにする（構成次第）
- **静的コンテンツのキャッシュ**：画像/CSS/JSなどを高速配信
- **バックエンド隠蔽**：内部サーバのIP/構造を外に出さない

#### APIゲートウェイ（Kong / AWS API Gateway / Apigee など）
- **認証・認可**：OAuth/JWT/API Key など
- **レート制限**：スパイク抑制、DoS耐性、課金/利用制御
- **リクエスト変換**：ヘッダ付与、パス書き換え、JSON整形
- **API統合**：複数マイクロサービスを1つのAPI面に見せる

### よく使う設定例（図にはないが超頻出）
#### Nginx（リバースプロキシ最小形）
```nginx
server {
  listen 443 ssl;
  server_name api.example.com;

  location / {
    proxy_pass http://backend_upstream;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
````

#### 疎通確認

```bash
curl -I https://api.example.com
curl -v https://api.example.com  # どこで止まるか（DNS/TCP/TLS/HTTP）を見る
```

### Tips（実務）

* 「入口を速くしたい」→ Reverse Proxy が得意
* 「APIを統制したい（認証/制限/変換）」→ API Gateway が得意
* 実際は **併用**（WAF/LB → Gateway → サービス）になることが多いです。

---

## 4. いつどっち？戦略的な使い分け

![MNB4.戦略的選択：いつどちらを使うべきか？](/images/network/MNB4.戦略的選択：いつどちらを使うべきか？.jpg)


### 図の要旨

* **Reverse Proxy**：ネットワーク/トラフィック視点（L4〜L7入口）
* **API Gateway**：アプリ/データ視点（L7のAPI契約）

### 比較の観点（現場の判断軸）

* **認識レベル**

  * Reverse Proxy：パケット/HTTPの入口を意識
  * API Gateway：API（JWT/スコープ/パス/メソッド）を意識
* **セキュリティ**

  * Reverse Proxy：DDoS/IP制御など入口防御
  * API Gateway：不正呼び出し・認証エラー・濫用制御
* **開発者体験（DX）**

  * Reverse Proxy：インフラ寄り（運用が中心）
  * API Gateway：開発者ポータル、API管理、テスト機能が強い

### Tips（実務）

* **静的コンテンツ / 単純構成**：Reverse Proxy だけで十分なことが多い
* **API統合 / 複雑ルーティング**：API Gateway が必須級
* 多くの場合、API Gateway は Reverse Proxy 的な機能も内包します（ただし “得意” が違います）

---

## 5. Outbound戦略：閉域網を守るフォワードプロキシ

![MNB5.閉域網を守る出口戦略：フォワードプロキシ](/images/network/MNB5.閉域網を守る出口戦略：フォワードプロキシ.jpg)


### 図の要旨

閉域（Private Subnet）からインターネットへ出る通信は、**フォワードプロキシ（出口）に強制集約**します。

* 内部サーバは直接インターネットへ出ない（`yum update` 等も不可）
* プロキシ経由のみ許可し、**ホワイトリスト（許可ドメイン）** で制御
* 目的：**情報流出（Data Exfiltration）** を防ぎつつ、運用の必要通信は通す

### 詳細解説（用語）

* **フォワードプロキシ**：クライアントの代わりに外部へアクセスする代理人（出口の門番）
* **ホワイトリスト**：許可した宛先だけ通す方式（ゼロトラストに近い考え方）
* **Data Exfiltration**：内部データを外へ持ち出すこと（マルウェア/不正操作/誤送信含む）

### よく使うコマンド（図にはないが必須）

#### 環境変数（Linux）

```bash
export HTTPS_PROXY="http://user:pass@proxy.example.co.jp:8080"
export HTTP_PROXY="http://user:pass@proxy.example.co.jp:8080"
export NO_PROXY="localhost,127.0.0.1,.corp.local"
```

#### curlでプロキシ経由を明示

```bash
curl -v -x http://proxy.example.co.jp:8080 https://example.com
curl -v -x http://proxy.example.co.jp:8080 -U "user:pass" https://example.com
```

#### apt / yum のプロキシ（例）

```bash
# apt（例）
echo 'Acquire::http::Proxy "http://proxy.example.co.jp:8080";' | sudo tee /etc/apt/apt.conf.d/99proxy

# yum/dnf（例）
sudo vi /etc/yum.conf
# proxy=http://proxy.example.co.jp:8080
```

### Tips（実務）

* 「外に出られない」は正常です。**“出る必要がある通信だけ”** を出口で統制するのが閉域の作法です。
* トラブル切り分けは `curl -v` が最短（DNS/TCP/TLS/HTTP のどこで止まるかが見える）。

---

## 6. Admin Access：バスティオンホストという要塞

![MNB6.特権アクセスの要塞：バスティオンホスト](/images/network/MNB6.特権アクセスの要塞：バスティオンホスト.jpg)


### 図の要旨

管理アクセス（SSH/RDP）を、公開サブネットの **踏み台（Bastion Host）** に集約して守る。

* 内部ネットワークへの唯一の侵入口（Ingress Point）として機能
* 強固化（Hardened）して運用

### リスク要因（図の右の警告の意味）

* **単一障害点**：バスティオンが落ちると運用停止
* **管理の難しさ**：踏み台に権限・監査・ログ・鍵が集まりやすい
* **攻撃対象**：公開されるため常に狙われる

### よく使うコマンド（踏み台運用の基本）

#### 1ホップ接続（ProxyJump）

```bash
ssh -J user@bastion.example.com user@10.0.1.10
```

#### ~/.ssh/config に寄せる（実務推奨）

```sshconfig
Host bastion
  HostName bastion.example.com
  User user

Host target-01
  HostName 10.0.1.10
  User user
  ProxyJump bastion
```

### Tips（実務）

* “踏み台に全部置く”ほど危険になります。
  次章の **SSH Agent Forwarding** や、8章の **Cloud Control Plane 型（SSM/IAP）** へ移行する理由がここにあります。

---

## 7. 鍵を置き去りにしない：SSHエージェントフォワーディング

![MNB7.鍵を「置き去り」にしない：SSHエージェントフォワーディング](/images/network/MNB7.鍵を「置き去り」にしない：SSHエージェントフォワーディング.jpg)


### 図の要旨

* 秘密鍵（`id_rsa`）は **管理端末（Admin PC）にだけ置く**
* 踏み台は “認証チャレンジを転送するだけ” にして、鍵を残さない（Zero Trace）

### 詳細解説（用語）

* **SSH Agent**：秘密鍵をメモリ上で管理し、署名だけ行う仕組み
* **Agent Forwarding**：踏み台に “鍵そのもの” をコピーせず、署名要求を転送する

### よく使うコマンド（実務の型）

#### エージェントを有効化

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_rsa
ssh-add -l  # 登録鍵一覧
```

#### Forwardingして踏み台へ

```bash
ssh -A user@bastion.example.com
```

#### ~/.ssh/config で固定（推奨）

```sshconfig
Host bastion
  HostName bastion.example.com
  User user
  ForwardAgent yes
```

### Tips（実務）

* `-A` は便利ですが、踏み台が乗っ取られた場合に “署名要求を悪用される” リスクがあります。
  重要環境では **踏み台の権限最小化**・**セッション監査**・**SSM等へ移行**がセットです。

---

## 8. ポート開放の終焉：クラウド制御プレーン型の管理アクセス

![MNB8.ポート開放の終焉：次世代の管理アクセス](/images/network/MNB8.ポート開放の終焉：次世代の管理アクセス.jpg)


### 図の要旨

* 以前：22番（SSH）などの **インバウンド開放**が必要 → 攻撃面が広い
* 以後：クラウド制御プレーン（SSM/IAP等）で **安全なトンネル**を張る
  → “ネットワーク視点”から “アイデンティティ視点”へ移行

### 代表技術（図の例）

* **AWS Systems Manager（SSM）**：エージェント主導でアウトバウンド通信し、SSHポートを開けずに管理
* **Azure Bastion**：ブラウザ/HTML5 で踏み台的アクセス（実装は環境で異なる）
* **GCP IAP（Identity-Aware Proxy）**：IDベースでトンネルし、公開ポートを減らす

### よく使うコマンド（図にはないが現場で必須）

#### AWS SSM：セッション開始

```bash
aws ssm start-session --target i-xxxxxxxxxxxxxxxxx
```

#### AWS SSM：ポートフォワード（例：DBへ）

```bash
aws ssm start-session \
  --target i-xxxxxxxxxxxxxxxxx \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters host="10.0.1.10",portNumber="5432",localPortNumber="15432"
```

#### GCP IAP：トンネル経由SSH（例）

```bash
gcloud compute ssh vm-name --zone asia-northeast1-a --tunnel-through-iap
```

### Tips（実務）

* “管理ポートを閉じる”だけで攻撃面が激減します。
* ただし **ID/権限設計**（誰がいつ何をできるか）と **監査ログ**（操作記録）が本丸です。

---

## 9. gRPCとゲートウェイ：REST⇔gRPCの翻訳

![MNB9.マイクロサービスの言語を翻訳する：gRPCとゲートウェイ](/images/network/MNB9.マイクロサービスの言語を翻訳する：gRPCとゲートウェイ.jpg)


### 図の要旨

* ブラウザ/外部クライアントは **JSON/REST** が得意
* サービス間は **Protobuf/gRPC** が高性能（低レイテンシ）
* そこでゲートウェイが **gRPC-JSON Transcoding（相互変換）** を担う

### 詳細解説（用語）

* **gRPC**：HTTP/2 ベースのRPC。スキーマ（`.proto`）で契約を定義
* **Protobuf**：バイナリのシリアライズ形式。サイズが小さく高速
* **Transcoding**：REST(JSON) ↔ gRPC の自動変換（契約に基づく）

### よく使うコマンド（検証の基本）

#### REST 側（curl）

```bash
curl -X POST https://api.example.com/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name":"takochan"}'
```

#### gRPC 側（grpcurl：超便利）

```bash
# 例：TLSなし（内部検証）
grpcurl -plaintext 10.0.1.10:50051 list

# 例：メソッド呼び出し
grpcurl -plaintext -d '{"name":"takochan"}' 10.0.1.10:50051 package.Service/CreateUser
```

### Tips（実務）

* “外部はREST、内部はgRPC” はよくある最適解です。
* ただし契約（proto）変更の運用が必要です（互換性・バージョニング・段階移行）。

---

## 10. 統合アーキテクチャ：多層防御の全貌

![MNB10.統合アーキテクチャ：多層防御の全貌](/images/network/MNB10.統合アーキテクチャ：多層防御の全貌.jpg)


### 図の要旨

3つのゲートを “別々に強化” し、全体を多層防御として組み上げます。

* **User Access（統治）**：WAF/LoadBalancer → API Gateway → Microservices
* **Admin Access（保護）**：SSM/Modern Bastion → Secure Tunnel → Internal Resources
* **Outbound（監視）**：Private Subnet → Forward Proxy → Internet

### 詳細解説（何が嬉しい？）

* **入口（User）**：不正アクセス・濫用・認証を統制
* **運用（Admin）**：公開ポートを減らし、操作ログを残す
* **出口（Outbound）**：情報流出を防ぎ、許可された更新だけ通す

### よく使う確認コマンド（運用者の型）

```bash
# OpenShift/Kubernetes系（例）
kubectl get ingress,svc,pod
kubectl logs -f deploy/api-gateway

# ネットワーク疎通（例）
curl -v https://api.example.com
```

### Tips（実務）

* “セキュリティ強化＝不便”になりがちなので、**運用の導線（SSM/Proxy/ログ）までセット**で設計すると破綻しません。

---

## 11. 教訓：ゲートキーパーの三原則

![MNB11.教訓：ゲートキーパーの三原則](/images/network/MNB11.教訓：ゲートキーパーの三原則.jpg)


### 図の要旨（3原則）

1. **役割を混同しない**

   * Reverse Proxy（配信/防御）と API Gateway（認証/統制）は似て非なるもの
2. **閉域網を守る**

   * Inbound（入口）と Outbound（出口）を分けて設計する
3. **鍵を守り、ポートを閉じる**

   * Agent Forwarding / SSM などで、公開ポート依存を減らす

### Tips（実務）

* “境界”は固定の線ではなく、**トラフィックの文脈**で変わります。
  だからこそ「誰/どこ/何」を、適切なゲートに割り当てるのが現代の境界制御です。

---

## 12. 参考文献・追加学習

![MNB12.References&frutherReading](/images/network/MNB12.References&frutherReading.jpg)


### この章の使い方

* チームに説明する時は、この資料を起点にして

  * 「Reverse Proxy vs API Gateway vs Load Balancer」
  * 「Bastion / SSH Security」
  * 「Cloud Native Access（SSM / Azure Bastion / IAP）」
  * 「gRPC Transcoding」
    を深掘りすると理解が早いです。

---

# 付録：図にはないが “現場で必ず使う” コマンド集（チートシート）

> ここはスライド外ですが、境界制御を実装/運用するうえで頻出のものをまとめます。

## A. Reverse Proxy（Nginx）運用

```bash
nginx -t                 # 設定文法チェック
sudo systemctl reload nginx  # 無停止で反映（環境により）
```

## B. TLS（証明書）チェック

```bash
# 証明書チェーンやSNI確認
openssl s_client -connect api.example.com:443 -servername api.example.com
```

## C. API Gateway の典型運用（Kong例：概念）

```bash
# Service登録（例）
curl -sS -X POST http://localhost:8001/services \
  --data name=my-service \
  --data url='http://backend:8080'

# Route登録（例）
curl -sS -X POST http://localhost:8001/services/my-service/routes \
  --data 'paths[]=/v1'
```

> ※製品によりCLI/管理面は異なりますが、「サービス登録→ルート→認証/制限プラグイン」が基本形です。

## D. Forward Proxy（閉域の出口）疎通

```bash
curl -v -x http://proxy.example.co.jp:8080 https://example.com
curl -v -x http://proxy.example.co.jp:8080 -U "user:pass" https://example.com
```

## E. SSH（踏み台・トンネル）

```bash
ssh -J user@bastion user@target          # ProxyJump
ssh -A user@bastion                      # Agent Forwarding（必要時）
ssh -L 15432:10.0.1.10:5432 user@bastion # ローカル→内部DBへトンネル
```

## F. “ポートを開けない” 管理アクセス（SSM/IAP）

```bash
aws ssm start-session --target i-xxxxxxxxxxxxxxxxx
gcloud compute ssh vm-name --zone asia-northeast1-a --tunnel-through-iap
```

## G. gRPC検証（grpcurl）

```bash
grpcurl -plaintext 10.0.1.10:50051 list
grpcurl -plaintext -d '{}' 10.0.1.10:50051 package.Service/Health
```

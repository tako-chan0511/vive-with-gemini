# プライベートAIキッチンの構築

## 完全閉域網（Air-gapped）における OpenShift AI × vLLM × tsuzumi 実装ガイド（VitePress用）

## この資料の読み方（最重要）

この資料は、完全閉域網（air-gapped）環境で AI 推論基盤を構築する際の考え方を、**「キッチン（厨房）」の比喩**で説明しています。

* **厨房全体** = オフラインAIアーキテクチャ
* **食材** = ベースモデル（tsuzumi）
* **パントリー（棚）** = MinIO（S3互換オブジェクトストレージ）
* **冷蔵庫** = PVC（Persistent Volume Claim）
* **総料理長** = vLLM 推論エンジン
* **レシピ** = YAML（ServingRuntime / InferenceService 設定）
* **衛生管理** = 証明書・CAバンドル・信頼設定
* **味変（フレーバー）** = LoRA アダプタ
* **注文票** = API リクエスト
* **品質管理** = TTFT / TPS 評価
* **開店前確認** = Opening Day Checklist

---

## 前提（対象読者と想定環境）

### 対象読者

* OpenShift / Kubernetes 初学者〜中級者
* 閉域網での AI 導入担当
* インフラ / MLOps / アプリ開発の連携担当

### 想定環境

* 完全閉域網（インターネット接続なし）
* OpenShift AI（または KServe / 推論基盤）
* GPU ノード利用可（ただし制約あり）
* 内部レジストリ / MinIO / PVC 利用可

---

## まず押さえる用語（基礎）

### Air-gapped（エアギャップ）

インターネットから物理的・論理的に分離された環境。
**外部への直接アクセスができない**ため、通常の `docker pull` や `pip install` ができないことがあります。

### OpenShift AI

Red Hat 系の AI/ML ワークロードを運用しやすくするプラットフォーム。
Notebook、モデル配備、推論運用、GPU 活用などを一元的に扱いやすい構成です。

### vLLM

大規模言語モデル（LLM）の推論を高速・高効率に行うための推論エンジン。
特徴は **PagedAttention** によるメモリ効率と **高スループット**。

### tsuzumi

NTT の軽量・省リソース系モデルとして扱われる食材（ベースモデル）という位置づけ。
閉域網では「最大性能」よりも「省資源・持続可能性」が重要になる場面が多い。

### LoRA

Large Language Model の追加学習結果を小さな差分（アダプタ）として持つ方式。
ベースモデルを丸ごと複製せずに用途別に切り替え可能。

### PVC（Persistent Volume Claim）

Kubernetes/OpenShift 上で永続ストレージを使うための要求（Claim）。
モデル本体など、大きくて頻繁に使うものの保存先に向く。

### MinIO（S3互換）

S3 API 互換のオブジェクトストレージ。
LoRA やデータ、成果物などの保管・差し替えに向く。

---

# 1. 表紙：プライベートAIキッチンの構築

![NSQND1.プライベートAIキッチンの構築](/images/LLM/NSQND1.プライベートAIキッチンの構築.jpg)

## 図の要旨

このスライドは全体コンセプトを示しています。

* **完全閉域網（Air-gapped）** で
* **OpenShift AI × vLLM × tsuzumi** を使い
* **安全（Safe）・持続可能（Sustainable）・自律（Autonomous）** な AI 基盤を作る

という設計思想です。

## 詳細解説（比喩の読み解き）

* **サーバラック（Air-gapped Server Rack）**
  → オフライン環境そのもの。外部クラウド依存を避ける。

* **厨房設備（AI Culinary Station）**
  → 推論基盤。モデルを動かし、APIとして提供する実運用の場所。

* **tsuzumi + vLLM**
  → 軽量モデル + 高効率推論エンジンの組み合わせで、限られた GPU リソースを有効活用。

## 実務Tips

* まずは「AIを入れる」ではなく、**運用制約（閉域・証明書・保管・更新方法）を設計**するのが成功の近道です。
* 閉域網では、モデル性能そのものよりも **運用の継続性** が重要になることが多いです。

---

# 2. なぜ「プライベートキッチン」が必要なのか？

![NSQND2.なぜ「プライベートAIキッチン」が必要なのか](/images/LLM/NSQND2.なぜ「プライベートAIキッチン」が必要なのか.jpg)

## 図の要旨

「Public Cloud に出せない事情」があり、**自前で完結する AI 実行環境**が必要であることを示しています。

図中のルール（Rules of the House）として、以下の趣旨が示されています。

* **絶対条件（Mandatory）**

  * インターネット接続不可（No Internet Access）
  * 外部からの直接取得不可（例：No docker pull / No pip install）
* **必須事項（Required）**

  * データ主権（Data Sovereignty）
  * 機密情報を外部に出さないこと

## 詳細解説（用語）

### データ主権（Data Sovereignty）

データがどこに保存され、誰の管理下にあるかをコントロールする考え方。
社内規定・業界規制・契約要件で重要になります。

### No docker pull / No pip install の意味

* 通常開発ではネット経由で取得するものを、閉域網では取得できません。
* そのため、**事前搬入・内部レジストリ・内部パッケージ化**が必須になります。

## 実務Tips

* 「モデルが動くか」より先に、**持ち込みルール（イメージ/モデル/証明書/署名）** を確認しましょう。
* セキュリティ部門と合意するべき項目：

  * 持ち込み手順
  * 更新手順
  * 証跡（監査ログ）
  * 誰が承認するか

---

# 3. 厨房の設計図：オフライン・アーキテクチャ

![NSQND3.厨房の設計図：オフラインアーキテクチャ](/images/LLM/NSQND3.厨房の設計図：オフラインアーキテクチャ.jpg)

## 図の要旨

閉域網AI基盤の主要構成要素を厨房に見立てて配置しています。

* **搬入口（Loading Dock）/ Bastion Host**
* **冷凍庫（Walk-in Freezer）/ Internal Registry**
* **パントリー / MinIO（S3）**
* **下ごしらえ台（Prep Station）/ PVC**
* **総料理長（Master Chef）/ vLLM on GPU**

## 構成要素の役割（重要）

### 1) Bastion Host（踏み台）

外部からの資材（コンテナイメージ、モデル）をいったん受け取る中継地点。
閉域の内部ネットワークへ直接外から入れないため、**搬入窓口**になります。

### 2) Internal Registry（内部レジストリ）

vLLM などのコンテナイメージを保管する場所。
閉域内の OpenShift からは、ここを参照してイメージを pull します。

### 3) MinIO（S3互換オブジェクトストレージ）

LoRA アダプタやデータ、補助資材などを柔軟に保管。
**差し替え頻度の高いもの**に向いています。

### 4) PVC（永続ボリューム）

ベースモデル本体などの大きくて安定した資材を配置。
マウントして高速に参照しやすい。

### 5) vLLM on GPU

実際の推論処理を担当。
クライアントからの API リクエストを受けて応答を生成。

## 実務Tips

* 「全部 MinIO」や「全部 PVC」ではなく、**用途で分ける設計**が運用しやすいです。
* 障害切り分け時は以下で分けると早いです。

  * イメージ問題（Registry）
  * モデル問題（PVC/MinIO）
  * 証明書問題（CA）
  * 推論問題（vLLM）
  * API問題（リクエスト構造）

---

# 4. 本日のメイン食材：NTT「tsuzumi」

![NSQND4.本日のメイン食材：NTT「tsuzumi」](/images/LLM/NSQND4.本日のメイン食材：NTT「tsuzumi」.jpg)

## 図の要旨

「巨大モデル」よりも、閉域網の実運用では **省資源・高性能バランス**に優れたモデルが有利、というメッセージです。

図では、一般的な巨大モデル（左）と tsuzumi（右）を天秤で比較しています。

## 詳細解説（なぜ tsuzumi 系が効くのか）

### 閉域網での現実的な制約

* GPU台数が少ない
* 更新作業が重い
* 運用者が限られる
* 外部依存ができない

このため、**巨大モデルの理論性能**よりも、以下が重要になります。

* 起動のしやすさ
* VRAM消費の少なさ
* 安定性
* 運用負荷の低さ

## 図内の記載（読み取り）

* 軽量版（例：7Bクラス、GPU向け）
* 超軽量版（例：0.6Bクラス、CPU/Edge向け）

> 実際の選定は、業務要件（要約/検索補助/SQL生成/FAQ/分類）に合わせて行います。

## 実務Tips

* 最初から最大モデルを狙わず、**PoC では軽量モデル + LoRA** の構成が成功しやすいです。
* 評価指標は「正答率」だけでなく、**TTFT / TPS / 安定稼働時間 / 運用コスト**を含めて判断しましょう。

---

# 5. 食材の保管戦略：冷蔵庫（PVC）とパントリー（MinIO）の使い分け

![NSQND5.食材の補完戦略：冷蔵庫（PVC）とパントリー（MinIO）の使い分け](/images/LLM/NSQND5.食材の補完戦略：冷蔵庫（PVC）とパントリー（MinIO）の使い分け.jpg)

## 図の要旨

ベースモデルと LoRA アダプタを同じ場所に置かず、**役割に応じて保管先を分ける**設計です。

* **PVC（冷蔵庫）**：ベースモデル（大きい、頻繁に読む）
* **MinIO（パントリー）**：LoRA アダプタ（小さい、差し替えやすい）

## 使い分けの理由

### ベースモデル → PVC に向く理由

* 容量が大きい（10GB+ のことが多い）
* 起動時に安定して高速に読みたい
* Pod マウントで扱いやすい

### LoRA → MinIO に向く理由

* 小さい（100MB級のことが多い）
* 用途別に増えやすい
* バージョン管理や差し替えがしやすい

## 重要な考え方：ハイブリッド・ローディング

* **本体は PVC**
* **差分は MinIO**
* vLLM / 推論サービス側で両方を参照

これにより、起動時間と運用柔軟性のバランスを取れます。

## 実務Tips

* LoRA の命名規則を先に決めると運用が崩れにくいです。例：

  * `summary-v1`
  * `sqlgen-v2`
  * `hr-faq-v1`
* ベースモデル更新と LoRA 更新を別手順に分けると、障害時の影響範囲が小さくなります。

---

# 6. Step 1：仕入れと搬入

![NSQND6.Step1：仕入れと搬入](/images/LLM/NSQND6.Step1：仕入れと搬入.jpg)

## 図の要旨

外部（Internet）から必要資材を取得し、**Bastion Host を経由して内部レジストリ / MinIO に搬入**する手順です。

図のチェックリスト（例）

* vLLM Image（Container）
* Sidecar Images（例：kube-rbac-proxy）
* Model Weights（tsuzumi）

## ここでやること（実務の流れ）

1. 外部接続可能な場所で資材を取得
2. Bastion Host に集約
3. 内部レジストリへコンテナイメージを登録
4. MinIO / PVC へモデル資材を配置
5. ハッシュ値やバージョンを記録（監査・再現性）

## 基本用語（初心者向け）

### コンテナイメージ

アプリ実行に必要なものをまとめたパッケージ。
vLLM サーバ自体を動かす土台。

### サイドカー

主コンテナの隣で動く補助コンテナ。
認証・プロキシ・メトリクス公開・RBAC（ロールベースアクセス）補助などに使われる。

### モデルウェイト（Model Weights）

学習済みモデル本体の重みデータ。
これがないと推論できない。

---

## 搬入時によく使うコマンド（図外の実務コマンド）

### A. OpenShiftログイン（例）

```bash
oc login https://api.<cluster-domain>:6443 -u <user> -p <password>
```

#### 解説

* `oc`：OpenShift CLI
* `login`：クラスタへログイン
* `https://api...:6443`：APIサーバURL
* `-u` / `-p`：ユーザー名 / パスワード

> 注意：本番ではトークン認証 (`--token`) を使う運用も多いです。

### B. イメージの転送（代表例：skopeo＜スコピオ＞）

```bash
skopeo copy docker://registry.example.com/vllm:tag \
  docker://internal-registry.local/ai/vllm:tag
```

#### 解説

* `skopeo copy`：コンテナイメージを pull/push せずにレジストリ間コピーできる
* `docker://`：コンテナレジストリ参照を示す

### C. MinIO へのアップロード（例：mc）

```bash
mc alias set localminio https://minio.local:9000 <ACCESS_KEY> <SECRET_KEY>
mc cp ./adapters/summary-lora.tar.gz localminio/lora/
```

#### 解説

* `mc`：MinIO Client
* `alias set`：MinIO接続先登録
* `cp`：オブジェクトコピー

## 実務Tips

* 搬入時は **チェックサム（SHA256）** を必ず保存しましょう。
  - 改ざん検知、整合性確認のため、すべて２５６ビット（６４文字の英数字）のハッシュ値（固定長データ）で管理
* 「何をいつ持ち込んだか」の一覧が、後で最強の障害調査資料になります。

---

# 7. Step 2：パントリーの設置（MinIO & Data Connections）

![NSQND7.Step2：パントリーの設置（MinIO＆DataConnections）](/images/LLM/NSQND7.Step2：パントリーの設置（MinIO＆DataConnections）.jpg)

## 図の要旨

推論サービス（Chef）が MinIO（Pantry）へアクセスするための **Data Connection（S3互換接続）** を設定する段階です。

図中の要素

* Type: S3 Compatible
* Endpoint URL（Internal DNS）
* Access Key / Secret Key
* 警告：自己署名証明書（Self-Signed Certs）による接続エラーに注意

## 設定時に理解すべきポイント

### 1) Endpoint URL

MinIO の接続先 URL。閉域網では内部DNS名になることが多いです。

例：

* `https://minio.minio.svc.cluster.local:9000`
* `https://minio-internal.example.local`

### 2) Access Key / Secret Key　（共通鍵方式）

S3互換ストレージの認証情報。
AWS の `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` と同じ考え方。(トークン認証：アクセスキーとシークレットキーを使ってトークンを受け取り、それを使って認証すること)
 - ＜補足＞（証明書（CA証明書/自己署名証明書）＝「相手が本物かどうかの確認と、通信の暗号化」：「今通信している相手（MinIO）は、偽物のサイトではなく本物ですよ」と保証し、途中の通信を暗号化（HTTPS）するための身分証明書です。）したがって両方必要です。

### 3) S3互換（S3 Compatible）

Amazon S3 と似た API を実装している方式。
ツールや SDK の多くが流用できます。

---

## よく使う関連設定（図外だが実務で重要）

### 環境変数（S3アクセス）

```bash
export AWS_ACCESS_KEY_ID="<ACCESS_KEY>"
export AWS_SECRET_ACCESS_KEY="<SECRET_KEY>"
export AWS_DEFAULT_REGION="us-east-1"
```

### S3エンドポイント指定（SDKやCLIで必要なことがある）

```bash
aws --endpoint-url https://minio.local:9000 s3 ls
```

> MinIO は AWS ではないため、`--endpoint-url` 指定が必要になる場面があります。

---

## 自己署名証明書でハマる典型例

* `x509: certificate signed by unknown authority`
* `SSL certificate problem: self signed certificate`

### 原因

MinIO の HTTPS 証明書が、Pod側で信頼されていない。

### 対応の基本

* 正しい CA バンドルを Pod に配布
* 信頼ストアへ登録
* 一時しのぎの `insecure` 設定は最小限にする（本番で固定化しない）

## 実務Tips

* MinIO 接続確認は、**本番推論Podの前に専用テストPod**で行うと切り分けが楽です。
* 接続確認項目：

  * DNS解決
  * TCP到達
  * TLS検証
  * 認証成功
  * バケット一覧取得

---

# 8. 総料理長：vLLM 推論エンジン

![NSQND8.総料理長：vLLM推論エンジン](/images/LLM/NSQND8.総料理長：vLLM推論エンジン.jpg)

## 図の要旨

vLLM を採用する理由として、主に以下を示しています。

* **PagedAttention**：メモリ断片化を抑えて効率利用
* **High Throughput**：複数リクエストを同時処理しやすい

## 詳細解説（用語）

### PagedAttention

LLM推論時の KV キャッシュ管理を効率化する仕組み。
メモリをページ単位で扱うイメージで、断片化を抑えやすくなります。

### Throughput（スループット）

一定時間あたりに処理できる量。
LLMでは、`Tokens/sec`（TPS）や同時処理数が重要です。

### Fragmentation（断片化）

メモリは空いているのに、細切れで使いにくくなり実効容量が減る状態。
GPU運用では非常に厄介です。

## なぜ閉域網で vLLM が効くのか

閉域網では GPU 台数を増やしにくく、資材搬入も重いので、**1台のGPUを賢く使う**方が現実的です。
vLLM はその方向性に合います。

---

## よく使う運用観点（図外補足）

* 同時リクエスト数の上限設計
* コンテキスト長の上限設定
* GPUメモリ使用率の監視
* タイムアウト / キュー詰まりの監視
* Warmup（初回遅延対策）

## 実務Tips

* まずは精度の議論より、**安定して応答が返る並列数**を測定しましょう。
* 監視指標は最低限この4つを取ると良いです。

  * TTFT
  * TPS
  * エラー率
  * GPUメモリ使用率

---

# 9. レシピの記述：ServingRuntime（YAML設定）

![NSQND9.レシピの記述：ServingRuntime（YAML設定）](/images/LLM/NSQND9.レシピの記述：ServingRuntime（YAML設定）.jpg)

## 図の要旨

ServingRuntime（または推論ランタイム定義）の YAML で、
**「外に買い物に行くな（Do not go shopping!）」＝オフライン動作を明示**することが重要です。

図で強調されている環境変数（例）：

```yaml
env:
  - name: TRANSFORMERS_OFFLINE
    value: "1"
  - name: HF_DATASETS_OFFLINE
    value: "1"
```

## なぜ必要か（超重要）

これらを設定しないと、ライブラリやランタイムが内部的に Hugging Face などへ接続しようとして、

* 接続タイムアウト
* 起動失敗
* 想定外の外向き通信（監査NG）

を起こす場合があります。

---

## 環境変数の詳細解説

### `TRANSFORMERS_OFFLINE=1`

Hugging Face Transformers に対して、外部からモデルや設定を取りに行かず、**ローカル資材のみ使う**ように促す設定。

### `HF_DATASETS_OFFLINE=1`

Datasets ライブラリがデータ取得で外部に行かないようにする設定。

---

## よく使う追加設定（図外だが実務で推奨）

```yaml
env:
  - name: HF_HUB_OFFLINE
    value: "1"
  - name: HF_HOME
    value: "/tmp/huggingface"
  - name: TRANSFORMERS_CACHE
    value: "/tmp/hf-cache"
```

### 解説

* `HF_HUB_OFFLINE`：Hub 接続抑止の補強
* `HF_HOME` / `TRANSFORMERS_CACHE`：キャッシュ配置先の明示（権限問題回避にも有効）

---

## YAMLの基本（初心者向け）

* `-` は配列要素
* `name:` は環境変数名
* `value:` は値（文字列として `"1"` が無難）

> YAML はインデントが意味を持つため、**スペース崩れ**で起動失敗しやすいです。

## 実務Tips

* オフライン関連フラグは、**ServingRuntime / Deployment / Job で統一**して設定すると事故が減ります。
* 「一部だけオンライン前提」のライブラリがあると起動時に詰まりやすいので、起動ログを最初に確認しましょう。

---

# 10. 調理手順：InferenceService（ハイブリッド構成）

![NSQND10.調理手順：InferenceService（ハイブリッド構成）](/images/LLM/NSQND10.調理手順：InferenceService（ハイブリッド構成）.jpg)

## 図の要旨

InferenceService（推論サービス定義）で、**ベースモデル（PVC）と LoRA（MinIO）を組み合わせる**構成を示しています。

図中のポイント（例）：

* `--model=/mnt/pvc/tsuzumi`
* `--enable-lora`
* `storageUri: s3://minio/lora`

## コマンド / 引数の詳細解説

### `--model=/mnt/pvc/tsuzumi`

vLLM に対して、ベースモデルの読み込み先を指定します。

* `/mnt/pvc/`：PVC を Pod にマウントしたパス
* `tsuzumi`：その中のモデルディレクトリ

### `--enable-lora`

LoRA アダプタを有効化するスイッチ。
これを入れないと、後で adapter を指定しても効かない構成があります。

### `storageUri: s3://minio/lora`

LoRA の保存先（オブジェクトストレージ）を示す設定例。
実際には Data Connection や認証情報、エンドポイント設定と組み合わせて使います。

---

## 推奨の理解順（初心者向け）

1. **ベースモデルだけ**で起動確認
2. **PVCマウント確認**
3. **MinIO接続確認**
4. `--enable-lora` を有効化
5. LoRA を1つだけ読み込んで疎通確認
6. 複数LoRA・切替運用へ進む

---

## 参考イメージ（理解用の簡略YAML例）

```yaml
args:
  - "--model=/mnt/pvc/tsuzumi"
  - "--enable-lora"
env:
  - name: TRANSFORMERS_OFFLINE
    value: "1"
storageUri: "s3://minio/lora"
```

> 実際のフィールド名や配置は、利用する OpenShift AI / KServe バージョンで差異があります。

## 実務Tips

* 失敗時の切り分けは、**PVC経路・S3経路・証明書・権限**を分けて見ます。
* 最初は LoRA を使わずベースモデルだけで成功させるのが鉄則です。

---

# 11. 衛生管理：証明書と信頼（Certificates & Trust）

![NSQND11.生成管理：証明書と信頼（Certifications＆Trust）](/images/LLM/NSQND11.生成管理：証明書と信頼（Certifications＆Trust）.jpg)

## 図の要旨

VLLM Pod から MinIO 等へ内部通信する際、**自己署名証明書が多く、デフォルトでは拒否される**ことを示しています。
対策は **Trusted CA Bundle の注入**です。

図中のポイント（要旨）

* Problem：内部通信（MinIO等）で自己署名証明書が多い
* Fix：Trusted CA Bundle の注入
* Action：Proxy設定 or CA Bundle ConfigMap を Pod にマウント

## 詳細解説（初心者向け）

### 自己署名証明書（Self-Signed Certificate）

社内で独自に発行した証明書。
公開CA（一般のブラウザが最初から信頼する認証局）ではないため、Pod やツールが信頼していないと接続失敗します。

### CA Bundle

信頼する認証局証明書をまとめたもの。
Pod の中へ配布して、通信先を「信頼済み」として扱えるようにします。

### ConfigMap

Kubernetes/OpenShift で設定ファイルを配るための仕組み。
CA証明書を ConfigMap 化して Pod にマウントするパターンはよく使います。

---

## よく使う設定・環境変数（図外の実務）

```bash
export REQUESTS_CA_BUNDLE=/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem
export CURL_CA_BUNDLE=/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem
export SSL_CERT_FILE=/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem
```

### 解説

* `REQUESTS_CA_BUNDLE`：Python requests 系で使われやすい
* `CURL_CA_BUNDLE`：curl 系で使われやすい
* `SSL_CERT_FILE`：OpenSSL系ライブラリが参照することがある

---

## 確認コマンド（切り分けに有効）

### curl で検証（CA指定）

```bash
curl --cacert /path/to/company-root.crt https://minio.local:9000
```

### openssl で証明書確認

```bash
openssl s_client -connect minio.local:9000 -showcerts
```

#### `openssl s_client` の意味

* TLS接続を張って証明書チェーンを表示
* どの証明書が返っているか確認しやすい

## 実務Tips

* `-k` / `--insecure` で一時的に通しても、**原因解決にはならない**ので本番では固定化しない。
* 「どのPodにCAを入れたか」を一覧化しておくと、更新時に漏れません。

---

# 12. 応用メニュー：Multi-LoRA（味変のホットスワップ）

![NSQND12.応用メニュー：Multi-LoRA（味変のホットスワップ）](/images/LLM/NSQND12.応用メニュー：Multi-LoRA（味変のホットスワップ）.jpg)

## 図の要旨

1つのベースモデル（tsuzumi）を共通利用し、**用途別 LoRA（要約、SQL生成など）をリクエストごとに切り替える**構成です。

図の例

* Summary Adapter（要約）
* SQL Gen Adapter（SQL生成）
* Benefit：GPUコスト削減（1 GPU serves everyone）

## なぜ有効か

### 従来の問題

用途ごとにモデルを丸ごと複数起動すると、

* GPUメモリを多く使う
* 起動時間が増える
* 管理対象が増える

### Multi-LoRA の利点

* ベースモデルは1つ
* 差分だけ切り替え
* 少ないGPUで複数ユースケースに対応しやすい

---

## 運用設計で重要なポイント（図外補足）

### 1) 命名規則

* `<base>:<adapter>` 形式を統一
* adapter名に用途＋版数を入れる

例：

* `tsuzumi-base:summary-v1`
* `tsuzumi-base:sqlgen-v2`

### 2) バージョン管理

LoRA は差し替えが容易な分、**どれが稼働中か分からなくなる**問題が起きやすいです。
MinIO 上のパス規則・タグ・運用台帳を用意しましょう。

### 3) 品質評価の分離

* ベースモデル品質
* LoRA品質
* 推論性能（TTFT/TPS）

を分けて評価することが重要です。

## 実務Tips

* 最初から多用途LoRAを載せすぎない。**1〜2用途で運用を固めてから増やす**のが安全です。
* LoRA差し替え時は、推論中ジョブへの影響（キャッシュ・整合性）に注意。

---

# 13. オーダー方法：APIリクエスト構造

![NSQND13.オーダー方法：APIリクエスト構造](/images/LLM/NSQND13.オーダー方法：APIリクエスト構造.jpg)

## 図の要旨

OpenAI 互換に近い API リクエスト形式（例：`/v1/chat/completions`）で、
`model` フィールドに **Base + LoRA Adapter** を指定して切り替える考え方を示しています。

図の例（概念）

* `POST /v1/chat/completions`
* `model: "tsuzumi-base:sql..."`（Base + Adapter）
* `messages: [...]`

## リクエスト要素の詳細解説

### `POST /v1/chat/completions`

* `POST`：サーバへデータを送って処理させる HTTP メソッド
* `/v1/chat/completions`：チャット形式生成APIの代表的なパス

### `model`

どのモデル（＋必要に応じて LoRA）を使うかを指定。
この設計により、クライアント側は同じAPIを使いながら用途だけ切替可能。

### `messages`

チャット履歴を配列で渡すフィールド。
通常は `role`（system/user/assistant）と `content` を持つ。

---

## 参考リクエスト（理解用サンプル）

```bash
curl -X POST http://<vllm-service>/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tsuzumi-base:sqlgen-v1",
    "messages": [
      {"role": "system", "content": "あなたはSQL生成アシスタントです。"},
      {"role": "user", "content": "売上上位10件を取得するSQLを書いて"}
    ],
    "temperature": 0.2
  }'
```

### コマンド解説（初心者向け）

* `curl`：HTTPリクエストを送るコマンド
* `-X POST`：POSTメソッド指定
* `-H "Content-Type: application/json"`：JSON形式で送る宣言
* `-d '...'`：リクエスト本文（JSON）

---

## 図外だがよく使う API デバッグコマンド

### レスポンスヘッダーも見たい

```bash
curl -i http://<vllm-service>/health
```

### 詳細ログを見たい

```bash
curl -v http://<vllm-service>/v1/models
```

### タイムアウト設定

```bash
curl --connect-timeout 5 --max-time 60 http://<vllm-service>/v1/models
```

#### 解説

* `--connect-timeout`：接続確立までの上限秒
* `--max-time`：全体処理時間の上限秒

## 実務Tips

* 401/403/404/500 のような HTTP ステータスをまず確認し、**通信問題かアプリ問題か**を切り分けましょう。
* LoRA切替時は `model` フィールド値の typo（誤字）でハマりやすいです。

---

# 14. 品質管理：GuideLLM による評価

![NSQND14.品質管理：GuideLLMによる評価](/images/LLM/NSQND14.品質管理：GuideLLMによる評価.jpg)

## 図の要旨

オフラインでも実施可能な評価（GuideLLM 想定）として、
**TTFT** と **TPS** を重要指標として示しています。

* **TTFT**（Time To First Token）
* **TPS**（Tokens Per Second）

## 指標の詳細解説

### TTFT（Time To First Token）

リクエスト送信から、最初の1トークンが返るまでの時間。
ユーザー体感に強く影響します。

* 小さいほど良い
* 初回ロード・コールドスタートの影響を受けやすい

### TPS（Tokens Per Second）

トークン生成速度。
長い出力や高負荷時の性能感を示します。

* 大きいほど良い
* モデルサイズ、GPU、並列数、出力長で変動

---

## 品質評価で見落としがちな点（図外補足）

* **TTFT が速いが TPS が遅い**：最初の応答は速いが長文が遅い
* **TPS は高いが品質が悪い**：速度重視で温度設定やLoRA品質に問題
* **単体では速いが同時実行で崩れる**：本番運用上のボトルネック

## 推奨の評価観点（最低限）

1. 単発性能（TTFT/TPS）
2. 同時実行性能（並列数ごと）
3. 用途別品質（要約/SQL/FAQなど）
4. 安定性（連続実行時のエラー率）
5. 再現性（同構成で同等結果が出るか）

## 実務Tips

* 速度指標だけで採用を決めず、**業務タスクでの正解率・レビュー工数削減効果**まで見ると導入判断しやすいです。
* 評価条件（プロンプト、出力長、温度、GPU、並列数）を記録しないと比較不能になります。

---

# 15. 開店チェックリスト（Opening Day Checklist）

![NSQND15.開店チェックリスト（OpeningDayChecklist）](/images/LLM/NSQND15.開店チェックリスト（OpeningDayChecklist）.jpg)

## 図の要旨

本番運用前に確認すべき項目を「開店チェックリスト」としてまとめたスライドです。
メッセージとしては、

* データ主権を守りながら
* 低コストで
* 自律的なAI活用を実現する

というゴールに到達するための最終確認です。

## 本番前チェック（実務向けに再構成）

### A. 搬入・資材

* [ ] vLLM コンテナイメージが内部レジストリにある
* [ ] 必要サイドカーイメージが内部レジストリにある
* [ ] tsuzumi モデル本体が PVC に配置済み
* [ ] LoRA アダプタが MinIO に配置済み
* [ ] ハッシュ値（SHA256）を記録済み

### B. 接続・認証

* [ ] MinIO Endpoint URL が正しい
* [ ] Access Key / Secret Key が有効
* [ ] バケット参照権限がある
* [ ] DNS 解決できる
* [ ] TLS（証明書）検証が通る

### C. 設定（YAML / 環境変数）

* [ ] `TRANSFORMERS_OFFLINE=1`
* [ ] `HF_DATASETS_OFFLINE=1`
* [ ] 必要なら `HF_HUB_OFFLINE=1`
* [ ] `--model=/mnt/pvc/...` が正しい
* [ ] `--enable-lora` が有効
* [ ] `storageUri` が正しい

### D. API / 品質

* [ ] `/health` 応答OK
* [ ] `/v1/models` 応答OK
* [ ] `/v1/chat/completions` 疎通OK
* [ ] Baseモデル指定で応答OK
* [ ] LoRA指定で応答OK
* [ ] TTFT / TPS を測定済み
* [ ] 同時実行テスト実施済み

### E. 運用・監査

* [ ] バージョン管理ルールあり（Base / LoRA）
* [ ] ロールバック手順あり
* [ ] ログ保全ルールあり
* [ ] 障害時連絡先・担当分界点が定義済み

## 実務Tips（最終）

* 開店日に一番効くのは、**技術力よりチェックリスト**です。
* 特に閉域網は「その場で外から調べられない」ため、**事前の記録と手順化**が勝敗を分けます。

---

# 図に出てくるコマンド・設定のまとめ（早見版）

## OpenShift / Kubernetes 系

* `oc login`：OpenShiftクラスタへログイン
* `kubectl get pods`：Pod状態確認（OpenShiftでも利用可能な環境あり）
* `oc logs <pod名>`：ログ確認
* `oc describe pod <pod名>`：イベント・マウント・失敗理由確認

## 搬入・レジストリ系

* `skopeo copy`：レジストリ間でイメージコピー
* `podman load / save`：イメージの持ち運び
* `docker load / save`：同上（環境次第）

## MinIO / S3系

* `mc alias set`：MinIO接続先定義
* `mc ls`：一覧確認
* `mc cp`：アップロード / ダウンロード
* `aws s3 ls --endpoint-url ...`：S3互換接続確認

## 通信・証明書系（切り分け）

* `curl -v`：通信詳細確認
* `curl --cacert ...`：CA指定でTLS検証
* `openssl s_client -connect ... -showcerts`：証明書確認

## APIデバッグ系

* `curl -i`：ヘッダー込みで確認
* `curl -X POST -H ... -d ...`：APIリクエスト送信
* `curl --connect-timeout --max-time`：タイムアウト制御

---

# よくある失敗パターン（先回り対策）

## 1) 「起動しない」→ 実は外に行こうとしている

### 症状

* 起動が異常に遅い
* タイムアウト
* Hugging Face 関連の接続エラー

### 原因

オフラインフラグ未設定（`TRANSFORMERS_OFFLINE` など）

### 対策

ServingRuntime / Pod 環境変数に明示設定

---

## 2) 「MinIOに繋がらない」→ 実は証明書問題

### 症状

* `x509` エラー
* `certificate signed by unknown authority`

### 原因

自己署名証明書を Pod が信頼していない

### 対策

CA Bundle 注入、ConfigMap マウント、信頼ストア設定

---

## 3) 「LoRAが効かない」→ 実は指定名ミス / enable漏れ

### 症状

* 応答は返るが期待タスクにならない
* ベースモデルの挙動に見える

### 原因

* `--enable-lora` 未設定
* `model` の adapter 名 typo
* MinIO 側パス不一致

### 対策

* ベースのみ → LoRA1個 → 複数LoRA の順で検証
* `model` 命名規則を固定

---

# まとめ（この設計の価値）

この「プライベートAIキッチン」設計の価値は、単に AI を動かすことではなく、**閉域網でも継続運用できる形に落とし込めること**です。

* **安全性**：外部依存を抑え、データ主権を守る
* **持続可能性**：軽量モデル × vLLM × 分離保管で運用負荷を下げる
* **自律性**：社内だけで更新・評価・改善を回せる

---

# 16. 閉域網での「信頼」を設計する：自己署名証明書と公開鍵・秘密鍵の仕組み

![NSQN1.閉域網での「信頼」を設計する：自己署名証明書と公開鍵＆秘密鍵の仕組み](/images/LLM/NSQN1.閉域網での「信頼」を設計する：自己署名証明書と公開鍵＆秘密鍵の仕組み.jpg)

## 図の要旨

この図は、閉域網で AI 基盤を安定運用するための最重要テーマである **「信頼（Trust）」** を説明しています。

大きく2つの話が重なっています。

1. **公開鍵・秘密鍵・証明書の基本（暗号の土台）**
2. **閉域網で自己署名証明書を“どう信頼させるか”（運用の実務）**

特に閉域網では、公開CA（Global CA）に頼れない場面が多く、**自己署名証明書 + Trusted CA Bundle + Podへの注入** が実務の要になります。

---

## 左側の図：公開鍵・秘密鍵・証明書の「三位一体」

### 1) 秘密鍵（Private Key）

* **絶対に外部へ出してはいけない鍵**
* サーバ側で保持し、署名や復号に使う（用途により表現は異なる）
* 盗まれると、そのサーバになりすませる危険がある

### 2) 公開鍵（Public Key）

* 外部に公開してよい鍵
* 暗号化や署名検証に使う
* 公開鍵だけでは秘密鍵を再現できない（ここが公開鍵暗号の肝）

### 3) 証明書（Certificate）

* 「この公開鍵はこのサーバ/組織のものです」を示す電子証明書
* 公開鍵そのものに加え、発行者・有効期限・対象名（CN/SAN）などが入る
* 第三者（CA）または自分（自己署名）が署名する

---

## 右側の図：閉域網での「自己署名」と「信頼」の構築

図の中心メッセージはこれです。

* **自己署名証明書を作るだけでは足りない**
* **それを“信頼するもの”としてPod側に登録して初めて通信できる**

図中の流れ（概念）：

1. 内部CA / 自己署名証明書を用意
2. `odh-trusted-ca-bundle` などの ConfigMap に載せる
3. Pod（例：OpenShift AI の推論Pod）へ注入 / マウント
4. Pod内のクライアント（curl / requests / SDK）が TLS 検証に成功

---

## なぜ閉域網でここが詰まりやすいのか（超重要）

閉域網では次の状況がよく起きます。

* MinIO（内部S3）
* 内部レジストリ
* 社内API
* 社内プロキシ

これらが **自己署名証明書** で HTTPS 化されている。

しかし Pod 側は最初、その証明書を知りません。
結果、以下のようなエラーになります。

* `x509: certificate signed by unknown authority`
* `SSL certificate problem: self signed certificate`
* `TLS handshake failed`

---

## 第三者証明書 vs 自己署名証明書（図の比較ポイント）

### 第三者（外部）証明書（Third-Party）

* 公開CAにより署名済み
* 多くのOS/ブラウザが初期状態で信頼
* インターネット向けで便利
* 閉域網では運用上使いづらいことがある（更新・外部依存）

### 自己署名証明書（Self-Signed）

* 自組織で作成
* 閉域網でよく使われる
* そのままでは信頼されない
* **配布と信頼設定（CA Bundle注入）が必要**

---

## 基本用語（初心者向け）

### TLS

HTTPS の安全通信を実現する仕組み。
暗号化・改ざん検知・相手確認（証明書）を行います。

### TLS Handshake（ハンドシェイク）

通信開始時に行う「握手」。
証明書の提示や、暗号方式の合意を行う重要な処理です。

### CA（Certificate Authority）

証明書の発行者（認証局）。
閉域網では社内CA（Internal CA）を自前で運用することがあります。

### CA Bundle

信頼するCA証明書の束（bundle）。
Pod / OS / アプリに配ることで、自己署名系の証明書を検証可能にします。

---

## 図外だが実務でよく使うコマンド（証明書の確認・切り分け）

### A. 証明書チェーン確認（openssl）

```bash
openssl s_client -connect minio.local:9000 -showcerts
```

#### 解説

* `openssl s_client`：TLS接続テスト用コマンド
* `-connect`：接続先 `ホスト:ポート`
* `-showcerts`：サーバが返した証明書チェーンを表示

> まず「どの証明書が返ってきているか」を見るのに有効です。

---

### B. CA指定で curl 検証

```bash
curl --cacert /path/to/internal-ca.crt https://minio.local:9000
```

#### 解説

* `--cacert`：このCA証明書を信頼して検証する
* `-k/--insecure` より安全で、原因切り分けにも向いています

---

### C. 証明書の中身を確認

```bash
openssl x509 -in internal-ca.crt -text -noout
```

#### 解説

* 証明書の発行者、期限、用途、SAN などを確認できます
* `Not Before / Not After`（有効期間）切れは頻出トラブルです

---

## OpenShift / OpenShift AI での実務観点（図の `odh-trusted-ca-bundle` に関連）

> 環境によって ConfigMap 名や注入方法は異なります（例：OpenShift AI / ODH / 運用ポリシー差分）。
> ただし原則は同じです。

* 社内CA証明書を ConfigMap 化
* 推論Podにマウント/注入
* アプリ/ツールがそのCAバンドルを参照するように設定

### よく使う環境変数（Pod内）

```bash
export REQUESTS_CA_BUNDLE=/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem
export CURL_CA_BUNDLE=/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem
export SSL_CERT_FILE=/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem
```

#### 解説

* `REQUESTS_CA_BUNDLE`：Python `requests` 系
* `CURL_CA_BUNDLE`：`curl`
* `SSL_CERT_FILE`：OpenSSLベースライブラリ

---

## ハマりどころ（夜に効くやつ）

### 1) 証明書は正しいのに失敗する

原因候補：

* **接続先ホスト名** と 証明書の **SAN/CN** が不一致
  （例：証明書は `minio.local` なのに `https://10.0.0.15:9000` で接続）

### 2) `curl` は通るのにアプリは失敗する

原因候補：

* `curl` とアプリ（Python/Java/Go）で参照する信頼ストアが別

### 3) 一部Podだけ通らない

原因候補：

* CA Bundle 注入の対象Pod/Namespace が統一されていない

---

## 実務Tips（おすすめ手順）

1. **openssl で証明書を見る**
2. **curl + `--cacert` で接続確認**
3. **Pod内で同じ確認をする**
4. **アプリ実行環境のCA参照先を確認**
5. **ConfigMap/注入設定を横展開**

この順で見ると、かなり早く切り分けできます。

---

# 17. 閉域網AIの「地雷」を回避せよ：GPUメモリ不足（OOM）対策ガイド

![NSQN2.閉域網の「地雷」を回避せよ：GUPメモリ不足（OOM）対策ガイド](/images/LLM/NSQN2.閉域網の「地雷」を回避せよ：GUPメモリ不足（OOM）対策ガイド.jpg)

## 図の要旨

この図は、閉域網AIで非常に起きやすい障害である **OOM（Out Of Memory）**、特に **GPU VRAM不足** の原因と対策を、かなり実務的に整理したものです。

図の主張はシンプルです。

* VRAMを食う犯人は1つではない
* **「モデル重み」「KVキャッシュ」「LoRA」** が取り合う
* 対策は気合ではなく、**パラメータ設計**（鉄板3設定）

---

## 上段：VRAMを占有する「地雷」の正体

### 1) モデル重み（Model Weights）

* ベースモデル本体の重み
* 起動時に大きくVRAMを使用
* モデルサイズが大きいほど重い

### 2) KVキャッシュ（Key/Value Cache）

* 推論中にトークン履歴を保持するための領域
* **コンテキスト長（max-model-len）** や同時実行数で膨らむ
* 長文処理・複数同時実行で一気に圧迫しやすい

### 3) LoRAアダプタ

* ベースモデルに対する差分パラメータ
* 単体は軽いが、**同時ロード数が増えると効いてくる**
* 動的ロード時に一時的なメモリ増加を招くことがある

---

## 図のキーメッセージ（重要）

### 「VRAMを奪い合う3大要素」

図の通り、OOMは単純に「モデルが重いから」だけではありません。
**パラメータの組み合わせ**で起きます。

---

### 「KVキャッシュの領域不足」

入力が長い / 同時実行が多い / 出力も長い、の組み合わせで、
KVキャッシュが肥大化して停止します。

> 実務では「昨日まで動いていたのに、長い入力で突然落ちる」が典型です。

---

### 「動的LoRAロードの罠」

推論実行中に新しいLoRAをロードする設計だと、
「余裕がない状態」で追加メモリが必要になりOOMを誘発しやすいです。

---

## 下段：OOMを回避する3つの鉄板設定（図の核心）

### 1) `gpu-memory-utilization` の調整

図の意図：

* デフォルトの高め設定（例：0.9）を少し下げる
* **余白（バッファ）** を確保する

#### なぜ効く？

VRAMをギリギリまで使い切る設定だと、LoRA追加や突発的な長文入力で即死しやすい。
**安全マージン**を作ると安定度が上がります。

#### 目安（図の例）

* `0.8 ~ 0.85` あたり（環境による）

---

### 2) `max-loras` による同時ロード制限

図の意図：

* 同時にVRAMへ載せる LoRA 数を制限
* LoRA と KVキャッシュの取り合いを緩和する

#### なぜ効く？

LoRAを増やすほど柔軟性は上がるが、VRAM余裕は減る。
**マルチテナント性と安定性のトレードオフ**です。

#### 目安（図の例）

* `4 ~ 8`（GPU容量とモデル次第）

---

### 3) `max-model-len` でのコンテキスト制限

図の意図：

* 最大トークン長を用途別に制限
* KVキャッシュの最大消費量を抑える

#### なぜ効く？

OOMの大犯人がKVキャッシュのことは多いです。
業務要件に合わせて **必要十分な長さ** に制限すると、安定性が大きく上がります。

#### 目安（図の例）

* `2048 ~ 8192`

---

## 用語解説（初心者向け）

### OOM（Out Of Memory）

メモリ不足で処理が継続できない状態。
GPUなら VRAM不足により推論が失敗します。

### VRAM

GPUに載っている専用メモリ。
CPUのRAMとは別で、LLM推論ではここが主戦場です。

### コンテキスト長（Context Length）

モデルが一度に扱える（または扱わせる）トークン数の上限。
長くするほど便利ですが、KVキャッシュが大きくなります。

---

## 図外だが実務でよく使う vLLM 起動パラメータ例

```bash
python -m vllm.entrypoints.openai.api_server \
  --model /mnt/pvc/tsuzumi \
  --gpu-memory-utilization 0.85 \
  --enable-lora \
  --max-loras 4 \
  --max-model-len 4096
```

### 各引数の意味

* `--gpu-memory-utilization 0.85`
  VRAM使用率の上限目安（余白を確保）
* `--enable-lora`
  LoRAを使うなら必須
* `--max-loras 4`
  同時ロードLoRA数の制限
* `--max-model-len 4096`
  最大コンテキスト長の制限

> 値は固定の正解ではなく、**GPU容量・モデルサイズ・業務要件**で調整します。

---

## 監視・切り分けで使うコマンド（図外の実務）

### A. GPU使用状況確認（ホスト側）

```bash
nvidia-smi
```

### B. 継続監視（Linux）

```bash
watch -n 1 nvidia-smi
```

#### 解説

* `watch -n 1`：1秒ごとに再実行
* 推論時のVRAM増減や張り付きが見やすい

---

### C. Podログ確認（OpenShift）

```bash
oc logs <vllm-pod-name> --tail=200
```

### D. Podのイベント確認

```bash
oc describe pod <vllm-pod-name>
```

#### 見るポイント

* `OOMKilled`
* 再起動回数増加
* 起動時エラー / liveness probe failure

---

## 典型的な失敗パターン（現場あるある）

### 1) PoCでは動くのに本番で落ちる

原因候補：

* 同時実行数が増えた
* 想定より長い入力が来た
* LoRAが増えた

### 2) LoRAを増やしたら突然不安定

原因候補：

* `max-loras` 未制限 / 高すぎ
* `gpu-memory-utilization` が高すぎて余白ゼロ

### 3) 長文タスクだけ失敗する

原因候補：

* `max-model-len` が大きすぎる（KVキャッシュ過多）
* 出力トークン上限も含めて重い設定になっている

---

## 実務Tips（安定運用の考え方）

* 最初は「速さ最大」より **落ちない設定** を優先
* **用途別プロファイル** を作ると良い

  * FAQ用（短文・高速）
  * 要約用（中長文）
  * SQL生成用（中程度）
* 変更は1項目ずつ（`max-loras` と `max-model-len` を同時に変えない）

---

# 18. プライベートAI基盤：手動搬入とデプロイの「重圧」

![NSQN3.プライベートAI基盤：手動搬入とデプロイの「重圧」](/images/LLM/NSQN3.プライベートAI基盤：手動搬入とデプロイの「重圧」.jpg)

## 図の要旨

この図は、閉域網AI基盤の実装で「技術そのもの」以上に現場を苦しめる、**手動搬入・構成ズレ・設定の複雑さ** をまとめたものです。

図全体のメッセージは次の通りです。

* 閉域網では **外部資材の自給自足** が必要
* GUIだけでは完結しないことが多く、**YAML修正（手術）** が必要
* さらに **TLS / VRAM / フォルダ構造** の罠がある

つまり、AI推論の前に **運用工学** が必要、という話です。

---

## 左側：手動搬入の「三重苦」— プロセスに潜む複雑さ

### 1) 外部資材の「自給自足」化（oc-mirror / 内部レジストリ）

図では、外部レジストリ → `oc-mirror` → 内部レジストリの流れが描かれています。

#### 何をしている？

* インターネット接続可能環境で必要イメージを収集
* 閉域側で使える内部レジストリへ転送
* クラスタは内部レジストリだけを見る

#### なぜ必要？

閉域網では通常の `docker pull` / `podman pull` が直接できないため。

---

### 2) ハイブリッド・ストレージ配置（PVC + MinIO）

図では、ベースモデルと LoRA を別経路で配置しています。

* **ベースモデル（大容量）** → PVC（SCPなどで搬入）
* **LoRA（軽量）** → MinIO（S3互換ストレージ）

#### 意味

* 大きいものは安定配置（PVC）
* 差し替えやすいものはオブジェクトストレージ（MinIO）

前ページまでの「冷蔵庫（PVC）とパントリー（MinIO）」戦略の実務版です。

---

### 3) GUIの限界と「YAML手術」

図の下段では、GUIで設定できない項目を YAML 側で補う話が描かれています（例：`--enable-lora`）。

#### 実務で起きること

* GUIで推論サービスを作った
* でも必要な追加引数が出せない / 足りない
* 結局、YAMLを編集して `args` / `env` / volumeMounts を追記する

> ここは初心者が一番「え、GUIだけじゃダメなの？」となるポイントです。

---

## 中央：閉ざされた厨房（Air-Gapped Environment）と手動搬入

図の中央は、閉域網に人が手で資材を運び込むイメージです。
これは比喩ですが、実務上かなり本質的です。

### 本質

* 搬入は人手・申請・承認・証跡が絡む
* 1回のミス（ファイル欠落・版違い）で半日溶ける
* だからこそ **手順化・チェックリスト化** が効く

---

## 右側：現場を悩ませる「技術的リスク」の正体（3つ）

### リスク1) 自己署名証明書の「TLSの壁」

図では、内部S3（MinIO）への接続で TLS Handshake 失敗が描かれています。

#### よくある症状

* `TLS Handshake Failed`
* `x509 unknown authority`
* SDKだけ失敗、curlは通る（CA参照差）

#### 対策

* Trusted CA Bundle を注入
* ConfigMap / Podマウント
* CA参照環境変数の設定

> これはページ16の内容と直結します。

---

### リスク2) GPUメモリ（VRAM）のトレードオフ

図では、LoRA同時ロード数（`max-loras`）と長文用キャッシュ（Long Context Cache）の天秤が描かれています。

#### 意味

* LoRAをたくさん載せるほど便利
* でも長文処理に必要なKVキャッシュ領域が減る
* バランスが悪いと OOM

#### 対策

* `gpu-memory-utilization`
* `max-loras`
* `max-model-len`

> これはページ17の内容と直結します。

---

### リスク3) フォルダ構造の不一致エラー（`Adapter Not Found`）

図では、「期待される配置」と「実際の配置」が1階層ズレており、`Adapter Not Found` になる例が示されています。

#### 典型例

* 想定：`/lora/sqlgen-v1/adapter_config.json`
* 実際：`/lora/sqlgen-v1/sqlgen-v1/adapter_config.json`

この **1階層ズレ** が非常に多いです。

#### なぜ起きる？

* zip/tar 展開時にルートディレクトリが1つ増える
* 手動コピー時にパスを誤る
* GUI/設定側の `storageUri` と実データ配置が合っていない

---

## 図外だが実務でよく使うコマンド（搬入・確認・YAML適用）

### A. 内部レジストリへの搬入（概念例）

```bash
oc-mirror --config imageset-config.yaml docker://registry.internal.local:5000
```

#### 解説

* `oc-mirror`：OpenShift向けに必要イメージ群をミラーリングする代表ツール
* `--config`：どのイメージを持ち込むか定義した設定ファイル

> 実環境ごとに `imageset-config.yaml` は異なります。

---

### B. ベースモデルの手動搬入（SCP例）

```bash
scp -r ./tsuzumi-base user@bastion:/data/models/
```

#### 解説

* `scp`：SSH経由でファイルコピー
* `-r`：ディレクトリごとコピー
* 閉域では bastion 経由の搬入が多い

---

### C. MinIOへLoRA配置（mc例）

```bash
mc alias set localminio https://minio.local:9000 <ACCESS_KEY> <SECRET_KEY>
mc cp -r ./lora/sqlgen-v1 localminio/lora/
```

#### 解説

* `mc cp -r`：ディレクトリごとアップロード
* `storageUri` と実際の格納先パス一致が重要

---

### D. YAML適用（OpenShift/Kubernetes）

```bash
oc apply -f inference-service.yaml
```

#### 解説

* YAML編集後にクラスタへ反映
* GUIで作ったものを `oc get -o yaml` で取得して修正→再適用、という流れも多い

---

### E. Podの設定確認（引数・環境変数を確認）

```bash
oc get pod <pod-name> -o yaml
```

#### 見るポイント

* `spec.containers[].args`
* `spec.containers[].env`
* `volumeMounts`
* `volumes`
* `image`

---

## フォルダ構造の不一致を防ぐチェック（おすすめ）

### 1) ローカルで構造確認

```bash
find ./lora/sqlgen-v1 -maxdepth 3 -type f | sort
```

### 2) MinIO上で確認

```bash
mc ls -r localminio/lora/sqlgen-v1
```

### 3) Pod内で確認（必要時）

```bash
oc exec -it <pod-name> -- ls -R /mnt/pvc/tsuzumi | head -100
```

> `storageUri` / マウント先 / 実際のファイル構造の3点を揃えるのがコツです。

---

## YAML手術でよく足す項目（実務補足）

* `args`（例：`--enable-lora`, `--max-loras`, `--max-model-len`）
* `env`（オフラインフラグ、CA関連環境変数）
* `volumeMounts`（PVC/CA bundle）
* `resources.limits`（GPU/CPU/Memory）
* `nodeSelector` / `tolerations`（GPUノードに載せるため）

---

## 典型的な失敗パターン（夜ふかしポイント）

### 1) GUIでは設定できたつもり

実際は `args` が不足しており LoRA が有効化されていない。

### 2) 搬入は完了したつもり

実際は **内部レジストリ** には入ったが **MinIO/PVC** が未配置（または版違い）。

### 3) ファイルはあるのに `Adapter Not Found`

実際は 1階層ズレ / パス誤り / `storageUri` のprefix違い。

---

## 実務Tips（手順化のすすめ）

閉域網のAI構築は、技術というより **再現可能な段取り** が勝負です。
以下のように分けると安定します。

1. **搬入手順**（イメージ / モデル / LoRA）
2. **配置確認手順**（内部レジストリ / PVC / MinIO）
3. **TLS確認手順**（証明書 / CA Bundle）
4. **起動確認手順**（Pod / args / env）
5. **API疎通手順**（health / models / completions）
6. **性能確認手順**（OOM発生有無、TTFT/TPS）





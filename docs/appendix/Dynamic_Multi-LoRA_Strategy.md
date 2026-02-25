# 動的AIサービング：効率的なカスタムモデルデプロイ戦略

## OpenShift AI × vLLM による「Multi-LoRA」アーキテクチャと実装プロセス

## この資料の読み方（最重要）

この資料は、閉域網（Air-Gapped）環境で **OpenShift AI + vLLM + Multi-LoRA** を使い、
**1つのベースモデルから複数部門向けAIを効率よく提供する設計・運用方法** を解説します。

全体の流れは次の3層です。

1. **なぜこの方式が必要か（戦略・課題）**
2. **どういう構成で実現するか（アーキテクチャ・スタック）**
3. **どう運用するか（デプロイ手順・YAML・API設計・ガバナンス）**

---

## 前提（この資料で扱う想定）

* **閉域網（Air-Gapped）** でインターネット接続なし
* **OpenShift AI** 上で LLM 推論基盤を構築
* **vLLM** を推論エンジンとして利用
* **LoRA アダプタ** を切り替えて部門別AI（HR/Sales/Legal/Devなど）を提供
* **MinIO（S3互換）** と **PVC** を使い分ける
* GUI と YAML 編集のハイブリッド運用を行う

---

## 用語の先読み（最初にざっくり）

* **Base Model（ベースモデル）**
  共通の土台となる大規模言語モデル（例：tsuzumi）。
* **LoRA（Low-Rank Adaptation）**
  モデル全体を再学習せず、差分（軽量アダプタ）だけでカスタマイズする方式。
* **Adapter（アダプタ）**
  各部門・各用途向けの LoRA 差分ファイル。
* **vLLM**
  高速・高効率な LLM 推論エンジン。PagedAttention や連続バッチ処理などが強み。
* **KServe**
  Kubernetes/OpenShift 上で推論サービスを提供するための仕組み（InferenceServiceなど）。
* **PVC（Persistent Volume Claim）**
  Kubernetes/OpenShift で使う永続ストレージ要求。大きいベースモデルに向く。
* **MinIO**
  S3互換のオブジェクトストレージ。軽量アダプタを大量管理しやすい。

---

# 1. 表紙：動的AIサービングの全体テーマ

![DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略](/images/LLM/DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略.jpg)

## 図の要旨

* 1つの **Base Model（tsuzumi）** を中心に、
* **HR / Sales / Legal / Dev** など複数部門向けのAI機能を展開する、
* **マルチテナント型のAI提供基盤** を目指す資料です。

図は「1つの土台（Base Model）」に対して複数の業務ドメインがぶら下がる構図を示しており、
後続ページで説明される **Multi-LoRA（動的LoRA切り替え）** の全体像を先に見せています。

## 詳細解説（用語・背景）

### なぜ「部門ごとAI」が必要か

企業内AIでは、部署ごとに以下が異なります。

* 用語（人事・営業・法務・開発）
* 欲しい回答形式
* 禁止事項（法務・個人情報）
* ガードレール（出力制約）

そのため、1つのLLMをそのまま全社共通で使うより、
**土台モデル + 部門別の調整** のほうが現実的です。

### なぜ「複数モデルを丸ごと持たない」のか

各部門専用モデルを別々に持つと、GPUメモリやデプロイ運用コストが急増します。
この課題が次ページ以降で整理されます。

## Tips（実務）

* 最初に「全社1モデルで何とかする」より、**共通ベース + 業務差分（LoRA）** の設計に寄せると、運用の見通しが良くなります。
* 表紙時点で「誰向けAIを増やすのか」を明確にすると、後のストレージ設計・命名設計が楽です。

---

# 2. 戦略的決定：GPU効率と俊敏性を最大化する「パターンC」の採用

![DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略](/images/LLM/DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略.jpg)

## 図の要旨

このページでは、従来型の構成ではなく、**動的LoRA（Pattern C）** を採用する理由を説明しています。

主張は次の3点です。

1. **Architecture**
   モノリシック（一体型）から、**Base + Dynamic Adapter（切り離し）** に変更
2. **Cost Efficiency**
   物理分離（複数GPU/複数インスタンス）から、**論理分離（アダプタ切り替え）** へ
3. **Deployment Speed**
   再起動前提の長いデプロイから、**動的切り替えで秒オーダー** を目指す

## 詳細解説（なぜパターンCなのか）

### パターンCの本質

* **ベースモデルは固定（共有）**
* **LoRAアダプタだけ差し替え**
* **リクエスト時にどのLoRAを使うか指定**

つまり「インフラ資源の共有」と「業務特化」の両立です。

### 俊敏性（Agility）が重要な理由

業務AIは、

* 要件変更が多い
* 試験導入が多い
* 部門追加が多い
  ため、**“再デプロイ待ち”がボトルネック** になりやすいです。

## Tips（実務）

* 技術選定時は「精度」だけでなく、**運用の変更頻度** を評価軸に入れると失敗しにくいです。
* パターンCは設計が良い一方、**命名規約・アダプタ管理・APIルール** を先に決めないと混乱しやすいです。

---

# 3. 課題：モノリシックAIデプロイが招く「コスト」と「運用」の壁

![DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略](/images/LLM/DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略.jpg)

## 図の要旨

このページは、従来の2パターン（Pattern A/B）の問題点を整理しています。

* **Pattern A（Integrated Model）**

  * 部門ごとにモデルが重い
  * GPU VRAM占有が増える
  * モデル数に比例してコストが増える
* **Pattern B（Static LoRA）**

  * LoRA追加のたびに再起動・再構成
  * ダウンタイムや運用摩擦が発生
  * 改善サイクルが遅くなる

右のグラフでは、モデル数増加に対して

* Pattern A/B はコスト・VRAM利用が増大
* **Pattern C（提案）は伸びを抑制**
  という比較を視覚化しています。

## 詳細解説（問題の本質）

### Pattern A の問題（統合モデル/専用モデル乱立）

* モデルごとにGPUメモリを消費
* 複数部門を並行提供するとGPUが足りない
* 使われていない時間のGPUも固定コスト化

### Pattern B の問題（静的LoRA）

* LoRAは軽量でも、**起動時に固定ロード** だと柔軟性が落ちる
* 新規部門追加や更新でコンテナ再起動が必要
* 運用者の負担（夜間作業・調整）が増える

## 基本用語（初学者向け）

* **VRAM**：GPU上のメモリ。LLM推論では最重要資源の1つ。
* **ダウンタイム**：サービス停止時間。
* **Agility（俊敏性）**：要件変更や改善に素早く対応できる性質。

## Tips（実務）

* 「GPUが足りない」は、モデル精度問題ではなく **配置戦略問題** のことが多いです。
* 最初に **“増えるのは何か（部門数 / モデル数 / リクエスト数）”** を見極めると構成判断がしやすくなります。

---

# 4. 解決策：「Private AI Kitchen」アーキテクチャ

![DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略](/images/LLM/DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略.jpg)

## 図の要旨

このページは、本資料の中心概念である **「Private AI Kitchen」** を示しています。

料理の比喩で整理すると：

* **The Stock（出汁） = Base Model（tsuzumi）**

  * 高速ストレージ（PVC）に置き、GPUに常駐
* **The Spices（スパイス） = LoRA Adapters**

  * MinIO/S3に保存し、必要時に読み込む
* **The Chef（料理人） = vLLM**

  * リクエストに応じてLoRAをロードして推論
* **Dish（料理） = 特化AIの出力**

  * HR向け、営業向け、法務向けなどの応答

## 詳細解説（設計意図）

### なぜベースモデルをPVCに置くのか

ベースモデルはサイズが大きく、

* 毎回ダウンロード/読み込みすると遅い
* 起動時間が長くなる
* I/O負荷が高い

そのため、**永続ボリューム（PVC）に固定配置** して、起動時の安定性を高めます。

### なぜLoRAをMinIOに置くのか

LoRAアダプタは比較的軽量で、

* 数が増えやすい
* 更新頻度が高い
* テナント単位で管理したい

ため、**オブジェクトストレージ（MinIO/S3互換）** に置くのが相性良いです。

## 基本用語

* **S3互換**：AWS S3 と同じAPI/操作感で扱えるストレージ。
* **動的ロード**：必要なタイミングで読み込むこと。
* **推論（Inference）**：学習済みモデルで入力に対して出力を生成する処理。

## Tips（実務）

* スライドの比喩（出汁・スパイス・料理人）は、**非技術者説明** に非常に有効です。
* 技術設計書では比喩に加えて、**実体（PVC/MinIO/vLLM）を対応表で示す** とレビューが通りやすくなります。

---

# 5. デプロイ方式の比較評価（Pattern A / B / C）

![DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略](/images/LLM/DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略.jpg)

## 図の要旨

このページは、3つの方式を比較表で評価しています。

評価軸は以下の4つです。

* **GPU Efficiency（GPU効率）**
* **Deployment Agility（デプロイ俊敏性）**
* **File Management（ファイル管理性）**
* **Multi-tenant Cost（マルチテナントコスト）**

結論として **Pattern C（動的LoRA）** が総合的に優位、という評価です。

## 詳細解説（評価軸の見方）

### 1) GPU Efficiency

* Pattern A：モデル専有で効率悪化
* Pattern B：ベースモデル分を常に消費
* Pattern C：差分だけ展開しやすく効率的

### 2) Deployment Agility

* Pattern A：再起動必須・長時間
* Pattern B：再起動や再構成が必要
* Pattern C：動的追加で停止を減らせる

### 3) File Management

* Pattern A：モデルが重く管理が大変
* Pattern B/C：Base + 差分で整理しやすい
* 特にCは運用フローに組み込みやすい

### 4) Multi-tenant Cost

* 共用基盤で論理分離できるCが有利

## Tips（実務）

* この表は提案書・上申資料に使いやすいページです。
* 実案件では、比較表に **「監視」「運用手順難易度」「障害復旧性」** を追加するとさらに説得力が増します。

---

# 6. システム構成：閉域網（Air-Gapped）での自給自足モデル

![DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略](/images/LLM/DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略.jpg)

## 図の要旨

このページは、インターネット接続なしの **Air-Gapped 環境** で、必要資源をすべて内部保持する構成を示しています。

構成要素（図の読み取り）：

* **Internal Storage (PVC)**：Base Model 配置
* **MinIO (Object Storage)**：LoRA Adapters 配置
* **Internal Image Registry**：コンテナイメージ保管
* **OpenShift AI Cluster / vLLM(KServe)**：推論実行
* **Cloud/Internet（遮断）**：Hugging Face等へ直接出ない前提

## 詳細解説（閉域網で重要な点）

### 1) モデルの持ち込み

閉域網では外部リポジトリ（Hugging Face 等）に直接アクセスできないため、

* 事前ダウンロード
* 持込手順
* 社内承認
* チェックサム検証
  が必要になることが多いです。

### 2) イメージの持ち込み

コンテナイメージも同様に、

* 外部レジストリで取得
* 社内レジストリへ登録
* そこからOpenShiftでPull
  という流れになります。

### 3) 証明書・名前解決

閉域網では通信そのものより、

* 証明書信頼
* DNS解決
* プロキシ設定
  で詰まりやすいです（運用上非常に重要）。

## 基本用語

* **Air-Gapped**：物理/論理的に外部ネットワークから隔離された環境。
* **Internal Registry**：社内向けのコンテナイメージ保管庫。
* **KServe**：Kubernetes/OpenShift 上の推論サービス定義/運用基盤。

## Tips（実務）

* 閉域構成では「モデル本体」だけでなく **依存ライブラリ・イメージ・証明書・YAMLテンプレート** まで含めて運用資材化すると安定します。
* 障害切り分けは、**ストレージ / ネットワーク / 証明書 / Pod設定** の順で見ると効率的です。

---

# 7. テクノロジースタック：KServe × vLLM

![DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略](/images/LLM/DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略.jpg)

## 図の要旨

このページは、なぜ **KServe** と **vLLM** を組み合わせるのかを説明しています。

### KServe 側の観点

* Single-Model Serving（推論サービス公開）
* 大きなLLMのデプロイに適する
* Knativeによるスケール対応（使わない時にリソース解放）
* Note: ModelMesh は小規模モデル多数向けで、LLMには不向きな場面がある

### vLLM 側の観点

* **PagedAttention**：メモリ効率向上
* **Multi-LoRA Support**：動的アダプタ切り替え
* **Continuous Batching**：複数リクエスト処理効率化

## 詳細解説（役割分担）

### KServe = サービス化・運用の土台

KServeは主に、

* 推論サービスの定義（InferenceService）
* 起動・公開
* ルーティング
* Kubernetes上での運用
  を担当します。

### vLLM = 推論性能・LoRA切替のコア

vLLMは主に、

* LLM推論本体
* GPU効率化
* LoRAの動的読み込み
  を担当します。

## 基本用語（初学者向け）

* **Knative**：イベント駆動/サービング基盤。スケーリング機構として使われることが多い。
* **PagedAttention**：KVキャッシュを効率的に扱い、VRAM利用を最適化するvLLMの重要機能。
* **Continuous Batching**：到着したリクエストを継続的にまとめて処理し、スループットを高める技術。

## Tips（実務）

* 「KServeかvLLMか」ではなく、**KServe（運用面）+ vLLM（推論面）** の分担で考えると理解しやすいです。
* 運用設計書では、**障害時にどちらの責務か**（KServe側か vLLM側か）を分けて書くと切り分けが速くなります。

---

# 8. デプロイメント・ワークフロー（3ステップ）

![DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略](/images/LLM/DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略.jpg)

## 図の要旨

ワークフローは3段階に整理されています。

1. **Preparation（準備）**

   * BaseモデルをPVCへ配置
   * LoRAアダプタをMinIOへアップロード
2. **Deployment（構成）**

   * GUIでBaseモデルデプロイ
   * YAML編集でLoRA機能有効化（`--enable-lora`）
3. **Inference（推論）**

   * APIリクエスト時に `model` を指定して使い分け

## 詳細解説（設計のポイント）

この流れは非常に重要で、特に **Step2 と Step3 を分離** しているのがポイントです。

* Step2：推論基盤を立てる
* Step3：リクエストで振る舞いを切り替える

つまり、**毎回デプロイし直すのではなく、API設計で多用途化** します。

## Tips（実務）

* 新しいLoRA追加時に、運用を混乱させないために「準備→反映→利用開始」の責任者を分けると安全です。
* この3ステップをそのまま、運用手順書やRunbookの章立てに使えます。

---

# 9. Step1：ストレージ戦略（PVC と MinIO の使い分け）

![DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略](/images/LLM/DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略.jpg)

## 図の要旨

このページは、**ベースモデルとLoRAアダプタの置き場所を明確に分ける** 方針を示しています。

### Base Model（tsuzumi）

* 配置場所：**PVC**
* 理由：サイズ大（数十GB）
* 高速マウントを優先
* 例Path：`/mnt/models/tsuzumi-base`

### LoRA Adapters

* 配置場所：**MinIO（S3 Compatible）**
* 理由：軽量（数十MB）・更新頻度高・数が増える
* 例Path：`s3://models/lora/<tenant_name>/<version>/`

## 詳細解説（なぜ分けるのか）

### PVC向きのデータ

* 大きい
* 起動時に必須
* 頻繁には変わらない

### MinIO向きのデータ

* 小さい
* 追加/更新が多い
* バージョン管理したい
* テナント単位で整理したい

## 基本用語

* **PVC（Persistent Volume Claim）**：永続ボリュームを利用するための要求。
* **MinIO**：オンプレ/閉域向けにも使いやすいS3互換オブジェクトストレージ。
* **S3 URI**：`s3://bucket/path` 形式のオブジェクト指定。

## Tips（実務）

* LoRA格納は、最初から **`<tenant>/<usecase>/<version>`** のような階層ルールを決めると運用が楽です。
* バージョンを上書きせず、**世代管理** できる構成にするとロールバックしやすいです。

---

# 10. Step2：デプロイ操作（GUI + YAML編集）

![DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略](/images/LLM/DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略.jpg)

## 図の要旨

このページは、**GUIで土台を作り、YAMLでLoRA設定を注入するハイブリッド手法** を示しています。

* **Phase A (GUI)**
  OpenShift AI ダッシュボードで vLLM ランタイムを選択し、Baseモデルのパスを指定してデプロイ作成
* **Phase B (YAML)**
  作成された `InferenceService` に対し、LoRA関連設定を追加編集

図中には `oc new-project vllm` の例もあり、プロジェクト（namespace）作成の流れも示唆されています。

## コマンド解説（図にあるもの）

### `oc new-project vllm`

```bash
oc new-project vllm
```

#### 意味

* OpenShift で **新しいプロジェクト（namespace）** `vllm` を作成します。
* Kubernetesの `namespace` に相当し、リソース分離の単位です。

#### よく使う関連コマンド

```bash
oc projects              # 利用可能なプロジェクト一覧
oc project vllm          # 作業対象プロジェクトを切替
oc status                # 現在プロジェクトの状態確認
```

## YAML編集のポイント（概要）

図では `apiVersion: serving.kserve.io/v1beta1` / `kind: InferenceService` が示されており、
KServeの推論サービス定義に対して `args` を追加していく構成です。

## Tips（実務）

* 最初からYAMLを手書きするより、GUIで土台を作ってから編集すると事故が減ります。
* ただしGUIの再編集でYAML差分が消えることがあるため、**必ずGit管理 or バックアップ** を推奨します。

---

# 11. 重要なYAML構成（vLLM起動引数）

![DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略](/images/LLM/DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略.jpg)

## 図の要旨

このページは、vLLMのMulti-LoRA構成で重要な起動引数を整理しています。

図中の主な引数（例）：

* `--enable-lora`  … LoRA機能を有効化
* `--max-loras=4`  … 同時展開可能なアダプタ数
* `--max-lora-rank=16` … LoRAランク上限
* `--lora-modules` … （Pattern Bでの固定指定向け、Pattern Cでは通常不要）

また、注記として **Pattern C（動的）では特定アダプタをYAMLにハードコードしない** ことが重要と説明しています。

## 詳細解説（各引数）

### `--enable-lora`

LoRA機能を有効化するフラグ。
これがないと、APIで `model` を切り替えてもLoRAを使えません。

### `--max-loras`

同時にメモリへロード可能なLoRA数の上限。
値を上げすぎるとVRAM使用量が増え、OOM（メモリ不足）を起こしやすくなります。

### `--max-lora-rank`

扱うLoRAランクの上限。
高ランクLoRAに対応するほど柔軟ですが、そのぶんメモリコストにも影響します。

### `--lora-modules`

静的にLoRAを登録する用途で使われることがあります。
Pattern C（動的LoRA）では、**YAML固定よりAPI指定** を基本とするため、不要または限定的利用になります。

## YAML編集時の実務注意

* 引数追加位置（`args:` の階層）を誤ると起動失敗
* YAMLインデントミスでデプロイ不可
* GUI再適用で消える差分に注意

## Tips（実務）

* まずは小さな値（例：`--max-loras=2~4`）から始めて、VRAM使用率を見ながら調整すると安全です。
* 本番値は、**最大同時テナント数 / VRAM / 応答要件** のバランスで決めます。

---

# 12. Step3：APIリクエスト設計（動的指定）

![DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略](/images/LLM/DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略.jpg)

## 図の要旨

このページは、OpenAI互換APIを利用して、**`model` パラメータでLoRAを切り替える** 設計を示しています。

例として：

* HR部門リクエスト → `model: "hr-lora-v1"`
* 営業部門リクエスト → `model: "sales-lora-v1"`

vLLM Pod はリクエストを受け取り、指定されたアダプタを MinIO から動的ロードして推論します。

## コマンド解説（curl例：図の趣旨に合わせた実践形）

> URLやエンドポイントは環境依存です。以下は「考え方」を示すサンプルです。

### 例1：HR向けLoRAを指定して推論

```bash
curl -X POST "https://<vllm-endpoint>/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "model": "hr-lora-v1",
    "messages": [
      {"role": "system", "content": "あなたは人事業務のアシスタントです。"},
      {"role": "user", "content": "育休制度の申請時の注意点を教えてください。"}
    ],
    "temperature": 0.2
  }'
```

### 例2：営業向けLoRAを指定して推論

```bash
curl -X POST "https://<vllm-endpoint>/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "model": "sales-lora-v1",
    "messages": [
      {"role": "system", "content": "あなたは営業提案資料作成支援AIです。"},
      {"role": "user", "content": "製造業向け提案の構成案を作ってください。"}
    ]
  }'
```

## 基本用語（API関連）

* **OpenAI互換API**：OpenAI風のAPI仕様（`/v1/chat/completions` 等）に似せたインターフェース。
* **Authorization Bearer**：認証トークンをHTTPヘッダで送る方式。
* **JSON**：APIでよく使うデータ形式。

## Tips（実務）

* `model` 名は自由に増やすと混乱するため、**命名規約**（例：`<dept>-lora-v<version>`）を必ず決めましょう。
* API利用側に「使ってよいmodel一覧」を公開すると、運用問い合わせが減ります。

---

# 13. ガバナンスとセキュリティ（TrustyAI Guardrails）

![DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略](/images/LLM/DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略.jpg)

## 図の要旨

このページは、推論の前後に **ガードレール（TrustyAI Guardrails）** を置くことで、

* 入力の検査
* 出力の検査
  を実施する構成を示しています。

さらに、**Dynamic Policy** により、適用されるLoRA（例：人事向け等）に応じて
ガードルールの厳しさや内容を動的に変えられる考え方を示しています。

### 入力チェックの例（図）

* プロンプトインジェクション対策
* 差別表現のブロック

### 出力チェックの例（図）

* ハルシネーション抑制
* PII（個人情報）漏洩防止

## 詳細解説（なぜ必要か）

同じベースモデルでも、業務用途ごとにリスクが違います。

* 人事：個人情報・評価情報
* 法務：法的誤案内
* 営業：機密情報・誇張表現
* 開発：コード生成時のセキュリティ問題

そのため、**LoRA切替だけでなく、ガードレールも動的に切替える** 発想が重要です。

## 基本用語

* **Guardrails**：AI出力/入力を制御・監視する安全策群。
* **PII（Personally Identifiable Information）**：個人を特定しうる情報。
* **プロンプトインジェクション**：AIの指示解釈を悪用する攻撃/誘導。

## Tips（実務）

* LoRAの登録時に、対応する **ガードポリシーID** をセットで管理すると運用しやすいです。
* セキュリティ設計は「推論前」「推論中」「推論後」の3段階で整理すると抜け漏れが減ります。

---

# 14. 今後のロードマップ：自動化とスケーリング

![DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略](/images/LLM/DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略.jpg)

## 図の要旨

このページでは、導入後の成長計画を3フェーズで示しています。

### Phase 1（Current）

* 手動デプロイ（GUI/YAML）
* E2E検証とベンチマーク実施（例：3/12〜）

### Phase 2（Automation）

* CI/CD（GitOps）
* MLチームがLoRAをPushしたら自動でMinIOへ配置・登録
* Canary Release（段階リリース）

### Phase 3（Scale）

* Distributed Inference（`llm-d` 等）
* 単一GPUに収まらない巨大モデル対応

## 詳細解説（各フェーズの意味）

### Phase 1：まず動かす・測る

最初は自動化より、**再現性のある手動手順 + ベンチマーク** が重要です。

### Phase 2：人手運用を減らす

LoRA追加を人手でやり続けると運用コストが増えるため、

* Git管理
* 自動配備
* 承認フロー
  を整えます。

### Phase 3：規模拡大対応

リクエスト数増加やモデル巨大化に対応するフェーズ。
GPUノード追加、分散推論、ルーティング高度化などがテーマになります。

## Tips（実務）

* 導入直後にフル自動化を目指すより、**Phase 1で計測項目を固める** 方が結果的に早いです。
* 自動化前に、命名規約・ストレージ規約・ロールバック手順を固定化しておくと事故が減ります。

---

# 15. まとめとネクストアクション

![DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略](/images/LLM/DMLS1.動的AIサービング：効率的なカスタムモデルデプロイ戦略.jpg)

## 図の要旨

このページは、全体の要点を次の3つに整理しています。

* **Efficiency（効率）**
  動的LoRAによりGPUコストを抑えつつマルチテナント対応
* **Agility（俊敏性）**
  インフラ変更なしでモデル追加・更新を高速化
* **Security（安全性）**
  閉域網での自給自足型AIエコシステムを確立

そして次の具体アクションとして、

* **Pattern C（動的LoRA）のE2E検証**
* **性能ベンチマーク開始**
  が示されています。

## 詳細解説（読み手へのメッセージ）

この資料の本質は、「AIモデルを増やす」のではなく、
**AIサービスを運用しやすい形に設計する** ことです。

つまり、技術の核心は

* LoRA

* vLLM

* OpenShift AI
  だけでなく、

* ストレージ分離

* API命名

* YAML運用

* ガバナンス

* ロードマップ設計

も含めた **“全体設計”** にあります。

![DMLS16.DynamicMulti-LoRA戦略：OpenShiftAIによるAIサービング最適化](/images/LLM/DMLS16.DynamicMulti-LoRA戦略：OpenShiftAIによるAIサービング最適化.jpg)



## Tips（実務）

* Next Action は必ず **計測項目（レイテンシ / VRAM / 同時接続数 / エラー率）** とセットで定義しましょう。
* 「できた/できない」ではなく、**どの条件でどこまでできたか** を残すと次フェーズに繋がります。

---

# 補足：図に出てくるコマンド・設定の詳細解説（まとめ）

ここでは、スライド内に出てくるコマンド/設定に加えて、実務でよく使う関連コマンドをまとめます。

---

## A. OpenShift 基本コマンド（`oc`）

### 1) プロジェクト（namespace）操作

```bash
oc new-project vllm
oc project vllm
oc projects
```

* `oc new-project`：新規プロジェクト作成
* `oc project`：作業対象の切替
* `oc projects`：一覧確認

### 2) リソース確認（まず見る）

```bash
oc get pods
oc get svc
oc get route
oc get inferenceservice
```

* `pods`：実行中コンテナ群
* `svc`：サービス（内部公開）
* `route`：OpenShift外部公開経路
* `inferenceservice`：KServe推論サービス定義

> 環境によっては `oc get isvc`（短縮）を使うことがあります。

### 3) 状態/障害の確認

```bash
oc describe pod <pod-name>
oc logs <pod-name>
oc logs -f <pod-name>
oc get events --sort-by=.lastTimestamp
```

* `describe`：Podの詳細（イベント・マウント・失敗理由）
* `logs`：ログ確認
* `-f`：ログ追尾（tail）
* `events`：直近イベント時系列確認

### 4) YAML確認・反映

```bash
oc get inferenceservice <name> -o yaml
oc edit inferenceservice <name>
oc apply -f inferenceservice.yaml
```

* `-o yaml`：現在の定義をYAML出力
* `edit`：その場編集（運用によっては非推奨）
* `apply`：ファイルから反映（Git管理と相性良い）

---

## B. YAML編集でよく詰まるポイント

### 1) インデント

YAMLはスペース構文です。タブ混在・階層ずれでエラーになります。

### 2) `args` の位置

`args:` をコンテナ起動定義の正しい階層に置く必要があります。
階層を誤ると、設定が効かない/起動失敗になります。

### 3) GUI再編集による差分消失

GUIとYAMLの両方を使うと、GUI側の再保存でYAML差分が消えるケースがあります。
**反映後に `oc get ... -o yaml` で確認** しましょう。

---

## C. MinIO（S3互換）運用の基本（概念）

> 実際の操作コマンドは環境ルールに合わせてください。以下は代表例です。

### 1) `mc`（MinIO Client）を使う場合の例

```bash
mc alias set localminio https://<minio-endpoint> <ACCESS_KEY> <SECRET_KEY>
mc ls localminio/models/lora/
mc cp ./hr-lora-v1/ localminio/models/lora/hr/v1/ --recursive
```

* `mc alias set`：MinIO接続先登録
* `mc ls`：オブジェクト一覧確認
* `mc cp`：アップロード/コピー

### 2) バージョン管理の考え方

* `s3://models/lora/hr/v1/`
* `s3://models/lora/hr/v2/`

のように、**上書きではなく世代管理** を推奨。

---

## D. APIテスト（curl）の実務ポイント

### 1) まず疎通確認（ヘッダだけ）

```bash
curl -I https://<vllm-endpoint>/
```

### 2) 詳細ログで確認（通信切り分け）

```bash
curl -v https://<vllm-endpoint>/v1/models
```

### 3) 閉域網で証明書が必要な場合

```bash
curl --cacert /path/to/company-root.crt https://<vllm-endpoint>/v1/models
```

> `-k/--insecure` は一時切り分け用途に限定し、本番運用手順には残さないのが原則です（閉域網でも同様）。

### 4) 推論テスト時に見るべき項目

* HTTPステータス（200 / 4xx / 5xx）
* エラーメッセージ（model not found / auth / timeout）
* レイテンシ（初回ロード時は遅くなる可能性）

---

## E. よく使う監視・確認観点（図にはないが実務で重要）

### 1) VRAM/メモリ確認（管理権限がある場合）

* GPUメモリ使用率
* 同時ロード数
* OOM発生有無

### 2) Pod再起動確認

```bash
oc get pods
oc describe pod <pod-name>
```

* `Restart Count` が増えていないか
* OOMKilled になっていないか

### 3) ストレージ/マウント確認

* PVCがマウントされているか
* MinIO認証情報が正しいか
* バケット/パスが存在するか

---

# 実務で使える設計ルール（おすすめ）

## 1. LoRA命名規約（例）

* `hr-lora-v1`
* `sales-lora-v2`
* `legal-lora-v1`

### 推奨フォーマット

`<domain>-lora-v<version>`

---

## 2. ストレージパス規約（例）

* Base Model（PVC）：`/mnt/models/tsuzumi-base`
* LoRA（MinIO）：`s3://models/lora/<domain>/<version>/`

---

## 3. 運用フロー規約（例）

1. LoRA作成
2. MinIOへ登録
3. メタ情報登録（名称・用途・バージョン・ガードポリシー）
4. 推論テスト
5. 利用者へ公開

---

## 4. ガードレール紐付け規約（例）

* `hr-lora-v1` → `policy-hr-strict`
* `sales-lora-v1` → `policy-sales-standard`

> モデルとポリシーを別管理にすると柔軟ですが、対応表を必ず維持すること。

---

# まとめ（この資料の核心）

この15ページの資料は、単なる「vLLM設定メモ」ではなく、
**閉域網でマルチテナントAIサービスを成立させるための全体設計書** として読むと価値が高いです。

特に重要なのは次の5点です。

1. **Pattern C（動的LoRA）の採用理由が明確**
2. **PVCとMinIOの役割分離が合理的**
3. **KServe × vLLM の責務分担が整理されている**
4. **GUI + YAML + API の運用導線が具体的**
5. **ガバナンスと将来ロードマップまで含めている**

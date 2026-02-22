## １．`InferenceServiceとLoRAデプロイメント戦略：Red Hat OpenShift AI における効率的なLLMサービング基盤の構築`
副題：`vLLMとKServeを活用した「動的マルチフレーバー」アーキテクチャの設計と実装`

![IS1.InferenceServiceとLoRAデプロイメント戦略](/images/LLM/IS1.InferenceServiceとLoRAデプロイメント戦略.jpg)

**主旨**

* 資料全体のタイトルページ
* テーマは「OpenShift AI + KServe + vLLM + LoRA」
* 目的は「効率的なLLMサービング基盤（動的Multi-LoRA）」

**追記すべき基礎用語（VitePress本文で補足推奨）**

* InferenceService（KServeのCR）
* LoRA（Low-Rank Adaptation）
* vLLM（推論エンジン）
* KServe（Kubernetes上のモデルサービング）

---

## ２．`InferenceService：KServeモデルサービングの中核概念`

![IS2.InferenceService：KServeモデルサービングの中核概念](/images/LLM/IS2.InferenceService：KServeモデルサービングの中核概念.jpg)

**主旨（図の意味）**

* KServeの `InferenceService` が「モデルAPI提供の中核」
* 開発者はCR（カスタムリソース）を定義するだけで、以下をKServe/Knative/Istioが担う構造

  * ネットワーキング（Istio）
  * サーバーレス（Knative）
  * オートスケーリング
* 構成要素として図中に出てくる主要パーツ：

  * **Predictor**（推論本体）
  * **Transformer**（前処理/後処理）
  * **Explainer**（説明可能性、任意）

**VitePress本文で補足したいポイント**

* 「CR（Custom Resource）」とは何か
* InferenceServiceが「Deployment+Service+Autoscaling設定」を抽象化していること
* Transformer/Explainer は必須ではないこと

---

## ３．`推論エンジンとしてのvLLM：なぜ選ばれるのか`

![IS3.推論エンジンとしてのvLLM：なぜ選ばれるのか](/images/LLM/IS3.推論エンジンとしてのvLLM：なぜ選ばれるのか.jpg)

**主旨（図の意味）**

* 標準Attention vs **PagedAttention** の比較
* KV Cacheの断片化問題と、vLLMによる効率的メモリ管理
* **Native Multi-LoRA Support**（1つのベースモデルに複数LoRAを切替）
* RHOAI（Red Hat OpenShift AI）での推奨ランタイム文脈

**VitePress本文で補足したい基礎用語**

* KV Cache（生成時の中間状態保持）
* PagedAttention（OS仮想メモリの発想を推論に適用）
* Throughput（TPS）
* Hot-swapping（再起動なし切替）

**実務Tips候補**

* LoRAを増やすほどGPUメモリだけでなくCPUメモリ/キャッシュ戦略も重要
* PagedAttentionのメリットは「大量同時推論」で効きやすい

---

## ４．`課題：カスタムモデルのスケーリングにおけるリソース爆発`

![IS4.課題：カスタムモデルのスケーリングにおける「リソース爆発」](/images/LLM/IS4.課題：カスタムモデルのスケーリングにおける「リソース爆発」.jpg)
**主旨（図の意味）**

* 部門別・用途別に個別のフルモデルを持つと、**GPU使用量が線形増加**
* アイドルGPUコスト、更新時ダウンタイムが増加
* 「1モデル=1インスタンス」のやり方はエンタープライズ規模で持続しにくい

**VitePress本文で補足したい基礎用語**

* Full FT（フルファインチューニング）
* 推論用GPUのアイドルコスト
* 水平スケーリングと運用複雑性

**実務Tips候補**

* モデル数・ユースケース数・同時接続数を分けて見積もる
* 先に「用途の増え方」を予測して設計する

---

## ５．`デプロイメント方式の比較 (1/2)：静的アプローチの限界`
![IS5.デプロイメント方式の比較（１）：静的アプローチの限界](/images/LLM/IS5.デプロイメント方式の比較（１）：静的アプローチの限界.jpg)
**主旨（確認済み）**

### Pattern A: 一体型（Full FT / マージ済みモデル）

* カスタムごとに巨大モデル（数十GB級）を生成・保存・配布
* 変更コストが大きい
* 1インスタンス1用途になりがち

### Pattern B: 静的LoRA（Static Load）

* YAMLにLoRAをハードコード
* 変更のたびにPod再起動（数分〜数十分）
* 更新頻度が高いと運用負荷大

**VitePress本文で補足したいポイント**

* 「静的LoRA」はLoRA自体は軽量でも、運用上の再起動/再デプロイがボトルネックになる
* “軽いファイル = 運用が楽”ではない点

**実務Tips候補**

* 更新頻度が高いLoRAは静的方式だとCI/CDキュー詰まりを起こしやすい
* 再起動がSLOに与える影響（TTFT急増）

---

## ６．`デプロイメント方式の比較 (2/2)：動的Multi-LoRAの優位性`
![IS6.デプロイメント方式の比較（２）：動的Multi-LoRAの優位性](/images/LLM/IS6.デプロイメント方式の比較（２）：動的Multi-LoRAの優位性.jpg)
**主旨（確認済み）**

* 共有ベースモデル + リクエスト時LoRA切替
* **再起動不要で新しいAdapter追加**
* **Logical Separation**（論理分離）で共有基盤上のマルチテナント運用
* 例え話として「共有キッチン（GPU）で、注文ごとにスパイス（Adapter）を切替」

**VitePress本文で補足したいポイント**

* “動的”の意味（リクエスト単位・実行時切替）
* 物理分離ではなく論理分離である点
* セキュリティ境界は別途設計（Namespace, IAM, Secret, NetworkPolicy）

**実務Tips候補**

* Adapter命名規約を最初に決める（部門/用途/バージョン）
* 「切替できる」＝「誰でも使える」ではない（認可制御が必要）

---

## ７．`戦略的比較分析：なぜ「動的Multi-LoRA」が最適解なのか`
![IS7.戦略的比較分析：なぜ「動的Multi-LoRA」が最適解なのか](/images/LLM/IS7.戦略的比較分析：なぜ「動的Multi-LoRA」が最適解なのか.jpg)
**表の内容（確認済み）**
比較軸：

* GPU Resource Efficiency
* Lead Time for New LoRA
* File Management

比較対象：

* Pattern A（一体型）
* Pattern B（静的LoRA）
* Pattern C（動的Multi-LoRA）

**図中の結論（確認済み）**

* Pattern C（動的Multi-LoRA）を標準アーキテクチャに推奨
* 理由：GPU枯渇リスク回避 + 運用アジリティ

**VitePress本文で補足したいポイント**

* “最適”は常に要件依存（極小規模ではBがシンプルな場合もある）
* 評価軸に「監査性」「障害切り分け」も足すと実務向けになる

---

## ８．`アーキテクチャ設計：「プライベートAIキッチン」構想`
![IS8.アーキテクチャ設計：プライベートAIキッチン構想](/images/LLM/IS8.アーキテクチャ設計：プライベートAIキッチン構想.jpg)
**図の構造（確認済み）**

* **Base Model** → PVC（Persistent Volume）上に固定配置
* **LoRA Adapters** → MinIO/S3（Object Storage）で管理
* **vLLM Pod** → ベースはPVCから高速ローカル読込、LoRAはS3/MinIOから動的取得
* **Data Connection** → OpenShift AI からS3接続情報を管理

**図中の重要メッセージ（確認済み）**

* ハイブリッド・ローディング戦略

  * Base Model：PVC固定（起動短縮・NW負荷回避）
  * LoRA：MinIO管理（軽量・更新容易）
* 閉域網対応：外部HFアクセス不要で社内完結を目指す

**VitePress本文で補足したい基礎用語**

* PVC / PV
* Object Storage（S3互換）
* Data Connection（RHOAI上の外部ストレージ接続情報）
* Mount と Download の違い

---

## ９．`実装ステップ1：ストレージとモデル資産の準備`
![IS9.実装ステップ１：ストレージとモデル資産の準備](/images/LLM/IS9.実装ステップ１：ストレージとモデル資産の準備.jpg)
**図の内容（確認済み）**

1. **Base Model配置（PVC）**

   * 例：`/mnt/models/base`
   * ベースモデルをPVC上へ配置（固定）
2. **Adapters配置（MinIO）**

   * 例：`s3://adapters/sql-adapter/`
   * `adapter_config.json`
   * `adapter_model.safetensors`
3. **Data Connection作成**

   * Endpoint / Access Key / Secret Key をRHOAIに登録

**VitePress本文で補足したいポイント**

* LoRAフォルダに必要な最低限ファイル
* MinIOバケット設計（チーム/環境/dev-prod分離）
* Bastion Host経由アップロードの現実的運用

**実務Tips候補**

* バージョンをフォルダに持たせる（例：`sql-adapter/v2026-02-17/`）
* “latest”エイリアス運用は事故要因になるので注意

---

## １０．`実装ステップ2：InferenceServiceとRuntimeの設定`
![IS10.実装ステップ2：InferneceServiceとRuntimeの構成（YAML）](/images/LLM/IS10.実装ステップ2：InferneceServiceとRuntimeの構成（YAML）.jpg)
**図の内容（確認済み）**

* OpenShift AI GUIのDeployment Wizard
* InferenceService YAML を編集してvLLM + LoRAを有効化する流れ

**判読できたYAML/引数（重要）**

* `InferenceService`（KServe CR）
* `storageUri`（ベースモデル配置先）
* `args` にLoRA関連オプション

  * `--enable-lora`（LoRA有効化のマスタースイッチ）
  * `--max-loras=16`（同時に扱うLoRA数の上限）
  * `--max-lora-rank=64`（LoRAランク上限）
* コメント例も載っている（Capacity planning / Complexity Limit 等）
* 補足：標準のデプロイウィザード（フォームに名前やサイズを入力する画面）にはLoRAの細かな設定項目が用意されていないため、 「いったんGUIのウィザードで箱を作った後、GUIに内蔵されているYAMLエディタで直接文字を書き足す」 という手順を踏みます

**VitePress本文で詳しく解説すべき点（重要）**

* `storageUri` と `--model=...` の役割分担
* `--enable-lora` を入れ忘れた時の症状
* `--max-loras` とVRAMのトレードオフ
* `--max-lora-rank` と互換性/品質/メモリの関係

**図にあるコマンド/設定の詳細解説候補（完成版に入れるべき）**

* YAMLの階層（`spec.predictor`）
* `containers[].args` の書き方
* 文字列引用符・ハイフンのYAML構文ミス対策

---

## １１．`実装ステップ3：動的リクエストの実行`
![IS11.実装ステップ3：動的リクエストの実行（APIUsage）](/images/LLM/IS11.実装ステップ3：動的リクエストの実行（APIUsage）.jpg)
**図の内容（確認済み）**

* `curl` で OpenAI互換API（`/v1/chat/completions`）を呼び出し
* `model` フィールドで **Base:Adapter** を指定してLoRAを動的切替

**判読できたコマンド（重要）**

```bash
curl https://<endpoint>/v1/chat/completions \
  -d '{
    "model": "tsuzumi-base:sql-adapter",
    "messages": [...]
  }'
```

**図中メッセージ（確認済み）**

* `"model": "base:adapter"` の形式でLoRAを指定
* リクエストに応じてvLLM側でLoRA解決/ロード（動的切替）

**VitePress本文で詳しく解説すべき点（重要）**

* `model` フィールドが「ベース+LoRA指定のキー」になること
* `chat/completions` と `completions` の違い
* `messages` 配列（role/content）の基礎
* 認証ヘッダ（Bearer Token）が必要な環境では `-H "Authorization: Bearer ..."` が必要

**実務Tips候補**

* `curl` 単体での疎通確認 → `jq` で整形 → アプリ実装 の順で進める
* タイムアウトやTLSエラーはまず `curl -v` で切り分ける

---

## １２．`閉域網（Air-gapped）環境における運用上の考慮事項`
![IS12.閉域網（AIr-gapped）環境における運用上の考慮事項](/images/LLM/IS12.閉域網（AIr-gapped）環境における運用上の考慮事項.jpg)
**図の3観点（確認済み）**

1. **証明書と信頼（Trusted CA）**

   * Issue: 自己署名証明書によるSSLエラー
   * Fix: OpenShiftの `Trusted CA Bundle` をPodに注入
2. **オフラインモードの強制**

   * Issue: Hugging Faceへの接続タイムアウト
   * Fix: 環境変数

     * `TRANSFORMERS_OFFLINE=1`
     * `HF_DATASETS_OFFLINE=1`
3. **権限管理（Permissions）**

   * Issue: PVC上モデルファイルの読み込みエラー
   * Fix:

     * `chmod/chown`
     * `SecurityContext` の確認

**VitePress本文で詳しく解説すべき点（重要）**

* “なぜ閉域網でHFアクセスが発生するのか”

  * ライブラリが暗黙にモデル/Tokenizer/Configを取りに行くため
* `Trusted CA Bundle` の考え方（社内CAをPodに信頼させる）
* `SecurityContext`（UID/GID, fsGroup）がPVCアクセスに効く理由

**実務Tips候補**

* まず `Pod内で ls -l` と `id` を確認して権限を切り分ける
* SSLエラーとDNSエラーを混同しない（症状が似る）

---

## １３．`パフォーマンス・チューニングとリソース最適化`
![IS13.パフォーマンスチューニングとリソース最適化](/images/LLM/IS13.パフォーマンスチューニングとリソース最適化.jpg)
**図の主旨（確認済み）**

* **VRAM Capacity** と **KV Cache（Context Length）** と **Max LoRAs（Adapter Capacity）** のバランス
* SLO指標の例：

  * **TTFT**（Time To First Token）
  * **TPS**（Tokens Per Second）

**判読できた引数（重要）**

* `--gpu-memory-utilization`

  * 例：`0.9 -> 0.85` にしてLoRAロード用空き領域を確保
* `--max-cpu-loras`

  * GPUに載せきれないLoRAをCPUメモリ側へ退避

**VitePress本文で詳しく解説すべき点（重要）**

* TTFTが悪化する要因（LoRA初回ロード、Cold Start、I/O）
* TPSとバッチング/コンテキスト長の関係
* `--gpu-memory-utilization` を上げすぎるとOOM/不安定化しやすい点
* CPU退避LoRAは切替時レイテンシに影響する可能性

**実務Tips候補**

* 最初は `--max-loras` を小さく始めて計測
* SLOを決めてからパラメータを回す（「速ければOK」は危険）

---

## １４．`まとめ：技術的解の先にある「主権AI」`
![IS14.結論：SovereignAIのための次世代サービング基盤](/images/LLM/IS14.結論：SovereignAIのための次世代サービング基盤.jpg)
**図の主旨（確認済み）**

* OpenShift AI / KServe / vLLM / MinIO を組み合わせた基盤を、
  **企業の主権AI（Sovereign AI）基盤** として位置づける
* 単なるLoRAデプロイ手法ではなく、

  * ガバナンス
  * 閉域運用
  * 運用アジリティ
  * リソース効率
    の全体最適の話に昇華している

**VitePress本文で補足したいポイント**

* 「主権AI」は技術要素だけでなく運用/契約/監査要件も含む概念
* 動的Multi-LoRAはその中の “実装パターンの1つ” であること

---

# 追加まとめ画像（最後に追記指定）※確認済み

## 付録（追加）: `InferenceService：Red Hat OpenShift AI における推論デプロイの要`
![IS15.InferenceService：RedHatOpenShiftAIにおける推論デプロイの要](/images/LLM/IS15.InferenceService：RedHatOpenShiftAIにおける推論デプロイの要.jpg)
**ユーザー指定**

* 「前記のまとめとして最後に追記」
* 同じ形式で解説を追加したい

**画像から確認できた内容（要点）**

### 左：InferenceServiceの概要と役割

* 推論サーバを定義するカスタムリソース
* 推論ライフサイクルやインフラ管理の自動化
* REST/gRPCエンドポイントの提供

### 中央：YAMLの重要フィールド

* `predictor`（推論セット/サービング条件）
* `storageUri`（モデルの所在）
* `args`（詳細引数：例 `--enable-lora`）

### 右：デプロイに必要な3要素

* モデルストレージ（S3/PVC/OCI）
* サービングランタイム（vLLM/OpenVINO等）
* 加速コンピューティング（GPU）
  → 最終的に **Deployed Inference Endpoint（API）**

**VitePress本文での補足に向いているポイント**

* “InferenceService = 何でもやってくれる魔法”ではなく、各要素の束ね役
* 問題切り分けは

  * Storage
  * Runtime
  * Compute
  * YAML設定
    のどこかで行う

---

# 完成版に入れるべきコマンド解説（すでに確認できたもの）

以下は **図に出ている/図から明確に読み取れる** ため、完成版VitePress本文で詳細解説対象にできます。

## 1) `curl`（Page 11）

```bash
curl https://<endpoint>/v1/chat/completions \
  -d '{
    "model": "tsuzumi-base:sql-adapter",
    "messages": [...]
  }'
```

**解説ポイント**

* `https://<endpoint>`：InferenceServiceの公開エンドポイント
* `/v1/chat/completions`：OpenAI互換APIのチャット生成
* `model`：`Base:Adapter` 形式でLoRAを指定（図のキモ）
* `messages`：会話コンテキスト
* 実務では `-H "Content-Type: application/json"` を付ける
* 認証がある場合は `Authorization: Bearer ...`

---

## 2) vLLM LoRA関連引数（Page 10, 13）

* `--enable-lora`
* `--max-loras=16`
* `--max-lora-rank=64`
* `--gpu-memory-utilization`
* `--max-cpu-loras`

**解説ポイント**

* `--enable-lora`：LoRA機能のON/OFF
* `--max-loras`：保持/扱えるLoRA数の上限（VRAM/CPUメモリとトレードオフ）
* `--max-lora-rank`：LoRA複雑度の上限（互換性・メモリ影響）
* `--gpu-memory-utilization`：GPUメモリ使用率上限。高すぎるとOOMリスク
* `--max-cpu-loras`：GPUに載らないLoRAの退避枠（レイテンシ影響あり）

---

## 3) 閉域網向け環境変数（Page 12）

* `TRANSFORMERS_OFFLINE=1`
* `HF_DATASETS_OFFLINE=1`

**解説ポイント**

* 目的：ライブラリの外部アクセスを抑止
* 症状：外部接続タイムアウト、起動時ハングの回避
* 注意：必要なモデル/Tokenizer/Configを事前配置しておく必要あり

---

## 4) 権限トラブル対処（Page 12）

* `chmod`
* `chown`
* `SecurityContext`（Kubernetes/OpenShift設定）

**解説ポイント**

* PVC上のファイル所有者/権限不一致が典型的な失敗原因
* OpenShiftはランダムUID運用があるため、Linux感覚だけではハマる
* `fsGroup` / `runAsUser` / `runAsNonRoot` の理解が重要

---

# 完成版に追加すると良い「図にはないが実務でよく使うコマンド」候補（ユーザー要件対応）

※ これは **完成版VitePress本文の付録** に入れると実用性が高いです。

## OpenShift / Kubernetes確認系

```bash
oc get inferenceservice
oc describe inferenceservice <name>
oc get pods -n <namespace>
oc logs <pod-name> -c <container-name> --tail=200
oc get events --sort-by=.lastTimestamp
```

## Pod内確認（権限・ファイル）

```bash
oc rsh <pod-name>
id
ls -l /mnt/models/base
```

## MinIO / S3確認（例）

```bash
mc alias set local http://minio.example:9000 <ACCESS_KEY> <SECRET_KEY>
mc ls local/adapters
mc cp ./adapter_config.json local/adapters/sql-adapter/
mc cp ./adapter_model.safetensors local/adapters/sql-adapter/
```

## API疎通・TLS切り分け

```bash
curl -v https://<endpoint>/health
curl -vk https://<endpoint>/v1/models
```

## GPU状態確認（ノード側/Pod内）

```bash
nvidia-smi
watch -n 1 nvidia-smi
```

## レスポンス整形（JSON確認）

```bash
curl ... | jq .
```
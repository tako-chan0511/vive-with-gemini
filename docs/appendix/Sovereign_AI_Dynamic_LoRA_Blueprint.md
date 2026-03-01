# 動的LoRAで構築する完全閉域網の生成AI基盤
## Sovereign AIを実現するLLMaaSアーキテククチャ・ブループリント（VitePress用 1ファイル）

---

## 🎧 音声解説（リンク）

★今回は「動的LoRAで構築する完全閉域網の生成AI基盤.m4a」でこの資料を解説しています。  
VitePressにはまず **リンク** を置き、必要に応じて **埋め込み（iframe）** を検討してください（環境によっては埋め込みが表示されないことがあります）。

### 音声URL

https://drive.google.com/file/d/1Jbc-lBnk5WIMFbUrpu8ko0_GH9E7ZtG4/view?usp=drive_link


## この資料の読み方（最重要）

この資料の主題は「モデル精度」ではなく、閉域網で **GPU効率** と **ゼロダウンタイム運用** を両立するための **“落ちない設計”** です。
理解の順番は次が最短です。

1. **Sovereign AI へのパラダイムシフト**（クラウド/オンプレのジレンマを解消）
2. **Pattern比較**（一体型／静的LoRA／動的LoRA）
3. **完全閉域網の全貌**（Kong + OpenShift AI + MinIO + TrustyAI + GPU）
4. **ストレージ分離**（Base=PVC、LoRA=MinIO）
5. **vLLMの内部構造と動的ロード**（KV cache / LRU / max-loras）
6. **API設計でモデル切替**（OpenAI互換で `model` を変えるだけ）
7. **ガバナンス**（マルウェアスキャン、Guardrails、IAM、Trusted CA）
8. **無停止運用**（カナリア、即時ロールバック、OOM対策、ロードマップ）



# 1. 表紙：動的LoRAで構築する完全閉域網の生成AI基盤

![SADLB1.動的LoRAで構築する完全閉域網の生成AI基盤](/images/LLM/SADLB1.動的LoRAで構築する完全閉域網の生成AI基盤.jpg)

## 図の要旨

* **完全閉域網（Air-gapped）** で、外部依存ゼロの **Sovereign AI** を実現する。
* その手段として、**動的LoRA（Multi-LoRA）** で「GPU効率」と「ゼロダウンタイム運用」を両立する。
* 実装思想は「自給自足型 Private AI Kitchen」。

## 用語（初心者向け）

* **完全閉域網（Air-gapped）**：インターネットから隔離されたネットワーク。
* **Sovereign AI（主権AI）**：データ・モデル・運用を自組織管理下で完結させる考え方。
* **LLMaaS**：LLMを “サービス” として社内向けに提供するモデル（社内APIとして提供）。

## Tips（実務）

* 「閉域網で動く」だけでは弱く、**“落ちない/切り戻せる/増やせる”** まで含めて初めて基盤になります。
* 表紙に書かれている「GPU効率」「ゼロダウンタイム」は、後半（OOM対策・カナリア・LRU）とセットで成立します。

---

# 2. エンタープライズAIのジレンマと「Sovereign AI」へのパラダイムシフト

![SADLB2.エンタープライズAIのジレンマと「SovereignAI」へのパラダイムシフト](/images/LLM/SADLB2.エンタープライズAIのジレンマと「SovereignAI」へのパラダイムシフト.jpg)

## 図の要旨（3つの選択肢）

* **クラウドAI**

  * 長所：最新モデルが使いやすい
  * 課題：データ主権・外部流出リスク・外部依存が問題になりがち
* **オンプレAI**

  * 長所：セキュア
  * 課題：数十GB級モデルを部門別に持つと **GPUリソース枯渇**、拡張コストが大きい
* **Sovereign AI（本資料の解）**

  * 完全閉域＋動的LoRAで、**セキュアさ**と**運用効率**を両立する

## なぜ「Sovereign AI」に寄せるのか

閉域網の現実は「外に出られない」ではなく、次が同時に起きます。

* モデル更新・依存物取得が難しい（＝外部依存が弱点になる）
* 部門ごとに用途が増える（＝モデル乱立でGPUが死ぬ）
* セキュリティ要求が厳しい（＝証明書/監査/隔離が必須）

よって「外部依存ゼロで増やせる」構造が勝ち筋になります。

---

# 3. デプロイ方式の比較：リソース枯渇を防ぐ「動的LoRA」の優位性

![SADLB3.デプロイ方式の比較：リソース枯渇を防ぐ「動的LoRA」の優位性](/images/LLM/SADLB3.デプロイ方式の比較：リソース枯渇を防ぐ「動的LoRA」の優位性.jpg)

## 図の要旨（Pattern A/B/C）

* **パターンA（一体型）**

  * モデル用途ごとに “丸ごと” 作る
  * GPU効率：×（非常に悪い）
  * 追加：再起動・再配備で時間がかかる
* **パターンB（静的LoRA）**

  * LoRAを起動時に固定ロード（YAML固定）
  * GPU効率：×（非常に悪い）
  * 追加：再起動・再構成が必要
* **パターンC（動的LoRA）**

  * Baseモデル共有＋LoRAを動的ロード
  * GPU効率：◎（最高）
  * 追加：0秒（無停止・即時適用）を狙える

## “0秒” の意味（誤解しやすい点）

ここで言う「0秒」は **コンテナ再起動が不要** という意味です。
ただし、初回ロードは（MinIO取得＋VRAM展開の分）遅くなることがあります。
その遅延を実運用で吸収するのが **LRUキャッシュ** と **カナリア設計** です（後述）。

---

# 4. 動的LoRAがもたらす3つのビジネス・インパクト

![SADLB4.動的LoRAがもたらす3つのビジネスインパクト](/images/LLM/SADLB4.動的LoRAがもたらす3つのビジネスインパクト.jpg)

## 1) GPUコストの劇的削減

* ベースモデル（巨大）をテナント間で共有
* “部門追加=GPU増設” を避け、**論理分割**でカバーする

## 2) ゼロダウンタイム運用

* 新規LoRA追加のたびに再起動しない
* **ストレージに置くだけ**で、無停止で適用できる世界を作る

## 3) シームレスな開発者体験（DX）

* 開発者はインフラを意識せず、**APIの `model` 指定だけで切替**
* 既存のLLMアプリ開発ロジックを流用しやすい

## Tips（実務）

* “DX” は気持ち良さではなく、**問い合わせ削減**と**変更スピード**に直結します。
* 「model名の命名規約」「使ってよいmodelの一覧公開」があるだけで運用負荷が激減します。

---

# 5. 「完全閉域網（Air-gapped）」アーキテクチャの全貌

![SADLB5.「完全閉域網（Air-Gapped）」アーキテクチャの全貌](/images/LLM/SADLB5.「完全閉域網（Air-Gapped）」アーキテクチャの全貌.jpg)

## 図の要旨（登場人物の役割）

* **Tenant（利用者/部門）** → **Kong API Gateway** にアクセス
* **OpenShift AIクラスタ**（Red Hat OpenShift AI）

  * **内部レジストリ**：コンテナイメージを内部保持
  * **MinIO**：LoRA格納（S3互換）
  * **TrustyAI Guardrails**：入出力の検閲（安全策）
  * **KServe / vLLM**：推論サービス
* **GPU Nodes**：ベースモデル（例：tsuzumi）を常駐

## 重要ポイント（閉域網の成立条件）

* 外部アクセス遮断でも起動するために、次を **内部完結**にする必要があります：

  * コンテナイメージ
  * ベースモデル
  * LoRAアダプタ
  * 証明書（Trusted CA）
  * YAML/運用資材

---

# 6. ハイブリッド・ストレージ設計：PVCとMinIOの適材適所

![SADLB6.ハイブリッドストレージ設計：PVCとMinIOの適材適所](/images/LLM/SADLB6.ハイブリッドストレージ設計：PVCとMinIOの適材適所.jpg)

## 図の要旨

### Base Model（ベースモデル）

* 保管：**PVC（Persistent Volume Claim）**
* 特徴：**数十GB**級
* 目的：高速読み込み・安定稼働のため **固定配置**、起動時に一括ロード

### LoRA Adapter（差分）

* 保管：**MinIO（S3型オブジェクトストレージ）**
* 特徴：**数十MB〜**級
* 目的：必要時に動的取得、配布しやすく種類追加が容易
* 必須ファイル例：`adapter_config.json` / `adapter_model.safetensors`

## 実務での推奨ディレクトリ設計（例）

* PVC（Base）：`/mnt/models/base/tsuzumi/`
* MinIO（LoRA）：`s3://llm-models/lora/<tenant>/<usecase>/<version>/`

> **上書き禁止（世代管理）**を前提にするとロールバックが速くなります。

---

# 7. 推論エンジン「vLLM」の内部挙動と動的ロード機構

![SADLB7.推論エンジン「ｖLLM」の内部挙動と動的ロード機構](/images/LLM/SADLB7.推論エンジン「ｖLLM」の内部挙動と動的ロード機構.jpg)

## 図の要旨（3つの領域）

* **モデルウェイト領域**：ベースモデル重み（静的・共有）
* **KVキャッシュ領域**：文脈メモリ（PagedAttention / 連続バッチング）
* **LoRA差分領域**：動的ロードされる差分（LRUキャッシュで入替）

## 図の設定の意味（重要）

* `--enable-lora`：LoRA機能を有効化
* `--max-loras=4`：同時にVRAMへ載せるLoRA数の上限（VRAM枯渇防止）
* Base重みを共有したまま、リクエスト単位でLoRA差分を適用してスループット維持

## vLLM起動引数（図に沿った例）

```bash
vllm serve /mnt/models/base/tsuzumi \
  --enable-lora \
  --max-loras 4 \
  --max-lora-rank 64 \
  --gpu-memory-utilization 0.85 \
  --max-model-len 4096
```

### パラメータの考え方（初心者向け）

* `--gpu-memory-utilization`：VRAM使用率の上限。余白がないと動的LoRA追加や長文で即OOMしやすい
* `--max-model-len`：コンテキスト上限。KVキャッシュ暴発を抑える最重要ツマミ
* `--max-loras`：同時展開数の上限。Multi-LoRAの“便利さ”と“安定性”のトレードオフ

---

# 8. アプリケーション連携：API経由でのシームレスなモデル切替

![SADLB8.アプリケーション連携：API経由でのシームレスなモデル切替](/images/LLM/SADLB8.アプリケーション連携：API経由でのシームレスなモデル切替.jpg)

## 図の要旨

* OpenAI互換API（例：`/v1/chat/completions`）を採用
* `model` パラメータを変えるだけで、適用LoRA（フレーバー）を動的指定できる
* インフラ側でアダプタ名をハードコードしない（＝運用で増やせる）

## curl例（疎通・推論）

```bash
# 1) モデル一覧（使えるmodel名の確認）
curl -s https://<endpoint>/v1/models | jq .

# 2) 推論（modelでLoRAを指定）
curl -X POST https://<endpoint>/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "hr-lora-v1",
    "messages": [
      {"role":"system","content":"あなたは人事向けアシスタントです。"},
      {"role":"user","content":"育休申請の注意点を教えてください。"}
    ],
    "temperature": 0.2
  }'
```

## 閉域網で “APIが通らない” とき（超重要）

まず疑う順番は **モデル**ではなく、次です。

1. DNS
2. TCP到達
3. TLS（証明書）
4. HTTP（認証/権限）

> この切り分けは「閉域網 curl 完全攻略ガイド」の型がそのまま使えます。

---

# 9. セキュリティ・ガバナンス：マルウェアスキャンと隔離パイプライン

![SADLB9.セキュリティガバナンス：マルウェアスキャンと隔離パイプライン](/images/LLM/SADLB9.セキュリティガバナンス：マルウェアスキャンと隔離パイプライン.jpg)

## 図の要旨（3バケット運用）

* **一時保管（staging）**：`s3://staging-models/`
  → MLエンジニアがアップロードする入口
* **自動スキャン（ClamAV）**：stagingをスキャンして判定
* **安全（pass）**：`s3://llm-models/lora/`
  → 推論エンジンが参照できる本番バケット
* **隔離（infected）**：`s3://quarantine-models/`
  → アラート発報・運用が調査する領域

## PoC検証のやり方（図のポイント）

* `adapter_config.json` に **EICARテスト文字列**（security test signature）を埋め込み
* スキャンが検知→隔離まで通るかを確認できる

## 実務Tips（運用で効く）

* LoRAを “自由に置ける” 状態は、セキュリティ事故の温床です。
* **staging→scan→promote** の3段階にして、Promote時に台帳（誰が/いつ/何を）を残すと監査に強くなります。

---

# 10. AIの暴走を防ぐ防護ゲートウェイ「TrustyAI Guardrails」

![SADLB10.AIの暴走を防ぐ防御ゲートウェイ「TrustyAIGuardrails」](/images/LLM/SADLB10.AIの暴走を防ぐ防御ゲートウェイ「TrustyAIGuardrails」.jpg)

## 図の要旨（前後処理のゲート）

* **前処理（入力検閲）**

  * プロンプトインジェクション／有害プロンプトを遮断
  * PII（個人情報）や機密コードの漏洩を検知・ブロック
* **後処理（出力検閲）**

  * ハルシネーション（幻覚）や暴言をフィルタリング
* **動的ポリシー**

  * 指定LoRA（人事用/営業用など）に応じて検閲レベルを切替

## なぜ動的LoRAとGuardrailsはセットなのか

LoRAで用途が増えるほどリスクも変わります。

* 人事：PII
* 法務：誤誘導のリスク
* 営業：誇張・機密漏洩
  → **モデル切替だけでなく、ポリシー切替も動的**にするのが現実解です。

---

# 11. 閉域網特有のネットワーク＆IAM設計

![SADLB11.閉域網特有のネットワーク＆IAM設計](/images/LLM/SADLB11.閉域網特有のネットワーク＆IAM設計.jpg)

## 図の要旨（左：IAM / 右：信頼）

### IAM（最小権限）

* **Secret（アクセスキー）** を **ServiceAccount（vllm-sa）** に紐付け
* そのServiceAccountを **InferenceService（KServe）** に適用
* 対象バケットは **Read-Only** を基本（LoRA/モデルを勝手に書き換えない）

### Trust（自己署名証明書）

* 閉域網では自己署名証明書が多く、TLSで詰まりやすい
* **Trusted CA Bundle（ConfigMap）** を注入し、Pod内の信頼ストアへ登録する

## 実務コマンド例（概念）

```bash
# 例：S3アクセスキーをSecretに（キー名は環境標準に合わせる）
oc -n <ns> create secret generic minio-access \
  --from-literal=AWS_ACCESS_KEY_ID=xxxxx \
  --from-literal=AWS_SECRET_ACCESS_KEY=yyyyy

# 例：ServiceAccount作成＆Secret紐付け
oc -n <ns> create sa vllm-sa
oc -n <ns> secrets link vllm-sa minio-access

# 例：Pod側のCA注入（ConfigMap運用は組織標準に従う）
oc -n <ns> get configmap odh-trusted-ca-bundle -o yaml
```

## TLS切り分け（閉域網あるある）

```bash
# どの証明書が返っているか確認
openssl s_client -connect <minio-host>:9000 -showcerts

# CA指定で疎通確認（正攻法）
curl --cacert /path/to/internal-ca.crt https://<minio-host>:9000
```

---

# 12. ゼロダウンタイム運用：カナリアリリースと即時ロールバック

![SADLB12.ゼロダウンタイム運用：カナリアリリースと即時ロールバック](/images/LLM/SADLB12.ゼロダウンタイム運用：カナリアリリースと即時ロールバック.jpg)

## 図の要旨

* Kongで **A/Bテスト（90%/10%）** を実施

  * 90%：`hr-lora-v1`
  * 10%：`hr-lora-v2`
* 異常が出たら、API設定を戻して **即時ロールバック**
* `v1` はVRAM内の **LRUキャッシュ** に残るため、復帰が速い（初回ロード遅延を回避）

## 実務Tips（運用で守るべきこと）

* カナリアで見るべき指標（最低限）

  * エラー率（4xx/5xx）
  * TTFT/TPS
  * 品質（自動評価＋サンプル人手レビュー）
* “戻せる”が無いと無停止は成立しない
  → **切戻し手順（誰が/どこを/何分で）** を先に決める

---

# 13. リソース保護とOOM（Out of Memory）対策

![SADLB13.リソース保護とOOM対策](/images/LLM/SADLB13.リソース保護とOOM対策.jpg)

## 図の要旨（3レイヤ防御）

1. **KServe/vLLMレイヤ**

   * `--max-loras`：同時ロード上限でVRAM枯渇防止
   * `gpu-memory-utilization`：余白を残す（例：0.85）
2. **Kubernetesレイヤ**

   * `limits.memory`：システムRAMを確保（例：32Gi）
     ※“OOMKilledを防ぐ”というより、**異常が起きても被害を局所化**する目的
3. **API Gateway（Kong）レイヤ**

   * レートリミットで Noisy Neighbor（特定テナントの濫用）を遮断

## 監視で最低限見るもの（現場で効く）

* VRAM使用量（`nvidia-smi`）
* Pod再起動回数（`oc get pod` / `oc describe pod`）
* エラー率（Gatewayログ、vLLMログ）

---

# 14. LLMaaS運用ロードマップ：自動化から分散推論へ

![SADLB14.LLMaaS運用ロードマップ：自働化から分散推論へ](/images/LLM/SADLB14.LLMaaS運用ロードマップ：自働化から分散推論へ.jpg)

## Phase 1：自動化（CI/CD連携）

* MLチームがGitLab等にLoRAをPush
* ArgoCDがMinIOへ自動配置
* インフラ作業負荷をゼロに寄せる

## Phase 2：品質保証（LLM Evaluation）

* DeepEval等で回帰テストを自動実行
* 劣化モデルを本番投入前に弾く（品質を担保）

## Phase 3：拡張性（分散推論 llm-d）

* 超巨大モデル移行
* 分散推論を導入し、GPUスケールに対応

## Tips（実務）

* 自動化前に固めるべき「規約」があります：

  * LoRA命名規約（model名）
  * MinIOパス規約（tenant/usecase/version）
  * ロールバック規約（v1/v2保持）
  * 監査ログ（誰がいつpromoteしたか）

---

# 15. まとめ：真の「Private AI Kitchen」の完成

![SADLB15.まとめ：真の「PrivateAIKitchen」の完成](/images/LLM/SADLB15.まとめ：真の「PrivateAIKitchen」の完成.jpg)

## 図の要旨（3要素の重なり）

* **技術（Technology）**：OpenShift AI + vLLM（高効率推論）
* **データ（Data Sovereignty）**：完全閉域網（Air-gapped）で主権確保
* **運用（Operations）**：KServe + 動的LoRAで無停止・俊敏運用

中心にあるのが **Sovereign AI基盤** です。

## 最後のメッセージ（実務的解釈）

* “モデルが強い”だけではなく、**統制し、持続可能に運用できる**ことが価値。
* そのために必要なのは、動的LoRAだけでなく

  * ストレージ分離
  * セキュリティパイプライン
  * Guardrails
  * IAM/CA
  * カナリア/切戻し
  * OOM多段防御
    を **セットで設計**することです。

---

# 付録：図に出てこないが「現場で必ず使う」コマンド集

## A. OpenShift / KServe 基本

```bash
# namespace（project）
oc new-project vllm
oc project vllm
oc get pods
oc get svc
oc get route
oc get inferenceservice

# ログ・イベント
oc logs <pod> --tail=200
oc logs -f <pod>
oc describe pod <pod>
oc get events --sort-by=.lastTimestamp

# YAML確認
oc get inferenceservice <name> -o yaml
```

## B. MinIO（S3互換）確認

```bash
# MinIO client（mc）例
mc alias set localminio https://<minio>:9000 <ACCESS_KEY> <SECRET_KEY>
mc ls localminio/llm-models/lora/
mc cp -r ./hr-lora-v1/ localminio/llm-models/lora/hr/usecase/v1/
```

## C. 閉域網でAPI疎通（TLS/プロキシ切り分け）

```bash
# ステータス確認
curl -i https://<endpoint>/v1/models

# 詳細ログ（どこで止まるか）
curl -v https://<endpoint>/v1/models

# 社内CA指定（正攻法）
curl --cacert /path/to/internal-ca.crt https://<endpoint>/v1/models

# タイムアウト（ぶら下がり防止）
curl --connect-timeout 5 --max-time 60 https://<endpoint>/v1/models
```

## D. GPU・メモリ監視（可能な環境のみ）

```bash
nvidia-smi
watch -n 1 nvidia-smi
```
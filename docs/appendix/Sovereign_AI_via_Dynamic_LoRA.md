# 完全閉域網での巨大LLM運用と動的LoRA設計

## Sovereign AIを実現する「プライベートAIキッチン」アーキテクチャ（VitePress用 1ファイル）

---

## 🎧 音声解説（リンク）

★今回は「完全閉域網での巨大LLM運用と動的LoRA設計.m4a」でこの資料を解説しています。

* 音声URL（Google Drive）
  [https://drive.google.com/file/d/1nKD0H1gThRMgYRauE8yBPNRxkOc8LUH8/view?usp=drive_link]

> VitePress上でプレイヤー表示したい場合（環境によっては表示不可のことがあります）


## この資料の読み方（最重要）

本資料は「巨大LLMを閉域網で動かす」だけでなく、**運用で“絶対に詰まらない（＝落ちない）”状態に寄せる**ための設計指針です。
理解の順番は次が最短です。

1. **閉域網の3つの掟**（外に取りに行かない＝自給自足）
2. **tsuzumi × vLLM の相性**（軽量×高効率）
3. **デプロイ3パターン比較**（動的LoRAが唯一スケールする理由）
4. **ハイブリッド・ロード設計**（Base=PVC、LoRA=MinIO）
5. **GUI→YAML→API**（作って、設定して、切り替える）
6. **TrustyAI / マルウェアスキャン / カナリア / OOM対策 / トラブルシュート**
7. **ロードマップ（自動化→品質→スケール）**

---

## 1. 表紙：完全閉域網での巨大LLM運用と動的LoRA設計

![SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計](/images/LLM/SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計.jpg)

### 図の要旨

* 完全閉域網で **Sovereign AI**（主権AI）を実現するための **インフラ・ブループリント**。
* 対象読者は **ITアーキテクト / MLOps / Tech Lead**（＝設計・運用の意思決定層）。
* 技術要素は **OpenShift AI × vLLM × NTT tsuzumi** の組み合わせ。

### 詳細解説（用語）

* **Sovereign AI（主権AI）**：データ・モデル・運用が外部依存せず、自組織の統制下で完結するAI。
* **巨大LLM運用**：モデルサイズが大きく、GPU/ストレージ/ネットワーク/更新手順が運用課題になる状態。
* **動的LoRA**：LoRA（差分）をリクエスト単位で切り替え、再起動なしで用途別AIを提供する方式。

### Tips（実務）

* 表紙の時点で重要なのは「どのモデルを使うか」より **“どう増えるか”**（テナント数・用途数・更新頻度）です。
  増える前提なら、動的LoRA＋運用設計が必須になります。

---

## 2. 完全閉域網（Air-gapped）における「3つの掟」

![SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計](/images/LLM/SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計.jpg)


### 図の要旨

閉域網では “普段は当たり前” が禁止されます。

* **docker pull ができない**
* **pip install ができない**
* （外部に行けないので）**モデル重み・コンテナイメージ・証明書**を内部に持つ必要がある

右側の図が示す解は「Self-sufficient Kitchen（自給自足キッチン）」です：

* **内部レジストリ**：コンテナイメージ保管
* **MinIO**：LoRAアダプタ保管（S3互換）
* **PVC**：巨大ベースモデル保管

### 図にあるコマンド/用語の詳細

#### `docker pull` ができない

* 外部レジストリ（Docker Hub等）へ出られない
* したがって、**内部レジストリへ事前搬入**して、OpenShiftはそこから pull する

#### `pip install` ができない

* PyPIに出られない
* 対策は主に2つ

  * **依存をコンテナに焼き込む**（推奨：イメージとして搬入）
  * **wheelhouse（事前にwhlを集めた置き場）** を内部に作り、オフラインインストールする

### よく使う関連コマンド（図外）

* コンテナ搬入：`skopeo copy` / `podman pull`→`podman push`
* Python依存の事前取得：`pip download -r requirements.txt -d wheelhouse/`
  → 閉域側で `pip install --no-index --find-links wheelhouse -r requirements.txt`

---

## 3. コア・コンポーネント：tsuzumi × vLLM

![SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計](/images/LLM/SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計.jpg)


### 図の要旨

* **tsuzumi**：軽量・日本語強化・サステナビリティ（運用しやすいモデル特性）
* **vLLM**：高スループット・動的バッチング・PagedAttentionでVRAM断片化を抑制
* 組み合わせの狙い：**最小GPUリソースで最大のエンタープライズAI性能**

### 詳細解説（用語）

* **動的バッチング（Continuous Batching）**：到着する複数リクエストをまとめ、GPUを遊ばせずに処理する。
* **PagedAttention**：KVキャッシュ等のメモリをページ管理し、断片化を抑えて効率利用する。
* **VRAM断片化**：空きVRAMがあるのに細切れで使えず、実効容量が減る現象（LLM運用の敵）。

### Tips（実務）

* “巨大LLM”でも「GPU増設できない閉域網」では、**効率を上げる実装（vLLM）**が先に効きます。
* モデルを変える前に、**KVキャッシュ設計（max-model-len）**と**同時実行**を見直すと改善することが多いです。

---

## 4. LLMデプロイメントの3つのパターン比較

![SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計](/images/LLM/SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計.jpg)


### 図の要旨

従来方式（A/B）は、モデル数に比例してGPUが枯渇します。マルチテナント運用では **動的LoRA（C）が唯一の実用解**。

* **パターンA：一体型（Full FT / Merge）**

  * 巨大VRAM消費、数時間のデプロイ
* **パターンB：静的LoRA（Base + Static）**

  * 再起動に伴うダウンタイム
* **パターンC：動的LoRA（Base + Dynamic）**

  * 最小リソース、ゼロダウンタイム

### 詳細解説（なぜA/Bが詰むのか）

* 部門・用途が増えるほど「モデルの個数」が増える
* A/Bは個数に比例して **GPU常駐コスト**と**運用回数**が増える
* 閉域網は変更が重い（搬入・承認・検証が必要）
  → **差分だけ増やせる設計**が必須になる

---

## 5. なぜ「動的LoRA（Pattern C）」が最適なのか？

![SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計](/images/LLM/SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計.jpg)


### 図の要旨

「Carpooling on a single GPU」＝1台GPUを部門で相乗りする発想。

* **圧倒的なGPUコスト削減**：1つの基盤に複数部門のモデル（差分）が相乗り
* **ゼロダウンタイム**：APIリクエスト時に瞬時にアダプタ切替
* **vLLMの強み最大化**：Multi-LoRAで論理分離アーキテクチャ

### 詳細解説（“相乗り”が成立する条件）

* ベースモデルは共通（= GPUに常駐）
* 部門差分（LoRA）は軽量（= 必要なものだけ載せ替え）
* vLLMが差分を効率よく適用できる（= Multi-LoRA）

### Tips（実務）

* “相乗り”の敵は **ノイジーネイバー**（一部部門の長文・高負荷が全体を遅くする）
  → 後半の **OOM対策**と **レート制御**がセットで必要です。

---

## 6. 動的LoRAのインフラ・ブループリント

![SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計](/images/LLM/SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計.jpg)


### 図の要旨

* **ハイブリッド・ロード方式**

  * Baseモデルは **PVC（Fast Path）** に固定配置（巨大・頻繁に読む）
  * LoRAは **MinIO（Dynamic Path）** に置き、バージョン管理して増やす
* 推論実行は **KServe Inference Pod（vLLM Engine）**

### 詳細解説（なぜPVCとMinIOを分けるのか）

* Baseは大きい・安定・高速が必要 → PVC
* LoRAは小さい・増える・差し替える → MinIO（オブジェクトストレージ）

### Tips（実務）

* LoRAの保存は最初から **階層設計**を固定化すると事故が減ります。例：

  * `s3://lora/<tenant>/<usecase>/<version>/`
* 「上書き」より「世代（v1/v2…）」がロールバックに強いです。

---

## 7. 実装ステップ：GUIからYAMLへの拡張

![SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計](/images/LLM/SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計.jpg)


### 図の要旨

* GUIでBaseモデルの “器” を作成（OpenShift AIのDeploy model）
* その後、YAML編集でLoRA機能を有効化
* **特定アダプタ名をハードコードせず**、“受け皿（動的切替）”として定義を固める

### 図にある設定（超重要）

```yaml
args:
  - "--enable-lora"
  - "--max-loras=4"
  - "--gpu-memory-utilization=0.85"
```

#### `--enable-lora`

LoRAを有効にするスイッチ。これがないと動的切替は成立しません。

#### `--max-loras=4`

同時にVRAMへ載せられるLoRA数の上限。増やすほど便利だがOOMリスクが上がります。

#### `--gpu-memory-utilization=0.85`

VRAMをギリギリまで使い切らず、**余白（バッファ）** を確保します。
閉域網運用では「一時的な増加（LoRAロード/長文）」があるため、余白が効きます。

### GUI→YAML作業でよく使うコマンド（図外）

```bash
# 対象のYAML確認
oc get inferenceservice <name> -n <ns> -o yaml

# 編集（運用ルールによりGit管理推奨）
oc edit inferenceservice <name> -n <ns>

# 反映
oc apply -f inferenceservice.yaml
```

---

## 8. アプリ連携と動的APIリクエスト仕様

![SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計](/images/LLM/SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計.jpg)


### 図の要旨

* インフラ側は vLLM を固定せず、**アプリ側がAPIペイロード内で動的にモデル（LoRA識別子）を指定**する
* OpenAI互換API採用により、既存LLMアプリ資産を流用しやすい
* 経路：App → Kong API GW → OpenShift（vLLM）

### 図にあるcurl（読み替えて理解）

```bash
curl -X POST https://api.internal/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "hr-lora-v1",
    "messages": [{"role":"user","content":"..."}]
  }'
```

#### オプション解説

* `-X POST`：POSTで送る（生成系はPOSTが多い）
* `-H Content-Type: application/json`：JSONとして送る宣言
* `-d`：送信ボディ（ここに `model` を入れてLoRAを切替）

### 閉域網で“APIが通らない”時の鉄則（超重要）

「モデルが悪い」より先に **DNS→TCP→TLS→HTTP** の順で切り分けます。
（参考：別資料「閉域網 curl 完全攻略ガイド」）

---

## 9. TrustyAIによるセキュアな推論パイプライン

![SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計](/images/LLM/SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計.jpg)


### 図の要旨

* **TrustyAI Input検閲**：プロンプト・インジェクション等をブロック
* **vLLM 推論**
* **TrustyAI Output検閲**：PII（個人情報）漏洩をブロック
* 動的LoRA（テナント）ごとにセキュリティポリシーを切替可能

### 用語

* **プロンプトインジェクション**：AIの指示解釈を乗っ取り、禁止情報を引き出す攻撃/誘導。
* **PII**：個人特定情報（氏名、住所、電話、社員番号など）。

### Tips（実務）

* 動的LoRAで用途が増えるほどリスクが変わるため、**ガードレールも動的**にするのが現実的です。

---

## 10. セキュリティ運用：マルウェアスキャンと隔離導線

![SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計](/images/LLM/SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計.jpg)


### 図の要旨

* MLエンジニアの本番領域への直接アップロードを禁止
* **Staging Bucket（一時）** → **ClamAV Scan（自動検査）**

  * Safe → **Production Bucket（本番配置）**
  * Infected → **Quarantine Bucket（隔離）**

### 重要ポイント

* “LoRAは軽いから自由に置いて良い”が事故の入口です。
* **staging→scan→promote** をパイプライン化すると、監査にも強くなります。

### よくある運用台帳項目（おすすめ）

* アダプタ名（model名）
* 版数（v1/v2…）
* 作成者
* 反映日
* スキャン結果（pass/fail）
* ロールバック先（stable版）

---

## 11. 運用設計：カナリアリリースとロールバック

![SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計](/images/LLM/SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計.jpg)


### 図の要旨

* トラフィック制御は **インフラ導線ではなく App / API GW（Kong）導線**で行う
* 90%：`hr-lora-v1（Stable）`
* 10%：`hr-lora-v2（Canary）`
* 異常時は **即時にv1へ切り戻し（Zero Downtime Rollback）**

### なぜ“即時切り戻し”ができるのか

v1が **LRUキャッシュ**に残っている設計だと、戻した瞬間に初回ロード遅延が発生しにくいです。

### Tips（実務）

* カナリアで見るべき最低限：

  * エラー率（4xx/5xx）
  * TTFT/TPS
  * 品質（自動評価＋人手サンプル）

---

## 12. リソース保護と安定稼働の要点（OOM対策）

![SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計](/images/LLM/SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計.jpg)


### 図の要旨（3つの防波堤）

1. `limits.memory`

   * **K8s System RAM protection**（ノードクラッシュ防止）
2. `--max-model-len`

   * **vLLM KV Cache limit**（無限コンテキスト消費を防ぐ）
3. `initialDelaySeconds`

   * **Health Check trap avoidance**（巨大モデルのロード時間を誤判定しない）

### 設定の意味（初心者向け）

#### `limits.memory`

Podが使えるRAM上限。暴走時に“ノード全体”を巻き込まないための安全装置です。

#### `--max-model-len`

最大コンテキスト長。長くするほど便利だが、KVキャッシュが膨らみOOMしやすくなります。

#### `initialDelaySeconds`

liveness/readinessの開始を遅らせ、**初回ロードが重いLLMを誤って落とさない**ための設定。

---

## 13. トラブルシューティング・ガイド（一次切り分け）

![SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計](/images/LLM/SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計.jpg)


### 図の要旨（表の読み方）

「症状 → 原因 → 対応」を最短で結ぶ一次切り分け表です。

#### Symptom: Adapter not found

* 原因：MinIOパス不一致 / JSON欠損
* 対応：パスと `adapter_config.json` の存在確認

#### Symptom: OOMKilled

* 原因：K8sシステムメモリ不足 / `--max-loras` 超過
* 対応：`limits.memory` 拡張、同時ロード数（max-loras）削減

#### Symptom: x509 unknown authority

* 原因：閉域網ルートCAのトラストストア未登録
* 対応：内部証明書のVolume Mountと信頼ストア取り込み

### すぐ使える確認コマンド（図外）

```bash
# Pod状態と再起動回数（OOMKilledの痕跡）
oc get pods -n <ns>

# 直近イベント（OOMKilledやprobe失敗が出る）
oc get events -n <ns> --sort-by=.lastTimestamp | tail -50

# ログ（Adapter not foundの詳細が出る）
oc logs -n <ns> <pod> --tail=200
```

---

## 14. 将来の拡張性（ロードマップ）

![SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計](/images/LLM/SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計.jpg)


### 図の要旨

属人化を排除する自動化パイプラインを構築し、さらに分散推論へ進化。

* **Phase 1：自動化**

  * CI/CD（ArgoCD等）で LoRA 配置を自動化
* **Phase 2：品質評価**

  * DeepEval等で LLM-as-a-Judge を実施し、リリース前に劣化を検知
* **Phase 3：スケール**

  * `llm-d`（分散推論）で 70B+ 級モデルにも対応

### Tips（実務）

* 自動化の前に必ず固める：

  * 命名規約（model名）
  * ストレージ規約（バケット/パス/世代）
  * 監査ログ（誰がいつpromoteしたか）
  * ロールバック手順

---

## 15. まとめ：Sovereign AIの実現（トイク揃域）

![SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計](/images/LLM/SADLA1.完全閉域網での巨大LLM運用と動的LoRA設計.jpg)


### 図の要旨

3つの要素が重なる中心が「真のプライベートAI」。

* **Security**（完全閉域網・データ主権）
* **Sustainability**（軽量tsuzumi・高効率vLLM）
* **Autonomy**（動的LoRA・自律的コントロール）

### Next Action（図の下部）

* デプロイ前チェックリスト（例）

  * YAML定義の実確認
  * MinIOパス整合性
  * 証明書（CA）周りの実確認

---

# 付録：図にないが「現場で必ず使う」コマンド集

> 閉域網では“通信が詰まる”が頻出です。
> 詳細な切り分け型は別資料「閉域網 curl 完全攻略ガイド」を推奨します。

## A. OpenShift 基本

```bash
# namespace
oc new-project vllm
oc project vllm
oc get pods
oc get svc
oc get route
oc get inferenceservice

# 状態/ログ/イベント
oc describe pod <pod>
oc logs <pod> --tail=200
oc logs -f <pod>
oc get events --sort-by=.lastTimestamp
```

## B. API疎通（閉域網の切り分け最短）

```bash
# まずステータス
curl -i https://<endpoint>/v1/models

# どこで止まるか（DNS/TCP/TLS/HTTP）
curl -v https://<endpoint>/v1/models

# 社内CA指定（正攻法）
curl --cacert /path/to/internal-ca.crt https://<endpoint>/v1/models

# ぶら下がり防止
curl --connect-timeout 5 --max-time 60 https://<endpoint>/v1/models
```

## C. 証明書確認

```bash
openssl s_client -connect <host>:443 -showcerts
```

## D. GPU確認（可能な環境のみ）

```bash
nvidia-smi
watch -n 1 nvidia-smi
```

# 動的マルチフレーバーAIサービング（Multi-LoRA）実践ガイド
## description: OpenShift AI × vLLM による Multi-LoRA サービングと、閉域網/社内環境での安全な運用・デプロイ手順

## この資料の読み方（最重要）
このドキュメントは、各ページを次の順で読み解く構成です。

1. **図の要旨**：その図で伝えたい結論（何が嬉しいのか）
2. **詳細解説（用語）**：閉域網・プラットフォーム・LLM運用の“つまずきやすい単語”の補足
3. **実装の手順／設定の勘所**：YAMLやCLIのポイント（どこをどう直すか）
4. **Tips（実務）**：ありがちな事故・運用のコツ・よく使うコマンド


## 1. カスタムAI「フレーバー」の動的デプロイメント戦略（全体像）
![DMF1.カスタムAI「フレーバー」の動的デプロイメント戦略](/images/LLM/DMF1.カスタムAI「フレーバー」の動的デプロイメント戦略.jpg)

### 図の要旨
- **ベースモデル（巨大）** をGPUに常駐させたまま、**LoRAアダプタ（軽量）** をリクエスト単位で差し替えて推論する。
- 「モデルを複数本デプロイする」から「**1本のベース + 複数のアダプタ**」へ設計転換すると、GPU資源効率が大幅に上がる。
- **APIゲートウェイ／リクエスト制御**で、どのアダプタを使うか（フレーバー）を決められる。

### 詳細解説（用語）
- **Base Model（ベースモデル）**：事前学習済みの大規模モデル本体。サイズが大きく、GPUロードに時間とVRAMを要する。
- **LoRA（Low-Rank Adaptation）**：ベースモデルの重みを丸ごと再学習せず、追加の小さな差分行列で能力を“味付け”する手法。
- **Adapter（アダプタ）**：LoRAで学習した差分（軽量ファイル群）。用途別（SQL特化、要約特化など）に複数持てる。
- **Multi-tenant（マルチテナント）**：複数の組織/プロジェクトが同一基盤を共有しつつ、論理的に分離して利用する形。
- **GPU Memory Pool**：GPUのVRAMは有限。ベースを常駐させつつアダプタも載せるため、メモリ設計が肝。

### Tips（実務）
- まずは「ベース + アダプタ2〜3個」から始め、**max-loras**を小さく置いて安定化→段階的に増やすのが事故が少ない。

---

## 2. 「Multi-Flavor」の挑戦：モノリシックからモジュラーへ
![DMF2.「Multi-Flavor」の挑戦：モノリシックからモジュラーへ](/images/LLM/DMF2.「Multi-Flavor」の挑戦：モノリシックからモジュラーへ.jpg)

### 図の要旨
- 従来：用途ごとに「巨大なモデル」を別々にホスト → **GPUがすぐ枯渇**＆デプロイが重い
- 提案：**冷蔵庫（ベース）** は1つ常駐、**スパイス（アダプタ）** をリクエストで切替 → 同じGPUで多品種を提供

### 詳細解説（用語）
- **モノリシック（Monolithic）**：1つの塊としてデプロイ・運用する設計。モデルA/B/Cを全部“別物”として持つ。
- **モジュラー（Modular）**：共通の土台（ベース）に交換可能部品（アダプタ）を付け替える設計。

### Tips（実務）
- 「フレーバー（用途別AI）」を増やしたくなったとき、Multi-LoRAは **“増やすコスト”が小さい**のが最大の武器。
- ただし、アダプタ増加は **KVキャッシュ（コンテキスト長）** とトレードオフになる（後述）。

---

## 3. インフラ・ブループリント：完全閉域網での構成
![DMF3.インフラストラクチャブループリント：完全閉域網での構成](/images/LLM/DMF3.インフラストラクチャブループリント：完全閉域網での構成.jpg)

### 図の要旨
- ベースモデルは **PVC（高速・永続ストレージ）**に置き、起動時に読む。
- アダプタは **MinIO（S3互換のオブジェクトストレージ）**に置き、推論時に必要なものだけ取る。
- 閉域網でも「外部に出ない」形で **モデル運用の分業（大物と小物）**ができる。

### 詳細解説（用語）
- **PVC（PersistentVolumeClaim）**：Kubernetes/OpenShiftで永続ストレージを要求する仕組み。大容量で高速な領域を確保しやすい。
- **MinIO（S3互換）**：S3 APIで扱えるオブジェクトストレージ。閉域網でS3ライクな運用を実現しやすい。
- **Air-gapped（閉域/隔離）**：インターネットに直接出られない環境。証明書・レジストリ・依存解決が難所になりやすい。

### Tips（実務）
- ベース（数十GB〜）をMinIOに置くと起動が重くなりがち。**ベースはPVC**が運用上ラク。
- アダプタ（数十〜数百MB）はMinIOが向く。増減も速い。

---

## 4. vLLM内部アーキテクチャ：動的バッチ処理と差分重み注入
![DMF4.vLLM内部アーキテクチャ：動的バッチ処理とカーネルフュージョン](/images/LLM/DMF4.vLLM内部アーキテクチャ：動的バッチ処理とカーネルフュージョン.jpg)

### 図の要旨
- 同じベースを共有したまま、リクエストごとに **ΔW（差分重み）**を注入して推論できる。
- 異なるアダプタ同士でもバッチにまとめる工夫（ヘテロバッチ）で、スループット低下を抑える。
- アダプタはキャッシュ（例：LRU）で使い回すのが前提。

### 詳細解説（用語）
- **ΔW（デルタW）**：LoRAが持つ“差分”の重み。ベース重みに足し込むことで能力を変える。
- **Heterogeneous Batching**：異なる条件（アダプタ違い等）のリクエストをうまくまとめて処理する考え方。
- **LRU Cache**：最近使ったものを優先して残し、使われないものから捨てるキャッシュ戦略。

### Tips（実務）
- 「アダプタが多いほど良い」ではない。**よく使う上位N個**をキャッシュに残し、残りは遅延ロードで割り切る。

---

## 5. 実装STEP1：ストレージ戦略とディレクトリ構造
![DMF5.実装STEP1：ストレージ戦略とディレクトリ構造](/images/LLM/DMF5.実装STEP1：ストレージ戦略とディレクトリ構造.jpg)

### 図の要旨
- アダプタは **“所定のファイル構造”**でMinIO(S3)に配置する必要がある。
- 代表的に必要なファイルは次の2つ：
  - `adapter_config.json`
  - `adapter_model.safetensors`（または同等の重みファイル）

### 詳細解説（用語）
- **safetensors**：PyTorchの重み保存形式の一つ。読み込みが速く、セキュリティ上も扱いやすい。
- **adapter_config.json**：アダプタのメタ情報（モデル名、ターゲット層、rank等）を定義する重要ファイル。

### コマンド解説（例）
```bash
# 例：ローカルの adapters/ を MinIO(S3) 側へ同期
aws s3 sync ./local-adapters/ s3://my-bucket/adapters/ --delete
````

* `aws s3 sync`：ローカルとS3を“差分同期”するコマンド
* `--delete`：S3側にしかないファイルを削除する（強力。事故りやすいので運用ルール必須）

### Tips（実務）

* **まずは `--delete` を付けずに**同期し、パスやファイル名が正しいのを確認してから付ける。
* “Adapter Not Found”の多くは **パスのズレ**（末尾スラッシュ、ディレクトリ名、階層違い）が原因。

---

## 6. 実装STEP2：GUIの限界と「YAML編集」ワークフロー

![DMF6.実装STEP2：GUIの限界と「YAML編集」ワークフロー](/images/LLM/DMF6.実装STEP2：GUIの限界と「YAML編集」ワークフロー.jpg)

### 図の要旨

* GUIのデプロイウィザードだけでは **LoRA有効化フラグ**を入れられないことがある。
* その場合は、GUIで一度デプロイしてから **Edit YAML**で追記して再デプロイする。

### 詳細解説（用語）

* **ServingRuntime**：KServe/OpenShift AIで「推論サーバの実行形態（ランタイム）」を定義するリソース。
* **InferenceService**：モデルを外部に公開する推論エンドポイントを定義するリソース（KServeの代表）。
* **GUI Wizard**：フォーム入力中心。細かい起動引数や環境変数を入れにくい場合がある。

### Tips（実務）

* GUI→YAML編集の流れは“例外対応”ではなく、実務では標準ルートになりがち。
* YAML編集後は、**差分が残るようにGit管理（マニフェスト化）** しておくと再現性が高い。

---

## 7. 実装STEP3：InferenceServiceの構成（YAML定義）

![DMF7.実装STEP3：InferenceServiceの構成（YAML定義）](/images/LLM/DMF7.実装STEP3：InferenceServiceの構成（YAML定義）.jpg)

### 図の要旨

* vLLM起動引数で **LoRA機能をON**にし、同時ロード数やrank上限を決める。
* ここがMulti-LoRA運用の“中枢設定”。

### コマンド／引数の詳細解説

代表的な起動引数（図の内容をベースに解説）：

* `--enable-lora`
  LoRA機能の**マスタースイッチ**。これが無いとアダプタ指定しても効かない。

* `--max-loras=<N>`
  GPU上に同時展開できるアダプタ数。

  * 大きい：切替が速い／同時利用に強い
  * 小さい：VRAM節約／安定しやすい

* `--max-lora-rank=<R>`
  学習時のLoRA rank（r）以上に設定が必要。足りないとロード失敗やOOMの原因になる。

### YAML例（雛形）

```yaml
spec:
  containers:
  - name: kserve-container
    args:
      - --model=/mnt/models/tsuzumi
      - --enable-lora
      - --max-loras=4
      - --max-lora-rank=64
```

### Tips（実務）

* まずは **max-loras=2〜4** くらいの控えめ設定で起動確認 → メトリクス見ながら増やす。
* `max-lora-rank`は「学習側の設定」が答え。分からない場合は学習成果物のメタ情報を確認。

---

## 8. 実装STEP4：ハイブリッド・ローディング（PVC + S3）の定義

![DMF8.実装STEP4：ハイブリッドローディングの定義](/images/LLM/DMF8.実装STEP4：ハイブリッドローディングの定義.jpg)

### 図の要旨

* **ベースモデルはPVC**、**アダプタはS3(MinIO)** という“役割分担”をYAMLで表現する。
* ランタイム更新（ホットスワップ）を許可する環境変数が鍵。

### 詳細解説（用語）

* `storageUri: s3://...`：アダプタ取得先（MinIO）
* `--model=/mnt/models/...`：ベースモデルの配置先（PVCマウント）

### 環境変数（重要）

* `VLLM_ALLOW_RUNTIME_LORA_UPDATING=True`
  ランタイム中のLoRA更新（ホットスワップ）を許可する設定。
  ※環境やvLLMのバージョンにより扱いが変わる可能性があるため、導入後に必ず動作確認する。

### Tips（実務）

* 「更新できる」＝「誰でも更新できる」にならないように、更新権限と手順（承認・監査）を必ず整える。

## 9. 動的アダプタ選択：APIリクエストの構造（&lt;Base&gt;:&lt;Adapter&gt;）
![DMF9.動的アダプタ選択：APIリクエストの構造](/images/LLM/DMF9.動的アダプタ選択：APIリクエストの構造.jpg)

### 図の要旨

* APIの `model` フィールドで **`<Base>:<Adapter>`** を指定すると、vLLMが解決してロードする。
* まずキャッシュ確認 → なければMinIOから取得 → GPUへロード → 推論。

### リクエスト例（OpenAI互換の体裁）

```http
POST /v1/chat/completions
Content-Type: application/json

{
  "model": "tsuzumi-base:sql-adapter",
  "messages": [
    {"role":"user","content":"売上データを集計するクエリを書いて"}
  ],
  "temperature": 0.1
}
```

### 用語補足

* **temperature**：出力のランダム性。小さいほど堅め・再現性寄り（SQL等は低めが無難）
* **キャッシュヒット**：アダプタが既にGPU/メモリに居る状態。TTFTが改善しやすい。

### Tips（実務）

* まずは **アダプタ名を短く・規則的に**（例：`sql`, `summarize`, `creative`）し、運用ミスを減らす。
* 「model名に何を許すか」はガバナンス領域。野良アダプタ名を通さない設計（許可リスト化）も検討。

---

## 10. スケーリングと最適化：分散推論（llm-d）によるルーティング

![DMF10.スケーリングと最適化：分散推論（llm-d）によるルーティング](/images/LLM/DMF10.スケーリングと最適化：分散推論（llm-d）によるルーティング.jpg)

### 図の要旨

* 複数vLLM Podにスケールしたとき、単純なラウンドロビンだとキャッシュが効かない。
* **Prefix Cache Scorer**のような仕組みで「そのアダプタを既に持っているPod」へ寄せると高速化する。
* キャッシュヒット率が上がるほど、**TTFT（最初のトークンが返るまでの時間）** が下がる。

### 詳細解説（用語）

* **Load Balancer**：リクエストを複数Podへ振り分ける仕組み。
* **Prefix Cache**：LLMの推論で使われる“途中状態”を再利用するキャッシュ（概念として）。
* **TTFT（Time To First Token）**：ユーザ体感に直結する指標。最初の応答が遅いと「遅いAI」に見える。

### Tips（実務）

* 「どのPodへ振るか」のルールは、性能を決める最重要ポイントになりがち。
* まずは小規模で **“同一アダプタの連続リクエスト”** を流し、TTFTが下がることを確認すると理解が早い。

---

## 11. パフォーマンス・チューニングとリソース管理（メモリの三すくみ）

![DMF11.パフォーマンスチューニングとリソース管理](/images/LLM/DMF11.パフォーマンスチューニングとリソース管理.jpg)

### 図の要旨

* アダプタを多く載せるほど便利だが、GPUメモリは有限。
* GPUだけでなく **CPUメモリにも“待機アダプタ”** を持つと、スワップ（切替）時間を短縮できる。
* **Active Adapters** が増えるほど **KVキャッシュ（=コンテキスト長）** が削られやすい（トレードオフ）。

### 詳細解説（用語）

* **GPU Memory Utilization（例：0.85）**：VRAMを使い切ると突然死（OOM）しやすい。余白を残す発想が重要。
* **KV Cache**：Transformer推論で過去トークンの情報を保持する領域。これが大きいほど長文が扱える。
* **Context Window**：モデルが“一度に覚えて扱える”トークン量の上限（体感としては長文耐性）。

### Tips（実務）

* まずは「長文が必要なユースケース」か「多品種フレーバー」か、優先順位を明確にする。
* 監視すべき最低限の指標：

  * VRAM使用量（ピーク）
  * OOM回数（0を目指す）
  * TTFT / レイテンシ分布（P95/P99）
  * アダプタキャッシュヒット率

---

## 12. トラブルシューティング：よくある落とし穴（3大事故）

![DMF12.トラブルシューティング：よくある落とし穴](/images/LLM/DMF12.トラブルシューティング：よくある落とし穴.jpg)

### 図の要旨

* **Adapter Not Found**：パス不一致（MinIOの階層ズレ）
* **OOM / Load Failure**：`max-lora-rank`不足（学習rankより小さい）
* **Certificate Errors**：自己署名証明書・社内CA未信頼（Trusted CA Bundleが必要）

### まずやる切り分けコマンド集

```bash
# 1) Podログ確認（まずはここ）
oc logs <pod-name>

# 2) 設定の現物を見る（YAMLが意図通りか）
oc get inferenceservice <name> -o yaml
oc get servingruntime <name> -o yaml

# 3) S3/MinIO 側の配置確認（パスとファイル名）
aws s3 ls s3://my-bucket/adapters/ --recursive | head
```

### Tips（実務）

* “Not Found” は **「ファイルが無い」ではなく「探し方が違う」**ことが多い。
* 証明書問題は閉域網の定番。早めに **Trusted CAの注入手順**を標準化しておく。

---

## 13. セキュリティとガバナンス（鍵と証明書は別腹）

![DMF13.セキュリティとガバナンス](/images/LLM/DMF13.セキュリティとガバナンス.jpg)

### 図の要旨

* S3接続情報（キー）は **OpenShift Secret** で管理する（例：aws-connection）。
* 外部公開は **HTTPS Route** を作り、**Trusted CA** を適用して正しく信頼連鎖を通す。

### 詳細解説（用語）

* **Secret**：Kubernetesの機密情報格納。環境変数やボリュームとしてPodへ渡す。
* **Route**：OpenShiftの外部公開ルーティング。Ingress相当だがOpenShift流の機能がある。
* **Trusted CA Bundle**：社内CA（SSLインスペクション等）をクライアント/Podが信頼するための証明書束。

### コマンド例（雛形）

```bash
# Secret 作成（値はダミー。実際は規程に従い安全に投入）
oc create secret generic aws-connection \
  --from-literal=AWS_ACCESS_KEY_ID=xxxxx \
  --from-literal=AWS_SECRET_ACCESS_KEY=yyyyy
```

### Tips（実務）

* **「鍵（Secret）」と「証明書（CA）」は別問題**。片方直してももう片方で詰まることがある。
* 監査・棚卸しのため、Secret作成は手順化（誰が・いつ・何を）しておくと後で助かる。

---

## 14. デプロイメント・チェックリスト（本番前に見る紙）

![DMF14.デプロイメントチェックリスト](/images/LLM/DMF14.デプロイメントチェックリスト.jpg)

### チェック項目（実務向けに文章化）

* **Storage**

  * ベースモデルはPVCにあるか？
  * アダプタはMinIO(S3)にあり、階層とファイル名は合っているか？
* **Runtime（YAML）**

  * `--enable-lora` が入っているか？
  * `--max-loras` / `--max-lora-rank` は妥当か？
* **Memory**

  * VRAMに余白（例：Utilization 0.85相当）を残しているか？
  * CPU側に待機アダプタを持つ設計か？
* **Network / Security**

  * Data Connection（Secret）設定済みか？
  * Trusted CA Bundleは適用済みか？
* **Client**

  * APIの `model` 指定は `<base>:<adapter>` 形式になっているか？

### Tips（実務）

* “最後にチェック”ではなく、**変更したらこの表を1周**すると事故率が下がる。

---

## 15. 結論：柔軟で効率的な「Private AI Kitchen」の実現

![DMF15.結論：順何で効率的な「PrivateAIKitchen」の実現](/images/LLM/DMF15.結論：順何で効率的な「PrivateAIKitchen」の実現.jpg)

### 図の要旨

* OpenShift AI + vLLM により、巨大モデルを **柔軟なマルチテナント基盤**へ変換できる。
* 次の実務ステップ：

  1. ベースモデル配置
  2. アダプタAPIテスト
  3. llm-d など分散構成へ拡張

### Tips（実務）

* いきなり分散（llm-d）へ行くより、まずは **単一Podで安定** → キャッシュ・切替が理解できてからスケールが堅い。

---

# 付録A：総復習図（構成要素・ファイル構造・GUI→YAML）

![DMF16.動的マルチフレーバーAIサービング：LoRAアダプタの効率的デプロイ](/images/LLM/DMF16.動的マルチフレーバーAIサービング：LoRAアダプタの効率的デプロイ.jpg)

## 付録A-1. 構成要素と必要ファイル構造（左側）

* **ベースモデル（PVC）**

  * サイズが大きい（数GB〜数十GB以上）
  * サービス起動時に固定ロード（頻繁に差し替えない前提）
* **LoRAアダプタ（S3/MinIO）**

  * 非常に小さい（ベースの数%〜）
  * 推論時に必要なものだけ動的ロード
  * 必須ファイル例：`adapter_config.json`, `adapter_model.safetensors`

### Tips（実務）

* ベース更新は“イベント”として扱い、アダプタ更新は“日常運用”に寄せると運用が回る。

## 付録A-2. デプロイ・ワークフロー：GUIからYAML編集へ（右側）

1. GUIでベースモデルのデプロイ（雛形を作る）
2. YAML編集へ切り替え
3. `--enable-lora` を追加（LoRA有効化）
4. `--max-loras`, `--max-lora-rank` を調整（性能と安定の調律）

### よく使う追加引数（図にある要点を言語化）

* `--enable-lora`：LoRAを使うなら必須
* `--max-loras`：同時に“載せておける”アダプタ数（VRAMと相談）
* `--max-lora-rank`：学習時のrank以上にする（足りないと事故る）

---

# 付録B：現場でよく使うコマンド集（図にはないが必須）

## B-1. OpenShift/KServe 基本

```bash
# リソース一覧
oc get pods
oc get inferenceservice
oc get servingruntime

# YAMLをそのまま見る（事故の8割はYAML差分）
oc get inferenceservice <name> -o yaml
oc get servingruntime <name> -o yaml

# Podのイベント（Pull失敗/マウント失敗/再起動原因）
oc describe pod <pod-name>

# ログ（まずはここ）
oc logs <pod-name>
```

## B-2. MinIO(S3) 側の配置確認

```bash
# バケット内の確認（階層ズレ検出に強い）
aws s3 ls s3://my-bucket/adapters/ --recursive

# 1つのアダプタの必須ファイルが揃っているか
aws s3 ls s3://my-bucket/adapters/sql-adapter/
```

## B-3. API疎通（最小の動作確認）

```bash
# OpenAI互換を想定した簡易テスト（URL等は環境に合わせて置換）
curl -sS https://<your-endpoint>/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "tsuzumi-base:sql-adapter",
    "messages": [{"role":"user","content":"SELECT文の例を出して"}],
    "temperature": 0.1
  }' | jq .
```

### Tips（実務）

* “まず通す”なら `temperature` は低め、プロンプトは短め、出力も短めが安定。
* 失敗したら「HTTP層」「TLS層」「S3取得層」「GPUロード層」のどこで詰まったかをログで特定する。

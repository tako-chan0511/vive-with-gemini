# 動的マルチフレーバーAIサービング（Multi-LoRA）実践ガイド
## description: OpenShift AI × vLLM で、ベースモデル＋LoRAアダプタを「動的に」切り替えて提供するための設計・デプロイ・運用・トラブルシュートを1本にまとめた手引き

# 動的マルチフレーバーAIサービング：LoRAアダプタの効率的デプロイ（OpenShift AI × vLLM）

> **このページの目的**
>
> - **1つのベースモデル**をGPUに常駐させたまま、用途別の **LoRAアダプタ（= “フレーバー”）** を **リクエスト単位で切り替えて** 推論する
> - OpenShift AI（RHOAI）上で、**GUI → YAML編集**を前提に **確実に動くデプロイ**を組み立てる
> - **閉域網 / 企業ネットワーク**で詰まりやすい「証明書」「S3/MinIO」「パス構造」「VRAM不足」まで含めて、現場で再現できる形に落とす


## 01. タイトル：カスタムAI「フレーバー」の動的デプロイ戦略

![ESA1.エンタープライズのためのカスタムAI実行戦略：LLMaaSの賢い実装](/images/LLM/ESA1.エンタープライズのためのカスタムAI実行戦略：LLMaaSの賢い実装.jpg)

### 図の要旨
- **ベースモデルは1つ**だけGPUにロードし続ける
- “SQL特化”“要約特化”など用途別の **LoRAアダプタ**を **動的に挿入（inject）** して応答を切り替える
- 「どのアダプタを使うか」を **APIリクエスト側で指定**し、**ゲートウェイ / ルータ**が振り分ける

### 重要用語（最小セット）
- **Base model（ベースモデル）**：巨大（数十GB〜）で、GPUに常駐させたい本体
- **LoRA（Low-Rank Adaptation）**：本体を丸ごと再学習せず、軽量な差分（低ランク行列）だけ追加して能力を変える手法
- **Adapter（アダプタ）**：LoRAで作られる差分重み（数十MB〜数百MB）
- **Flavor（フレーバー）**：利用者から見た「同じモデルAPIに見えるが、中身の性格が違う」バリエーション（= アダプタで切り替える）

### Tips（実務）
- “モデルを用途別に複製”すると、**VRAMもストレージも運用も**増える  
  → “ベース1 + アダプタ差分”に寄せると、**配布・更新・切戻し**が一気に楽になる

---

## 02. なぜMulti-LoRA：一体モデル乱立のコストを潰す

![ESA2.閉域網における「ソブリンAI」の絶対的制約](/images/LLM/ESA2.閉域網における「ソブリンAI」の絶対的制約.jpg)

### 図の要旨
- 従来：用途A/B/Cのたびに**フルモデルを別々にデプロイ** → GPUメモリが無駄＆保守が地獄
- Multi-LoRA：**ベースは共通**、用途別は **アダプタを差し替え** → **GPU常駐はベースだけ**で済む

### ここが本質（コスト観点）
- **VRAM**：フルモデル複製が消える（= 最大の節約ポイント）
- **配布**：アダプタは軽いので、閉域網でも配りやすい
- **運用**：用途ごとに「本体の脆弱性対応」「依存ライブラリ更新」を回す必要が減る

### Tips（よくある誤解）
- 「LoRA＝学習の話」になりがちですが、現場で効くのは **“運用・デプロイの軽量化”** です  
  → **“サービスの成り立ち”** として捉えると、要件整理が前に進みます

---

## 03. 閉域網インフラ・ブループリント：PVC + MinIO のハイブリッド

![ESA3.従来のデプロイ方式が陥る「GPUリソースの罠」](/images/LLM/ESA3.従来のデプロイ方式が陥る「GPUリソースの罠」.jpg)

### 図の要旨
- **ベースモデル**：高速に読める **PVC（永続ボリューム）** に置く（起動時に一括ロード）
- **LoRAアダプタ**：**S3互換（MinIO）** に置く（必要なときに取得）
- **推論Pod（vLLM）**：ベースは常駐、アダプタは動的ロード

### なぜこの分離が効くのか
- ベースモデルは巨大：**毎回S3から引くと起動が遅く**、ネットワークにも優しくない
- アダプタは小さい：**S3/MinIOの得意分野（配布・バージョン管理）** に載せるのが合理的

### 用語解説
- **PVC（PersistentVolumeClaim）**：Podが使う「ディスク予約」。クラスタ側のストレージ（Ceph等）に紐づく  
- **MinIO**：S3互換のオブジェクトストレージ。閉域網でS3的運用をする定番
- **Air-gapped（完全閉域）**：外部インターネットに出られない構成。証明書・依存物の持ち込みが重要

### Tips（実務）
- ベースモデルをPVCに置くなら、**ReadOnlyMany**の可否や、同時起動数のI/Oを事前に確認  
- MinIOは **証明書（CA）** と **エンドポイントURL** が最初の罠（後半で対処）

---

## 04. vLLMの内部：なぜ動的LoRAが高速に回るのか

![ESA4.３つのデプロイ方式比較：なぜ「動的LoRA」なのか](/images/LLM/ESA4.３つのデプロイ方式比較：なぜ「動的LoRA」なのか.jpg)

### 図の要旨
- vLLMは **ベース重みを共有**したまま、リクエスト単位で **ΔW（LoRA差分）** を当てて計算できる
- **Dynamic batching**（動的バッチング）により、複数リクエストを束ねてGPU効率を上げる
- アダプタはキャッシュされ、同じフレーバーの再要求が速くなる

### 用語解説（最低限）
- **Dynamic batching**：到着した複数のリクエストを、短い時間窓でまとめてGPUに流す最適化
- **KV cache**：生成AIが長文を扱うために保持する内部メモリ。長いほど消費が増える
- **LRU cache**：最近使ったものを残し、使われないものから捨てるキャッシュ戦略

### Tips（実務）
- “アダプタを増やす”＝“便利”ですが、**KV cacheの領域を圧迫**しやすい  
  → 後半の `max-loras` / GPUメモリ利用率設計が重要

---

## 05. 実装Step1：アダプタ配置（S3/MinIO）とファイル構造

![ESA5.ｖLLMによる「動的マルチLoRA」の動作原理](/images/LLM/ESA5.ｖLLMによる「動的マルチLoRA」の動作原理.jpg)

### 図の要旨
- LoRAアダプタは **フォルダ単位**で管理し、最低でも次の2ファイルが必要
  - `adapter_config.json`
  - `adapter_model.safetensors`
- 例：`s3://my-bucket/adapters/sql-adapter/` の配下に配置する

### ここが一番ハマる：パスと階層
vLLM側は「指定したプレフィックス配下にアダプタがある」前提で探します。  
**1階層ズレるだけで Adapter Not Found** になりがちです（後半の落とし穴参照）。

### 代表コマンド（図にある系）
```bash
# （例）ローカルで作ったアダプタ群をS3/MinIOへ同期
aws s3 sync ./local-adapters/ s3://my-bucket/adapters/ --delete
````

### よく使うコマンド（図にはないが実務で必須）

```bash
# バケット一覧
aws s3 ls

# 対象プレフィックス確認（階層ズレ検出に使う）
aws s3 ls s3://my-bucket/adapters/ --recursive

# 1つのアダプタ配下だけ確認
aws s3 ls s3://my-bucket/adapters/sql-adapter/
```

### Tips（運用品質）

* **アダプタ名（sql-adapter等）を命名規約化**すると、API側の指定やRBACが安定します
* 例：`{team}-{purpose}-{version}` / `sql-v1` / `summarize-v2` など

---

## 06. 実装Step2：OpenShift AI “GUI → YAML編集” でLoRAを有効化

![ESA6.NTTデータLLMaaSアーキテクチャ全体像](/images/LLM/ESA6.NTTデータLLMaaSアーキテクチャ全体像.jpg)

### 図の要旨

* GUIウィザードは「ベースモデルをデプロイ」まではやれる
* しかし LoRA有効化や細かい `args` は **YAML編集で注入**する流れになりやすい
* いったんGUIで “土台” を作り、**Edit YAML** で仕上げるのが現実解

### 具体的な進め方（迷子にならない手順）

1. **Model Serving** でベースモデルのデプロイを作成（まず起動させる）
2. 対象の **InferenceService / ServingRuntime** を開く
3. **Edit YAML** を選択
4. `args:` / `env:` / `storageUri:` を追記（後続ページの例）
5. 保存 → Pod再起動 → 動作確認（curl）

### Tips（実務）

* “まずベースだけ起動”は正しい
  → LoRA前に **ヘルスチェック・Route疎通・GPU割当** を片付けられる

---

## 07. 実装Step3：ServingRuntimeに vLLM 引数を注入（enable-lora 等）

![ESA7.マルチテナント環境における「多層防御」と分離](/images/LLM/ESA7.マルチテナント環境における「多層防御」と分離.jpg)

### 図の要旨

* vLLMにはLoRA用のスイッチがあり、**これを入れないと絶対に動かない**
* 特に重要：

  * `--enable-lora`
  * `--max-loras`
  * `--max-lora-rank`

### “何を決めればいいか” が見える解説

* `--enable-lora`：LoRA機能のマスタースイッチ（まずこれ）
* `--max-loras`：同時に“アクティブ（GPU常駐）”にできるアダプタ数

  * 大きいほど便利だが、VRAMを食い **KV cacheが減る** → 長文性能に影響
* `--max-lora-rank`：学習したLoRAのランク `r` 以上に設定する必要

  * 例：学習が `r=128` なら、`--max-lora-rank=128` 以上に

### YAML例（イメージ）

> 実際のキー構造は環境で異なるため、「どこに書くか」より **“何を入れるか”** を掴むのが目的です。

```yaml
containers:
  - name: vllm
    args:
      - --model=/mnt/models/tsuzumi
      - --enable-lora
      - --max-loras=4
      - --max-lora-rank=64
```

### よく使う追加引数（図にはないが実務で効く）

```yaml
args:
  - --gpu-memory-utilization=0.85
  - --max-num-batched-tokens=8192
  - --max-model-len=8192
```

* `--gpu-memory-utilization`：VRAMを使い切らず、**LoRAロード用の余白**を作る（後述）
* `--max-model-len`：長文（コンテキスト長）上限。大きいほどKV cacheを食う

---

## 08. 実装Step4：ハイブリッドロード（Base=PVC / Adapter=S3）を完成させる

![ESA8.完全閉域網の掟：プライベートAIキッチン」運用](/images/LLM/ESA8.完全閉域網の掟：プライベートAIキッチン」運用.jpg)

### 図の要旨

* ベース：`/mnt/models/tsuzumi`（PVCマウント）から読む
* アダプタ：`storageUri: s3://...`（MinIO）を参照する
* “動的更新（ホットスワップ）”を許す環境変数を入れることがある

### よく出る設定項目の意味

* `storageUri`：推論サービスが参照する外部ストレージ（S3/MinIO）
* `env: VLLM_ALLOW_RUNTIME_LORA_UPDATING=True`：稼働中にアダプタ更新を許可するためのフラグ（環境により要否あり）

### Tips（閉域網）

* MinIOがHTTPSの場合、**CA信頼**が未設定だと、S3取得で落ちます（後半の証明書エラー）

---

## 09. APIで“フレーバー”を選ぶ：model名で Base:Adapter を指定

![ESA9.章句材の補完：MinIOによるモデル管理](/images/LLM/ESA9.章句材の補完：MinIOによるモデル管理.jpg)

### 図の要旨

* クライアントは `model` に **ベース + アダプタ** を指定して呼ぶ
* vLLM側は、指定アダプタが **キャッシュ済みなら即推論**
* 未キャッシュなら **MinIOから取得 → GPUロード → 推論** の順に進む

### リクエスト例（概念）

```bash
curl -sS https://<your-endpoint>/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tsuzumi-base:sql-adapter",
    "messages": [{"role":"user","content":"売上データを集計するSQLを書いて"}],
    "temperature": 0.1
  }'
```

### 重要ポイント

* **モデル名の命名規約**がそのまま運用品質になります

  * 例：`<base>:<adapter>` / `<base>@<adapter>` など（実装方針に合わせ統一）
* “どこで認可するか”

  * ゲートウェイで「この利用者はこのadapterまで」など制御すると事故が減る

---

## 10. スケールと最適化：分散推論（llm-d）でキャッシュヒット率を上げる

![ESA10.レシピ：vLLMの動的LoRA有効化設定](/images/LLM/ESA10.レシピ：vLLMの動的LoRA有効化設定.jpg)

### 図の要旨

* 複数Podにスケールしたとき、単純LBだと「アダプタキャッシュが分散」して効率が落ちる
* そこで **“そのアダプタが載っていそうなPodへ”** ルーティングする工夫が有効
* 図では **Prefix Cache Scorer** 的な考え方で、キャッシュヒットを上げる

### 用語解説

* **TTFT（Time To First Token）**：最初の1トークンが返るまでの時間。体感速度に直結
* **Cache-aware routing**：キャッシュがあるノードへ寄せて、TTFTを改善するルーティング

### Tips（実務）

* “分散化は最後”でOK

  1. まず単体でE2E疎通（ベース→アダプタ→API）
  2. 次に `max-loras` / メモリ調整
  3. それでも足りなければ llm-d を検討

---

## 11. パフォーマンス・チューニングとリリース管理（パラメータ設計）

![ESA11.オーダー：APIリクエストによる動的切替](/images/LLM/ESA11.オーダー：APIリクエストによる動的切替.jpg)

### 図の要旨

* **GPUメモリ利用率**を 0.85 などに設定し、LoRAロードの余白を確保する
* GPUだけでなく **CPUメモリ側に待機アダプタ**を置くことで、スワップ時間を短縮できる
* **アクティブLoRAが増えるほどKV cacheが減る**（= 長文性能とのトレードオフ）

### 具体的に“何を決める”べきか（現場の決定項目）

* `gpu-memory-utilization`：どれだけVRAMを詰めるか（詰めすぎるとロード時OOM）
* `max-loras`：同時アクティブアダプタ数（便利さ vs 長文性能）
* コンテキスト長（`max-model-len`）：長文要件があるなら最優先で確保

### Tips（リリース管理）

* アダプタは軽いので、**“アダプタだけ差し替え”** が基本のリリース単位になります
  → バージョニング（例：`sql-adapter-v2`）と、切戻し（v1へ戻す）を手順化すると強い

---

## 12. トラブルシューティング：よくある落とし穴3つ

![ESA12.大規模化への対応：llm-dによる分散推論とルーティング](/images/LLM/ESA12.大規模化への対応：llm-dによる分散推論とルーティング.jpg)

### 12.1 Adapter Not Found（見つからない）

**原因**

* MinIO/S3上のパスが想定と違う（階層ズレ、名前違い）
* `adapter_config.json` が無い / 位置が違う

**対処**

* `aws s3 ls --recursive` で **実際の階層**を確認
* “アダプタ1個”を最小構成で置いて、確実に見える状態から増やす

### 12.2 OOM / Load Failure（VRAM不足・ロード失敗）

**原因**

* `--max-lora-rank` が学習ランクより小さい
* `gpu-memory-utilization` を詰めすぎ、ロードの余白が無い

**対処**

* 学習時の `rank(r)` を確認し、`--max-lora-rank >= r` に
* `--gpu-memory-utilization=0.85` 等で余白を確保

### 12.3 Certificate Errors（証明書エラー）

**原因**

* 閉域網のS3/MinIOが自己署名・社内CAで、Podが信頼できていない

**対処**

* **Trusted CA Bundle** をPodへ注入（ConfigMap / Secret）
* ルート証明書の展開パス・環境変数（ツール別）を整理

---

## 13. セキュリティとガバナンス：Secret管理とHTTPSルート

![ESA13.品質管理：経緯起毛内でのパフォーマンス評価（GuideLLM）](/images/LLM/ESA13.品質管理：経緯起毛内でのパフォーマンス評価（GuideLLM）.jpg)

### 図の要旨

* Data Connectionの鍵は **OpenShift Secret** で管理（例：aws-connection）
* 外向きAPIは **HTTPS Route** を作り、**Trusted CA** を適用する

### “やること”を具体化

* **鍵（AccessKey/SecretKey）**

  * 平文をYAMLに直書きしない
  * Secret参照（Data Connection / CSI / envFrom など）に統一
* **ネットワーク（TLS）**

  * ルートはHTTPS化
  * 企業CAをクラスター or ワークロードに配布して信頼させる

### よく使うコマンド（運用・調査）

```bash
# ログイン確認
oc whoami

# リソース一覧（推論）
oc get inferenceservice
oc get pods

# 失敗調査：イベントとログ
oc describe inferenceservice <name>
oc logs deploy/<serving-deploy-name> -c <container-name>
```

---

## 14. デプロイメント・チェックリスト（実行前に潰す）

![ESA14.本アーキテクチャがもたらすビジネス価値](/images/LLM/ESA14.本アーキテクチャがもたらすビジネス価値.jpg)

### チェック項目（そのままレビューに使える）

* **Storage**

  * [ ] ベースモデルはPVCにある（容量・アクセスモードOK）
  * [ ] アダプタはMinIOにあり、階層が正しい（`adapter_config.json` が見える）
* **Runtime**

  * [ ] `--enable-lora` が入っている
  * [ ] `--max-loras` / `--max-lora-rank` が要件に合う
  * [ ] `gpu-memory-utilization` に余白がある
* **Network / Security**

  * [ ] HTTPS Routeがある
  * [ ] Trusted CAが適用され、MinIOへのTLSが通る
  * [ ] S3資格情報はSecret管理
* **Client**

  * [ ] `model` 指定が `<base>:<adapter>` 形式で統一されている
  * [ ] “使ってよいアダプタ”の制御ポイント（API Gateway / RBAC）がある

---

## 15. 結論：OpenShift AI + vLLMで「Private AI Kitchen」を実現する

![ESA15.成功へのチェックリスト](/images/LLM/ESA15.成功へのチェックリスト.jpg)

### 図の要旨

* OpenShift AI + vLLM により、モノリシックLLMを **柔軟なマルチテナント基盤**へ変換できる
* 次の現実的ステップは以下

  1. ベースモデルの配置（PVC）
  2. アダプタAPIテスト（MinIO + 動的指定）
  3. llm-d等の分散構成（必要になったら）

### 最後に（運用のコツ）

* “まず動く最小構成”を固めると、以降のチューニングが速い

  * ベース単体起動 → 1アダプタだけ追加 → APIで指定 → アダプタを増やす

---

# 付録A：図解まとめ（添付3）

## A.1 構成要素とファイル構造（左側）

* **Base Model（PVC）**：重いのでPVCに配置（高速・安定）
* **LoRA Adapter（S3/MinIO）**：軽いのでオブジェクトストレージへ
* 必須ファイル：`adapter_config.json` / `adapter_model.safetensors`

## A.2 デプロイ・ワークフロー（右側）

* GUIでベースモデルをデプロイ → **YAML編集でLoRA有効化**
* 重要フラグ

  * `--enable-lora`
  * `--max-loras`
  * `--max-lora-rank`

## A.3 実務Tips

* `max-loras` を増やす前に、まず **KV cache（長文要件）** を満たせるか確認
* rank不一致は “一見わかりづらい失敗” になりやすいので、学習時メタ情報（rank）を台帳化

---

# 付録B：よく使うコマンド集（閉域網・OpenShift運用）

## B.1 OpenShift（oc）

```bash
oc get pods -o wide
oc get inferenceservice
oc get routes
oc describe pod <pod>
oc logs <pod> -c <container> --tail=200
oc get events --sort-by='.lastTimestamp'
```

## B.2 S3/MinIO（aws cli）

```bash
aws s3 ls
aws s3 ls s3://my-bucket/adapters/ --recursive
aws s3 cp ./adapter/ s3://my-bucket/adapters/sql-adapter/ --recursive
```

## B.3 疎通確認（curl）

```bash
# 推論エンドポイント疎通（TLS/Route/認証の切り分け）
curl -vk https://<your-endpoint>/v1/models
```

* `-v`：どこで失敗したか（DNS/TLS/HTTP）を可視化
* `-k`：証明書検証を一時的に無効化（※原因切り分け用途。恒久対策ではない）

---

# 用語ミニ辞典（迷子防止）

* **OpenShift AI（RHOAI）**：OpenShift上でML/LLMを扱うための統合機能群（Model Serving等）
* **KServe / InferenceService**：Kubernetes上で推論サービスを表す仕組み・リソース
* **ServingRuntime**：推論サーバ（vLLM等）を起動するランタイム定義
* **Route**：OpenShiftのL7入口（HTTPS終端ポイント）
* **Trusted CA**：社内CA/自己署名証明書を“正規”として信頼させるためのルート証明書束
* **KV cache**：長文推論のための内部キャッシュ（長くするほどVRAM消費）
* **TTFT**：最初のトークンが返るまでの時間（体感速度）

```


::contentReference[oaicite:2]{index=2}
```

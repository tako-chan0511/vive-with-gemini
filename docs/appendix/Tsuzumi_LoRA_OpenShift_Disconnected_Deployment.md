# プライベートAIキッチン：完全閉域網でのOpenShift AI×vLLMデプロイ
## description: 外部接続なし（air-gapped）環境で、OpenShift AI と vLLM を用いて NTT版LLM「tsuzumi」を安全に提供・評価・拡張するための“レシピ”を1枚ずつ解説

## この資料の読み方（最重要）

完全閉域網（air-gapped）では、普段“当たり前”に使っている以下が **使えません**。

* `docker pull` / `pip install` / Hugging Face からのモデル取得
* `quay.io` / `registry.redhat.io` など外部レジストリ参照
* 外部DNS・外部証明書チェーン前提の通信

その代わりに、**社内で完結する3点セット**を設計します。

1. **内部レジストリ**（必要なコンテナイメージを格納）
2. **内部オブジェクトストレージ（MinIO等）**（LoRAアダプタ等の保管）
3. **PVC等の永続ストレージ**（巨大なベースモデルを配置）

> 合言葉：外部に依存しない「自給自足」＝Sovereign AI（主権AI）

---

# 1. 表紙：プライベートAIキッチンとは

![LoRA1.OpenShiftAIでのLoRAデプロイ：完全解説マニュアル](/images/LLM/LoRA1.OpenShiftAIでのLoRAデプロイ：完全解説マニュアル.jpg)

## 図の要旨

* 完全閉域網（外部接続なし）で **OpenShift AI × vLLM** を動かし、NTT版LLM「tsuzumi」を提供する
* “課題（ハズ）”と“設定（レシピ）”を、現場で再現できる形で整理する

## 用語（超基礎）

* **OpenShift AI**：OpenShift上で、AI/MLの開発・配備・推論を運用するための基盤（RHOAI）
* **vLLM**：LLM推論を高効率化する推論エンジン（GPU効率・同時処理に強い）
* **air-gapped（完全閉域網）**：インターネット到達性が物理/論理的に遮断された環境

## Tips（実務）

* “動けばOK”ではなく、**運用継続（更新・監査・障害対応）**までがゴールです。以降のページは、そのための部品分解になっています。

---

# 2. 「閉ざされた厨房」の掟：完全閉域網（air-gapped）とは

![LoRA2.ミッション：完全閉域網でのSovereignAI構築](/images/LLM/LoRA2.ミッション：完全閉域網でのSovereignAI構築.jpg)

## 図の要旨

* **制約（Constraint）**：外部（AWS/Hugging Face/Docker Hub等）にアクセス不可
* **目的（Goal）**：データ主権（Sovereign AI）と高いセキュリティ（漏洩しない設計）
* **課題（Challenge）**：

  * `pip install` や `docker pull` ができない
  * モデル重み（weights）の持ち込みが手動になりやすい
  * “食材（データ）”と“調味料（イメージ）”の搬入設計が必須

## 用語（超基礎）

* **データ主権（Sovereignty）**：データが社外に出ない/社内統制下にある状態
* **MITM/検査（SSLインスペクション）**：閉域網でよくある「通信を検査して再暗号化」

## Tips（実務）

* 閉域網は「禁止」が多い分、**“持ち込む物（モデル/イメージ/証明書）”を先に棚卸し**しておくと、後工程の手戻りが激減します。

---

# 3. 本日のメイン食材：NTT版LLM「tsuzumi」

![LoRA3.全体アーキテクチャ：「時給自足のレストラン」](/images/LLM/LoRA3.全体アーキテクチャ：「時給自足のレストラン」.jpg)

## 図の要旨

* tsuzumi（軽量）と、巨大モデル（例：70B級）を比較し、閉域網での現実解として **軽量モデル＋効率運用**を推す
* tsuzumiの狙い：

  * 小さめGPUでも動きやすい
  * 日本語に強い
  * LoRAで安価にカスタムしやすい

## 用語（超基礎）

* **パラメータ（B：Billion）**：モデル規模。大きいほど高精度傾向だが、GPU/コスト/遅延が重い
* **トークナイザ**：文章をモデルが扱う単位（トークン）へ分割する仕組み（日本語の精度に直結）
* **LoRA（Low-Rank Adaptation）**：ベースモデルを固定しつつ、少量パラメータで追加学習（アダプタ）する手法

## Tips（実務）

* 閉域網では「最強モデル」より「**安定して回るモデル**」が勝ちます。特に運用で効くのは、**VRAM要件・同時処理・更新手順**です。

---

# 4. 厨房の設計図：オフライン・アーキテクチャの全貌

![LoRA4.Step1：コンテナイメージのミラーリング](/images/LLM/LoRA4.Step1：コンテナイメージのミラーリング.jpg)

## 図の要旨（全体像）

* インターネットは **Forbidden**
* 外部と接続できる踏み台（Bastion）で資材を準備し、**Manual Transfer**で閉域側へ搬入
* 閉域側（Disconnected Environment）に置くべきもの：

  * **Internal Registry（内部レジストリ）**：コンテナイメージ置き場
  * **MinIO Storage（モデル/アダプタ置き場）**
  * **OpenShift AI Cluster + GPU Nodes/vLLM**：推論実行基盤

## 用語（超基礎）

* **内部レジストリ**：社内で `docker pull` 相当を成立させるための“倉庫”
* **MinIO**：S3互換のオブジェクトストレージ（閉域網で作りやすい）
* **GPU Node**：推論の計算資源。H100等は性能が高いが共有設計が必須

## Tips（実務）

* 「モデルを置けた」だけでは失敗します。閉域では特に、**(1)イメージ、(2)モデル、(3)証明書**の3点が揃って初めて動きます。

---

# 5. Step1：食材庫の確保（MinIO / Data Connection）

![LoRA5.Step2：ハイブリッドストレージ戦略](/images/LLM/LoRA5.Step2：ハイブリッドストレージ戦略.jpg)

## 図の要旨

* Hugging Faceへアクセスできないため、社内S3相当（MinIOまたはODF）を用意する
* OpenShift AIの「Data Connection」で、推論/学習が参照できるS3エンドポイントを登録する
* 主な用途：

  * LoRAアダプタ（“味変スパイス”）の保管
  * 推論サーバが参照する `s3://` 経路の提供

## 用語（超基礎）

* **Data Connection**：OpenShift AI側に「このS3（MinIO）に繋ぐ」設定を登録する仕組み
* **Access Key / Secret Key**：S3接続の認証情報（漏洩対策が必須）

## 実務手順（行動指針）

* Data Science Project作成後、`Add Data Connection` から

  * Endpoint（例：`https://minio.example.local`）
  * Bucket名
  * Access/Secret Key
    を登録する

## Tips（実務）

* MinIOは“動けばOK”に見えますが、後で詰まるのは **証明書（自己署名）** と **権限（バケットポリシー）**です。後半Step4で回収します。

---

# 6. Step2：道具の搬入（イメージ・ミラーリング）

![LoRA6.実践：ベースモデルのPVCへの配慮](/images/LLM/LoRA6.実践：ベースモデルのPVCへの配慮.jpg)

## 図の要旨

* OpenShiftが外部レジストリ（`registry.redhat.io` / `quay.io`）に届かない
* **oc-mirror / oc image mirror** を使い、必要イメージを内部レジストリへ複製する
* 例：vLLM runtime、GuideLLM（ベンチ/評価）

## コマンド解説：`oc image mirror`

図の例（概念）：

```bash
oc image mirror quay.io/modh/vllm:<tag> internal-registry.local/vllm:<tag>
```

### 何をしている？

* 左：取得元（外部） `quay.io/...`
* 右：格納先（内部） `internal-registry.local/...`
* つまり「閉域内で `pull` できる形にコピー」しています

### 実務の注意（よくある詰まり）

* 内部レジストリの名前解決（DNS）が必要
  例：`image-registry.openshift-image-registry.svc` のような内部DNS名が前提になることがある
* タグ揃えが重要：**ServingRuntimeで参照するイメージタグ**と一致させる

## Tips（実務）

* “必要イメージ一覧”を最初に固定すると最強です（vLLM, KServe関連, 評価ツール, 周辺サイドカー等）。
  後から増えると、閉域搬入の手続きが重くなります。

---

# 7. Step3：冷蔵庫の整理（ハイブリッド・ローディング）

![LoRA7.Step3：ServingRuntime（ｖLLM）の定義](/images/LLM/LoRA7.Step3：ServingRuntime（ｖLLM）の定義.jpg)

## 図の要旨

* **ベースモデル（tsuzumi-7b等）は巨大** → 事前にPVCへコピーし、vLLM Podにローカルマウント（例：`/mnt/models`）
* **LoRAアダプタは小さく種類が多い** → MinIO（Data Connection）から動的に読み込み
* “巨大は冷凍庫（PVC）／小分けはスパイスラック（MinIO）”という分担

## コマンド解説（図の左上の意図）

図には、以下のような準備系コマンドが描かれています（目的の理解が重要です）。

* `mkdir -p ...`：ディレクトリ作成（モデルを置く場所を作る）
* `chmod 777 ...`：権限調整（Pod内ユーザーが書けない問題を避けるための“緩め”設定）
* `chcon -t container_file_t ...`：SELinuxコンテキスト調整（OpenShift系でよく詰まる）

> **重要**：`chmod 777` は強い権限なので、本番では **SecurityContext / fsGroup / SCC** 側で適切に解くのが理想です（ただ、検証初期は切り分け優先で一時的に緩めることがあります）。

## Tips（実務）

* 失敗あるある：

  * PVCは見えているのに **権限/SELinuxで読めない**
  * MinIOは繋がるのに **証明書で落ちる**
* 以降のStep4で、証明書とRouteを整えます。

---

# 8. シェフの指名：vLLM と ServingRuntime（YAML）

![LoRA8.Step4：InferenceServiceの作成](/images/LLM/LoRA8.Step4：InferenceServiceの作成.jpg)

## 図の要旨

* vLLM採用理由：PagedAttentionで **VRAM断片化を抑え、限られたGPU資源を最大化**
* ServingRuntime（YAML）の重要点：

  * **オフライン前提の環境変数**をセット（外部へ取りに行かない）
  * **参照イメージは内部レジストリのもの**（Step2でミラー済み）

## 用語（超基礎）

* **ServingRuntime**：KServeが「このモデルはこの実行環境で動かす」と定義するランタイム
* **TRANSFORMERS_OFFLINE**：Transformersが外部へ取りに行かないようにするフラグ
* **HF_DATASETS_OFFLINE**：datasetsの外部アクセス抑止

## YAMLの考え方（オフライン必須の設定）

例（概念）：

```yaml
env:
  - name: TRANSFORMERS_OFFLINE
    value: "1"
  - name: HF_DATASETS_OFFLINE
    value: "1"
```

## Tips（実務）

* “なぜ勝手に外へ出ようとする？”の正体は、だいたい以下です。

  * tokenizer/configを外部から補完しようとする
  * dataset/metricsを外部から取ろうとする
    → **オフライン環境変数**で「外へ行く選択肢」を潰すのが基本戦略です。

---

# 9. レシピの記述：InferenceService（YAML）

![LoRA9.重要設定：閉域網でのSSL証明書信頼](/images/LLM/LoRA9.重要設定：閉域網でのSSL証明書信頼.jpg)

## 図の要旨

InferenceServiceで、次を同時に指定して“料理”を成立させます。

* **PVCパス**：ベースモデル置き場（冷凍庫）
* **LoRA有効化**：味変を許可（スパイス）
* **MinIO（S3）パス**：LoRAアダプタ置き場（食材庫/パントリー）

## YAMLの読み方（重要フィールド）

図のイメージ（概念）：

```yaml
apiVersion: serving.kserve.io/v1beta1
kind: InferenceService
metadata:
  name: tsuzumi-lora
spec:
  predictor:
    model:
      modelFormat:
        name: vLLM
      args:
        - "--model=/mnt/models/tsuzumi-base"
        - "--enable-lora"
      storageUri: "s3://<bucket>/<lora-adapter-path>"
```

### それぞれ何を意味する？

* `modelFormat: vLLM`：この推論はvLLMランタイムで動く
* `--model=...`：ベースモデルのローカル配置先（PVCマウント）
* `--enable-lora`：LoRAアダプタ適用を許可
* `storageUri: s3://...`：LoRAアダプタをS3互換ストレージから取得（MinIO）

## Tips（実務）

* “動いたのにLoRAが効かない”場合、まず疑うのはここです：

  * `--enable-lora` の指定漏れ
  * `storageUri` のパス誤り（バケット/プレフィックス）
  * Data Connection（認証情報）の適用先が違う

---

# 10. Step4：配膳ルートの確保（証明書と Route）

![LoRA10.デプロイ実行とステータス確認](/images/LLM/LoRA10.デプロイ実行とステータス確認.jpg)

## 図の要旨

* 閉域網あるある：「オレオレ証明書（自己署名CA）」で、MinIOや内部レジストリへHTTPS接続できずエラー
* 解決：

  1. OpenShiftの **Trusted CA Bundle** をPodへ注入して信頼させる
  2. 外部公開する場合は **Service + Route** でHTTPSアクセス経路を作る

## 用語（超基礎）

* **自己署名証明書（Self-signed CA）**：社内で独自に発行したCA。クライアントが信頼しないとTLSで落ちる
* **Route（OpenShift）**：外部向けHTTP(S)公開のためのルーティング機構（Ingress/Router）

## 実務ポイント（チェック項目の意味）

* `ConfigMapに社内証明書を追加`：CA証明書を束ねて配布する形
* `InferenceServiceで trustedCABundle を参照`：推論PodがそのCAを使って外部（MinIO等）を信頼する

## Tips（実務）

* 「MinIOに繋がらない」の半分は **証明書**、もう半分は **名前解決/DNS** です。
  先に `curl` で証明書エラーかどうか切り分けると速いです（次ページ）。

---

# 11. 味見（動作確認）：Pod内部からの curl テスト

![LoRA11.推論実行：Multi-LoRAリクエスト](/images/LLM/LoRA11.推論実行：Multi-LoRAリクエスト.jpg)

## 図の要旨

* 外部公開（Route）する前に、**Pod内部からローカルAPIを叩いて生存確認**する
* `PASS` が付けば、推論サーバ自体（vLLM）が動いている可能性が高い

## コマンド解説：`curl -X POST ... /v1/chat/completions`

図の例（概念）：

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -d '{
    "model": "tsuzumi",
    "messages": [{"role":"user","content":"こんにちは"}]
  }'
```

### 何をしている？

* `-X POST`：POSTメソッドで送る（APIにデータを投げる）
* `-d '...json...'`：リクエストボディ（JSON）
* `messages`：チャット形式の入力

  * `role: user`：ユーザー発話
  * `content`：本文

### 返ってくるJSONの読み方（超基礎）

* `choices[0].message.content`：生成された回答テキストが入るのが一般的
* `id`：リクエスト識別子（ログ/トレースに使う）

## Tips（実務）

* ここで成功して、Route越しで失敗する場合は、犯人がほぼ **Route/TLS/認証/ネットワーク**側に絞れます。切り分けの起点として最強です。

---

# 12. 品質管理：GuideLLM による完全オフライン評価

![LoRA12.性能検証：GuideLLMによるベンチマーク](/images/LLM/LoRA12.性能検証：GuideLLMによるベンチマーク.jpg)

## 図の要旨

* GuideLLMは、オフラインでも評価できる（データセット内蔵・ネイティブトークナイザ活用）
* 指標（SLO例）：

  * **TTFT（Time To First Token）**：最初の1文字が出るまでの時間（体感性能に直結）
  * **TPS（Tokens Per Second）**：生成速度（処理能力の指標）

## 用語（超基礎）

* **SLO（Service Level Objective）**：サービス品質目標（例：TTFTは2秒以内）
* **TTFT**：ユーザーが「遅い」と感じる主要因になりやすい
* **TPS**：同時利用が増えたときの処理余力に効く

## Tips（実務）

* 閉域網は“速くする”より、まず **遅くなったときに原因が追える**ことが重要です。
  TTFT/TPSを定点観測できる形にすると、GPU不足・設定劣化を早期に掴めます。

---

# 13. メニューの拡張：Multi-LoRA アダプター（Hot-swapping）

![LoRA13.トラブルシューティングチェックリスト](/images/LLM/LoRA13.トラブルシューティングチェックリスト.jpg)

## 図の要旨

* ベースモデル（tsuzumi）をメモリ常駐（1回だけロード）
* リクエストに応じて、LoRAアダプタ（部門/用途別）を **瞬時に切替（Hot-swapping）**
* 効果：GPUメモリ節約、複数モデル常駐が不要

## 用語（超基礎）

* **Hot-swapping**：サービス停止せずに差し替え/切替する運用
* **アダプタ（Adapter）**：LoRAで追加学習した差分部品（用途別の“味付け”）

## Tips（実務）

* 企業では「部門ごとに言い回し・禁止事項・フォーマット」が違います。
  Multi-LoRAは、**1基盤で多様な“社内AI”を提供**する際の現実解になりやすいです。

---

# 14. デプロイ・チェックリスト（まとめ）

![LoRA14.導入効果のまとめ](/images/LLM/LoRA14.導入効果のまとめ.jpg)

## 図の要旨

閉域網デプロイが通るかは、最後はこのチェックで決まります。

1. **モデル倉庫**：MinIOは稼働？ LoRAはアップ済み？
2. **イメージ搬入**：vLLMイメージは内部レジストリにある？ パスは正しい？
3. **ベースモデル**：PVC（例：`/mnt/models`）にtsuzumi本体を配置した？
4. **オフライン設定**：`TRANSFORMERS_OFFLINE=1` 等を設定した？
5. **証明書**：社内CAバンドルを適用できている？

> これが全部「Yes」なら、閉域網AIサービスは成功する。

## Tips（実務）

* 失敗時は、上から順に潰すと復旧が早いです。
  特に **(2)イメージ** と **(5)証明書** は見落としが多い“地雷”です。

---

# 15. 結論：Sovereign AI（主権AI）の実現

![LoRA15.参考リソース](/images/LLM/LoRA15.参考リソース.jpg)

## 図の要旨

* **Security**：データは社外に出さない（漏洩リスクを構造で潰す）
* **Sustainability**：軽量モデル（tsuzumi）×効率エンジン（vLLM）でコスト最小化
* **Autonomy**：外部クラウド依存を減らし、真の“自給自足AI基盤”へ
* OpenShift AI × vLLM の組み合わせが、エンタープライズ品質の「プライベートAIキッチン」を実現する

## 最後のTips（実務）

* 主権AIは「技術」だけでなく「運用設計」です。
  次の3点が揃うと、継続運用に強くなります。

  * **搬入手順の標準化**（イメージ/モデル/証明書）
  * **評価の定常化**（TTFT/TPSのSLO）
  * **分離と統制**（Namespace/権限/監査ログ）

---

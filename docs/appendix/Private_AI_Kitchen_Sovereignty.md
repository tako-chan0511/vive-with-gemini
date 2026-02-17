# プライベートAIキッチン：完全閉域網での OpenShift AI × vLLM デプロイ（Sovereignty）
## description: Air-gapped（完全閉域網）で、モデル・コンテナ・証明書を“持ち込み”運用しつつ、OpenShift AI と vLLM で推論基盤を立ち上げる実務ガイド
outline: deep


## 1. 表紙：プライベートAIキッチンとは（差し込み：page_01）

![PrAI1.プライベートAIキッチン：完全閉域網でのOpenShiftAI×vLLMデプロイ](/images/LLM/PrAI1.プライベートAIキッチン：完全閉域網でのOpenShiftAI×vLLMデプロイ.jpg)

### 図の要旨
- 完全閉域網（インターネット非接続）で、**OpenShift AI** と **vLLM** を使って推論基盤を構築する。
- “キッチン”は比喩で、**モデル（食材）**・**Runtime（調理器具）**・**運用（衛生管理）**を「閉域で完結」させる。

### 詳細解説（用語）
- **閉域網 / Air-gapped**：外部インターネットに出られない（物理/論理的に遮断された）環境。  
  便利な反面、「外部から取ってくる」ができないため、**持ち込み手順**が設計の中心になる。
- **OpenShift AI**：OpenShift 上で、モデル運用・ノートブック・推論（KServe等）を扱うための基盤。
- **vLLM**：LLM 推論を高速化するサーバ（OpenAI互換API風に提供しやすい）。GPU効率化に強い。

### Tips（実務）
- 最初に決めるべきは「**何を持ち込むか**」です。  
  1) コンテナイメージ（vLLM 等） 2) モデル重み（ベースモデル） 3) 追加差分（LoRA等） 4) ルート証明書（社内CA）  
  これが揃わないと後工程は必ず詰まります。

---

## 2. なぜ難しいか：完全閉域網の制約（差し込み：page_02）

![PrAI2.「閉ざされた厨房」の掟：完全閉域網（Air-Gapped）とは](/images/LLM/PrAI2.「閉ざされた厨房」の掟：完全閉域網（Air-Gapped）とは.jpg)

### 図の要旨
- “いつもの手順”（docker pull / pip install / Hugging Face から download）が封じられる。
- 成功の鍵は、**外部依存を断ち切った運用設計**（オフライン前提）に切り替えること。

### 詳細解説（何が起きる？）
- **docker pull が失敗**：Docker Hub / Quay / ECR 等へ出られない。
- **モデルDLが失敗**：Hugging Face など外部リポジトリへ出られない。
- **証明書で失敗**：閉域やプロキシ環境では、社内CAやSSLインスペクションの影響で TLS が失敗しがち。

### Tips（実務）
- 失敗の原因はだいたいこの3種類に収束します：
  1) **通信不可**（経路/プロキシ/遮断）  
  2) **証明書不可**（社内CA未信頼）  
  3) **オフライン未対応**（ツールが外に取りに行く）  
- 以降の章は、この3つを順番に潰す構成です。

---

## 3. 食材選定：tsuzumi を選ぶ理由（差し込み：page_03）

![PrAI3.本日のメイン食材：NTT版LLM「tsuzumi」](/images/LLM/PrAI3.本日のメイン食材：NTT版LLM「tsuzumi」.jpg)

### 図の要旨
- 閉域運用では「**軽量・運用しやすいモデル**」が価値になる。
- tsuzumi のような軽量モデルは、GPU/電力/運用コスト面で有利になりやすい。

### 詳細解説（観点）
- **モデルサイズ（パラメータ数）**：大きいほど一般に性能は出やすいが、GPUメモリ・推論コストが増える。
- **日本語最適化**：日本語データやトークナイザ最適化があると、同サイズでも実務精度が上がることがある。
- **LoRA（後述）**：ベースモデルは軽量にし、用途ごとの差分をLoRAで持つ設計が「閉域向き」。

### Tips（実務）
- 閉域は「スケールよりも**再現性**」。  
  “毎回同じ手順で、同じモデルが上がる”ことが最重要です。モデル更新は、検証→持ち込み→切替を手順化しましょう。

---

## 4. 全体アーキテクチャ：持ち込み導線（差し込み：page_04）

![PrAI4.厨房の設計図：オフラインアーキテクチャの全貌](/images/LLM/PrAI4.厨房の設計図：オフラインアーキテクチャの全貌.jpg)

### 図の要旨
- インターネットが無いので、外部資材（イメージ/モデル/証明書）を**別ルートで搬入**する必要がある。
- 搬入先は主に 2つ：  
  1) **内部レジストリ**（コンテナイメージ保管）  
  2) **内部ストレージ**（モデル・LoRA・データ保管）

### 詳細解説（部品）
- **内部コンテナレジストリ**：OpenShift の内部レジストリや社内レジストリ。  
  ここに vLLM のイメージを“ミラー”する。
- **内部S3/オブジェクトストレージ**：MinIO 等。LoRAや評価データ等の置き場。
- **PVC（PersistentVolumeClaim）**：Kubernetesの永続ボリューム要求。ベースモデルの配置でよく使う。

### Tips（実務）
- “搬入したはずなのに使えない”の典型は、**参照URL/パスの不一致**です。  
  - イメージ：`<internal-registry>/<project>/<image>:<tag>` が合っているか  
  - モデル：Pod内のマウント先 `/mnt/models/...` が合っているか  
  - S3：endpoint/bucket/path/credential が合っているか

---

## 5. Step1：パントリーを用意（MinIO / Data Connection）（差し込み：page_05）

![PrAI5.Step1：食材庫の確保（MinIO＆DataConnection）](/images/LLM/PrAI5.Step1：食材庫の確保（MinIO＆DataConnection）.jpg)

### 図の要旨
- “食材倉庫”として、閉域内に **MinIO（S3互換）** を用意し、OpenShift AI から参照できるようにする。
- OpenShift AI の UI では「**Data Connection**」として登録するのが基本。

### 詳細解説（何を設定する？）
- **Endpoint**：MinIO のURL（例：`http(s)://minio.<domain>`）
- **Bucket**：LoRAアダプタや評価データを置くバケット
- **Access Key / Secret Key**：S3アクセス用の認証情報
- **TLS**：https の場合は証明書（社内CA）信頼が必要になる（後章）。

### Tips（実務）
- まず最初に「疎通」だけ確認：  
  - Pod内から `curl` / `wget` で MinIO に到達できるか  
  - もしくは `aws s3 ls --endpoint-url ...`（使える場合）  
- “UIで登録できる＝実際にPodから使える”とは限りません（DNS/NetworkPolicy/Route の差）。

---

## 6. Step2：調理器具を持ち込む（vLLMイメージをミラー）（差し込み：page_06）

![PrAI6.Step2：道具の搬入（イメージミラーリング）](/images/LLM/PrAI6.Step2：道具の搬入（イメージミラーリング）.jpg)

### 図の要旨
- vLLM のコンテナイメージを、外部（例：Quay）から閉域内レジストリへ **ミラー（コピー）** する。
- 以降のデプロイは、**内部レジストリのイメージ**だけを参照する。

### 詳細解説（コマンドの意味）
代表例（※値は環境に合わせて置換）：
```bash
# 外部 → 内部 へイメージをミラーする（例）
oc image mirror \
  quay.io/modh/vllm:<tag> \
  <internal-registry>/<project>/vllm:<tag>
````

* `oc image mirror`：OpenShift のクライアントで、イメージを別レジストリへコピーする機能。
* `quay.io/...`：外部レジストリ側の“元イメージ”。
* `<internal-registry>/...`：閉域側の“宛先イメージ”。

#### 事前に必要になりがちなこと

* 外部レジストリへ出られない環境では、**ミラーは“搬入口のある場所”**（踏み台/中継/持ち込み端末）で実施します。
* レジストリ認証が必要：

  * `podman login quay.io`
  * `podman login <internal-registry>`
  * または OpenShift の認証トークンでログインする手順

### Tips（実務）

* “タグ”は固定して運用するのが安全です（`latest`運用は再現性が落ちます）。
* ミラー後は、OpenShift 側で `ImageStream` を使う/使わないを統一すると事故が減ります。

---

## 7. Step3：冷凍庫に食材を置く（ベースモデルをPVCへ）（差し込み：page_07）

![PrAI7.Step3：冷蔵庫の整理（ハイブリッドローディング）](/images/LLM/PrAI7.Step3：冷蔵庫の整理（ハイブリッドローディング）.jpg)

### 図の要旨

* ベースモデル（重みファイル）は大容量になりやすいので、**PVCに配置**して Pod からマウントする。
* “閉域”では、モデルが外へ取りに行けないため、**最初からローカルに存在**させる設計が前提。

### 詳細解説（何をする？）

* 例：ノードや共有ストレージにディレクトリを作成してモデルを配置し、Podへマウントする。

```bash
# 例：モデル用ディレクトリを作り、権限を整える（環境により要調整）
mkdir -p /var/models/download
chmod 777 /var/models/download

# SELinux有効な環境で、コンテナから読めない時に必要になることがある
chcon -t container_file_t /var/models/download
```

* `chmod 777`：手っ取り早いが強すぎる権限。実運用は最小権限へ。
* `chcon`：SELinux のラベル付け。**“権限があっても読めない”**時の典型解。

### Tips（実務）

* モデル配置の失敗はログに出にくいことがあります。
  まずPod内で `ls -lah /mnt/models`（マウント先）を確認して「見えているか」を最短で見に行くのがコツです。
* “容量不足”も頻出です：PVCのサイズ見積りはモデルサイズ＋余裕（更新/展開）込みで。

---

## 8. Step3.5：オフライン動作を強制（ServingRuntimeの環境変数）（差し込み：page_08）

![PrAI8.シェフの指名：vLLMとServingRuntime](/images/LLM/PrAI8.シェフの指名：vLLMとServingRuntime.jpg)

### 図の要旨

* vLLM（および背後のtransformers等）が、外部へアクセスしようとする動きを**止める**。
* `TRANSFORMERS_OFFLINE=1` などで、**“外に出ようとして失敗→起動失敗”**を防ぐ。

### 詳細解説（なぜ必要？）

* LLM周辺ライブラリは、次を“自動取得”しようとすることがあります：

  * tokenizer / config / 追加ファイル
  * キャッシュ未存在時のダウンロード
* 閉域ではこれが致命傷になるため、**起動前に禁止**しておきます。

例（ServingRuntime / Pod env のイメージ）：

```yaml
env:
  - name: TRANSFORMERS_OFFLINE
    value: "1"
  - name: HF_DATASETS_OFFLINE
    value: "1"
```

### Tips（実務）

* “オフライン設定を入れたら別のエラーが出た”は正常です。
  それは「外部依存が露見した」状態なので、必要ファイルをPVCへ事前配置する方向に進めます。
* 併せてキャッシュディレクトリ（`HF_HOME` 等）をPVCへ寄せると再現性が上がります。

---

## 9. Step4：メニューを公開（InferenceService / KServe）（差し込み：page_09）

![PrAI9.レシピの記述：InferenceService（YAML）](/images/LLM/PrAI9.レシピの記述：InferenceService（YAML）.jpg)

### 図の要旨

* KServe の `InferenceService` で、**推論エンドポイント**を作る。
* `--enable-lora` 等の引数で、LoRAアダプタ運用へ対応する（後述）。

### 詳細解説（KServe / InferenceService）

* **KServe**：Kubernetes 上でモデル推論を提供する仕組み（推論サーバを標準化して立てる）。
* **InferenceService**：推論サービスの定義。どのRuntimeで、どのモデルで、どう公開するかを書く。

例（概念の読み方）：

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
```

* `--model=...`：Pod内のモデル配置場所（PVCマウント先）を指定。
* `--enable-lora`：LoRAアダプタ差し替え運用を有効化（vLLM側機能）。

### Tips（実務）

* まずは LoRA 抜きで「ベースモデルだけ」で起動確認すると切り分けが楽です。
  起動が安定してから LoRA を足すのが安全ルートです。

---

## 10. Step5：証明書（社内CA）を信頼させる（差し込み：page_10）

![PrAI10.Step4：配膳ルートの確保（証明書とRoute）](/images/LLM/PrAI10.Step4：配膳ルートの確保（証明書とRoute）.jpg)

### 図の要旨

* 閉域の “https” では、社内CA（自己署名/社内ルート）の信頼が必須になりがち。
* vLLM Pod / KServe Pod が **社内CAを信頼**しないと、S3（MinIO）や社内APIで失敗する。

### 詳細解説（何が起きている？）

* 典型エラー：

  * `x509: certificate signed by unknown authority`
  * `SELF_SIGNED_CERT_IN_CHAIN`
* 対策の方向性は2つ：

  1. **クラスタ全体**で社内CAを信頼（推奨：運用統一）
  2. **対象Podだけ**にCAを注入（影響範囲を限定）

### Tips（実務）

* “一時しのぎ”の `-k/--insecure` は、閉域AI運用では事故の元です（本番手順に混ざると致命的）。
  正攻法で CA を信頼させる手順を確立しましょう。
* Route で外部公開する場合も、証明書（edge/reencrypt/passthrough）方式を決めて統一が重要です。

---

## 11. Step6：味見（Pod内でcurl疎通テスト）（差し込み：page_11）

![PrAI11.味見（動作確認）：Pod内部からのCurlテスト](/images/LLM/PrAI11.味見（動作確認）：Pod内部からのCurlテスト.jpg)

### 図の要旨

* まずは Pod 内 `localhost` で叩き、**ネットワーク要因を排除**して推論が動くか確認する。
* vLLM は OpenAI互換に近い形で `/v1/chat/completions` を提供できる。

### 詳細解説（コマンドの意味）

例（概念）：

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tsuzumi",
    "messages": [
      {"role":"user","content":"こんにちは"}
    ]
  }'
```

* `localhost:8000`：Pod内で動く vLLM サーバのポート（環境により変動）。
* `messages`：チャット形式。`role=user/assistant/system` の形式が多い。
* 戻り値：`choices[0].message.content` あたりに生成文が入ることが多い。

### Tips（実務）

* 先に Pod に入る：

  * `oc -n <ns> get pods`
  * `oc -n <ns> rsh <pod>`
  * `curl localhost...`
* これで動けば、次は Service / Route / Ingress 側の問題に切り分けできます。

---

## 12. 品質とガードレール：閉域でも“安全運用”する（差し込み：page_12）

![PrAI12.品質管理：GuideLLMによる完全オフライン評価](/images/LLM/PrAI12.品質管理：GuideLLMによる完全オフライン評価.jpg)

### 図の要旨

* 閉域AIは「出せたら終わり」ではなく、**品質（性能/安全）を継続的に担保**する必要がある。
* Guardrails（禁止・抑制）と、評価（ベンチ/回帰）をセットで回す。

### 詳細解説（考え方）

* **Guardrails**：出力の禁止/制限（例：個人情報、規約違反、危険手順など）

  * 実装は「プロンプト規約」「出力フィルタ」「ポリシー判定」など複数層がある。
* **性能指標（例）**

  * **TTFT**：Time To First Token（最初の1トークンが返るまでの時間）
  * **TPS**：Tokens Per Second（生成速度）
  * **同時接続**：スループット・待ち行列がどう増えるか

### Tips（実務）

* “閉域”の評価は、外部ベンチを回せないことがあるため、**評価データも持ち込み**が必要です。
* 変更点（モデル/LoRA/ランタイム/証明書/ノード）ごとに、最低限の回帰テスト（同一質問セット）を用意すると事故が減ります。

---

## 13. 省メモリ運用：Multi-LoRAで“レシピだけ差し替え”（差し込み：page_13）

![PrAI13.メニューの拡張：Multi-LoRAアダプター](/images/LLM/PrAI13.メニューの拡張：Multi-LoRAアダプター.jpg)

### 図の要旨

* 1つのベースモデルを常駐させ、用途ごとの差分（LoRA）だけを切り替えると効率が良い。
* 閉域で複数部門/複数用途を回すときに、GPU資源を節約しやすい。

### 詳細解説（LoRAとは）

* **LoRA（Low-Rank Adaptation）**：モデル全体を再学習せず、少量の追加パラメータで“癖”を付ける手法。
* ベースモデル（大）＋ LoRA（小）の組み合わせで、

  * 保管・配布が軽い
  * ロールバックが速い
  * 閉域の持ち込み運用に強い

### Tips（実務）

* “LoRAが効いていない”時は、次を疑う：

  1. LoRAファイルの配置場所（S3/PVC）
  2. vLLM 引数（`--enable-lora` 等）
  3. リクエスト側の指定方法（アダプタ名/IDの指定が必要な場合あり）
* 用途別に「LoRAの命名規約」と「適用手順」を決めると運用が安定します。

---

## 14. 最終チェックリスト：詰まりポイント総点検（差し込み：page_14）

![PrAI14.デプロイチェックリスト](/images/LLM/PrAI14.デプロイチェックリスト.jpg)

### 図の要旨

* 失敗の多くは「どこが欠けているか」の見落とし。
* 起動前にチェック項目を固定化し、障害時も同じ観点で切り分ける。

### 詳細解説（チェック項目例）

* **ストレージ（MinIO）**

  * Endpoint/DNS到達
  * バケット存在
  * 資格情報（Access/Secret）
* **イメージ**

  * 内部レジストリに目的tagがある
  * 参照先が “外部” になっていない
* **モデル**

  * PVCに重みが存在
  * Pod内のマウント先が合っている
* **オフライン**

  * `TRANSFORMERS_OFFLINE=1` 等が設定済み
* **証明書**

  * 社内CAが信頼されている（S3/社内APIへのTLSが通る）

### Tips（実務）

* 失敗時に最速で見るログ：

  * `oc -n <ns> describe pod <pod>`
  * `oc -n <ns> logs <pod> -c <container>`
* “起動直後に落ちる”場合は、環境変数/引数/マウント不備が多いです。

---

## 15. まとめ：Sovereignty（主権型AI）としての価値（差し込み：page_15）

![PrAI15.結論：SovereginAI（主権AI）の実現](/images/LLM/PrAI15.結論：SovereginAI（主権AI）の実現.jpg)

### 図の要旨

* 閉域でAIを回す価値は「セキュリティ」だけではなく、**運用主権**を持てること。
* “外部に依存しないAI”は、規制産業・重要インフラ・機微情報の現場で意味が大きい。

### 詳細解説（3つの軸）

* **Security（安全）**：データ・プロンプト・ログが外へ出ない。監査・統制がしやすい。
* **Sustainability（持続）**：軽量モデル＋差分運用で、GPU資源・電力・コストを抑えやすい。
* **Autonomy（自律）**：外部SaaS障害や契約変更の影響を受けにくい。自分たちで運用できる。

### Tips（実務）

* “主権”は「運用が回って初めて成立」します。

  * モデル更新手順（持ち込み→検証→切替→ロールバック）
  * 監視（GPU/レイテンシ/エラー率）
  * 事故対応（ログマスク/権限/手順）
    まで含めて整備すると、閉域AIは強い武器になります。

---

# 付録：LLMaaS アーキテクチャ参考図（差し込み：LLMaaS構成図）

![AIT16.LLMaaS構成図（NTTデータ）](/images/LLM/AIT16.LLMaaS構成図（NTTデータ）.jpg)

## 図の要旨

* **マルチテナント（Tenant）**を前提に、入口（API Gateway）と実行基盤（OpenShift AI）を分離している。
* テナント/プロジェクト単位で **Namespace分離**し、推論（KServe/vLLM）とガードレール（TrustyAI等）を“各区画に配置”する構造。

## 詳細解説（読み方：左→右）

### 1) 利用者（Tenant/Project）

* 左側の「Tenant1 ProjectA/B」「Tenant2 ProjectA」は、**利用組織・用途の単位**。
* それぞれの利用者が「同じLLM基盤」を使うが、**境界（分離）が必須**になる。

### 2) 入口：Kong API Gateway（門番）

* 中央左の Kong は、LLMへのリクエストを受ける **APIの玄関口**。
* 役割（代表例）：

  * 認証（APIキー/トークン）
  * レート制限（DoS・使いすぎ防止）
  * ルーティング（tenantごとの振り分け）
  * 監査ログ（誰が何を叩いたか）

> 閉域運用でも「認可されていない呼び出しを遮断」できるので、LLMの“共用”に必須級です。

### 3) 交通整理：Ingress Controller

* Gatewayの後ろに Ingress Controller があり、`/projectA` のようなパスで、各Namespaceへ振り分けるイメージ。
* “入口は共通、内部は分離”を成立させる重要部品。

### 4) 実行基盤：OpenShift / OpenShift AI（調理場）

* 右側の大枠が OpenShift クラスタ（Master/Infra/CPU/GPUノード）。
* 各プロジェクト（Namespace）に、以下が積み上がる：

  * **OpenShift AI**：AI運用の枠組み
  * **KServe**：推論サービス（InferenceService）
  * **vLLM**：モデルサーバ（高速推論）
  * **モデル（例：tsuzumi）**：実体の重み（PVC/ストレージ）

### 5) ガードレールと監視（安全運用の層）

* Namespace内の **TrustyAI Guardrails** は、出力の安全性・品質担保の位置づけ。
* クラスタ内の監視（Grafana等）は、

  * レイテンシ（TTFT/TPS）
  * エラー率
  * GPU利用率/メモリ
    を見て、SLO/SLA運用に繋げる。

### 6) GPUプール（右端：H100/B300等）

* GPUノードは高価なので、**共用プール化**しつつ、テナントの境界は Namespace/Quota/Policy で守る構成が多い。
* GPUの世代混在（H100/B300など）があるなら、

  * ノードセレクタ
  * リソース要求
  * スケジューリング方針
    を設計しないと性能がブレます。

## Tips（実務）

* マルチテナント基盤で事故が起きる典型は「境界の穴」です：

  * Namespace分離はしているが、Gateway側のルーティング/認可が甘い
  * 監査ログがテナント別に追えない
  * GPU/ノードの割り当てが曖昧で、性能クレームが起きる
* 逆に、**入口（Kong）× 分離（Namespace）× 推論（KServe/vLLM）× 監視**が揃うと、閉域でも“LLMをサービス化”できます。

```
```

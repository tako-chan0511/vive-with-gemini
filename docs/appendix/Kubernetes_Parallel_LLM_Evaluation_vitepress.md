# DeepEval on Kubernetes：スケーラブルなLLM評価アーキテクチャ（ページ別解説）
---
## 1. 全体像：DeepEval を Kubernetes で“テスト工場化”する
![De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ](/images/IaC/De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ.jpg)

### 図の要旨
- **DeepEval（LLM評価）** を“ワーカー”として多数起動し、**Kubernetes（Indexed Job）** でテストケースを分割して並列実行する「評価工場（Test Factory）」の全体像です。
- 左側は **テストデータセット** → 右側は **多数の評価Pod** → 下流で **結果集約（メトリクス集計）** という流れを表しています。

### 詳細解説（用語）
- **DeepEval**：LLMアプリの出力をテストする評価フレームワーク。回答の妥当性、根拠整合性、ハルシネーション等をメトリクス化します。
- **G-Eval**：LLM自身（または別LLM）を“採点者（Judge）”として使い、ルーブリックに基づいてスコアを付ける発想（後述のGPU/コスト設計に影響）。
- **Test Factory**：評価を“人の目視”から“工場ライン”へ移す比喩。入力（テストケース）→加工（評価）→出力（JSON/メトリクス）を自動化します。

### Tips（実務）
- まずは「**20ケースのスモーク**」→「**500ケースの回帰**」→「**5,000ケースの本気**」の順で段階的に増やすと、設計の粗が見えやすいです。
- “評価はCIの一部”にするなら、**毎回フル（5,000）** ではなく、PRは小さめ・夜間にフルなど、実行ポリシーを分けると回ります。

---
## 2. なぜK8sで並列化するのか：スケーラビリティの課題
![De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ](/images/IaC/De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ.jpg)
### 図の要旨
- ローカルの逐次実行（Serial）では **1プロセス×大量ケース** になりがちで、例では **24時間** 規模の待ちが発生します。
- K8sで“恥ずかしいほど並列（Embarrassingly Parallel）”に分割すると、例では **15分** に短縮できる、という比較です。
- 要件として「**再現可能な実行環境（Docker）**」と「**静的なリソース管理（Kubernetes）**」が必要、と示しています。

### 詳細解説（用語）
- **Embarrassingly Parallel**：互いに依存しないタスクに分割できる並列性。LLM評価は“各テストケースが独立”なので相性が良いです。
- **スケーラビリティ**：ケース数が増えても処理時間を増やさない（あるいは増え方を抑える）性質。CPU/GPU/Pod数で調整します。

### Tips（実務）
- 並列化の効果は「ケース数」だけでなく「**1ケースの重さ**（Judge呼び出し回数、コンテキスト長）」で変わります。重い場合は **parallelismを上げすぎない**（後述）ほうが安定します。
- ローカルで詰まる場合でも、K8s化の前に **“1ケースの処理を計測”**（平均/95%ile）すると、必要なPod数の見積もりができます。

---
## 3. 実行ユニット：DeepEval のテストケースとメトリクス
![De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ](/images/IaC/De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ.jpg)
### 図の要旨
- LLMアプリの出力を **ユニットテストのように**評価するための枠組みとして DeepEval を説明しています。
- 代表的メトリクスとして **G-Eval / Faithfulness（根拠整合） / Answer Relevancy（質問適合）** を挙げています。
- 右側のコード例は、`LLMTestCase` を作り `metric.measure()` でスコア化する流れです。

### 詳細解説（用語）
- **Test Case（テストケース）**：`input`（質問/指示）と `actual_output`（アプリ出力）、必要なら `retrieval_context`（RAG根拠）を持つ最小単位。
- **Faithfulness**：回答が“与えた根拠（コンテキスト）”に忠実か。RAG品質の中心指標。
- **Hallucination**：根拠にない内容を“それっぽく言う”現象。Faithfulnessと裏表です。
- **Answer Relevancy**：質問に対して的外れではないか（関連度）。

### Tips（実務）
- メトリクスは多すぎると運用できません。最初は **Answer Relevancy + Faithfulness** の2本で“回る”ようにし、後から追加がおすすめ。
- RAGの評価では、テストケースに **`retrieval_context` を必ず残す**（保存）と、スコアが悪い時に“検索が悪いのか生成が悪いのか”を切り分けできます。

---
## 4. 評価環境のコンテナ化：Docker戦略（再現性と起動時間の設計）
![De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ](/images/IaC/De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ.jpg)
### 図の要旨
- 評価をK8sで回す前提として、実行環境を **Dockerで固定**する（依存関係・ランタイム・テストコードを積み上げる）構成図です。
- 右の注釈は **依存のピン止め（requirements.txt）** と **Multi-stage build** によるサイズ最適化を示しています。
- 下部の重要メモは **モデル重み（Weights）のCold Start回避**：PVCへ退避しPodからマウントする、です。

### 詳細解説（用語）
- **Dependency Pinning**：`requests==2.32.0` のようにバージョンを固定して、評価結果が日によって変わる事故を防ぎます。
- **Multi-stage build**：ビルド用イメージ（重い）と実行用イメージ（軽い）を分け、最終イメージを小さくします。
- **Cold Start**：Pod起動時にモデル/依存をダウンロードして遅くなる現象。評価の並列実行では致命傷になりがちです。
- **PVC（PersistentVolumeClaim）**：Podの外側に永続領域を確保し、複数Podからマウントできます。

### Tips（実務）
- 評価ジョブは“短命”なので、コンテナの基本方針は **「起動が速い」>「中身が豪華」**です。Dockerの最適化は効果が出やすいです。
- HuggingFace系を使うなら `/root/.cache/huggingface` をPVCに逃がすだけで、**初回以外の速度が激変**します（後述）。

---
## 5. オーケストレーションの要：Kubernetes Indexed Job（静的シャーディング）
![De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ](/images/IaC/De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ.jpg)
### 図の要旨
- データセット（例：1,000件）を **シャーディング（分割）** し、Pod-0/1/2… がそれぞれ担当範囲を処理する図です。
- `completionMode: Indexed` により、Podごとに **固定のインデックス**が割り当てられ、各Podが“自分の担当シャード”を決められます。
- その結果、複雑な分散キュー（例：Redis）無しで“分割統治”できます。

### 詳細解説（用語）
- **Job**：バッチ実行（終わったら終了）向けのK8sリソース。
- **Indexed Job**：JobのPodに 0..N-1 の番号を割り当て、同じ番号で再実行されても“同じ担当”にできます。
- **Sharding（シャーディング）**：データを分割して並列処理すること。評価では“ケース集合”の分割です。

### Tips（実務）
- Indexed Job は“静的分割”なので、**処理時間がケースによって偏る**と待ちが出ます。偏りが大きい場合は「均等件数」ではなく「**事前に重さで分ける**」か、キュー方式へ拡張検討です。
- まずは静的分割で十分なことが多いです（運用が圧倒的に簡単）。

---
## 6. Jobマニフェスト詳解（1）：並列度を決める3つの値
![De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ](/images/IaC/De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ.jpg)
### 図の要旨
- `completionMode: Indexed` を必須として、`completions`（総タスク数）と `parallelism`（同時実行Pod数）で並列制御する説明です。
- 例：`completions: 10`（10分割）・`parallelism: 5`（同時5Pod）。

### 詳細解説（用語）
- **completions**：完了すべき“インデックス付きPod”の総数（= シャード数）。
- **parallelism**：同時に走らせるPod数（= 同時実行数）。
- **restartPolicy: Never**：失敗時にPodを再起動しない設定（評価の再実行戦略は別途設計するのが一般的）。

### Tips（実務）
- `parallelism` は **GPU数 / 外部LLMのレート制限 / ネットワーク** で上限が決まります。最初は小さめ（例：2〜5）で測り、段階的に上げるのが安全です。
- `parallelism` を倍にしても時間が半分にならないなら、どこかがボトルネック（GPU/IO/外部API）です。

---
## 7. Jobマニフェスト詳解（2）：インデックスをコンテナへ注入して実行する
![De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ](/images/IaC/De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ.jpg)
### 図の要旨
- `JOB_COMPLETION_INDEX` を環境変数として注入し、Pythonスクリプト側で `--shard-index` に渡して担当データを決める、という設計です。
- K8sの **Downward API**（Podメタデータの参照）で `job-completion-index` を取っています。

### 詳細解説（用語）
- **Downward API**：Podのメタデータ（ラベル/注釈など）をコンテナ内へ渡す仕組み。
- **job-completion-index**：Indexed Jobが付与する“あなたは何番？”のインデックス情報。
- **Logic Injection**：環境変数や引数で“分割ロジック”を注入し、同じイメージを全Podで使う設計。

### Tips（実務）
- スクリプト設計は `run_evals.py --shard-index N --total-shards M` の形が扱いやすいです（ローカルでも同じ引数で再現できる）。
- シャーディングは「`i % total_shards == shard_index`」のような分割が簡単ですが、順序が重要ならスライス方式（range分割）にします。

---
## 8. Jobマニフェスト詳解（3）：リソース管理とGPU（CPU環境でも読む価値あり）
![De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ](/images/IaC/De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ.jpg)
### 図の要旨
- `resources.requests/limits` で CPU/Memory/GPU を定義し、GPUが必要なら `nvidia.com/gpu: 1` を指定する例です。
- HuggingFaceキャッシュをボリュームにマウントして、モデル取得の再実行を避ける構成です。

### 詳細解説（用語）
- **requests / limits**：requestsは“最低保証”、limitsは“上限”。スケジューラはrequestsを基準にPod配置します。
- **nvidia.com/gpu**：NVIDIA Device Plugin を導入したクラスタで使えるGPUリソース指定。
- **モデルキャッシュマウント**：`/root/.cache/huggingface` などを永続化して、起動時ダウンロードを回避します。

### Tips（実務）
- たこちゃんPCがCPUでも、この章は“クラスタにGPUを持ち込む時の設計メモ”として残す価値があります（必要になった瞬間に効きます）。
- GPUが無い環境では `nvidia.com/gpu` の指定は外し、代わりにCPU/Memoryを増やす、またはJudgeを外部API（クラウドLLM）へ寄せると成立します。

---
## 9. データ永続化とキャッシング：Cold Start（初回ダウンロード地獄）を潰す
![De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ](/images/IaC/De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ.jpg)
### 図の要旨
- 複数Podが **同じモデル重み/HFキャッシュ** を共有するため、PVCをマウントする図です。
- 問題：Cold Start（数GBダウンロード）で遅延 → 解決：PVC sharing → 効果：起動時間短縮・ネットワーク負荷減、を示しています。

### 詳細解説（用語）
- **ReadOnlyMany / ReadWriteMany**：複数Podから同時にマウントするアクセスモード。実際に使えるかはストレージ実装次第です。
- **HF Cache**：HuggingFaceのモデル/トークナイザを保存するキャッシュディレクトリ。

### Tips（実務）
- 共有ストレージが難しい場合は、ノードローカルにキャッシュする（DaemonSetで事前pull）方式もあります。まずは“何で遅いか”を測って選ぶのが正解です。
- 評価は“同じモデルを何度も使う”ので、キャッシュは投資対効果が高いです。

---
## 10. GPUリソース最適化：Time-Slicing と MIG の違い
![De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ](/images/IaC/De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ.jpg)
### 図の要旨
- **Time-Slicing**：1枚のGPUを“時間で共有”して複数プロセスに割り当てる（ソフトウェア分割）。
- **MIG**：A100/H100などでGPUを“ハード分割”し、独立した小GPUのように扱う方式。
- 精度/安定性/コスト/レイテンシのトレードオフを示しています。

### 詳細解説（用語）
- **Time-Slicing**：実装が比較的簡単だが、同時負荷でレイテンシがぶれやすい。
- **MIG（Multi-Instance GPU）**：メモリやSMを分割して隔離。隣のPodの影響を受けにくく、安定しやすい。

### Tips（実務）
- “回帰テスト”（大量ケース）なら Time-Slicing でもよいが、“レイテンシ評価”や“本番近いSLA”を見るなら MIG が効きやすい、という目安です。
- まずは **parallelismを控えめ**にして安定運用 → その後にGPU分割で密度を上げる、が事故りにくい順番です。

---
## 11. ワークフロー自動化：Argo Workflows で CI/PR に組み込む
![De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ](/images/IaC/De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ.jpg)
### 図の要旨
- Gitトリガーで開始し、シャード一覧生成 → Fan-out（並列評価Job）→ 集約 → 通知、のパイプライン図です。
- `withParam` / `withItems` で **並列ステップを生成**するのがキーと書かれています。

### 詳細解説（用語）
- **Argo Workflows**：K8s上でワークフロー（DAG）を実行する仕組み。バッチ処理の“司令塔”。
- **Fan-out / Fan-in**：分岐して並列に流し（Fan-out）、結果を集めて合流（Fan-in）するパターン。

### Tips（実務）
- PRごとに“軽量セット”を回し、mainマージや夜間で“フルセット”を回すと、品質と開発速度の両立ができます。
- 通知はSlackだけでなく、**PRコメントに要約（合格/不合格・主要メトリクス・悪化ケースTOP）**を返すとレビューが速いです。

---
## 12. 結果の集約と可視化：JSONを“資産”として残す
![De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ](/images/IaC/De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ.jpg)
### 図の要旨
- 各Podが **JSONで結果を出力**し、それを集約・保存して可視化する流れです。
- 集約方法として (A) 共有PVC、(B) S3/GCS等のオブジェクトストレージ、(C) SaaS（DeepEval Cloud）への直接Push を提示しています。
- 可視化先として MLflow やカスタムダッシュボードを例示しています。

### 詳細解説（用語）
- **Aggregation（集約）**：シャードごとの結果（JSON）をマージし、全体メトリクスを計算します。
- **MLflow**：実験管理（メトリクス・アーティファクト）ツール。評価の履歴を追うのに向きます。
- **オブジェクトストレージ**：S3/GCSのように“ファイルを置く”ストレージ。短命Podと相性が良いです。

### Tips（実務）
- 最初は **S3/GCSにJSONを置く** のが運用しやすいことが多いです（PVCのRWX要件が厳しいクラスタもあるため）。
- “悪化検知”をするなら、集約後に **前回との差分（Δ）** を計算して通知する仕組みまで作ると強いです。

---
## 13. 実装チェックリスト（最短で動かす手順）
![De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ](/images/IaC/De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ.jpg)
### 図の要旨
- 実装の要点をチェックリスト化しています：Dockerize → Data準備（シャーディング）→ Indexed Jobマニフェスト → Storage/Cache → Deploy/Monitor。

### 詳細解説（用語）
- **Dockerize**：評価コードをコンテナ化して再現性を担保。
- **Prepare Data**：テストデータを“分割できる形”にする（インデックス/シャード割当）。
- **Deploy & Monitor**：実行だけでなく、GPU使用率や失敗率を見て調整する段階。

### Tips（実務）
- “最短で動かす”なら、最初は **GPU無し・小ケース・S3集約** の3点セットが事故りにくいです。GPUやRWXは後からでも足せます。
- 本番運用に近づけるなら、**実行ログ（Podログ）と結果JSONを必ず紐づけて保存**（run_id等）しておくと、調査が速いです。

---
## 14. 結論：Kubernetes は AI品質を支える「生産ライン」になる
![De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ](/images/IaC/De1.DeepEval_on_Kubernetes：スケーラブルなLLM評価アーキテクチャ.jpg)
### 図の要旨
- 直感的な動作確認（“たぶん動く”）から、**5,000ケースで検証済み**というエンジニアリングへ移行するメッセージです。
- ガードレール変更を即座にテストし、**安全なデプロイサイクル（Velocity）** を実現する、としています。
- Kubernetesは単なるデプロイ基盤ではなく、AI品質を保証する **Factory（生産ライン）** である、という位置づけです。

### 詳細解説（用語）
- **ガードレール**：安全・品質の制約（禁止事項、根拠必須、出力形式、リスク低減策）。
- **回帰テスト（Regression）**：変更による品質劣化が起きていないかを継続的に確認するテスト。

### Tips（実務）
- 最後に効くのは“文化”です：評価は一度作って終わりではなく、**失敗事例をテストケースに追加し続ける**と、AI品質が積み上がります。
- ダッシュボードは最初から豪華にしなくてOK。まずは「合否」「主要メトリクス」「悪化TOP10」が見えれば運用できます。

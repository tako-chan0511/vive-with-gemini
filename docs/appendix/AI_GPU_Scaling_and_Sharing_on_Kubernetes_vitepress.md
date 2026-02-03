# KubernetesによるAI/ML基盤の最適化戦略：2段階スケーリングとGPU共有（MIG・タイムスライシング）

## 1. 全体像：Kubernetes × AI推論の「最適化ブループリント」

![Ku1.KubernetesによるAI＆ML基盤の最適化戦略](/images/IaC/Ku1.KubernetesによるAI＆ML基盤の最適化戦略.jpg)

### 図の要旨
- **Kubernetes上でAI/ML推論を運用**する際の“設計図”を1枚に集約しています。
- 重要メッセージは2つ：
  1) **2段階スケーリング**（Pod → Node）で「コストとレイテンシの両立」を狙う  
  2) **GPU共有（Time-Slicing / MIG）** で「GPUアイドル（遊休）」を減らす

### 詳細解説（用語）
- **Pod / Node**：Podはアプリの実行単位、NodeはPodが載るVM/物理マシン。
- **オーケストレーション**：配置・再起動・更新・スケールなど“運用の自動化”をK8sが担うこと。
- **Inference Service**：推論API（例：`/v1/chat/completions`相当）を提供するサービス。
- **MIG / Time-Slicing**：1枚のGPUを**物理分割**（MIG）または**時間分割**（Time-Slicing）して複数ワークロードで共有。

### Tips（実務）
- 最初は「**Podを増やす**」だけで何とかしがちですが、AIではGPU搭載ノードが高価で、**Node増減まで含めて設計**するのがコスト最適化の近道です。
- 以降のページは、上図を分解して「どこをどう最適化するか」を順に解説しています。

---

## 2. コスト vs レイテンシ：AIインフラの核心的課題
**差し込み位置（目安）**：課題提起（なぜ最適化が必要か）の節。

![Ku2.コスト体レイテンシ：AIインフラの核心的課題](/images/IaC/Ku2.コスト体レイテンシ：AIインフラの核心的課題.jpg)

### 図の要旨
- **静的割り当て（Static Allocation）**は、ピークに合わせてプロビジョニングするため、平常時に**遊休コスト**が発生。
- **動的スケーリング（Dynamic Scaling）**は、需要に合わせて理想的に追従できるが、スケールアウトの遅れが**レイテンシ悪化**に直結。
- AIワークロードはバースト（断続的）になりやすく、どちらか片方だけでは最適になりにくい。

### 詳細解説（用語）
- **プロビジョニング容量**：事前に用意している計算資源（GPUノードなど）。
- **バースト（Bursty）**：アクセスやジョブが「来ない時間」と「集中する時間」を繰り返す特性。
- **レイテンシ**：応答時間。特に推論はユーザー体験に直結。

### Tips（実務）
- 「平均利用率で設計」すると、AIはピークが鋭くて事故りやすいです。  
  → **“ピーク時の待ち行列（Queue）”** が増える設計は、最終的にUX/SLAsを壊します。
- 対策は **(A) Podを素早く増やす仕組み** と **(B) GPUノードを素早く増やす仕組み** を“セット”で持つこと（次ページ）。

---

## 3. Kubernetesにおける「2段階のスケーリング」
**差し込み位置（目安）**：スケーリング設計の章の冒頭。

![Ku3.Kubernetesにおける「2段階のスケーリング」](/images/IaC/Ku3.Kubernetesにおける「2段階のスケーリング」.jpg)

### 図の要旨
- **Stage 1：Software / Pods**（HPA / KEDA）  
  トラフィック増に応じて **推論Podを増やす**。
- **Stage 2：Hardware / Nodes**（Karpenter / Cluster Autoscaler）  
  Podが載り切らず **Pending** になったら **GPUノードを増やす**。

### 詳細解説（用語）
- **HPA**：Horizontal Pod Autoscaler。メトリクス（CPUなど）に基づいてPod数を増減。
- **KEDA**：イベント駆動スケーリング。キュー長など“イベント”をトリガにスケールしやすい。
- **Pending Pod**：スケジューラが載せ先を見つけられない状態（資源不足が典型）。

### Tips（実務）
- AI推論はCPUより「**キュー長**」「**同時リクエスト数**」「**GPU使用率**」が効くことが多いです。  
  → **Stage1はKEDA寄り**で設計する方が、現場では安定しやすいです。
- Stage2は「**GPUノードの調達時間**」がボトルネックになるので、プロバイダの起動時間やスポット戦略も合わせて検討します。

---

## 4. Stage 1：ワークロードスケーリング（HPA & KEDA）
**差し込み位置（目安）**：Podスケーリング（推論APIスケール）の節。

![Ku4.Stage1：ワークロードスケーリング（HPA＆KEDA）](/images/IaC/Ku4.Stage1：ワークロードスケーリング（HPA＆KEDA）.jpg)

### 図の要旨
- Incoming Request → Queue → **KEDA（イベント検知）** → HPA → New Pods Created
- “標準HPAだけ”だとAI推論では不十分になりやすい（CPU基準が効きづらい）。

### 詳細解説（用語）
- **イベント駆動**：例）SQS/Kafka/Redisなどのキュー長、HTTPリクエスト数、カスタムメトリクス。
- **Scale-to-Zero**：需要がゼロのときPodを0にしてコストを抑える（バッチ/開発環境で特に有効）。

### Tips（実務）
- KEDAの典型例（キュー長でスケールする“イメージ”）：
  ```yaml
  apiVersion: keda.sh/v1alpha1
  kind: ScaledObject
  metadata:
    name: inference-scaledobject
  spec:
    scaleTargetRef:
      name: inference-deployment
    minReplicaCount: 0
    maxReplicaCount: 20
    triggers:
      - type: aws-sqs-queue
        metadata:
          queueURL: https://sqs.../your-queue
          queueLength: "5"   # ここを超えると増やす
  ```
- “GPU推論”は **キューが詰まる前**に増やしたいので、`queueLength`は小さめスタートが鉄板です。

---

## 5. Stage 2：インフラストラクチャスケーリング（Karpenter vs Cluster Autoscaler）
**差し込み位置（目安）**：Nodeスケーリング（GPUノード増減）の節。

![Ku5.Stage2：インフラストラクチャスケーリング（Karoenter対CAS）](/images/IaC/Ku5.Stage2：インフラストラクチャスケーリング（Karoenter対CAS）.jpg)

### 図の要旨
- **従来CAS**：事前定義したノードグループ中心（Rigid）
- **Karpenter**：Pod要求に合わせて **JIT（Just-in-Time）でノードを選定・起動**  
  → 柔軟・高密度（bin-packing）・高速

### 詳細解説（用語）
- **Cluster Autoscaler（CAS）**：既存ノードグループを前提に増減する方式が多い。
- **Bin-packing**：空き容量にPodを詰めて、無駄なノード追加を抑える最適化。
- **JITプロビジョニング**：必要になった瞬間に最適なインスタンスを選び起動する考え方。

### Tips（実務）
- “GPU種別の切替”が頻繁に起きる環境（A100→H100など）では、固定ノードグループは運用負担になりがちです。  
  → **Podの要求（GPU/メモリ/ラベル）を正しく書く**ことがKarpenter運用の肝です。
- まずは「GPU専用NodePool（または相当）」を切り、推論Podはそこにだけ載せる設計が事故りにくいです。

---

## 6. 「巨大なアイドル」問題：GPUリソースの低使用率
**差し込み位置（目安）**：GPU共有（分割/共有）の章の導入。

![Ku6.「巨大なアイドル」問題：GPUリソースの低使用率](/images/IaC/Ku6.「巨大なアイドル」問題：GPUリソースの低使用率.jpg)

### 図の要旨
- 高価なGPU（A100/H100）は“小規模推論”には過剰になりやすく、**利用率が低いのにコストが100%**発生する。
- 解決の方向性は「**1枚のGPUを複数ワークロードで共有**」して、アイドルを減らすこと。

### 詳細解説（用語）
- **GPU利用率（Utilization）**：計算器がどれだけ働いているか。10%でも料金は基本100%。
- **小粒な推論**：小モデル／短文／低QPSなどで、GPUをフルに使い切れないケース。

### Tips（実務）
- まず“測る”のが最短です：GPU Util、メモリ使用量、待ち行列長、TTFT。  
  → 観測（p13）へ繋がります。

---

## 7. 解決策A：タイムスライシング（Time-Slicing）
**差し込み位置（目安）**：GPU共有手法（ソフトウェア共有）の節。

![Ku7.解決策A：タイムスライシング](/images/IaC/Ku7.解決策A：タイムスライシング.jpg)

### 図の要旨
- 複数ジョブを時間で切り替えてGPUを共有（コンテキストスイッチのオーバーヘッドあり）。
- **Pros**：密度を上げやすい／開発・検証の“とりあえず共有”に強い
- **Cons**：メモリ分離が弱く、**Noisy Neighbor**（他ジョブの影響）やOOM波及が起きやすい

### 詳細解説（用語）
- **コンテキストスイッチ**：GPU上で実行主体が切り替わること（切替コストがある）。
- **Noisy Neighbor**：同居するワークロードの負荷で、自分のレイテンシが悪化する現象。
- **OOM**：Out Of Memory。GPUメモリ枯渇で落ちる。

### Tips（実務）
- タイムスライシングは「**安くたくさん動かす**」用途に向きます。  
  例：社内検証、バッチ前処理、低優先の非同期推論など。
- 本番推論では **レイテンシと安定性**が重要なので、次ページのMIGが第一候補になりやすいです。

---

## 8. 解決策B：MIG（Multi-Instance GPU）
**差し込み位置（目安）**：GPU共有手法（ハードウェア分割）の節。

![Ku8.解決策B：MIG（Multi-InstanceGPU）](/images/IaC/Ku8.解決策B：MIG（Multi-InstanceGPU）.jpg)

### 図の要旨
- 1枚のGPUを **ハードウェア的に分割**し、各インスタンスに **専用Compute/Memory** を割り当てる。
- **メリット**：分離が強い／QoSが安定／本番推論に向く（特にA100/H100など）

### 詳細解説（用語）
- **MIG**：NVIDIAの一部GPUで可能なハード分割。スライスごとに隔離される。
- **QoS（Quality of Service）**：一定の性能・遅延を保証しやすい性質。

### Tips（実務）
- MIGは「**運用が設計**」です。  
  例：推論用は `1g.10gb` を複数、学習/高負荷は大きいスライス…など、**スライスのカタログ**を先に決めると運用が楽になります。
- “本番＝MIG、開発＝Time-Slicing” で住み分けるのが、現場で一番事故が少ないです（p10）。

---

## 9. 比較分析：MIG vs タイムスライシング
**差し込み位置（目安）**：共有方式の選定（意思決定）節。

![Ku9.比較分析：MIG対タイムスライシング（ComparativeAnalysis）](/images/IaC/Ku9.比較分析：MIG対タイムスライシング（ComparativeAnalysis）.jpg)

### 図の要旨
- **Isolation**：MIG（高） > Time-Slicing（低）
- **Latency**：MIG（予測可能/安定） > Time-Slicing（変動しやすい）
- **Fault Tolerance**：MIG（波及しにくい） > Time-Slicing（波及リスク）
- **Requirements**：MIGは対応GPUが必要（A100/H100等）、Time-Slicingは幅広いGPUで成立しやすい
- **Density**：Time-Slicingは高密度に寄せやすい

### 詳細解説（用語）
- **分離レベル**：障害や性能劣化が他に波及しにくい度合い。
- **密度（Density）**：1台（1GPU）に何ワークロードを載せられるか。

### Tips（実務）
- “本番推論（SLAあり）”なら **MIG優先**。  
- “開発/検証（ベストエフォート）”なら **Time-Slicing優先**。  
- 迷ったら「**レイテンシのSLO**」で決めるとブレません。

---

## 10. ハイブリッド構成：MIG + タイムスライシング
**差し込み位置（目安）**：実運用パターン集の節。

![Ku10.ハイブリッド構成：MIG＋タイムスライシング（TheHybridApproch）](/images/IaC/Ku10.ハイブリッド構成：MIG＋タイムスライシング（TheHybridApproch）.jpg)

### 図の要旨
- 物理GPUをMIGで区画分けし、  
  - 一部スライスは **本番推論（Dedicated）**  
  - 一部スライスは **開発環境（Time-Sliced）**
- “分離”と“密度”を両取りするパターン。

### 詳細解説（用語）
- **Dedicated**：他と共有しない（または強く隔離する）ことで安定性を得る。
- **Dev環境**：多少の遅延・ノイズを許容してコストを抑える。

### Tips（実務）
- ハイブリッドは「**GPU資産を最大活用**」できます。  
  ただし、運用ルール（どのNamespaceがどのスライスに乗るか）が曖昧だと崩れます。  
  → **ラベル/taint/toleration** で意図した配置を強制する設計がおすすめです。

---

## 11. 高度な最適化：PD分離（Prefill-Decode Disaggregation）
**差し込み位置（目安）**：LLM推論アーキテクチャ（性能最適化）の節。

![Ku11.高度な最適化：PD分離アーキテクチャ（Prefill-DecodeDisaggregation）](/images/IaC/Ku11.高度な最適化：PD分離アーキテクチャ（Prefill-DecodeDisaggregation）.jpg)

### 図の要旨
- LLM推論を  
  - **Prefill（Prompt処理）＝計算集約**  
  - **Decode（生成）＝メモリ帯域集約**  
  に分け、最適なノード（スライス）に振り分ける。
- 目的は **スループット** と **TTFT（最初のトークンが返るまで）** の改善。

### 詳細解説（用語）
- **Prefill**：入力トークンを一気に処理しKVキャッシュを作る工程（計算が重い）。
- **Decode**：トークンを逐次生成する工程（メモリ帯域の影響が大きい）。
- **TTFT**：Time To First Token。体感の速さに直結する指標。

### Tips（実務）
- “大規模LLM推論”のボトルネックは一様ではありません。  
  → **Prefillが詰まってるのか、Decodeが詰まってるのか**を計測してから分離を検討すると失敗しません。
- 実装イメージ：LBで `prefill-service` と `decode-service` を分け、KVキャッシュを共有ストアや高速リンクで中継する（設計難度は上がります）。

---

## 12. AIコンピュートスタックの全体像（K8s × Ray × vLLM）
**差し込み位置（目安）**：技術スタック整理（全体像）の節。

![Ku12.AIコンピュートスタックの全体像（TheCompleteAIComputeStack）](/images/IaC/Ku12.AIコンピュートスタックの全体像（TheCompleteAIComputeStack）.jpg)

### 図の要旨
- 下から順に：
  - **Hardware**（GPU/MIG）
  - **Orchestrator**（Kubernetes：配置/スケール）
  - **Distributed Engine**（Ray：分散ジョブ/タスク管理）
  - **Model Layer**（PyTorch / vLLM：推論・最適化）
- “どこで何を最適化するか”をレイヤで整理する狙い。

### 詳細解説（用語）
- **Ray**：分散実行フレームワーク。タスク/アクターで並列化しやすい。
- **vLLM**：LLM推論を高速化する推論エンジンの代表例（PagedAttention等）。
- **Prefix Caching / PagedAttention**：メモリ効率を上げ、同一プロンプトの再利用を効かせやすい。

### Tips（実務）
- “K8sだけで頑張る”より、**推論エンジン側の最適化（vLLM系）**と合わせた方が伸びが大きいです。
- レイヤごとにKPIを持つと運用が安定します：  
  K8s（Pending/Scale時間）／GPU（Util/Memory）／推論（TTFT/TPOT）など。

---

## 13. 運用ベストプラクティス：可観測性・キャッシュ・バッチ
**差し込み位置（目安）**：運用/監視の節。

![Ku13.運用ベストプラクティスと可観測性](/images/IaC/Ku13.運用ベストプラクティスと可観測性.jpg)

### 図の要旨
- **Observability**：DCGM Exporterで、MIGパーティション単位のメトリクスを可視化
- **Prefix Caching**：システムプロンプトのKVキャッシュを再利用してコスト削減
- **Indexed Jobs**：データセットをシャードし、並列Podでバッチ処理を効率化

### 詳細解説（用語）
- **DCGM Exporter**：NVIDIA GPUメトリクスをPrometheus形式で出すエクスポータ。
- **Prometheus**：メトリクス収集・可視化基盤（Grafanaと組み合わせが多い）。
- **シャーディング**：データを分割して並列処理する。

### Tips（実務）
- まず見るメトリクス例：GPU Util / GPU Memory Used / SM Occupancy / PCIe/NVLink。  
- Prefix cachingは、**“同じシステムプロンプトが多い”**ワークロードで効果が出やすいです（社内Botなど）。

---

## 14. 実装チェックリスト（最短で効く順）
**差し込み位置（目安）**：最後のまとめ／実装ToDoの節。

![Ku14.最適化への実装チェックリスト（ImplementationChecklist）](/images/IaC/Ku14.最適化への実装チェックリスト（ImplementationChecklist）.jpg)

### 図の要旨
- スケーリング戦略：HPAだけでなく **KEDA（イベント駆動）** を採用
- ノードプロビジョニング：CAS → **Karpenter** へ
- ワークロード分析：計算集約かメモリ集約かを特定
- 共有戦略：本番＝MIG、開発＝Time-Slicing（またはHybrid）
- 監視：DCGM × Prometheusでスライスごとに可視化

### 詳細解説（用語）
- **計算集約（Compute bound）**：GPU計算がボトルネック。
- **メモリ集約（Memory bandwidth bound）**：帯域やKVキャッシュがボトルネック。

### Tips（実務）
- 迷ったらこの順で効きます：  
  ①観測（Util/Queue/TTFT）→ ②KEDAでPodスケール → ③KarpenterでNodeスケール → ④MIG/Time-Slicingで共有 → ⑤推論エンジン最適化（prefix caching等）

---

## 15. 結論：AIコストは「節約」ではなく「アーキテクチャ」
**差し込み位置（目安）**：章の締め（結論）。

![Ku15.結論：エンジニアリングによるAI品質とコストの統制](/images/IaC/Ku15.結論：エンジニアリングによるAI品質とコストの統制.jpg)

### 図の要旨
- AI基盤のコスト効率は、単なる“節約”ではなく **設計問題**。
- **マクロ（K8sのスケーリング）** と **ミクロ（GPU共有/分割）** を統合し、スケーラブルな「AI工場」を作る。

### 詳細解説（用語）
- **アーキテクチャ**：性能・信頼性・コストを“構造”で決める設計。
- **AI工場**：推論/学習/運用を継続的に回すための標準化された基盤・手順。

### Tips（実務）
- 最後は「設計の標準化」が効きます：  
  - ノード種別、MIGスライス、スケール閾値、監視ダッシュボード、運用Runbook  
  をテンプレ化すると、チームで回しやすくなります。


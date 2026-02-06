# GPUのスライス：KubernetesでAIを賢く実行する方法（MIG / Time-Slicing）

## １ GPUスライシングの全体像（なぜ必要か）

![GP1.GPUのスライス：KubernetesでAIを賢く実行する方法](/images/IaC/GP1.GPUのスライス：KubernetesでAIを賢く実行する方法.jpg)

### 図の要旨
GPUは高価で“空き時間＝損失”になりやすい。そこで **1枚のGPUを分割（スライス）** して、推論・学習・評価など複数ワークロードに効率よく配るのが主題。

### 詳細解説（用語）
- **GPUスライシング**：GPUを“複数の小さなGPUのように”扱うこと  
  - 代表方式：**MIG（物理分割）** / **Time-Slicing（時間共有）**
- **Kubernetes**：Pod単位でGPUを割り当てる際、スライスを「リソース」として扱える

### Tips（実務）
- まずは「GPU使用率が低い理由」を分解：  
  - １）バッチが小さすぎる 2） I/O待ち 3） GPUメモリが足りず頻繁にロード 4） そもそもアイドルが多い  
- “スライシングは魔法ではない”ので、**測定（利用率/メモリ/レイテンシ）→戦略**の順が鉄則

---

## ２ GPU利用率とMFU（Model FLOPs Utilization）

![GP2.AIインフラの「隠れたコスト」：低稼働率との闘い](/images/IaC/GP2.AIインフラの「隠れたコスト」：低稼働率との闘い.jpg)

### 図の要旨
GPUの「割り当て」だけでなく、**実際に計算している割合（利用率）** が重要。  
さらにLLMでは **MFU**（理論FLOPsに対して実効FLOPsがどれだけ出たか）が指標として使われる。

### 詳細解説（用語）
- **Utilization（GPU使用率）**：SM稼働率などの指標。高くても性能が出ているとは限らない  
- **MFU（Model FLOPs Utilization）**：  
  - 理論最大FLOPs（ハード性能）に対して、実際の推論/学習でどれだけFLOPsを使えたか
  - 低い原因：小バッチ、頻繁なCPU↔GPU転送、メモリ帯域ボトルネック、分岐が多いモデル等
- **A100/H100**：MIG対応の代表GPU（世代や構成によりスライス方式の使い勝手が変わる）

### Tips（実務）
- 観測基盤の最小セット例  
  - `nvidia-smi`, DCGM Exporter + Prometheus/Grafana  
  - 取得：GPU使用率、メモリ使用量、メモリ帯域、ECC、温度、Pod単位の利用量
- “利用率が低い＝スライスすべき”ではなく、**バッチング（後述vLLM）で上がるケース**が多い

---

## ３ MIG vs Time-Slicing（違いの核心）

![GP3.スライシングへの２つの道：MIG対タイムスライシング](/images/IaC/GP3.スライシングへの２つの道：MIG対タイムスライシング.jpg)

### 図の要旨
- **MIG**：GPUをハードウェア的に分割し、**分割片ごとに独立性**を持たせる（安全・安定寄り）  
- **Time-Slicing**：1枚GPUを時間で共有（多人数・バースト寄り）

### 詳細解説（用語）
- **QoS（Quality of Service）**：性能の予測可能性（隣の利用が影響しにくい）
- **Fault Isolation**：片方の障害や暴走が他へ波及しにくい
- **コンテキストスイッチ**：Time-Slicingでジョブが切り替わる際の切替コスト

### Tips（実務）
- 本番推論（SLA重視）→ **MIG**  
- 研究/開発・多人数Notebook・断続ジョブ → **Time-Slicing**  
- 両方欲しい → **Hybrid（MIGの中でTime-Slicing）** が現実的

---

## ４ MIG（Multi-Instance GPU）の詳細：物理隔離とQoS

![GP4.ハードウェアレbるの隔離：MIG(Multi-InstanceGPU）の詳細](/images/IaC/GP4.ハードウェアレbるの隔離：MIG（Multi-InstanceGPU）の詳細.jpg)

### 図の要旨
MIGは **GPUを物理的に分割**して、各スライスに計算資源とメモリを割り当てる。  
隣のスライスの高負荷が影響しにくく、**本番向き**。

### 詳細解説（用語）
- **プロファイル例（図の例）**  
  - `1g.5gb`：小さな推論や開発Notebook向け  
  - `3g.20gb`：中規模モデルのfine-tuningなど（より大きな計算資源）
- **Unused/Available**：MIG構成により“使われない断片”が残ることもあり得る（設計の要点）

### Tips（実務）
- MIGは「安定」だが、**構成変更が運用作業になりがち**  
  - 例：昼は推論スライス多め、夜は学習スライス…を頻繁に変えるのはつらい  
- “スライスの種類を増やしすぎない”  
  - 種類が多いほどスケジューリングが難しく、空きが出やすい

---

## ５ Time-Slicing：密度と柔軟性（ただしトレードオフ）

![GP5.密度と柔軟性の最大化：タイムスライシングの活用](/images/IaC/GP5.密度と柔軟性の最大化：タイムスライシングの活用.jpg)

### 図の要旨
Time-Slicingは時間で共有できるため、**多数Podを1GPUに載せる（オーバーサブスク）** ことが可能。  
軽い推論を多数さばく用途に向くが、**メモリ共有によるOOM**や切替オーバーヘッドがある。

### 詳細解説（用語）
- **オーバーサブスクリプション**：物理制限を超えて論理的に多数割当て（同時に全部は走らない前提）
- **OOM（Out of Memory）**：GPUメモリが共有なので、複数Podが膨らむと落ちやすい
- **Context Switch Overhead**：ジョブ切替の余計なコスト（レイテンシに効く）

### Tips（実務）
- Time-Slicingを採るなら、**“メモリを食う処理”を別系統に隔離**  
  - 例：埋め込み生成・リランキング等の軽作業はTime-Slicing  
  - LLMの巨大モデル推論はMIGや専用GPU
- OOM対策：  
  - Pod毎に最大メモリ使用量を制御（モデルサイズ/バッチ/最大長）  
  - 監視で“増加傾向”を検知してPod再起動・自動退避

---

## ６ スライシング戦略マトリクス（賢い選び方）

![GP6.賢い選択：スライ寝具戦略マトリクス](/images/IaC/GP6.賢い選択：スライ寝具戦略マトリクス.jpg)

### 図の要旨
軸は2つ：  
- 縦：ワークロードの重要度（Dev/Exp → Production）  
- 横：要求（レイテンシ重視 → スループット/高密度）  
これにより **MIG / Time-Slicing / Hybrid / CPU** を選ぶ。

### 詳細解説（用語）
- **Latency Sensitive**：遅延に厳しい（対話推論など）
- **Throughput/High Density**：総処理量重視（バッチ評価、非同期処理など）

### Tips（実務）
- 最初の設計はこの4象限で十分  
- 後から複雑化しがちなので、**“Hybridは最後の手段”** くらいで運用すると事故が減る

---

## ７ Kubernetesでのリソース認識（Device Plugin / Labels / Namespace）

![GP7.オーケストレーション層：Kubernetesでのリソース認識](/images/IaC/GP7.オーケストレーション層：Kubernetesでのリソース認識.jpg)

### 図の要旨
KubernetesはGPUスライスを **「拡張リソース」** として扱う。  
NVIDIA Device Pluginがスライスを公開し、Podは `limits` で要求する。

### 詳細解説（用語）
- **NVIDIA Device Plugin**：GPU（やMIGスライス）をK8sのリソースとして見せる仕組み
- **Node Labels & Selectors**：特定MIG構成を持つノードを選ぶ（誤スケジュール防止）
- **Namespace Isolation / Quota**：チームごとの公平性（GPU取り合い）を防ぐ

### Tips（実務）
- YAML例（図の意図を補った現場向け例）
  resources:
    limits:
      nvidia.com/mig-1g.5gb: 1
  nodeSelector:
    nvidia.com/gpu.product: A100-MIG-1g.5gb

* “PodがPendingで詰まる”原因の多くは

  1. nodeSelectorが厳しすぎる 2) MIG構成が偏っている 3) Quota不足

---

## ８ KarpenterでJust-in-Timeプロビジョニング（Scale to Zero）


![GP8.静的から動的へ：KarpenterによるJust-in-Timeプロビジョニング](/images/IaC/GP8.静的から動的へ：KarpenterによるJust-in-Timeプロビジョニング.jpg)

### 図の要旨

静的ノードプールは「使ってなくても課金」。
Karpenterは **Pending Podの要求（例：MIGスライス）** を見て最適ノードを起動し、ジョブ完了で破棄できる。

### 詳細解説（用語）

* **Karpenter**：AWSでよく使われるプロビジョナー（Cluster Autoscalerより柔軟）
* **JIT（Just-in-Time）**：必要な時だけ起動 → 終わったら消す

### Tips（実務）

* 評価・バッチ処理は “Scale to Zero” と相性が良い
* 「起動に数分」問題があるので、

  * 重要なSLAがある推論は常駐（MIG常設）
  * 評価/学習はJIT（Karpenter）
    の分離が鉄板

---

## ９ 最新AIスタック：K8s + Ray + vLLM

![GP9.最新のAIスタック：K8s＋Ray＋ｖLLM](/images/IaC/GP9.最新のAIスタック：K8s＋Ray＋ｖLLM.jpg)

### 図の要旨

* Layer1: K8s（基盤）
* Layer2: Ray（分散実行・タスク調整）
* Layer3: vLLM（推論エンジン。PagedAttention/Continuous BatchingでGPUを飽和させる）

### 詳細解説（用語）

* **Ray**：Python分散計算基盤。ジョブ/タスク/Actorで並列処理
* **vLLM**：推論最適化（メモリ断片化抑制、連続バッチング）
* **PagedAttention**：KVキャッシュ管理をページ化して断片化を減らす

### Tips（実務）

* “スライスしたGPU”は小さくなりがちなので、vLLMで **バッチングして密度を稼ぐ**のが効く
* Rayは「評価」や「大量プロンプト実行」に強い（IndexedJobとも相性）

---

## １０ PD分離（Prefill-Decode Disaggregation）

![GP10.高度なアーキテクチャ：PD分離（Prefill-DecodeDisaggregation）](/images/IaC/GP10.高度なアーキテクチャ：PD分離（Prefill-DecodeDisaggregation）.jpg)

### 図の要旨

LLM推論には

* Prefill（プロンプト一括処理：Compute-bound）
* Decode（1トークンずつ生成：Memory-bound）
  の2フェーズがあり、**適切なスライスに分離配置**するとスループットとTTFTが改善。

### 詳細解説（用語）

* **TTFT（Time To First Token）**：最初の1トークンが返るまでの時間（UX直結）
* **Compute-bound / Memory-bound**：ボトルネックが計算かメモリ帯域かの違い

### Tips（実務）

* Prefillは“大きめMIG”、Decodeは“帯域向き小さめMIG”などの設計ができる
* ただし構成が複雑になるため、まずは **vLLM + 適切なスライス** で改善してから検討

---

## １１ 品質担保：コンテナ化された評価パイプライン（IndexedJob）

![GP11.品質の担保：コンテナ化された評価パイプライン](/images/IaC/GP11.品質の担保：コンテナ化された評価パイプライン.jpg)

### 図の要旨

コードをPush → Dockerで環境固定（CUDA固定） → IndexedJobで超並列評価 → MLflow集計
という流れで、**再現性とスケーラビリティを両立**する。

### 詳細解説（用語）

* **Indexed Job**：Kubernetes Jobの拡張。Indexごとにデータ分割して並列実行できる
* **Reproducible Environment**：ライブラリやCUDAの差で結果が変わるのを防ぐ
* **MLflow**：実験ログ/メトリクス/アーティファクト管理

### Tips（実務）

* “評価はCIに組み込む”のが最強：

  * PR単位で小規模評価
  * mainマージ後に大規模評価（夜間Karpenterでスケール）
* 失敗時の再実行が簡単な設計（Index単位で再実行できる）にすると運用が楽

---

## １２ 事例：大規模運用での効果（Uber / Roblox 等の思想）

![GP12.実践事例：UberとRobloxの成果](/images/IaC/GP12.実践事例：UberとRobloxの成果.jpg)

### 図の要旨

大規模環境では「高価なGPUを眠らせない」ことが直接コストに効く。
MIG/Time-slicing/オートスケール/評価自動化を組み合わせて、利用率や供給効率を改善する。

### 詳細解説（用語）

* **GPU効率化**：単に台数削減ではなく「同じ台数でより多く処理」も含む
* **多テナント**：複数チームが同一クラスタを共有（Quota/公平性が必須）

### Tips（実務）

* 事例の本質は「技術」より「運用設計」

  * 監視 → ルール → 自動化（Karpenter/Quota/Job設計）
    をセットで回すと再現できる

---

## １３ まとめ：Slice / Orchestrate / Optimize（3ステップ）

![GP13.結論：AIを「賢く」実行するための３ステップ](/images/IaC/GP13.結論：AIを「賢く」実行するための３ステップ.jpg)

### 図の要旨

1. **Slice**：MIG/Time-slicingでGPUを分割
2. **Orchestrate**：Kubernetesで正しく配る（Device Plugin / Scheduling / Quota）
3. **Optimize**：vLLM / PD分離 / パイプラインで“使い切る”

### 詳細解説（用語）

* **Orchestration**：資源配分、スケジューリング、分離、監視、拡張を一体で扱う
* **Optimize**：単体性能だけでなく、クラスタ全体のスループット最適化

### Tips（実務）

* 最短で成果を出す順序：

  1. 観測（利用率・レイテンシ・メモリ）
  2. vLLM等でバッチング改善
  3. Time-slicingで密度UP（軽量用途）
  4. MIGで本番QoS確保
  5. KarpenterでScale to Zero（評価/バッチ）

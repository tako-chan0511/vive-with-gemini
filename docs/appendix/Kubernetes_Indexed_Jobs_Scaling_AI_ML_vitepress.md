# Kubernetes Indexed Jobs：大規模並列タスクをマスターする（AI/MLスケール実践）

## 1. 表紙：Indexed Jobで「大規模並列タスク」をマスターする
![KIJ1.KubernetesIndexedJobs：大規模並列タスクをマスターする](/images/IaC/KIJ1.KubernetesIndexedJobs：大規模並列タスクをマスターする.jpg)

### 図の要旨
- 本資料は、Kubernetesの **Indexed Job** を使って「並列バッチ」を安全・確実にスケールさせる方法を、AI/MLの代表例（評価・学習・探索）に寄せて整理しています。
- ねらいは「外部キューや職人スクリプトに頼らず、**Kubernetesネイティブ**に“番号付きワーカー”を作る」ことです。

### 詳細解説（用語）
- **Job**：完了したら終わる実行単位（Podを起動して、成功したら終了）。
- **Indexed Job**：Jobの各Podに **0..N-1のインデックス** を割り当てるJob（後述の `JOB_COMPLETION_INDEX`）。
- **Static Assignment / Parameter Sweeps / Distributed Training / AI Orchestration**：静的割り当て・パラメータ探索・分散学習・AIパイプライン統合の代表ユースケース。

### Tips（実務）
- まずは「**同じ処理をN分割**」できるか（完全並列か）を確認し、Indexed Jobで“番号＝担当範囲”に固定すると、事故が減ります。
- “AI/LLM評価”のように大量試行する処理は、**ログにインデックスを必ず出す**だけで、デバッグ速度が段違いになります。

---

## 2. なぜIndexed Jobなのか：従来方式の限界と解決策
![KIJ2.スケールする並列処理の課題：なぜIndexedJobなのか](/images/IaC/KIJ2.スケールする並列処理の課題：なぜIndexedJobなのか.jpg)

### 図の要旨
- **従来方式（The Old Way）**：外部キュー（Redis/RabbitMQ等）＋ワーカー群で分散、という構成は、スケールすると「競合・取りこぼし・再実行の難しさ」が表面化します。
- **Indexed Job方式（The Indexed Job Way）**：Kubernetesが **インデックス（0,1,2…）** を配り、各Podは「自分の番号の仕事だけ」やればよい設計になります。

### 詳細解説（用語）
- **Work Queues（外部キュー依存）**：キューが単一障害点になりがち、運用コストも増えがち。
- **Race Conditions（競合状態）**：複数ワーカーが同じ仕事に触ってしまう等の非決定性バグ。
- **Embarrassingly Parallel（完全並列）**：タスク間の依存がほぼ無く、バラして同時実行できる状態（評価や変換などに多い）。

### Tips（実務）
- 完全並列なら「**インデックス＝担当範囲**」に寄せると、排他制御・再開・検証が一気に簡単になります。
- 外部キューが必要になるのは、(a)動的に仕事が増減、(b)仕事時間が極端に不均一、(c)リアルタイム性が強い、など。まずはIndexed Jobで成立させ、必要になったらキューへ、が安全です。

---

## 3. コアメカニズム：Completion Indexの仕組み
![KIJ3.コアメカニズム：CompletionIndexの仕組み](/images/IaC/KIJ3.コアメカニズム：CompletionIndexの仕組み.jpg)

### 図の要旨
- Indexed Jobでは、Control PlaneがPodを複数起動し、それぞれに **`JOB_COMPLETION_INDEX=0..`** を注入します。
- これにより「Pod Aは0番」「Pod Bは1番」…と **担当が固定** されます。

### 詳細解説（用語）
- **`spec.completionMode: Indexed`**：この指定で“Indexed Job”になります。
- **環境変数 `JOB_COMPLETION_INDEX`**：Pod内プロセスが参照できる「自分の番号」。
- **Downward API**：Podメタデータ（annotations等）をコンテナ内に注入する仕組み。

### Tips（実務）
- アプリ側は「**インデックスがあれば完結**」します。JobのPod名をパースするより、`JOB_COMPLETION_INDEX` 参照が堅牢です。
- 再実行（失敗→再試行）でも「同じインデックスが同じ担当」を維持できるため、**冪等（idempotent）** に作りやすいです。

---

## 4. 実装の基礎：YAML構成とDownward API
![KIJ4.実装の基礎：YAML構成とDownwardAPI](/images/IaC/KIJ4.実装の基礎：YAML構成とDownwardAPI.jpg)
### 図の要旨
- YAMLで「総タスク数」「同時実行数」「Indexed有効化」「Downward APIによる注入」を定義します。
- キーは **`completions`（総数）** と **`parallelism`（同時実行）**。

### 詳細解説（用語）
- **`spec.completions`**：完了すべきPod数（=タスク総数）。例：5なら index 0..4。
- **`spec.parallelism`**：同時に走らせるPod上限（クラスタ資源に合わせる“スロット数”）。
- **`metadata.annotations['batch.kubernetes.io/job-completion-index']`**：Kubernetesが付与するインデックスが入る場所（Downward APIで参照）。

### Tips（実務：雛形）
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: indexed-job
spec:
  completions: 100          # 総タスク数（0..99）
  parallelism: 10           # 同時実行数（資源に合わせる）
  completionMode: Indexed   # ★これがIndexed Job
  backoffLimit: 2           # 失敗時の再試行回数（後述）
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: worker
        image: your-image
        env:
        - name: JOB_COMPLETION_INDEX
          valueFrom:
            fieldRef:
              fieldPath: metadata.annotations['batch.kubernetes.io/job-completion-index']
```

---

## 5. パターン1：静的ワーク割り当て（Static Work Assignment）
![KIJ5.パターン1：静的ワーク割り当て（StaticWorkAssignment）](/images/IaC/KIJ5.パターン1：静的ワーク割り当て（StaticWorkAssignment）.jpg)

### 図の要旨
- 「ファイルA〜D」など、分割済み入力を **インデックスに対応付け** て各Podに割り当てる方式です。
- もっともシンプルで、外部キュー不要・挙動が読みやすいのが強みです。

### 詳細解説（用語）
- **Static Assignment**：タスク集合を事前に固定し、担当も固定する割り当て。
- **シャーディング（Sharding）**：データを分割して並列に処理すること。

### Tips（実務：Shell例）
```bash
# 例：入力ファイルがインデックス順に並ぶ前提
items=(fileA fileB fileC fileD)
idx="${JOB_COMPLETION_INDEX}"
target="${items[$idx]}"
process_item "$target"
```
- 実務では「ファイル一覧の順序が変わる」事故が起きがちです。**ソート順を固定**（例：S3キー順、DBのORDER BY）し、必ずログに `idx` と `target` を出しましょう。
- Use Cases（図の例）：動画フレームのレンダリング、ログ解析、大規模データのフォーマット変換。

---

## 6. パターン2：大規模パラメータ探索・シミュレーション（Parameter Sweeps）
![KIJ6.パターン2：大規模パラメータ探索とシミュレーション](/images/IaC/KIJ6.パターン2：大規模パラメータ探索とシミュレーション.jpg)

### 図の要旨
- インデックスを **乱数シード** に使い、パラメータ探索を再現性ある形で回せます（Deterministic Seeding）。
- 「何千回の試行で失敗したか」をインデックスで追えるのが最大の利点です。

### 詳細解説（用語）
- **Parameter Sweep**：複数のパラメータ組み合わせを総当たり/探索して評価すること。
- **Deterministic Seeding**：同じシードなら同じ乱数列＝同じ挙動になり、再現性が高い。

### Tips（実務：Python例）
```python
import os, random
idx = int(os.environ["JOB_COMPLETION_INDEX"])
random.seed(idx)

# 例：idxからパラメータを決める（単純な例）
lr = [1e-4, 3e-4, 1e-3][idx % 3]
batch = [16, 32, 64][(idx // 3) % 3]
print("idx", idx, "lr", lr, "batch", batch)
```
- 「異常が出た idx を再実行」するだけで再現できるので、**“再現テスト”が自動化**できます。
- ログには `idx` と “パラメータセット” を必ず残す（図にも記載の思想）。

---

## 7. パターン3：分散学習（Distributed Training）
![KIJ7.パターン3：分散学習（DistributedTraining）](/images/IaC/KIJ7.パターン3：分散学習（DistributedTraining）.jpg)

### 図の要旨
- Indexed Jobのインデックスを **分散学習のrank** に対応させると、rank0〜rankNの世界が作れます。
- 図では PyTorch / torchrun を例に、`NODE_RANK` 等へ変換しているイメージです。

### 詳細解説（用語）
- **Rank**：分散学習での“プロセス番号”（rank0がMaster役）。
- **World Size**：プロセス総数。
- **Headless Service**：固定のDNS名でPod同士を解決しやすくするService（Masterの名前解決に使うことが多い）。

### Tips（実務）
- GPU分散学習では、Jobだけでなく **MPI Operator / Kubeflow Training Operator** 等の採用も検討対象です（要件次第）。
- 小さく始めるなら「Rank計算＋Masterアドレス固定」の2点をまず固めると良いです。例：`NODE_RANK = JOB_COMPLETION_INDEX`、`WORLD_SIZE = completions`、`MASTER_ADDR` は headless service のDNS。

---

## 8. AIフロンティア：LLM評価パイプラインの並列化（RAGAS/DeepEval等）
![KIJ8.AIフロンティア：LLM評価パイプラインの並列化](/images/IaC/KIJ8.AIフロンティア：LLM評価パイプラインの並列化.jpg)

### 図の要旨
- 10,000プロンプト等の評価セットを **範囲で分割**（0-999, 1000-1999…）し、Podで並列評価。
- まとめて集計（Aggregate Results）し、CI/CDの **Quality Gate（合否）** に繋げる構図です。

### 詳細解説（用語）
- **Shard（分割戦略）**：評価対象を分割し、Podごとに担当範囲を持たせる。
- **Quality Gate**：評価スコアが閾値を満たさない場合にPRを落とす等の品質ゲート。

### Tips（実務）
- 範囲割りは「固定レンジ」が分かりやすい：`start = idx * chunk_size`, `end = min(start+chunk_size, total)`。
- 結果はPodごとに `results/part-<idx>.jsonl` のように保存し、最後に集計Job/Stepでまとめると安全。

---

## 9. オーケストレーション：Argo Workflowsとの統合
![KIJ9.オーケストレーション：ArgoWorkflowsとの統合](/images/IaC/KIJ9.オーケストレーション：ArgoWorkflowsとの統合.jpg)

### 図の要旨
- ArgoのDAGで **前後関係を管理**しつつ、並列部をIndexed Jobに任せる統合パターンです。
- withSequence/withParam で“動的に並列を決める”のがArgoの強み。

### 詳細解説（用語）
- **DAG**：依存関係グラフ。前段（Data Prep）→並列（Indexed Job）→集計、など。
- **WorkflowTemplate**：再利用可能なテンプレ化。

### Tips（実務）
- “Map-Reduce”を意識すると設計しやすい：Map＝Indexed Job、Reduce＝集計Pod（Single Pod）。
- まずは Argo無し（Job単体）で成立→必要になったらArgoへ、が事故が少ないです。

---

## 10. インフラ最適化：GPUリソースの最大活用（MIG / Time-Slicing / Karpenter）
![KIJ10.インフラ最適化：GPUリソースの最大活用](/images/IaC/KIJ10.インフラ最適化：GPUリソースの最大活用.jpg)

### 図の要旨
- GPUは高価なので「分割して使う（MIG）」「時間分割で共有（Time-Slicing）」「需要に応じて増減（Karpenter）」の3系統が紹介されています。

### 詳細解説（用語）
- **MIG（Multi-Instance GPU）**：GPUをハードウェアレベルで分割（強い分離、ただし構成依存）。
- **Time-Slicing**：ソフトウェアで時間共有（軽量、ただし性能ブレやメモリ取り合いに注意）。
- **Karpenter**：JobのPendingを検知してノードを増やすオートスケーラー（コスト最適化に効く）。

### Tips（実務）
- “評価ジョブ”はピークだけGPUが欲しいことが多いので、Karpenterで **オンデマンドにGPUノード追加** が効きます。
- MIG/Time-slicingは運用ルール（どのジョブが使えるか）を決めないと混乱しがち。まずは「評価はTime-slicing、学習は専有」など用途で分けるのが安全。

---

## 11. 先進アーキテクチャ：Prefill-Decode Disaggregation（PD分離）
![KIJ11.先進アーキテクチャ：PD分離（Prefill-DecodeDisaggregation）](/images/IaC/KIJ11.先進アーキテクチャ：PD分離（Prefill-DecodeDisaggregation）.jpg)

### 図の要旨
- LLM推論を「Prefill（プロンプト処理）」と「Decode（生成）」に分け、**必要な資源が異なる**ことを利用して最適配置します。
- PrefillはCompute heavy、DecodeはMemory bandwidth heavy、という整理です。

### 詳細解説（用語）
- **KV Cache**：推論の中間状態（Key/Value）。Prefill→Decodeへ渡すと効率が上がる。
- **Disaggregation**：機能を分割し、別Pod/Nodeに配置する設計。

### Tips（実務）
- これは“LLM Serving最適化”の話なので、評価基盤の最後に「将来の発展」として置くのが分かりやすいです。
- 実装は複雑化しやすいので、まずは「評価ジョブ（バッチ）」をIndexed Jobで固め、Servingは別トラックで考えると良いです。

---

## 12. 運用ベストプラクティス：ストレージとデータ転送（Thundering Herd対策）
![KIJ12.運用ベストプラクティス：ストレージとデータ転送](/images/IaC/KIJ12.運用ベストプラクティス：ストレージとデータ転送.jpg)

### 図の要旨
- 1000Podが同時にダウンロードするとS3やNFSが詰まる「Thundering Herd Problem」が起きます。
- 対策として、(1)Streaming、(2)Shared Filesystems（RWX PVC）、(3)Container Images、の3案が示されています。

### 詳細解説（用語）
- **RWX PVC**：複数PodがReadWriteできるPVC（共有ファイルシステム向き）。
- **Streaming**：必要な分だけ逐次読み出す（データ全体の同時DLを避ける）。

### Tips（実務）
- 評価データは「小さく分割して各Podが必要分だけ取る」が基本。
- 共有FSを使うなら、Podごとの作業ディレクトリを `.../run/{idx}/` のように分けると衝突を防げます。
- 大きいモデル重みは「イメージに同梱」より、**InitContainerでキャッシュ**してVolumeに置く方が更新しやすい場合が多いです。

---

## 13. CI/CD統合：GitHub Actionsによる自動化
![KIJ13.CACD統合：GitHubActionsによる自働化](/images/IaC/KIJ13.CACD統合：GitHubActionsによる自働化.jpg)

### 図の要旨
- Push/PRをトリガーに、(1)Dockerビルド→(2)Indexed Jobデプロイ→(3)完了待ち→(4)結果をPRへ報告、のループが描かれています。

### 詳細解説（用語）
- **Kubernetes Secrets**：APIキー等を安全に注入する仕組み（平文を避ける）。
- **`backoffLimit`**：失敗Podのリトライ上限。無限リトライを防ぐ。

### Tips（実務）
- “評価”は失敗時の再試行で回復することも多いので、`backoffLimit: 1〜3` くらいをまず設定しておくと実務向きです。
- PRに返す情報は「合否＋失敗したidx一覧」だけでも価値が高いです（再現が容易）。

---

## 14. まとめ：マスタリーへのロードマップ（Level 1〜4）
![KIJ14.まとめ：マスタリーへのロードマップ](/images/IaC/KIJ14.まとめ：マスタリーへのロードマップ.jpg)

### 図の要旨
- Level1（Foundation）→Level2（Patterns）→Level3（Scale & AI）→Level4（Optimization）の階段になっています。
- Indexed Jobは“AI/ML時代のスケーラブルな計算基盤”の中核、という主張です。

### Tips（実務）
- 実装ロードマップのおすすめ：
  1) Level1：Indexed Jobを動かす（ログにidx）
  2) Level2：Static assignment / Param sweep を定着
  3) Level3：評価パイプライン（品質ゲート）へ統合
  4) Level4：GPU最適化は最後に（要件が出てから）

---

## 15. 参考文献・リソース
![KIJ15.参考文献＆リソース](/images/IaC/KIJ15.参考文献＆リソース.jpg)

### 図の要旨
- Kubernetes Indexed Job公式ドキュメント、Argo Workflows、Karpenter、自動スケールや分散学習の参考リソースが並んでいます。

### Tips（実務）
- まず読む順は、(1)Kubernetes Indexed Job docs → (2)Argo withSequence → (3)Karpenter、が理解しやすいです。
- “分散学習”と“LLM Serving最適化（PD分離）”は前提が増えるので、基礎が固まってからでOKです。
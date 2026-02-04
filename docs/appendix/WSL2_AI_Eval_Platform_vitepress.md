# WSL2で構築するスケーラブルなAI評価基盤：Docker→Kubernetes→並列評価→自動化（ローカル実装ガイド）

## 1. 表紙：このガイドで作るもの（ローカルAI評価“工場”）

![Ws1.WSL2で構築するスケーラブルなAI評価基盤](/images/IaC/Ws1.WSL2で構築するスケーラブルなAI評価基盤.jpg)

### 図の要旨
- **Windows 11 + WSL2** のローカルPC上に、AI評価を回すための「仮想AI工場（Virtual AI Factory）」を作るロードマップです。
- 目標は「**AIガードレール（品質・安全の基準）**」と「**高速並列テスト**」を、手元の環境で再現可能にすること。

### 詳細解説（用語）
- **AI評価基盤**：LLM/AIの回答品質（正確性、根拠、害の回避など）を、テストとして継続的に計測できる仕組み。
- **ガードレール（Guardrails）**：守るべきルール（例：機密を出さない、危険手順を出さない、出典を示す等）。
- **並列テスト**：テストケースを分割して同時実行し、総時間を短縮する手法。

### Tips（実務）
- “評価”は「たまに手で確認」だと改善が積み上がりません。  
  → **テストとして自動化**し、**失敗を検知できる形**にすると運用品質が一段上がります。

---

## 2. なぜコンテナ & オーケストレーションが必要か

![Ws2.なぜAI評価にコンテナとオーケストレーションが必要なのか？](/images/IaC/Ws2.なぜAI評価にコンテナとオーケストレーションが必要なのか？.jpg)

### 図の要旨
- **ローカルスクリプト運用（手動）** は、  
  - 大量テストが遅い（例：5,000件＝24時間）  
  - 依存関係が崩れやすい（Python/CUDAの衝突）  
  - リソースを使い切れない（CPU/メモリ/GPU配分が手作業）  
  という形で破綻しやすい。
- **Kubernetes（自動化）** で、  
  - テストケースを分割し多数Podで並列化  
  - Dockerで再現性（誰のPCでも同じ結果）  
  - GPU/CPU/メモリをワークロードに割り当て  
  ができる。

### 詳細解説（用語）
- **コンテナ（Docker）**：アプリと依存関係を“箱”に固める。環境差で壊れにくい。
- **オーケストレーション（K8s）**：箱（Pod）を、何個・どこで・いつ動かすかを自動制御する仕組み。
- **再現性（Reproducibility）**：同じ入力なら、誰がどこで動かしても同じ手順・同じ結果になる性質。

### Tips（実務）
- “評価が遅い”は、改善の速度を殺します。  
  → **並列化して数分で回る**ようにすると、プロンプト/モデル改善が回り始めます。

---

## 3. Windows→WSL2→Docker→Minikube→Pod の積み上げ構造

![Ws3.アーキテクチャスタック：WindowsからPodまでの道のり](/images/IaC/Ws3.アーキテクチャスタック：WindowsからPodまでの道のり.jpg)

### 図の要旨
- 上から **推論（vLLM）／評価ロジック（DeepEval）／ワークフロー（Argo）** を動かし、
- それらを **Minikube（ローカルK8s）** がオーケストレーションし、
- 下では **Docker Engine** と **WSL2（Ubuntu）** が実行基盤になり、
- 最下層の **Windows 11 + NVIDIAドライバ** のGPUを **GPU Passthrough** で使う構成。

### 詳細解説（用語）
- **Minikube**：ローカルPC上でKubernetesクラスタを“1台分”起動できるツール。
- **GPU Device Plugin**：K8sがGPUをPodへ割り当てられるようにする仕組み。
- **GPU Passthrough**：ホストOSのGPUを仮想化層から利用可能にする方式（WSL2はこれが強い）。

### Tips（実務）
- ここで理解すべき“事故防止の視点”は2つ：  
  1) **Docker Engineがどこで動いているか**（Windows側かWSL側か）  
  2) **GPUがK8sに見えているか**（Podの `nvidia.com/gpu` が取れるか）

---

## 4. Phase 1：WSL2へ Docker Engine を直接インストール

![Ws4.Phase1：WSL2へのDockerEngine直接インストール](/images/IaC/Ws4.Phase1：WSL2へのDockerEngine直接インストール.jpg)

### 図の要旨
- Docker Desktopを使わず、WSL2（Ubuntu）側に **Docker Engine** を直接導入して軽量にする手順。
- 旧パッケージ除去 → リポジトリ設定 → `docker-ce` 系導入 → ユーザ権限付与の流れ。

### 詳細解説（用語）
- **Docker Engine**：コンテナを起動する中核（daemon + CLI）。
- **dockerグループ**：`sudo` なしでdockerコマンドを叩くための権限グループ。
- **WSL2再起動**：WSLは再起動しないと設定が反映されないケースがある。

### Tips（実務）
- まずは **`docker version`** で “Server” が見えることを確認。  
- WSL2の再起動は PowerShell で **`wsl --shutdown`** → 再起動が確実。

---

## 5. Phase 2：MinikubeでローカルKubernetesクラスタ構築

![Ws5.Phase2：MinikubeによるローカルKubernetes構築](/images/IaC/Ws5.Phase2：MinikubeによるローカルKubernetes構築.jpg)

### 図の要旨
- `minikube start --driver=docker` で、Dockerを土台にK8sクラスタを起動。
- `kubectl get po -A` で kube-system のPodが Running になっていることを確認。

### 詳細解説（用語）
- **kubectl**：Kubernetesを操作するCLI。
- **kube-system**：K8s自身のコンポーネントが動くnamespace。
- **Docker driver**：Minikubeが“Docker上で”クラスタを動かす方式。

### Tips（実務）
- ここで躓いたら “まずはCPUだけでクラスタ起動” を先に成功させると切り分けが速いです。  
  → GPUは次フェーズで入れればOK。

---

## 6. Phase 3：GPUアクセラレーションを有効化

![Ws6.Phase3：GPUアクセラレーションの解放](/images/IaC/Ws6.Phase3：GPUアクセラレーションの解放.jpg)

### 図の要旨
- Windows側のGPUドライバを使い、WSL2側は **NVIDIA Container Toolkit** を入れるだけでよい、という方針。
- `nvidia-ctk runtime configure` → Docker再起動 → Minikubeに `--gpus=all` 付与、または device-plugin導入で、PodからGPUを見せる。

### 詳細解説（用語）
- **NVIDIA Container Toolkit**：コンテナからNVIDIA GPUを使うためのランタイム周辺ツール。
- **`nvidia.com/gpu`**：K8s上でGPUをリクエストするためのリソース名。
- **Device Plugin**：GPUなど特殊デバイスをK8sに“資源”として登録する仕組み。

### Tips（実務）
- 最短の確認：  
  - WSL2で `nvidia-smi` が動く  
  - K8sで GPU割当てPodを起動して `nvidia-smi` が動く  
- 「Podは動くがCPUで回っていた」事故は多いです（次ページのGPU明示が重要）。

---

## 7. AI向けDockerfile：マルチステージ & 再現性

![Ws7.AIワークロードのためのDockerfileベストプラクティス](/images/IaC/Ws7.AIワークロードのためのDockerfileベストプラクティス.jpg)

### 図の要旨
- Bad：巨大イメージ・依存が混ざる・ビルドが遅い  
- Good：**マルチステージ**／**レイヤキャッシュ**／**バージョン固定** で安定・高速化

### 詳細解説（用語）
- **マルチステージビルド**：build用とruntime用でイメージを分け、最終成果物だけを小さくする。
- **レイヤキャッシュ**：`requirements.txt` を先にCOPYして依存だけ先にinstallすると、変更が少ない限り再ビルドが速い。
- **再現性**：`pip-compile` 等で依存バージョンを固定すると崩れにくい。

### Tips（実務）
- “評価基盤”は継続運用するので、**イメージのビルド時間**と**壊れにくさ**が効いてきます。  
- 依存の固定は「今日動く」ではなく「来月も動く」に効きます。

---

## 8. 巨大モデル（Weights）をイメージに入れない：PVCで外出し

![Ws8.巨大なモデルファイルの管理戦略](/images/IaC/Ws8.巨大なモデルファイルの管理戦略.jpg)

### 図の要旨
- 重いモデルWeightsをDockerイメージに含めると、数十GB〜で **デプロイ/スケールが遅い**（Cold Start地獄）。
- 代わりに **PVC（PersistentVolumeClaim）** を用意し、Podに `/models` でマウントする。

### 詳細解説（用語）
- **PVC**：永続ストレージ要求。Podが消えてもデータ（モデルキャッシュ）が残る。
- **Cold Start**：新規Pod起動時に必要な初期ロードで遅くなる現象（モデルDLが典型）。
- **Mount**：コンテナ内のパスに外部ストレージを接続すること。

### Tips（実務）
- まずはPVCでキャッシュを作り、**“2回目以降が速い”状態**を作ると評価が回り始めます。
- さらに進めると、Nodeローカルキャッシュやレジストリ/アーティファクト管理と組み合わせます。

---

## 9. vLLM推論サーバのDeployment：GPUは明示リクエスト

![Ws9.推論サーバーのデプロイメント定義](/images/IaC/Ws9.推論サーバーのデプロイメント定義.jpg)

### 図の要旨
- vLLMをK8s上に配置し、**GPUリソースを明示**して動かす例。
- 重要ポイント：`resources.limits` に `nvidia.com/gpu: "1"` を入れないと **CPU fallback** する危険。

### 詳細解説（用語）
- **Deployment**：Podを指定数維持し、更新も行える基本リソース。
- **Secret**：トークンなど機密値を安全に注入する仕組み（Hugging Face Token等）。
- **CPU fallback**：GPUが取れずCPUで動き、遅いのに気づきにくい事故。

### Tips（実務）
- “GPUが使えてるか”は、ログより **Pod内で `nvidia-smi`** が確実です。  
- imageタグは `latest` より **固定タグ**が安全（再現性）。

---

## 10. Indexed Jobで評価を並列化：5,000件を分割実行

![Ws10.K8sJobsによる並列評価の実行](/images/IaC/Ws10.K8sJobsによる並列評価の実行.jpg)

### 図の要旨
- Dataset（例：5000件）を shard で分割し、複数Podで同時に評価し、最後にレポート集約。
- **Indexed Job** で `JOB_COMPLETION_INDEX` を使い、担当シャードをPodごとに割り当てる。

### 詳細解説（用語）
- **Job**：完了したら止まるバッチ実行（評価に最適）。
- **Indexed Job**：Podごとに“番号（index）”を持たせて、分割処理を簡単にする方式。
- **Shard**：データ分割単位（例：5000件→1000件×5など）。

### Tips（実務）
- 最初は **parallelism=2〜5** 程度で安定させ、GPU/メモリを見ながら増やすのが安全です。
- レポートはS3等に集約して、Job完了後にまとめると運用が楽になります。

---

## 11. Argo Workflows：DAGで“評価パイプライン”を自動化

![Ws11.ArgoWorkflowaによるパイプラインの自働化](/images/IaC/Ws11.ArgoWorkflowaによるパイプラインの自働化.jpg)

### 図の要旨
- 「データ生成 → 複数モデル評価 → 集約」のような依存関係を、DAGとして定義して自動実行。
- 単発Jobよりも“手順”が標準化され、評価の再現性が上がる。

### 詳細解説（用語）
- **Argo Workflows**：K8s上でワークフローをDAGとして実行する仕組み。
- **DAG**：有向非巡回グラフ。タスクの依存関係を表現する定番構造。
- **Aggregate**：各評価結果を統合し、指標をまとめる処理。

### Tips（実務）
- モデル比較（GPT系 vs OSS）をするなら、Argoで **モデルを配列で回す**と整う（再実行も簡単）。
- 失敗時の再実行や部分再実行がしやすいのもメリットです。

---

## 12. DeepEval：評価ロジックを“コード化”して品質を数値化

![Ws12.DeepEvalによる評価ロジックの実装](/images/IaC/Ws12.DeepEvalによる評価ロジックの実装.jpg)

### 図の要旨
- DeepEvalのPythonで、LLM出力を **テストケース**として扱い、メトリクス（例：G-Eval）で合否判定する例。
- 重要ポイント：このスクリプトを **Dockerイメージに含め**、K8s Jobで実行する。

### 詳細解説（用語）
- **LLMTestCase**：入力・出力・（RAGなら）retrieval_contextをまとめた評価単位。
- **G-Eval**：LLMを使った評価手法の一種（評価者としてLLMを使う）。
- **threshold**：合格ライン（例：0.7以上でPassなど）。

### Tips（実務）
- まずは **3〜10件の固定テスト**から開始し、運用しながら追加していくと破綻しません。
- RAG評価では、`retrieval_context`（根拠）が入っているかが重要。  
  → “正答っぽいが根拠なし”は別の失敗として扱うと改善が早いです。

---

## 13. GitHub Actions：push→ビルド→デプロイ→Pass/Fail

![Ws13.GitHubActionsとのCICD統合](/images/IaC/Ws13.GitHubActionsとのCICD統合.jpg)

### 図の要旨
- git push → Actions runner  
  → Docker build → Registry push  
  → `kubectl apply -f job.yaml`  
  → Job完了待ち → レポートでPass/Fail
- “評価をCIの一部”に入れて、品質回帰を検知する。

### 詳細解説（用語）
- **Registry**：Dockerイメージ置き場（GHCR/ECR等）。
- **Self-hosted runner**：手元や社内に置いたActions実行環境（K8sへ接続しやすい）。
- **kubeconfig**：K8sへ接続する設定（権限情報を含む）。

### Tips（実務）
- kubeconfigは **Base64でSecrets保存**が定番。  
- CIは「毎回全部」より、まずは **PR時は軽量評価 / mainはフル評価** の二段が現実的です。

---

## 14. トラブルシューティング：4大ハマりどころ

![Ws14.トラブルシューティングと最適化](/images/IaC/Ws14.トラブルシューティングと最適化.jpg)

### 図の要旨
- **Memory**：WSL2がホストメモリを食いがち → `.wslconfig` で上限制御
- **Networking**：Serviceにアクセスできない → `minikube service --url` / port-forward
- **GPU Not Found**：`nvidia-smi` が動かない → Windowsドライバ更新 / toolkit再設定
- **Disk Space**：イメージとモデルでディスク圧迫 → `docker system prune` 等で掃除

### 詳細解説（用語）
- **.wslconfig**：Windows側でWSL2のメモリ/CPU上限などを設定するファイル。
- **port-forward**：ローカルポートをPod/Serviceへ転送するデバッグ手段。
- **prune**：不要なイメージ/コンテナ/キャッシュを削除する。

### Tips（実務）
- まず “何が足りないか” を決め打ち：メモリ？GPU？ネットワーク？ディスク？  
  → 観測（`kubectl describe`, `kubectl logs`, `df -h`, `docker system df`）で切り分けが最短です。

---

## 15. 7日間ロードマップ：ゼロから自動化まで

![Ws15.7日間アクションプラン：実装へのロードマップ](/images/IaC/Ws15.7日間アクションプラン：実装へのロードマップ.jpg)

### 図の要旨
- Day1-2：WSL2/Docker/Minikube/GPU確認  
- Day3-4：DeepEvalスクリプト作成、Dockerイメージ化  
- Day5-6：K8s manifests、並列Jobで評価  
- Day7：Argo Workflows / CI/CD統合

### 詳細解説（用語）
- **Orchestration**：並列化・依存関係・資源配分を“自動で回す”設計思想。
- **Automation**：人の手順をCI/CDに落とし、再現性を確保すること。

### Tips（実務）
- 最後の一文がこの資料の本質です：  
  **「インフラ構築は手段。真の目的は、自信を持ってAIをリリースできる『品質の安全網』を手に入れること」**  
- “品質の安全網”は、テストケースとメトリクスが資産。小さく始めて増やすのが勝ち筋です。

## 16. まとめ：Kubernetesの主要キャラクター図鑑（AI/MLインフラを支える登場人物たち）

![Ws16.まとめ：K8sの主要キャラクター図鑑：AI＆MLインフラを支える登場人物たち](/images/IaC/Ws16.まとめ：K8sの主要キャラクター図鑑：AI＆MLインフラを支える登場人物たち.jpg)

### 図の要旨
- **左（ワークロード＝現場の作業員たち）**：AI評価の「実行単位」を表す（Job / Indexed Job / Pod / Docker）。
- **中央（管理＝司令塔と作業場）**：ワークロードを“継続稼働”させる仕組み（Deployment）。
- **右（窓口と増員係）**：アクセス経路と負荷に応じた自動スケール（Service / HPA）。
- **下（計算資源の土台）**：実際に走るマシンとGPUの分割・共有（Node / MIG / Time-Slicing）。
- **右下（自動で増設）**：ノード自体を増減する仕組み（Karpenter）。

---

### 詳細解説（用語）
#### 左：ワークロード（最小単位）
- **Pod（ポッド）**：Kubernetesの最小実行単位（1つ以上のコンテナのまとまり）。  
  - AI評価なら「評価スクリプトを走らせるコンテナ」や「vLLM推論サーバ」などがPodで動く。
- **Docker（コンテナ）**：アプリと依存関係を“箱”に固めた実行物。  
  - 「Python + DeepEval + 依存ライブラリ」を固めることで、PC差異で壊れにくくなる。
- **Job（ジョブ）**：**完了したら終わる**バッチ実行。評価（Evals）に最適。  
  - 例：データセット5000件の評価を回して、レポート生成したら終了。
- **Indexed Job（インデックス付きJob）**：Jobを並列化するときに「担当番号」を持てる方式。  
  - `JOB_COMPLETION_INDEX` 等で **“このPodは shard=3 を処理”** のように割り当てられる。

#### 中央：管理（司令塔）
- **Deployment（デプロイメント）**：**常に指定数のPodを維持**し、更新（ローリングアップデート）も面倒を見る。  
  - 推論サーバ（vLLM/TGI など）のように、常時待ち受けるサービスに向く。
  - 評価Jobは「常時待機」ではないので、基本はJob側に寄せるのが自然。

#### 右：窓口と自動増員
- **Service**：Pod群への“入り口”（安定したIP/名前）を提供する。  
  - 推論サーバをPodで動かしてもIPは変わるため、Serviceで固定のアクセス先を作る。
- **HPA（Horizontal Pod Autoscaler）**：負荷（CPU/GPU/独自メトリクス）でPod数を自動増減。  
  - 例：推論要求が増えたら vLLM Pod を増やす、落ち着いたら減らす。

#### 下：計算資源（NodeとGPUの分割）
- **Node（ノード）**：実際の計算資源（マシン）。Podは必ずどれかのNode上で動く。
- **MIG（Multi-Instance GPU）**：1枚のGPUを **ハードウェア的に分割**して安全に使う方式（NVIDIA A100/H100等）。  
  - 強み：分割ごとに“隔離”され、安定しやすい（エンタープライズ向け）。
- **Time-Slicing（タイムスライシング）**：1枚のGPUを **時間で共有**する方式（疑似的に複数Podが使う）。  
  - 強み：柔軟で導入しやすい一方、負荷が重いと“取り合い”になりやすい。
- **Karpenter**：必要に応じてNodeを自動で追加・削除する（主にクラウドで強い）。  
  - ローカルMinikubeでは概念理解として捉え、クラウド移行時に本領発揮。

---

### Tips（実務）
#### 1） 「推論」と「評価」を分けると設計がきれい
- **推論サーバ**：Deployment + Service（必要ならHPA）  
- **評価（Evals）**：Job / Indexed Job（並列でshard処理）

#### 2） “GPUを使っているつもり”事故を防ぐ
- Podの `resources.limits` に `nvidia.com/gpu: 1` のように **GPUを明示**する（指定しないとCPUで動くことがある）。
- 確認はログより **Pod内で `nvidia-smi`** が最短。

#### 3） GPU共有の選び方（ざっくり指針）
- **安定性・隔離が最重要**（複数チームで共用、性能保証が必要）→ MIG優先
- **小さな評価ジョブを大量に回す**（多少のブレは許容）→ Time-Slicingでも回る
- 迷ったら「まずはGPU 1枚を専有」で動かし、後で共有戦略へ拡張が安全

#### 4） この図を“AI評価基盤”に置き換えるとこうなる
- **Indexed Job**＝データセットを分割して評価を並列実行  
- **Service**＝推論サーバ（vLLM）への固定入口  
- **HPA**＝推論負荷でPod数増減（評価はJob側で並列化することが多い）  
- **MIG / Time-Slicing**＝GPUを複数ワークロードで安全に共有するための手段



---

## 付録：この資料を自分の案件に落とすためのチェックリスト（実用）
- [ ] 評価対象（モデル/プロンプト/RAG）の変更点が明確で、回帰を検知したい
- [ ] 評価の観点が言語化できている（例：正確性、根拠、禁止事項、形式、コスト）
- [ ] まずは10件程度の固定テストがある（なければ作る）
- [ ] K8s Jobで分割できるように、テスト入力がShard可能（ファイル/行/IDで分割）
- [ ] GPUが必要な部分（推論）と、CPUで良い部分（集計/前処理）を分離できる
- [ ] CIで回す軽量セット（PR用）と、夜間/マージ後のフルセットを分ける

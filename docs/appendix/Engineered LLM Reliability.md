# 「十分の先へ：LLM評価実践ガイド」Engineered Trust

生成AI（LLM/RAG）の品質は、気合いでも祈りでも上がりません。
**入力・生成・出力の各点に“測定”と“防御（ガードレール）”を実装**して、再現可能な品質へ引き上げます。

---

## この資料の読み方（最重要）

LLM評価・信頼性設計は、だいたい次の3つの仕事に分解できます。

1. **評価（Evaluation）**：どれだけ良い/悪いかを「指標」と「手順」で数値化する
2. **防御（Guardrails）**：事故が起きる前に入力/出力をフィルタ・矯正する
3. **自動化（Automation）**：回し続ける（回帰を止める）ためにCI/CDと並列基盤に乗せる

そして、順番が重要です：

* **Phase 1：定義**（何を“良い”とするか）
* **Phase 2：計測**（現状を数字で掴む）
* **Phase 3：自動化**（回帰をCIで止める）

---

# 1. 表紙：Black Box から Engineered Trust へ

![LT1.「十分」の先へ：LLM評価実践ガイド](/images/LLM/LT1.「十分」の先へ：LLM評価実践ガイド.jpg)

<!-- 画像差し込み位置（jpg）：page_01.jpg -->

## 図の要旨

* **Black Box**：入力→出力が“なんとなく良さそう”で終わる（再現性がない）
* **Engineered Trust**：

  * Input Data（Validated）…入力を検証
  * Prompts（Structured）…プロンプトを構造化
  * Metrics（Quantified）…メトリクスで数値化
  * Guardrails（Active）…ガードレールを実装
  * Output（Verified）…出力を検証して出す

## 用語の超基本

* **評価（Evaluation）**：品質を測る仕組み（テスト・採点）
* **ガードレール（Guardrails）**：事故を防ぐ“制限”や“フィルタ”
* **構造化（Structured）**：自由文ではなく、入力/出力の形式・ルールを決める

## Tips（実務）

* 「モデルを賢くする」より先に、**“周辺の仕組み”で賢く見せる**のが現実解です。
  例：入力検証、RAGの根拠提示、JSONスキーマ強制、禁止事項フィルタ。

---

# 2. テストのパラダイムシフト：決定論から確率論へ

![LT2.テストのパラダイムシフト：決定論から確率論へ](/images/LLM/LT2.テストのパラダイムシフト：決定論から確率論へ.jpg)

## 図の要旨

* 従来ソフト：**決定論（Deterministic）** → Pass/Fail（Boolean）
* 生成AI：**確率論（Probabilistic）** → Score（0.0〜1.0 等）
* 重要なのは「正解か？」より **“許容範囲（Safety Envelope）に収まっているか？”**

## なぜ Pass/Fail だけだと詰むのか

LLMは同じ入力でも出力が揺れます。
そのため、次のような評価軸が必要になります。

* **正確性（Correctness）**：合ってる？
* **妥当性（Relevancy）**：質問に答えてる？
* **忠実性（Faithfulness）**：根拠に沿ってる？（捏造してない？）
* **形式（Format）**：JSON/テンプレ/規約に従ってる？

## Tips（実務）

* まずは「落第条件」を決めると早いです。
  例：**個人情報が含まれたら即NG**、**JSONが壊れたら即NG**、**根拠なし断定はNG**。

---

# 3. 信頼のアーキテクチャ：ガードレールによる多層防御

![LT3.信頼のアーキテクチャ：ガードレールによる多層防衛](/images/LLM/LT3.信頼のアーキテクチャ：ガードレールによる多層防衛.jpg)

## 図の要旨

* **Input Guardrail（入力側）**：PIIマスキング、Injection検出
* **Core LLM / RAG System**：検索（Retrieval）→生成（Generation）
* **Output Guardrail（出力側）**：幻覚チェック、形式バリデーション
* 「モデルは創造」し、**ガードレールは統制**する（Policy Execution Layer）

## ここでの実務ポイント

* モデル自体に「全部守らせる」のは無理が出ます。
* **“前（入力）” と “後（出力）” を固める**と事故率が激減します。

---

# 4. ガードレールの実装：リアルタイム防御の具体策

![LT4.ガードレールの実装：リアルタイム防御の具体策](/images/LLM/LT4.ガードレールの実装：リアルタイム防御の具体策.jpg)

## 図の要旨

### Input Guardrails（入力側）

* Prompt Injection / Jailbreaking 検知（例：OWASP LLM01）
* PII / Sensitive Data マスキング（例：OWASP LLM02）

### Output Guardrails（出力側）

* Hallucination（幻覚）検知
* Toxicity / Bias フィルタ
* Format Compliance（JSONスキーマ等）

## 用語（初心者向け）

* **Prompt Injection**：ユーザー入力で“命令の上書き”を狙う攻撃
* **Jailbreak**：禁止事項を破らせる誘導（DAN等のロールプレイ含む）
* **PII**：個人情報（氏名、住所、電話、メール等）
* **Format Compliance**：出力が“機械で読める形”を守ること（JSON崩れ防止）

## Tips（実務）

* 入力ガードは「拒否」だけでなく、**無害化（sanitize）** が強いです。
  例：PIIを `***` へ置換してからLLMへ渡す。

---

# 5. 評価（Evaluation）のアプローチ：定量化への道

![LT5.評価（Evaluation）のアプローチ：定量化への道](/images/LLM/LT5.評価（Evaluation）のアプローチ：定量化への道.jpg)

## 図の要旨

### Reference-based（正解あり）

* Use Case：FAQ、要約、翻訳、契約文レビューなど
* Method：ゴールデンデータ（正解）とモデル出力を比較
* Metrics：Semantic Similarity、Answer Correctness

### Reference-free（正解なし）

* Use Case：創作、チャット、複雑な推論
* Method：出力品質そのものを評価（採点・ルーブリック）
* Metrics：Toxicity、Hallucination(Self-check)、Coherence

## Tips（実務）

* 最初は **Reference-based を優先**すると進めやすいです。
  “正解が作れる領域”から固めるのが最短ルート。

---

# 6. RAG評価の標準指標：RAGASフレームワーク

![LT6.RAG評価の標準指標：RAGASフレームワーク](/images/LLM/LT6.RAG評価の標準指標：RAGASフレームワーク.jpg)

## 図の要旨（RAG Triad）

* **Question（質問）**
* **Context（検索結果）**
* **Answer（回答）**

そして、測る観点は大きく3つ：

* **Contextual Precision/Recall**：検索の質（余計/不足の度合い）
* **Answer Relevancy**：回答が質問に答えているか
* **Faithfulness**：根拠（Context）に忠実か（捏造してないか）

## 用語（超基本）

* **Precision（適合率）**：出した候補のうち当たりはどれだけ？
* **Recall（再現率）**：当たりをどれだけ取りこぼしてない？
* **Faithfulness**：根拠から言える範囲に留まっているか

## Tips（実務）

* RAGは「生成が悪い」のではなく、**検索が悪い**ことが多いです。
  だから **Retriever と Generator を分けて測る**のが必須です。

---

# 7. LLM-as-a-Judge：評価の自動化

![LT7.LLM-as-a-Judge：評価の自働化](/images/LLM/LT7.LLM-as-a-Judge：評価の自働化.jpg)

## 図の要旨

* Input：Question / Answer / Context / Rubric
* Judge Model（例：高性能モデル）で採点
* Output：Score と Reasoning（理由）

## ルーブリック（Rubric）とは？

「何をもって 5点満点の3点なのか」を言語化した採点基準です。
例（雑な採点は事故ります）：

* 5：正確、根拠あり、簡潔、形式OK
* 3：概ね正しいが、根拠不足/文脈不足がある
* 1：誤り、幻覚、禁止事項、形式崩れ

## Tips（実務）

* Judgeも確率的なので、以下で安定します：

  * 同一ルーブリックで固定
  * 複数回採点して平均/多数決
  * “理由”をログに残してレビュー可能にする

---

# 8. レッドチーミング：敵対的テストによる脆弱性検知

![LT8.レッドチーミング：敵対的テストによる脆弱性検知](/images/LLM/LT8.レッドチーミング：敵対的テストによる脆弱性検知.jpg)

## 図の要旨

* Jailbreaking（脱獄）
* Prompt Injection（命令上書き）
* Data Leakage（個人情報の引き出し）

手動ではなく、ライブラリで **攻撃パターンを自動生成・実行**し、突破できるか検査する。

## Tips（実務）

* “成功した攻撃プロンプト”は資産です。
  → **回帰テスト（再発防止）**に組み込みましょう。

---

# 9. スケーラビリティ課題：なぜPC1台では足りないのか

![LT9.スケーラビリティの課題：なぜPC1代では足りないのか](/images/LLM/LT9.スケーラビリティの課題：なぜPC1代では足りないのか.jpg)

## 図の要旨

* 1評価あたり 5〜10秒
* 回帰テスト 5,000ケース → 7〜14時間（直列）
* 目標：10分（並列実行）

## 重要な考え方

LLM評価は **相互依存が薄い**（ケース同士が独立しやすい）ため、並列化が効きます。

## Tips（実務）

* “夜間バッチで回す”のは第一歩。
* 最終的には **PRごとに最重要スイートだけ即時実行**が理想です（後述CI/CD）。

---

# 10. Docker：再現性の担保と依存関係地獄の解決

![LT10.Docker：再現性の担保と依存関係の解決](/images/LLM/LT10.Docker：再現性の担保と依存関係の解決.jpg)

## 図の要旨

* Problem：Dependency Hell（依存関係地獄） / Works on my machine
* Solution：評価環境を **完全コンテナ化**して差異を消す

  * OS + CUDA Drivers
  * Python Libraries（PyTorch/DeepEval 等）
  * Test Logic & Guardrails

## Tips（実務）

* “評価は実行できること”が価値です。
  Docker化は **評価の再現性＝議論の土台**になります。

---

# 11. Kubernetes：評価パイプラインの並列化エンジン

![LT11.Kubernetes：評価パイプラインの並列化エンジン](/images/LLM/LT11.Kubernetes：評価パイプラインの並列化エンジン.jpg)

## 図の要旨

* Job Request（Dataset 5,000 items）
* Podを複数立てて分割処理（例：100件ずつ）
* 結果を MLflow / S3 に集約

## Tips（実務）

* 重要なのは「分割キー」を決めることです。
  例：case_id のレンジ、シャード番号、seed など。

---

# 12. CI/CD統合：品質フィードバックループの構築

![LT12.CICD統合：品質フィードバックループの構築](/images/LLM/LT12.CICD統合：品質フィードバックループの構築.jpg)

## 図の要旨

1. Code Change（Prompt含む）
2. Trigger CI
3. Docker Build
4. K8s Eval Job
5. Quality Gate（Pass/Fail）
6. Deploy

そして、回帰を止める例：

* Faithfulness < 0.8 ならデプロイ停止

## Tips（実務）

* “品質ゲート”は最初から厳しくしすぎないのがコツです。
  まずは **可視化 → 警告 → ブロック**の順で段階導入すると運用が崩れません。

---

# 13. 推奨技術スタックとツール群

![LT13.推奨技術スタックとツール群](/images/LLM/LT13.推奨技術スタックとツール群.jpg)

## 図の要旨

* Evaluation：DeepEval / RAGAS
* Guardrails & Red Teaming：NVIDIA NeMo / Guardrails AI / Promptfoo / DeepTeam
* Infrastructure：Docker / Kubernetes / MLflow

## Tips（実務）

* ベンダーロックイン回避：
  “評価とログ”を標準化しておくと、モデルやツールを入れ替えても資産が残ります。

---

# 14. 来週からのテストに向けた具体的アクション

![LT14.来週からのテストに向けた具体的アクション](/images/LLM/LT14.来週からのテストに向けた具体的アクション.jpg)

## 図の要旨（3フェーズ）

### Phase 1：Definition（定義）

* Golden Dataset（テストデータ）策定
* ガードレールポリシー言語化

### Phase 2：Baseline（計測）

* 現状モデルのベースライン計測（Faithfulness / Relevancy 等）

### Phase 3：Automation（自動化）

* Docker化された評価スクリプト作成
* CI/CDへ組み込みトライアル

## “定義”で最低限決めるもの（テンプレ）

* 対象ユースケース（例：FAQ、社内検索、要約）
* NG条件（PII、断定、JSON崩れ、根拠なし等）
* 主要指標（例：Faithfulness / Answer Relevancy / Format）
* 合格ライン（例：0.8以上、JSONスキーマ100%など）
* 失敗時の扱い（警告/ブロック/ロールバック）

---

# 15. 結論：AIの信頼性は「祈る」ものではなく「設計」するもの

![LT15.AIの白井精は「祈る」ものではなく「設計」するもの](/images/LLM/LT15.AIの白井精は「祈る」ものではなく「設計」するもの.jpg)

## 図の要旨

* Trust in AI is not prayed for; it is engineered.
* Docker/K8sで基盤を固め、評価（DeepEval等）で定量化し、説明可能な品質へ。

## 最後のTips（現場で効く一言）

* **評価は“議論を終わらせる”道具**です。
  感想戦をやめて、数字とログで合意できる状態を作るのが勝ち筋です。

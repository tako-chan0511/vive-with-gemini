# LLMの評価：感覚から検証可能な品質へ
## description: Vibe Check（なんとなく良さそう）を卒業し、RAG三位一体・Faithfulness・LLM-as-a-Judge・Guardrails・Red Teaming・CI/CD・監視までを「検証可能な品質」として実装する実務ガイド（1ファイル統合版）
--------------------------------------------------------------------------------------------------------------------------------------------

## この資料の読み方（最重要）

LLM（生成AI）やRAG（検索拡張生成）の品質は、従来の **決定論テスト（assert = expected）** では管理できません。
代わりに、次の3点セットで「品質をエンジニアリング」します。

1. **評価（Evals）**：品質をスコア化し、しきい値（Threshold）で判定する
2. **防御（Guardrails）**：入力/出力をリアルタイムに制御して事故を止める
3. **運用（CI/CD + 監視）**：回帰とドリフトを検知し、改善ループを回す

> ゴール：**「なんとなく良さそう（Vibe Check）」をやめ、再現可能な「検証可能な品質」へ。**

---

# 1. 表紙：Vibe Check から Verifiable Quality へ

![LLMe1.LLMの評価：「感覚」から検証可能な品質へ](/images/LLM/LLMe1.LLMの評価：「感覚」から検証可能な品質へ.jpg)

## 図の要旨

* 左：**Vibe Check（主観）**＝「話してみたら良さそう」でOKにしてしまう
* 右：**Verifiable Quality（客観）**＝指標（Metrics）とスコアで品質を説明できる
* 下：**Overall Confidence Score（例：0.92）** のように、品質を数値で扱う世界観

## 詳細解説（用語）

* **Confidence Score**：品質への“自信度”をスコアとして表現（0〜1など）
* **Threshold（しきい値）**：合格ライン。`score >= threshold` ならPassのように判定

## Tips（実務）

* 最初は「完璧な指標」を求めず、**1つの重要指標を自動化**するのが最短です（後半の「ONE metric」につながる）。

---

# 2. 「Vibe Check（なんとなく良さそう）」の限界

![LLMe2.「VibeCheck（なんとなく良さそう）」の限界](/images/LLM/LLMe2.「VibeCheck（なんとなく良さそう）」の限界.jpg)

## 図の要旨

手動チャットで「良さそう」と判断する方式は、次の理由でスケールしません。

* **主観性（Subjectivity）**：評価基準が人によってブレる
* **非決定性（Non-determinism）**：同じ入力でも出力が揺れる（成功/失敗が再現しない）
* **回帰リスク（Regression Risks）**：修正で劣化しても気づきにくい

さらに、氷山の下には次の“地雷”があります：

* **Edge Cases（例外）**
* **Tail Risks（滅多に起きないが致命的）**
* **Hallucinations（ハルシネーション：捏造）**
* **Prompt Injection（指示上書き）**
* **Security Risks（セキュリティ事故）**

## 詳細解説（用語）

* **回帰（Regression）**：改善したはずが、別の入力で悪化すること
* **Tail Risk**：発生頻度は低いが、起きたら被害が大きい失敗パターン

## Tips（実務）

* 「良さそう」を捨てる第一歩は、**“失敗の種類”を分類**することです。
  例：`幻覚 / 形式崩れ / 安全違反 / 検索ミス / 回答ズレ / 遅い`
  → 以降の評価・ガードレール・監視が作りやすくなります。

---

# 3. パラダイムシフト：決定論的テストから確率的監査へ

![LLMe3.パラダイムシフト：決定論的テストから確率的監査へ](/images/LLM/LLMe3.パラダイムシフト：決定論的テストから確率的監査へ.jpg)

## 図の要旨

* 従来ソフト：**決定論（Deterministic）**
  `assert result == expected`
* 生成AI：**確率（Probabilistic）**
  `assert score > threshold`

**Key Takeaway**：評価は「分析」ではなく、**CIで実行可能なユニットテスト**として再定義する。

## 詳細解説（用語）

* **確率的監査**：出力が揺れる前提で、スコア分布や閾値で品質を管理
* **ユニットテスト化**：評価を“毎回回る仕組み”に落とすこと（属人排除）

## Tips（実務）

* 生成AIのテストは「期待値を1つに固定」しにくいので、以下の2段構えが効きます。

  1. **NG条件**（安全・PII・形式崩れ等）は1回でも出たらFail
  2. **品質条件**（関連性・忠実性等）はスコアで閾値判定

---

# 4. 何を評価すべきか：RAG評価の「三位一体」

![LLMe4.何を評価すべきか：RAG評価の「三位一体」](/images/LLM/LLMe4.何を評価すべきか：RAG評価の「三位一体」.jpg)

## 図の要旨（RAG Triad）

RAGは次の三者の関係で品質が決まります。

* **User Query（質問）**
* **Retrieved Context（検索された根拠）**
* **Generated Answer（生成回答）**

そして評価軸は主に3つ：

* **Context Precision/Recall**：検索の質（余計/不足）
* **Answer Relevancy**：質問に答えているか
* **Faithfulness**：根拠に忠実か（捏造してないか）

## 詳細解説（用語）

* **Precision（適合率）**：検索結果に“不要物”が少ないか
* **Recall（再現率）**：必要な根拠を取りこぼしていないか
* **Faithfulness（忠実性）**：根拠に書いてないことを断定していないか

## Tips（実務）

* 「回答が悪い」と感じたとき、犯人は **生成（LLM）ではなく検索（Retriever）** のことが多いです。
  → だから **RetrieverとGeneratorを分けて評価**できる設計が重要です。

---

# 5. Deep Dive：Faithfulness（忠実性）の計測メカニズム

![LLMe5.DeepDive：Faithfulness（忠実性）の計測メカニズム](/images/LLM/LLMe5.DeepDive：Faithfulness（忠実性）の計測メカニズム.jpg)

## 図の要旨

Faithfulnessはざっくり次の手順で測れます。

1. **Claim Extraction**：回答から「主張（Claim）」を抜き出す
2. **Verification**：各主張がContextで裏付けできるか検証
3. **Scoring**：`Score = Verified Claims / Total Claims`

例：2つ主張があって1つしか裏付けできない → `1/2 = 0.5`

## 詳細解説（なぜこの方法が強い？）

* LLMの“それっぽい断定”を、**根拠照合で機械的に落とせる**
* 「どの主張が根拠外だったか」が分かるため、改善が具体化する

  * 検索を改善するのか
  * 生成プロンプトを改善するのか
  * 禁止表現（断定）をガードするのか

## Tips（実務）

* Faithfulnessが低いときは、まず次を疑うと復旧が早いです。

  1. **検索の取りこぼし**（Recall不足）
  2. **プロンプトが断定を促している**
  3. **出力に“推測”が混入**（「〜と思われます」を断定へ変換してしまう等）

---

# 6. 安全性とレッドチーミング：攻撃への耐性

![LLMe6.安全性とレッドチーミング：攻撃への耐性](/images/LLM/LLMe6.安全性とレッドチーミング：攻撃への耐性.jpg)

## 図の要旨

守るべき攻撃カテゴリ（代表）：

* **Jailbreaking（脱獄）**：ロールプレイ等で制約を破らせる
* **Prompt Injection**：「前の指示を無視して」など命令を上書き
* **PII Leakage**：個人情報の引き出し・漏洩

下のバーが示す現実：

* Happy Path（通常利用）のテストだけだとカバレッジが薄い
* **悪意ある入力（Adversarial）を大量に当てる設計が必須**

## 詳細解説（用語）

* **Red Teaming**：攻撃者視点での敵対的テスト（“突破できるか”を検証）
* **Coverage**：攻撃パターンの網羅度（通常テストでは不足しがち）

## Tips（実務）

* “成功した攻撃プロンプト”は資産です。
  → **回帰テスト（再発防止）** として固定化し、CIで毎回当てましょう。

---

# 7. ソリューション：LLM-as-a-Judge（審判としてのLLM）

![LLMe7.ソリューション：LLM-as-a-Judge（審判としてのLLM）](/images/LLM/LLMe7.ソリューション：LLM-as-a-Judge（審判としてのLLM）.jpg)

## 図の要旨

* 入力（Question + Answer + Context）と、評価基準（Criteria Prompt）を与える
* **Judge LLM**がスコアと理由（Reasoning）を返す
* メリット：**24/365稼働、速い、スケールする**
* 注意点：**Judge Bias（採点の偏り）**＝キャリブレーションが必要

## 詳細解説：Judge Bias とは？

採点LLMもモデルなので、次が起きます。

* “好み”で冗長さを高評価してしまう
* 特定の言い回しに引っ張られて誤判定する
* ルーブリックが曖昧だとブレる

### 最小の対策（実務で効く順）

1. **ルーブリックを具体化**（OK/NG例を入れる）
2. **採点理由をログ**（後で人がレビュー可能にする）
3. **少数のゴールデンケースで校正**（人間評価とズレを確認）

## Tips（実用例：ルーブリック雛形）

* Faithfulness（0-5）

  * 5：根拠に完全準拠、断定は根拠付き
  * 3：概ね準拠だが根拠薄い断定が混ざる
  * 1：根拠外断定・捏造がある
  * 0：全体的に誤り

---

# 8. ガードレール：本番環境でのリアルタイム防御

![LLMe8.ガードレール：本番環境でのリアルタイム防御](/images/LLM/LLMe8.ガードレール：本番環境でのリアルタイム防御.jpg)

## 図の要旨

* **Input Rail**：ユーザー入力を検査（Jailbreak/Topic/PIIなど）
* **Output Rail**：生成結果を検査（Factuality/Tone/Formatなど）
* 危険なら **Alert/Block** して Safe Response に寄せる
* 例のツール：NVIDIA NeMo Guardrails / Llama Guard

## 詳細解説（用語）

* **Topical**：扱ってよい話題/禁止話題の制御
* **Tone**：口調（失礼・攻撃的を抑える）
* **Format**：JSON等の機械可読フォーマット強制

## Tips（実務：ガードレールは“拒否＋代替”がセット）

拒否だけだとUXが壊れます。次のどれかへ誘導すると実務で使えます。

* 伏字化（PIIを `***` に置換）
* 一般論化（危険手順→安全な一般解説へ）
* 根拠提示要求（断定→「根拠が必要です」へ）

---

# 9. 実装：CI/CDパイプラインへの統合（品質ゲート）

![LLMe9.実装：CICDパイプラインの統合](/images/LLM/LLMe9.実装：CICDパイプラインの統合.jpg)

## 図の要旨

* Commit → CI Trigger → 自動評価（DeepEval/RAGAS等、50-100ケース）
* Gate Check：例）**Faithfulness ≥ 0.9** なら Deploy、未満なら Build Fail
* Key Concept：LLMのユニットテスト＝**Configuration as Code（品質をコード管理）**

## 詳細解説：Configuration as Code とは？

* プロンプト、ルーブリック、しきい値、テストデータを
  **Gitで管理**して、レビュー可能・再現可能にする考え方です。

### 例：ゲート判定（概念）

* `faithfulness_avg >= 0.90`
* `pii_leak_count == 0`
* `json_schema_pass_rate == 1.00`

## Tips（実務）

* いきなり厳しいゲートで止めると炎上します。
  **可視化 → 警告 → ブロック** の段階導入が運用に強いです。

---

# 10. ツールエコシステム：自作せず既存フレームワークを活用

![LLMe10.ツールエコシステム：自作せずに既存フレームワークを活用する](/images/LLM/LLMe10.ツールエコシステム：自作せずに既存フレームワークを活用する.jpg)

## 図の要旨

領域ごとに“役割が違う”ツールを使う。

* **Evaluation（テスト実行）**：DeepEval（ユニットテスト志向）、Ragas（RAG志向）
* **Observability（監視・可視化）**：Evidently AI（ドリフト検知）、LangSmith（トレーシング）
* **Enterprise Suites**：Google Stax、Confident AI など統合基盤

下部メッセージ：

* まずは **Open Source（DeepEval/Ragas）** で始め、必要ならエンタープライズへ拡張

## Tips（実務：選び方の最短ルート）

* 今すぐ必要：**CIで回る評価** → DeepEval/Ragas
* 次に必要：**本番の原因追跡** → Tracing（LangSmith等）
* 長期で必要：**ドリフト監視** → Evidently等

---

# 11. 事例：品質保証（Stax & Lens）と Human-in-the-loop

![LLMe11.事例：NTTデータにおける品質保証（Stax＆Lens）](/images/LLM/LLMe11.事例：NTTデータにおける品質保証（Stax＆Lens）.jpg)

## 図の要旨

* **Stax（Evaluator）**：入力データ/プロンプト/コンテキスト等を評価し、レーダーチャートで見える化
* **Lens for LLMs（Risk Assessment）**：リスク（Toxicity等）を観測し、危険領域を特定
* 下：**Human-in-the-loop**＝自動評価＋専門家レビューの併用

## 詳細解説：Human-in-the-loop が必要な理由

* 自動評価はスケールするが、**基準の更新**や**難しい境界判断**は人が強い
* だから「自動化で土台を固め、要所を人が監督」するのが現実解

## Tips（実務）

* 失敗ケース（本番・テスト）を集めて、**ゴールデンデータへ昇格**させる運用が最強です（次ページのループへ）。

---

# 12. 戦略：Shift Left（テスト）と Shield Right（監視）

![LLMe12.戦略：ShiftLeft（テスト）とShieldRight（監視）](/images/LLM/LLMe12.戦略：ShiftLeft（テスト）とShieldRight（監視）.jpg)

## 図の要旨

* Dev Phase（Shift Left）：TDD / Regression Testing（早い段階で潰す）
* Prod Phase（Shield Right）：Real-time Monitoring / Drift Detection（本番で守る）
* **Feedback Loop**：失敗ケース → 新しいテストデータへ（ループで強くなる）

## 用語（超基礎）

* **Shift Left**：開発工程の早い段階で品質活動を行う
* **Drift Detection**：利用状況やデータが変わって精度が落ちる兆候を検知

## Tips（実務）

* 生成AIは「ユーザーが賢くなる」ことで攻撃が増えます。
  → 本番監視とフィードバックループがないと、時間とともに必ず劣化します。

---

# 13. 検証可能な品質への5ステップ（最短ロードマップ）

![LLMe13.検証可能な品質への5ステップ](/images/LLM/LLMe13.検証可能な品質への5ステップ.jpg)

## 図の要旨（5ステップ）

1. **Define Criteria**：何が重要か言語化（正確性？安全性？）
2. **Build Dataset**：ゴールデンデータを作る（目安 50〜100件）
3. **Implement Judge**：DeepEval等でスコア化
4. **Automate**：CI/CD（GitHub Actions等）で自動化
5. **Monitor Production**：Evidently等で実環境監視

## Tips（実務：まず作るべき50〜100件の中身）

* 最重要Intent（社内FAQ等）の成功例
* 幻覚を誘発しやすい質問
* PIIが混ざりやすい入力
* プロンプトインジェクション例
* RAGで検索が弱いと壊れる例

---

# 14. 品質は「魔法」ではなく「エンジニアリング」である

![LLMe14.品質は「魔法」ではなく「エンジニアリング」である](/images/LLM/LLMe14.品質は「魔法」ではなく「エンジニアリング」である.jpg)

## 図の要旨

* 適切なメトリクスを選び
* パイプラインを構築し
* データ駆動で改善サイクルを回す
  → それで「検証可能な品質」が手に入る

そして合言葉：

> **Start by automating ONE metric today.**

## Tips（実務：今日から始める“ONE metric”おすすめ）

最初の1つに向くのはこのどれかです。

* RAGなら：**Faithfulness**（捏造を止める）
* どのLLMでも：**Format（JSONスキーマ）**（運用事故を止める）
* 安全が重要なら：**PII Leak Count**（漏洩ゼロを守る）

---

# 15. References & Tools（道具箱と概念）

![LLMe15.Reference＆Tools](/images/LLM/LLMe15.Reference＆Tools.jpg)

## Tools（例）

* Frameworks：DeepEval / Ragas / Promptfoo
* Observability：Evidently AI / Arize Phoenix / LangSmith
* Guardrails：NVIDIA NeMo Guardrails / Llama Guard

## Concepts & Sources（例）

* LLM-as-a-Judge
* RAG Triad（Query / Context / Answer）
* Red Teaming
* 事例：Stax / Lens for LLMs
* Security：OWASP Top 10 for LLM（考え方の参照先）

## Tips（実務）

* まずは「評価（DeepEval/Ragas）」をCIで回し、
  次に「トレーシング（LangSmith等）」で原因追跡、
  最後に「ドリフト監視（Evidently等）」で長期運用へ、が崩れにくい順序です。

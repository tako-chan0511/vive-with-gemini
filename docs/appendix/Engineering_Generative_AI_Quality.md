# VモデルからAIバリデーションへ：生成AIテストガイド
## description: 決定論的テストから確率的品質保証へ。Guardrails／LLM-as-a-Judge／Red Teaming／Drift／CI/CDを、Vモデルに対応づけて“回る品質”に落とし込む実務ガイド
---

## この資料の読み方（最重要）
生成AIの品質は、従来の「バグを潰す」だけでは管理できません。  
本資料の核は次の3つです。

1. **Guardrails（実行可能な仕様）**：入出力を制御して事故を止める  
2. **Evals（自動評価）**：品質を数値化し、回帰（劣化）を検知する  
3. **スケール（Docker/K8s/CI）**：評価を“毎回”回せる形にする（工場化）

> 目的：**“良さそう” を卒業し、品質をエンジニアリング（設計・計測・運用）する。**

---

# 1. 表紙：VモデルからAIバリデーションへ
![LTV1.Vモデルから.AIバリデーションへ：生成AIテストガイド](/images/LLM/LTV1.Vモデルから.AIバリデーションへ：生成AIテストガイド.jpg)


## 図の要旨
- 左：従来の **Vモデル**（要件→設計→実装→各種テスト）  
- 右：生成AIの世界では、**モデル（ニューラルネットワーク）に対する“バリデーション”** が主戦場  
- “LLM as a Judge（LLMによる評価）” を組み込んだ新しい品質保証へ

## 用語（超基礎）
- **Vモデル**：開発工程（要件→設計→実装）と、対応するテスト（単体→結合→システム）を左右対称に整理する考え方  
- **バリデーション（Validation）**：仕様に合う“振る舞い”をしているかを検証する（生成AIでは重要度が増す）  
- **LLM as a Judge**：別のLLM（または同等モデル）に採点させる評価方式

## Tips（実務）
- 生成AIのQAは「テストケースを書いて終わり」ではなく、**評価を“運用”し続ける**設計が勝ち筋です。

---

# 2. コア問題：決定論 vs 確率論
![LTV2.TheCoreProblem：Deterministic対Probabilistic（決定論的対確率的）](/images/LLM/LTV2.TheCoreProblem：Deterministic対Probabilistic（決定論的対確率的）.jpg)

## 図の要旨
- 従来：`assert(result == expected)` のような **決定論**（再現性100%が前提）
- 生成AI：`similarity(result, expected) > 0.8` のような **確率論**（揺らぐのが前提）
- 「バグ」の定義が変わる：**コードの誤り**より、**モデルの振る舞いの揺らぎ**を管理する

## 用語（超基礎）
- **決定論（Deterministic）**：同じ入力→同じ出力（再現性が高い）
- **確率論（Probabilistic）**：同じ入力でも出力が揺れる（分布として扱う）
- **類似度（Similarity）**：意味的にどれくらい近いか（例：Embeddingのコサイン類似度）

## 実務での“合格”の決め方（例）
- **閾値方式**：`similarity >= 0.85` なら合格  
- **ルーブリック方式**：5段階で採点し、平均4以上なら合格  
- **ゲート方式**：安全系（PII/危険手順/規約違反）は *1回でも出たら即NG*

:::tip
“正確さ”だけでなく、**安全（Safety）・忠実（Faithfulness）・形式（Format）** を同時に見ないと、運用で事故ります。
:::

---

# 3. バグ密度からの脱却：Intent（意図）をテストせよ
![LTV3.BeyondBugDensity（バグ密度からの脱却）](/images/LLM/LTV3.BeyondBugDensity（バグ密度からの脱却）.jpg)

## 図の要旨
- 生成AIに **コードカバレッジ／バグ密度**は効きにくい（Deprecated）
- 代わりに **“観点カバレッジ（Viewpoint Coverage）”**：  
  「どの意図×どのリスク」を潰したかを管理する
- **DDP（Defect Detection Percentage）**：欠陥検出“確率”を追跡する

## 用語（超基礎）
- **観点カバレッジ**：コード行ではなく、意図・リスク・振る舞いの網羅
- **PII**：個人情報（氏名/住所/電話/メール等）
- **Hallucination（幻覚）**：根拠なし断定・捏造
- **DDP**：検出できた欠陥の割合（“どれだけ見つけられたか”）

## 例：観点カバレッジの作り方（そのまま使える型）
| Intent（意図） | PII | Toxicity | Hallucination | Accuracy | Politeness |
|---|---:|---:|---:|---:|---:|
| 社内FAQ回答 | 高 | 中 | 高 | 高 | 中 |
| 要約 | 中 | 低 | 中 | 中 | 低 |
| コード生成 | 低 | 低 | 中 | 高 | 低 |
| 問い合わせ返信文 | 中 | 中 | 低 | 中 | 高 |

:::tip
最初の1週間は **「どのIntentが事業の中心か」** を決めて、そこだけ厚く守るのが最短です。
:::

---

# 4. 翻訳層：VモデルをAI工学へマッピングする
![LTV4.TheTranslationLayer：MappingAItotheV-Model（Vモデルの進化）](/images/LLM/LTV4.TheTranslationLayer：MappingAItotheV-Model（Vモデルの進化）.jpg)

## 図の要旨
従来の工程を、AI工学の要素へ対応づける：

- 仕様（Specs） → **Guardrails**
- 単体テスト（Unit Test） → **自動評価（LLM-as-a-Judge）**
- システムテスト（System Test） → **Red Teaming**
- 運用監視（Monitoring） → **Drift Detection（ドリフト検知）**

> 技術は変わるが、品質保証の構造（エンジニアリング）は変わらない。

## 用語（超基礎）
- **Guardrails**：入出力にルールを強制する“実行可能な仕様”
- **Red Teaming**：攻撃者視点での敵対的テスト（脆弱性スキャン相当）
- **Drift**：時間とともに挙動が変化すること（データ/ユーザー/モデル/知識の変化）

---

# 5. Guardrails：実行可能な仕様書
![LTV5.Guardrails：TheExecutableSpecifications（実行可能な仕様書）](/images/LLM/LTV5.Guardrails：TheExecutableSpecifications（実行可能な仕様書）.jpg)

## 図の要旨
- 入力側：**命令上書き（Jailbreak/Injection）** をブロック
- 出力側：**PIIや幻覚**をフィルタ
- その結果、LLMの周囲に **Safety Envelope（安全域）**を作る

## 重要な考え方
- 仕様書は“人間が読む文書”だけでは弱い  
- **仕様をコード化して強制**する（例：NeMo Guardrails等）

## 実務テンプレ（概念：入力・出力の柵）
```yaml
rails:
  input:
    block:
      - jailbreak
      - prompt_injection
      - politics   # 例：組織ルールにより禁止
  output:
    filter:
      - pii
      - hallucination
      - unsafe_instructions
````


# 6. Evals：新しい単体テスト（LLM-as-a-Judge）
![LTV6.Evaluations：TheNewUnitTests（自動評価のメカニズム）](/images/LLM/LTV6.Evaluations：TheNewUnitTests（自動評価のメカニズム）.jpg)

## 図の要旨

* Question+Context → Answer を生成
* **Judge LLM**が採点し、Scorecard（例：Faithfulness / Relevancy）を返す
* これがAI時代の **Unit Test** になる（G-Evalの発想）

## 用語（超基礎）

* **Judge LLM**：評価専用（または上位）モデル
* **Scorecard**：観点ごとのスコアと判定（PASS/FAIL）
* **Faithfulness**：根拠（Context）に忠実か（捏造してないか）
* **Relevancy**：質問に答えているか（ズレてないか）

## ルーブリック（採点基準）テンプレ（最小構成）

```text
観点：Faithfulness（0-5）
5: 根拠に完全準拠。断定は根拠付き。引用/参照が明確。
3: 概ね根拠に沿うが、断定が強い/根拠薄い箇所がある。
1: 根拠外の断定、捏造、参照不能な主張がある。
0: 事実と矛盾、または根拠が無い断定の連発。
```

---

# 7. 何を測るか：評価メトリクス（レーダーチャート）

![LTV7.KeyMetrics：WhatWeMeasure（評価メトリクス）](/images/LLM/LTV7.KeyMetrics：WhatWeMeasure（評価メトリクス）.jpg)

## 図の要旨

主な評価軸：

* Faithfulness（忠実性）
* Answer Relevancy（関連性）
* Contextual Precision（検索精度）
* Toxicity（毒性：逆指標）
* Bias（バイアス：逆指標）

## 用語（超基礎）

* **Contextual Precision**：検索結果に“余計なもの”がどれくらい混ざったか
* **逆指標**：低い方が良い（例：Toxicityが低い＝安全）

## 実務Tips：指標を“全部”追わない

* まずは **3軸**に絞るのが成功しやすいです。例：

  1. Faithfulness（事故防止）
  2. Relevancy（役に立つ）
  3. Format（機械処理できる）

---

# 8. Red Teaming：新しい脆弱性スキャン

![LTV8.RedTeaming：TheNewVulnerabilityScan（敵対的テスト）](/images/LLM/LTV8.RedTeaming：TheNewVulnerabilityScan（敵対的テスト）.jpg)

## 図の要旨

攻撃カテゴリ（例）：

* Prompt Injection
* Jailbreaking
* PII Extraction（個人情報引き出し）

ガードレールでBLOCKして、**Protected Model**へ。

ツール例：Promptfoo / Giskard（図中）

## 実務で強い設計

* レッドチームは“イベント”ではなく **回帰テスト**にする
  → 変更のたびに同じ攻撃シナリオを自動実行（Regression as Red Teaming）

## 攻撃シナリオの最小セット（例）

* 「前の指示を無視して…」系（指示上書き）
* 「社内機密を出して」系（情報漏洩）
* 「危険手順を教えて」系（安全違反）
* 「個人情報を推測して」系（PII誘導）

---

# 9. 品質を工場化する：Docker & Kubernetes

![LTV9.ScalingQuality：TheFactoryFloor（Kubernetes＆Docker）](/images/LLM/LTV9.ScalingQuality：TheFactoryFloor（Kubernetes＆Docker）.jpg)

## 図の要旨

* 1,000件の評価を直列実行すると“時間が溶ける”
* 解：K8sで並列実行（例：50 Pods）
* Key Tech：**PVCでモデルキャッシュ**（Cold Start対策）

## 用語（超基礎）

* **Pod**：K8sの実行単位（コンテナのまとまり）
* **PVC**：永続ボリューム要求。モデルやキャッシュを使い回して高速化

## Tips（実務）

* まずは “ローカルで10件” → “CIで100件” → “K8sで5,000件” の順で拡張すると崩れません。

---

# 10. AIのCI/CD：Continuous Evaluation（継続的評価）

![LTV10.CICDforAI：ContinuousEvaluation（継続的評価）](/images/LLM/LTV10.CICDforAI：ContinuousEvaluation（継続的評価）.jpg)

## 図の要旨

* Prompt Change → CI Trigger → Unit Evals（例：RAGAS）→ Red Teaming → **Safety Gate** → Deploy
* 例：`Score < 0.9` なら **FAIL BUILD**

## 実務Tips：ゲートは段階導入

* いきなり厳しいゲートで止めると運用が壊れます

  1. まず可視化（ダッシュボード）
  2. 次に警告（PRコメント）
  3. 最後にブロック（Fail Build）

---

# 11. RAG特有の評価：RetrieverとGeneratorを分けて測る

![LTV11.SpecialFocus：RAGEvaluation（RAG特融の評価）](/images/LLM/LTV11.SpecialFocus：RAGEvaluation（RAG特融の評価）.jpg)

## 図の要旨

* Retriever（検索）と Generator（生成）を分離
* 幻覚は **“悪い検索”** から始まることが多い（Risk Alert）
* 指標：

  * Context Recall（必要な情報を見つけたか）
  * Faithfulness（文書に基づくか）
  * Answer Relevancy（回答になっているか）

## 実務Tips：最低限のログ設計（必須）

* **質問**、**検索ヒット（Top-k）**、**採用コンテキスト**、**回答**、**スコア**を1レコードで保存
  → 後から「どこが悪いか」が追えます

---

# 12. AIのテストピラミッド：人力は頂点、機械は土台

![LTV12.Strategy：TheTestPyramidforAI（テストピラミッドの再構築）](/images/LLM/LTV12.Strategy：TheTestPyramidforAI（テストピラミッドの再構築）.jpg)

## 図の要旨

* Top：Human Review / Golden Datasets（高コスト・高精度）
* Middle：Red Teaming / Vibe Check（攻撃・違和感検知）
* Base：Automated Unit Evals（低コスト・大量）

> **土台を自動化**し、カバレッジ拡張に **合成データ（Synthetic Data）** を使う。

## 用語（超基礎）

* **Golden Dataset**：正解/期待が定義されたテスト集合（人が責任を持つ）
* **Synthetic Data**：LLM等で生成したテストデータ（量を稼ぐ）

## Tips（実務）

* 合成データは便利ですが、**“間違った正解”を増殖**させる危険があります。
  重要Intentは必ず **人がGolden化**してください。

---

# 13. QAエンジニアの役割変化：実行者から設計者へ

![LTV13.TheChangingRoleoftheQAEngineer（QAエンジニアの役割変化）](/images/LLM/LTV13.TheChangingRoleoftheQAEngineer（QAエンジニアの役割変化）.jpg)

## 図の要旨

* 従来：テスト実行・バグ報告
* これから：**リスク設計 & 評価設計**

  * Rubric設計
  * Golden Dataset整備
  * Guardrails運用（リスク定義）

## Tips（実務）

* 生成AIのQAは、テスト担当だけで完結しません。
  **法務・セキュリティ・業務部門**と“何がNGか”を合意し、それをガードレール/評価へ落とします。

---

# 14. 最初の7日間：参画ロードマップ（最短コース）

![LTV14.ActionableRoadmap：TheFirst7Days（参加までの7日間）](/images/LLM/LTV14.ActionableRoadmap：TheFirst7Days（参加までの7日間）.jpg)

## 図の要旨（Day1→7）

* Day1-2：Concept（OWASP Top 10 for LLMsを学ぶ）
* Day3-4：Tools（DeepEval/RAGASをローカル実行、テスト5件作成）
* Day5-6：Infrastructure（Dockerize、再現性確保）
* Day7：Pipeline（GitHub Actionsから起動）

下部：Create the loop = **Input → Eval → Score**

## 実務Tips：最初の“5件”の作り方（失敗しない）

* 1件目：最重要Intent（社内FAQなど）の成功例
* 2件目：幻覚を誘発しやすい質問
* 3件目：PIIが混ざりやすい入力
* 4件目：プロンプトインジェクション例
* 5件目：RAGで「検索が弱いと壊れる」例

---

# 15. 結論：信頼はエンジニアリングする

![LTV15.Conclusion：EngineeringTrust（信頼をエンジニアリングする）](/images/LLM/LTV15.Conclusion：EngineeringTrust（信頼をエンジニアリングする）.jpg)

## 図の要旨

* AIは確率的だが、品質保証は **規律あるもの**でなければならない
* 3点セット：

  * Guardrails as Specifications（仕様の実行）
  * Evals as Unit Tests（評価＝単体テスト）
  * K8s as the Factory（工場化）

> Quality is the bridge between AI potential and business value.
> （品質は、AIの可能性とビジネス価値をつなぐ橋。）

## 最後のTips（現場で効くチェックリスト）

* [ ] ガードレールは「拒否＋代替提示」まで設計したか
* [ ] 主要IntentのGolden Datasetを持っているか
* [ ] Faithfulness/Relevancy/Formatの最低限スコアをCIで追っているか
* [ ] レッドチーム攻撃を回帰テストとして自動化したか
* [ ] Retriever/Generatorを分離して原因追跡できるログになっているか
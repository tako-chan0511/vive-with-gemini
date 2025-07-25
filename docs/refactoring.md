# 実践：AIと駆動するテスト駆動開発（TDD）

## 安全な「仕様変更」こそ、アジャイルの心臓部

**[私のトーク（導入）]**
「ビジネスは常に変化します。昨日決まった仕様が、今日には変わる。この『変化』に、いかに迅速かつ安全に対応できるか。それこそが、開発チームの価値、ひいては事業のROIを決定づけます。

これからお見せするのは、単なるリファクタリングではありません。AIという相棒を得た私たちが、<strong>テスト駆動開発（TDD）</strong>というアジャイルの原則を武器に、<strong>予測不能な仕様変更という荒波をどう乗りこなすか</strong>、そのライブセッションです。私たちの『バイブコーディング』が、いかにして変化を『コスト』から『価値向上のチャンス』に変えるか、ご覧ください。」

---

## フェーズ1：【TDD】新機能「注目度スコア」の実装

### Step 1: 要求の定義 (PBI)

すべては、プロダクトオーナーからのこんな一言から始まります。

> **PBI: レポートの注目度を可視化したい**
> AIが生成したレポートが、どれくらい重要なのか一目でわかるように、「注目度スコア」機能を追加してほしい。
> 
> ---
> **やりたいこと:**
> レポート本文からキーワードを検出し、注目度スコアを算出したい。仕様は以下の通り。
> -   **キーワードと点数:** '新製品'は10点、'DX'は10点、'提携'は10点、'課題'は5点。
> -   **表示場所:** レポート本文の上に、「注目度スコア: [計算結果]」のように表示する。
> -   **開発アプローチ:** TDDでテスト（仕様）を先に書く。
>     1.  `src/utils/attentionScore.test.ts` (テスト)
>     2.  `src/utils/attentionScore.ts` (実装)

### Step 2: TDDを支える高速テストフレームワーク Vitest

今回のTDDを支えるのが、`Vite`をベースとしたテストフレームワーク**`Vitest`**です。私たちがこれを選択した理由は、その圧倒的な「速さ」にあります。

-   **特徴**: Viteの高速なサーバーをそのままテストに利用するため、変更を保存した瞬間にテストが完了します。この高速なフィードバックループが、TDDの「RED→GREEN→REFACTOR」のサイクルを快適に回すための鍵となります。
-   **実行方法**: ターミナルで `npm run test` を実行すると、Vitestはファイルの変更を監視する「ウォッチモード」で起動し、コードを修正するたびに自動でテストを再実行してくれます。

詳細な環境設定の手順は、[付録：環境構築ガイド](/appendix-environment#_3-テスト環境-vitest-のセットアップ)にまとめています。

### Step 3: RED - 失敗するテストを先に書く

**[私のトーク]**
「ここからが、私たちの『バイブコーディング』です。私がこれから作る関数の仕様を、背景情報と共にGeminiに伝えます。このプロンプトは、どのチャットスレッドに貼り付けても理解できるように、必要な情報をすべて含んでいるのがポイントです。」

> **[デモ用プロンプト 1：テストの初回作成]**
> こんにちは。Vue3+Vite+TypeScriptで「AIマーケットアナリスト」というアプリケーションを開発しています。
>
> これから、レポート本文からキーワードを検出し、注目度スコアを算出する`calculateAttentionScore`という関数をTDDで実装します。
>
> まずは、この関数の仕様を満たすための単体テストを、Vitestを使って作成してください。テストはC1網羅率100%になるようにお願いします。
>
> **関数の仕様:**
> - 関数名: `calculateAttentionScore`
> - 引数: `reportText` (string)
> - 返り値: `score` (number)
> - ロジック: `reportText`に特定のキーワードが含まれていたらスコアを加算する。キーワードと点数は以下の通り。
>   - '新製品': 10点
>   - 'DX': 10点
>   - '提携': 10点
>   - '課題': 5点

<a href="/downloads/tdd-demo/phase1-attentionScore.test.ts" download="attentionScore.test.ts" class="download-button">📄 attentionScore.test.ts をダウンロード</a>

### Step 4: GREEN - テストをパスさせる

次に、この赤いテストを緑の「PASS」に変えるための、最小限のコードを実装します。

**`src/utils/attentionScore.ts`**
```typescript
const KEYWORD_SCORES = { '新製品': 10, 'DX': 10, '提携': 10, '課題': 5 };

export const calculateAttentionScore = (reportText: string): number => {
  let score = 0;
  for (const keyword in KEYWORD_SCORES) {
    if (reportText.includes(keyword)) {
      score += KEYWORD_SCORES[keyword as keyof typeof KEYWORD_SCORES];
    }
  }
  return score;
};
```
<a href="/downloads/tdd-demo/phase1-attentionScore.ts" download="attentionScore.ts" class="download-button">📄 attentionScore.ts をダウンロード</a>

### Step 5: UIへの反映

テスト済みのロジックをUIに組み込み、ユーザーに価値を届けます。

**`src/App.vue`**
```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { calculateAttentionScore } from './utils/attentionScore'; // 作成した関数をインポート

const analysisReport = ref(""); // レポート本文

// 注目度スコアを算出する算出プロパティ
const attentionScore = computed(() => {
  return calculateAttentionScore(analysisReport.value);
});
</script>

<template>
  <!-- ... -->
  <section v-if="analysisReport" class="analysis-report">
    <!-- この部分を追加 -->
    <div class="attention-score-wrapper">
      <strong>注目度スコア: </strong>
      <span class="attention-score">{{ attentionScore }}</span>
    </div>
    <div class="markdown-body" v-html="marked(analysisReport)"></div>
    <!-- ... -->
  </section>
</template>
```
<a href="/downloads/tdd-demo/phase1-App.vue" download="App.vue" class="download-button">📄 App.vue をダウンロード</a>

---

## フェーズ2：【アジャイル】急な仕様変更への対応

### Step 1: 要求の再定義 (新しいPBI)

> **PBI: 注目度を「レベル表示」に対応させる**
> スコアを元に「高・中・低」のレベルを判定し、「注目度: 高 (35)」のように表示してほしい。

### Step 2: RED - 新しい仕様をテストで表現する

**[私のトーク]**
「次に、仕様変更の場面です。先ほどと同様に、変更後のコードと、変更前のテストコードをすべて渡して、テストの更新を依頼します。これにより、Geminiは差分を正確に理解し、適切なテストコードを生成できます。」

> **[デモ用プロンプト 2：仕様変更に伴うテストの更新]**
> 先ほど作成したスコア計算の仕様が変更になりました。
>
> 新しく、スコアを元に「高」「中」「低」のレベルを判定する`getAttentionLevel`という関数を追加しました。
>
> 以下の**【変更後の実装コード全文】**に合わせて、**【変更前のテストコード】**を更新し、新しい`getAttentionLevel`関数のテストも追記した、**完成版のテストコード**を返してください。もちろん、網羅率100%は維持してください。
>
> **【変更後の実装コード全文 (`src/utils/attentionScore.ts`)】**
> ```typescript
> const KEYWORD_SCORES = { '新製品': 10, 'DX': 10, '提携': 10, '課題': 5 };
>
> export const calculateAttentionScore = (reportText: string): number => {
>   let score = 0;
>   for (const keyword in KEYWORD_SCORES) {
>     if (reportText.includes(keyword)) {
>       score += KEYWORD_SCORES[keyword as keyof typeof KEYWORD_SCORES];
>     }
>   }
>   return score;
> };
>
> export type AttentionLevel = '高' | '中' | '低';
>
> export const getAttentionLevel = (score: number): AttentionLevel => {
>   if (score >= 30) return '高';
>   if (score >= 10) return '中';
>   return '低';
> };
> ```
>
> **【変更前のテストコード (`src/utils/attentionScore.test.ts`)】**
> ```typescript
> import { describe, it, expect } from 'vitest';
> import { calculateAttentionScore } from './attentionScore';
>
> describe('calculateAttentionScore', () => {
>   it('キーワードに基づきスコアを計算する', () => {
>     const reportText = '当社の新製品は、市場のDXを推進します。';
>     expect(calculateAttentionScore(reportText)).toBe(20);
>   });
> });
> ```

<a href="/downloads/tdd-demo/phase2-attentionScore.test.ts" download="attentionScore.test.ts" class="download-button">📄 attentionScore.test.ts をダウンロード</a>

### Step 3: GREEN - 新しい要求を実装する

この新しいテストをパスさせるため、`attentionScore.ts`に新しい関数を追加します。

**`src/utils/attentionScore.ts` (追記)**
```typescript
// ... (calculateAttentionScoreは変更なし) ...

export type AttentionLevel = '高' | '中' | '低';

export const getAttentionLevel = (score: number): AttentionLevel => {
  if (score >= 30) return '高';
  if (score >= 10) return '中';
  return '低';
};
```
<a href="/downloads/tdd-demo/phase2-attentionScore.ts" download="attentionScore.ts" class="download-button">📄 attentionScore.ts をダウンロード</a>

### Step 4: UIへの最終反映

最後に、テスト済みの新しいロジックをUIに反映させ、デモを完成させます。

**`src/App.vue` (最終版)**
```vue
<script setup lang="ts">
import { computed } from 'vue';
// getAttentionLevel もインポート
import { calculateAttentionScore, getAttentionLevel } from './utils/attentionScore';

const attentionScore = computed(() => /* ... */);

// スコアからレベルを判定する新しい算出プロパティを追加
const attentionLevel = computed(() => {
  return getAttentionLevel(attentionScore.value);
});
</script>

<template>
  <!-- 表示をリッチにする -->
  <strong>注目度: {{ attentionLevel }} ({{ attentionScore }})</strong>
</template>
```
<a href="/downloads/tdd-demo/phase2-App.vue" download="App.vue" class="download-button">📄 App.vue をダウンロード</a>

---

## まとめ：変化を恐れない開発スタイル

**[私のトーク（まとめ）]**
「ご覧いただいたように、私たちの開発プロセスでは、テストは『後から書く面倒な作業』ではありません。<strong>未来の仕様変更から私たちを守り、高速な意思決定を支える『投資』</strong>です。

TDDサイクルを回すことで、

- 要求がコードレベルで明確になり
- 常に動くものが手元にあり
- デグレードを恐れずにリファクタリングや仕様変更に挑める

という、アジャイル開発の理想的な状態が生まれます。AIとの『バイブコーディング』は、このサイクルの回転速度を極限まで高めてくれます。これこそが、変化の時代を勝ち抜くための、私たちの答えです。」

<style>
.download-button {
  display: inline-block;
  border: 1px solid #3eaf7c;
  color: #3eaf7c;
  background-color: #fff;
  padding: 8px 16px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  transition: background-color 0.3s, color 0.3s;
  margin-top: 10px;
}
.download-button:hover {
  background-color: #3eaf7c;
  color: #fff;
}
</style>

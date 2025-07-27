# 実践：AIと駆動するテスト駆動開発（TDD）

## 安全な「仕様変更」こそ、アジャイルの心臓部

<details>
<summary>私のトーク（導入）</summary>

「ビジネスは常に変化します。昨日決まった仕様が、今日には変わる。この『変化』に、いかに迅速かつ安全に対応できるか。それこそが、開発チームの価値、ひいては事業のROIを決定づけます。

これからお見せするのは、単なるリファクタリングではありません。AIという相棒を得た私たちが、テスト駆動開発（TDD）というアジャイルの原則を武器に、予測不能な仕様変更という荒波をどう乗りこなすか、そのライブセッションです。私たちの『バイブコーディング』が、いかにして変化を『コスト』から『価値向上のチャンス』に変えるか、ご覧ください。」

</details>

---

## フェーズ0：AIとの文脈共有（コンテキスト・アライメント）

<details>
<summary>私のトーク</summary>

「AIとのペアプログラミングを成功させる秘訣は、最初に『何を』『どうしたいか』の全体像を共有することです。スレッドが変わったり、日をまたいで作業を再開した場合でも、AIが即戦力となるかは、この最初の情報共有の質にかかっています。ここではGeminiに渡す『引継ぎプロンプト』と、重要な添付資料を同時に渡す仕組みを示します。」

</details>

<details>
<summary>実際に使用した「引継ぎプロンプト」</summary>

```text
Geminiさん、前のスレッドからの引継ぎ情報です。
1. AIマーケットアナリストURL
   https://hara0511my-market-analyst.vercel.app/  
2. 添付1: 企業分析レポート画面 (report.png)
3. 添付2: 追加質問インターフェース (qa.png)
4. 添付3: App.vue の現状ソース (App.vue)
5. PBI: レポートの注目度を可視化したい
   - 本文からキーワード検出→スコア算出
   - 新製品(10), DX(10), 提携(10), 課題(5)
   - 「注目度スコア: [計算結果]」表示
   - 開発はTDDでテスト先行（Vitest）
```

**添付資料ダウンロード**

* [report.png](/report.png)
* [qa.png](/qa.png)
*  <a href="/App.vue" download="App.vue" type="text/plain; charset=UTF-8">App.vue</a>

このプロンプトには、AIが作業を理解するために必要な\*\*「目的」「現状」「タスク」「手段」「添付資料」\*\*がすべて含まれています。

</details>

---

## フェーズ1：【TDD】新機能「注目度スコア」の実装

### Step 1: 要求の定義 (PBI)

\::: tip PBI: レポートの注目度を可視化したい
AIが生成したレポートが、一目でどれだけ重要か分かるよう「注目度スコア」機能を追加。

**やりたいこと**

* レポート本文からキーワードを検出しスコアを算出
* キーワードと点数: '新製品':10、'DX':10、'提携':10、'課題':5
* TDDでテストを先に書く

**対象ファイル**

* `src/utils/attentionScore.test.ts`（テスト）
* `src/utils/attentionScore.ts`（実装）
  \:::

### Step 2: TDDを支える高速テストフレームワーク **Vitest**

Viteベースのテストフレームワーク**Vitest**を利用。保存と同時にテストを実行するウォッチモードで、RED→GREEN→REFACTORサイクルを高速化します。

> **実行方法**: `npm run test`

### Step 3: RED - 失敗するテストを先に書く

```ts
// src/utils/attentionScore.test.ts
import { describe, it, expect } from 'vitest';
import { calculateAttentionScore } from './attentionScore';

describe('calculateAttentionScore', () => {
  it('キーワードに基づきスコアを計算する', () => {
    const text = '当社の新製品は、市場のDXを推進します。';
    expect(calculateAttentionScore(text)).toBe(20);
  });
});
```

### Step 4: GREEN - テストをパスさせる

```ts
// src/utils/attentionScore.ts
const KEYWORD_SCORES: { keyword: RegExp; score: number }[] = [
  { keyword: /新製品/gi, score: 10 },
  { keyword: /DX/gi, score: 10 },
  { keyword: /提携/gi, score: 10 },
  { keyword: /課題/gi, score: 5 },
];

export const calculateAttentionScore = (text: string): number => {
  if (!text) return 0;
  return KEYWORD_SCORES.reduce((sum, { keyword, score }) => {
    const matches = text.match(keyword);
    return sum + (matches ? matches.length * score : 0);
  }, 0);
};
```

### Step 5: REFACTOR - 小さな失敗と対話での修正

\::: danger
FAIL src/utils/attentionScore.test.ts > calculateAttentionScore > case-insensitive test
AssertionError: expected 15 to be 10
\:::

<details>
<summary>AIからのアドバイス</summary>

\::: info
「文字列『企業のdx化は重要な経営課題です。』には dx(10点) と 課題(5点) が含まれるため、合計15点が正解です。
テスト期待値を修正しましょう。」
\:::

</details>

### Step 6: UIへの反映

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { calculateAttentionScore } from './utils/attentionScore';

const report = ref('');
const score = computed(() => calculateAttentionScore(report.value));
</script>
<template>
  <textarea v-model="report" placeholder="レポートを入力"></textarea>
  <div v-if="report">
    <strong>注目度スコア: {{ score }}</strong>
  </div>
</template>
```

---

## フェーズ2：【アジャイル】急な仕様変更への対応

### Step 1: 要求の再定義 (新PBI)

\::: warning PBI: 注目度を「レベル表示」に対応させる
数字だけでは分かりにくい！『高・中・低』で表示してほしい。
\:::

### Step 2: RED - 新仕様をテストで表現

<details>
<summary>私のトーク</summary>

「新しいPBIをAIに伝え、既存テストに差分を追加してもらいます。」

</details>

```ts
// src/utils/attentionScore.test.ts
describe('getAttentionLevel', () => {
  it('30以上なら高を返す', () => {
    expect(getAttentionLevel(30)).toBe('高');
  });
});
```

### Step 3: GREEN - レベル判定ロジックを実装

```ts
// src/utils/attentionScore.ts
export type AttentionLevel = '高' | '中' | '低';
export const getAttentionLevel = (score: number): AttentionLevel =>
  score >= 30 ? '高' : score >= 10 ? '中' : '低';
```

### Step 4: UIへの最終反映

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { calculateAttentionScore, getAttentionLevel } from './utils/attentionScore';
const report = ref('');
const score = computed(() => calculateAttentionScore(report.value));
const level = computed(() => getAttentionLevel(score.value));
</script>
<template>
  <textarea v-model="report" placeholder="レポートを入力"></textarea>
  <div v-if="report">
    <strong>注目度: {{ level }} ({{ score }})</strong>
  </div>
</template>
```

---

## まとめ：変化を恐れない開発スタイル

<details>
<summary>私のトーク（まとめ）</summary>

「テストは『後から書く面倒な作業』ではなく、未来の仕様変更を防ぐ投資です。AIアシスタントが文脈を跨いでサポートすることで、情報コストがゼロに。失敗もすぐに解決。TDD×AIこそ、変化の時代を勝ち抜く開発スタイルです。」

</details>

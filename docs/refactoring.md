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
> AIが生成したレポートが、どれくらい重要なのか一目でわかるように、「注目度スコア」機能を追加してほしい。<br>
><strong>やりたいこと:</strong>
>レポート本文からキーワードを検出し、注目度スコアを算出したい。仕様は以下の通り。
>キーワードと点数: '新製品'は10点、'DX'は10点、'提携'は10点、'課題'は5点。
>表示場所: レポート本文の上に、「注目度スコア: [計算結果]」のように表示する。
><br>
>コンポーネント（注目スコアを算出する）はTDDでテスト（仕様）を先に書く
>①src/utils/attentionScore.test.ts<br>
>②src/utils/attentionScore.ts


### Step 2: TDDを支える高速テストフレームワーク Vitest

今回のTDDを支えるのが、`Vite`をベースとしたテストフレームワーク**`Vitest`**です。私たちがこれを選択した理由は、その圧倒的な「速さ」にあります。

-   **特徴**: Viteの高速なサーバーをそのままテストに利用するため、変更を保存した瞬間にテストが完了します。この高速なフィードバックループが、TDDの「RED→GREEN→REFACTOR」のサイクルを快適に回すための鍵となります。
-   **実行方法**: ターミナルで `npm run test` を実行すると、Vitestはファイルの変更を監視する「ウォッチモード」で起動し、コードを修正するたびに自動でテストを再実行してくれます。

詳細な環境設定の手順は、[付録：環境構築ガイド](/appendix-environment#_3-テスト環境-vitest-のセットアップ)にまとめています。

### Step 3: RED - 失敗するテストを先に書く

TDDの第一歩は、これから作る機能の「仕様」を、テストコードとして記述することです。まだ実装コードは存在しないので、このテストは<strong>必ず失敗します。</strong>

**`src/utils/attentionScore.test.ts`**
```typescript
import { describe, it, expect } from 'vitest';
// calculateAttentionScore はまだないので、当然エラーになる
import { calculateAttentionScore } from './attentionScore';

describe('calculateAttentionScore', () => {
  it('キーワードに基づきスコアを計算する', () => {
    const reportText = '当社の新製品は、市場のDXを推進します。';
    // 「新製品」(+10), 「DX」(+10) = 20点
    expect(calculateAttentionScore(reportText)).toBe(20);
  });
});
```
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

機能リリース後、ユーザーからこんなフィードバックが届きました。

> 「スコアの数字だけだと、高いのか低いのか分かりにくい！『高・中・低』で表示してほしい！」

### Step 1: 要求の再定義 (新しいPBI)

> **PBI: 注目度を「レベル表示」に対応させる**
> スコアを元に「高・中・低」のレベルを判定し、「注目度: 高 (35)」のように表示してほしい。

### Step 2: RED - 新しい仕様をテストで表現する

既存のテストファイルに、この<strong>新しい仕様を表現するテストを追記</strong>します。

**`src/utils/attentionScore.test.ts` (追記)**
```typescript
// ... 既存のテスト ...

// --- 新しい仕様のテストを追加 ---
describe('getAttentionLevel', () => {
  it('スコアが30以上なら「高」を返す', () => {
    expect(getAttentionLevel(30)).toBe('高');
  });
});
```
<a href="/downloads/tdd-demo/phase2-attentionScore.test.ts" download="attentionScore.test.ts" class="download-button">📄 attentionScore.test.ts をダウンロード</a>

### Step 3: GREEN - 新しい要求を実装する

この新しいテストをパスさせるため、`attentionScore.ts`に新しい関数を追加します。

**`src/utils/attentionScore.ts` (追記)**
```typescript
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

という、アジャイル開発の理想的な状態が生まれます。AIとの『バイブコーディング』は、このサイクルの回転速度を極限まで高めてくれます。これこそが、**ROIを最大化し、変化の時代を勝ち抜くための、私たちの答えです。**」

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

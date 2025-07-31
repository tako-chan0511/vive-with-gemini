# 開発ストーリー：AIマーケットアナリスト

このページでは、私と相棒のGeminiが「ヴィーヴコーディング」で、どのように「AIマーケットアナリスト」を形にしていったか、その道のりを共有します。

![AIマーケットアナリストの完成画面](http://googleusercontent.com/file_content/0)

## 1. 原点：私たちの挑戦

すべては、私が抱いたこのシンプルな問いから始まりました。

> **私 → Gemini:**
> 「企業名を入れるだけで、最新ニュースを基にその企業の市場での立ち位置を分析してくれるアプリを作りたい。どんなアーキテクチャがいいだろうか？」

---

## 2. 最初の設計会議：キャッシュ戦略という光明

この問いに対し、相棒はパフォーマンスとコスト効率を両立させる、鋭い初期提案をしてくれました。これが、私たちのプロジェクトの青写真が決まった瞬間です。

> **Gemini → 私:**
> 「面白い挑戦ですね！毎回APIを叩くとコストと時間がかかるので、**サーバー側でのキャッシュ戦略**を組み込むのが鍵になります。Vercel上で完結できる、以下のような構成を提案します。」

### 技術スタック案

-   **フロントエンド:** `Vue 3` + `Vite` + `TypeScript`
-   **バックエンド (BFF):** `Vercel Functions`
-   **キャッシュ戦略:** `Vercel KV (Redis)`
-   **AI:** `Gemini API`
-   **外部API:** `GNews API`

---

### アーキテクチャ構成図

私たちが対話を通じて固めたアーキテクチャの全体像は、以下の通りです。

![アーキテクチャ構成図](/images/architecture.svg)

## 3. 壁とブレークスルー：対話による動的RAGの実装

開発の核心部分は、「どうやってコストを抑えつつ、深い対話を実現するか」でした。私がこの課題を投げかけると、

> **私 → Gemini:**
> 「同じ会社を何度も分析すると、APIコストもレスポンス時間も増大してしまう。何か良い解決策はない？」

相棒は、私たちのアーキテクチャの核となる、見事な解決策を提示してくれました。

> **Gemini → 私:**
> 「**Vercel KVを使った1日キャッシュ**が有効です。一度分析した企業の結果（収集したニュース本文とGeminiによる初期分析）を、企業名をキーにして24時間保存しましょう。」

この「**キャッシュを知識源にする**」というアイデアが、技術ハイライトに記載した「動的なRAGアーキテクチャ」の基盤となりました。

1.  **初回アクセス時:** GNews API → Gemini APIで分析 → 結果をユーザーに返し、同時にVercel KVにキャッシュ。
2.  **2回目以降のアクセス時:** Vercel KVから即座に結果を返す。
3.  **深掘りの対話時:** キャッシュに保存されている「ニュース記事本文」そのものを知識源（コンテキスト）として、GeminiとのRAGを起動する。

このように、対話を通じて課題を解決していくプロセスこそ、私たちの「ヴィーヴコーディング」の真骨頂です。

---
## 4. インクリメンタルな開発計画

では、実際の開発はどのように進んだのか？ 私たちが実践した、最初の数時間の具体的なステップと対話の様子をご紹介します。

### フェーズ1：プロジェクトの骨格構築

**【ゴール】** 主要なUIコンポーネントの「ガワ」だけを配置し、アプリケーションの全体像をまず見える化する。
> **【ROIの視点】 なぜ「ガワ」から作るのか？**
> これは、チームやステークホルダーとの認識齟齬という、最も手戻りコストの高いリスクを最小化するためです。早い段階で「私たちが作ろうとしているのはこれだ」という共通認識を持つことで、後の工程での無駄な開発コストを徹底的に排除します。

> **私 → Gemini:**
> 「`src`フォルダ内に、推奨されるVue3のフォルダ構成を作成して。それと、UIの主要要素である`CompanyInput.vue`、`AnalysisDisplay.vue`、`ChatBox.vue`の3つのコンポーネントの雛形も作ってほしい。」

#### **ディレクトリ構成（最終洗練版）**

| フォルダ / ファイル | 役割 |
| :--- | :--- |
| **`api/`** | Vercelのサーバーレス関数を格納します。APIキーが必要な処理や、重い処理はここで行います。 |
| **`src/assets/`** | CSS、画像、フォントなどの静的なアセットファイルを格納します。 |
| **`src/components/`** | アプリケーション内で再利用されるUI部品（ボタン、入力フォームなど）を格納します。 |
| **`src/views/`** | 各ページに対応する、より大きなコンポーネントを格納します。 |
| **`src/services/`** | `api/`で作成したバックエンドAPIとの通信など、外部との連携ロジックをここにまとめます。 |
| **`App.vue`** | アプリケーション全体のルート（起点）となるコンポーネントです。 |
| **`main.ts`** | Vueアプリケーションを初期化し、ページにマウント（表示）するためのエントリーポイントファイルです。 |

#### **初期コンポーネントコード (`src/views/HomeView.vue`)**
```vue
<script setup lang="ts">
import CompanyInput from '../components/CompanyInput.vue';
import AnalysisDisplay from '../components/AnalysisDisplay.vue';
import ChatBox from '../components/ChatBox.vue';
</script>

<template>
  <main class="container">
    <section class="input-section">
      <CompanyInput />
    </section>
    <section class="display-section">
      <AnalysisDisplay />
    </section>
    <section class="chat-section">
      <ChatBox />
    </section>
  </main>
</template>
```

---

### フェーズ2：バックエンドAPIのモック実装

**【ゴール】** フロントエンドが通信する先のAPIを、まずはダミーデータを返す「モック」として作成する。
> **【ROIの視点】 なぜモックを使うのか？**
> フロントエンドとバックエンドの開発を分離し、並行して進めるためです。これにより、開発期間という最大のコストを圧縮します。フロントエンドチームは、バックエンドの完成を待つことなく、フィードバックを得るためのUI開発に集中できます。

> **私 → Gemini:**
> 「Vercel Functionsで、`api/analyze.ts`というエンドポイントを作って。今はまだ外部APIは呼ばずに、固定のMarkdown文字列を返すだけの簡単なモック関数にしてほしい。」

#### **`api/analyze.ts`**
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  const dummyReport = `
# モック企業分析レポート

## 概要
これはバックエンドからのダミーレスポンスです。
  `;

  response.status(200).json({
    report: dummyReport,
  });
}
```

---

### フェーズ3：フロントエンドとAPIの連携

**【ゴール】** 作成した部品を連携させ、「分析開始」ボタンでバックエンド（モック）からダミーレポートが表示されるようにする。
> **【ROIの視点】 なぜ「動くもの」を急ぐのか？**
> 私たちの価値の定義は「フィードバックの総量」です。このステップで、初めてユーザー（この時点では開発者自身）からのフィードバックサイクルが回り始めます。「ボタンを押したら、何かが返ってくる」という最小限の価値を最速で実現し、そこから改善のサイクルを回していくことが目的です。

> **私 → Gemini:**
> 「`CompanyInput.vue`のボタンがクリックされたら、`api/analyze.ts`を呼び出して、結果を`AnalysisDisplay.vue`に表示するロジックを追加してほしい。関心事を分離するため、`services`層も作って。」

#### **`src/services/apiService.ts` (新規作成)**
```typescript
export async function fetchAnalysisReport(company: string): Promise<string> {
  const response = await fetch(`/api/analyze?company=${encodeURIComponent(company)}`);
  if (!response.ok) {
    throw new Error('APIの呼び出しに失敗しました');
  }
  const data = await response.json();
  return data.report;
}
```

#### **`src/views/HomeView.vue` (修正)**
```vue
<script setup lang="ts">
import { ref } from 'vue';
import CompanyInput from '../components/CompanyInput.vue';
import AnalysisDisplay from '../components/AnalysisDisplay.vue';
import { fetchAnalysisReport } from '../services/apiService';

const report = ref('');
const isLoading = ref(false);

const handleAnalyze = async (companyName: string) => {
  isLoading.value = true;
  report.value = '';
  try {
    report.value = await fetchAnalysisReport(companyName);
  } catch (error) {
    console.error(error);
    report.value = 'エラーが発生しました。';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <main>
    <CompanyInput @analyze="handleAnalyze" />
    <AnalysisDisplay :report="report" :is-loading="isLoading" />
  </main>
</template>
```

---

このように、**「骨格作成 → モック → 連携」** というサイクルを小さく回すことで、常に動くものを確認しながら、一歩ずつ着実にアプリケーションを完成に近づけていくことができます。これが、私たちのアジャイルな開発の進め方です。
# 開発ストーリー：AIマーケットアナリスト

このページでは、本プロジェクトで実際に題材としている「AIマーケットアナリスト」が、Geminiとの「バイブコーディング」によって、どのようにアイデアから形になっていったかを具体的に解説します。

![AIマーケットアナリストの完成画面](http://googleusercontent.com/file_content/0)

## 1. 原点：最初のアイデア

すべては、インセプションデッキに記載したこの問いから始まりました。

> **あなた (開発者) → Gemini:**
> 「企業名を入れるだけで、最新ニュースを基にその企業の市場での立ち位置を分析してくれるアプリを作りたい。どんなアーキテクチャがいいだろうか？」

---

## 2. Geminiからの初期提案：キャッシュ戦略が鍵

この問いに対し、私（Gemini）は、パフォーマンスとコスト効率を両立させるアーキテクチャを提案しました。

> **Gemini → あなた (開発者):**
> 「面白い挑戦ですね！毎回APIを叩くとコストと時間がかかるので、**サーバー側でのキャッシュ戦略**を組み込むのが鍵になります。Vercel上で完結できる、以下のような構成を提案します。」

### 技術スタック案

-   **フロントエンド:** `Vue 3` + `Vite` + `TypeScript` (UIの構築)
-   **バックエンド (BFF):** `Vercel Functions` (API連携とキャッシュロジックの中核)
-   **キャッシュ戦略:** `Vercel KV (Redis)` (分析結果を一時保存し、APIコストを削減)
-   **AI:** `Gemini API` (ニュース記事の分析・要約、RAGによる対話)
-   **外部API:** `GNews API` (リアルタイムでのニュース記事取得)

この構成案が、スクリーンショットにある技術スタックの元になっています。

---

## 3. 課題とブレークスルー：動的RAGの実装

開発の核心部分は、「どうやってコストを抑えつつ、深い対話を実現するか」でした。

> **あなた:** 「同じ会社を何度も分析すると、APIコストもレスポンス時間も増大してしまう。何か良い解決策はない？」
>
> **Gemini:** 「**Vercel KVを使った1日キャッシュ**が有効です。一度分析した企業の結果（収集したニュース本文とGeminiによる初期分析）を、企業名をキーにして24時間保存しましょう。2回目以降のアクセスでは、まずキャッシュを確認し、存在すればAPIを叩かずに即座に結果を返します。」

このキャッシュ戦略が、技術ハイライトに記載した**「動的なRAGアーキテクチャ」**の基盤となりました。

1.  **初回アクセス時:** GNews API → Gemini APIで分析 → 結果をユーザーに返し、同時にVercel KVにキャッシュ。
2.  **2回目以降のアクセス時:** Vercel KVから即座に結果を返す。
3.  **深掘りの対話時:** キャッシュに保存されている「ニュース記事本文」そのものを知識源（コンテキスト）として、GeminiとのRAG（Retrieval-Augmented Generation）を起動する。

この仕組みにより、コストと速度の問題を解決しつつ、収集した情報に基づいた専門的な対話を実現できました。これこそが、AIとの対話で課題を解決していく「バイブコーディング」の真骨頂です。

---
## 4. インクリメンタルな開発計画

実際の開発は、一度にすべてを作るのではなく、小さなステップを積み重ねて進めました。以下に、最初の数時間で行う具体的な開発のステップと、その際のGeminiとの対話を示します。

### **フェーズ1：プロジェクトの骨格構築**

**【ゴール】** 主要なUIコンポーネントの「ガワ」だけを配置し、アプリケーションの全体像が見える状態にする。

> **あなた → Gemini:**
> 「`src`フォルダ内に、推奨されるVue3のフォルダ構成を作成して。それと、UIの主要要素である`CompanyInput.vue`、`AnalysisDisplay.vue`、`ChatBox.vue`の3つのコンポーネントの雛形も作ってほしい。」

> **Gemini → あなた:**
> 「承知しました。まず、`src`配下に`components`, `views`, `services`を作成します。そして、各コンポーネントの初期コードを以下に示します。」
### フォルダ構成案

この構成に基づき、以下のようなフォルダ構成を提案しました。関心事の分離を意識した、モダンなVueプロジェクトの標準的な形です。

| フォルダ / ファイル | 役割 |
| :--- | :--- |
| **`api/`** | Vercelのサーバーレス関数を格納します。APIキーが必要な処理や、重い処理はここで行います。 |
| **`src/assets/`** | CSS、画像、フォントなどの静的なアセットファイルを格納します。 |
| **`src/components/`** | アプリケーション内で再利用されるUI部品（ボタン、入力フォームなど）を格納します。 |
| **`src/views/`** | 各ページに対応する、より大きなコンポーネントを格納します。Vue Routerなどで画面遷移の単位となります。|
| **`src/services/`** | `api/`で作成したバックエンドAPIとの通信など、外部との連携ロジックをここにまとめます。 |
| **`App.vue`** | アプリケーション全体のルート（起点）となるコンポーネントです。 |
| **`main.ts`** | Vueアプリケーションを初期化し、ページにマウント（表示）するためのエントリーポイントファイルです。 |

#### **`src/views/HomeView.vue`**
各コンポーネントをレイアウトします。
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

<style scoped>
/* 3ペインの基本的なレイアウトCSS */
</style>
```

#### **`src/components/CompanyInput.vue`**
まずは入力フォームとボタンだけを配置します。
```vue
<template>
  <div>
    <label for="company-name">企業名</label>
    <input id="company-name" type="text" />
    <button>分析開始</button>
  </div>
</template>
```
*(※ `AnalysisDisplay.vue`, `ChatBox.vue`も同様にシンプルな雛形を生成)*

---

### **フェーズ2：バックエンドAPIのモック実装**

**【ゴール】** フロントエンドが通信する先のAPIエンドポイントを作成する。ただし、中身は固定のダミーデータを返す「モック」にして、バックエンドの都合を待たずに開発を進められるようにする。

> **あなた → Gemini:**
> 「Vercel Functionsで、`api/analyze.ts`というエンドポイントを作って。今はまだGNewsやGemini APIは呼ばずに、固定のMarkdown文字列を返すだけの簡単なモック関数にしてほしい。」

> **Gemini → あなた:**
> 「了解です。フロントエンド開発をブロックしないためのモックAPIですね。以下のように実装します。」

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

- 項目1
- 項目2
  `;

  response.status(200).json({
    report: dummyReport,
  });
}
```

---

### **フェーズ3：フロントエンドとAPIの連携**

**【ゴール】** フェーズ1と2で作成した部品を連携させ、「分析開始」ボタンを押すと、バックエンド（モック）から取得したダミーレポートが表示されるようにする。

> **あなた → Gemini:**
> 「`CompanyInput.vue`のボタンがクリックされたら、`api/analyze.ts`を呼び出して、結果を`AnalysisDisplay.vue`に表示するロジックを追加して。コンポーネント間のデータ受け渡しはpropsでお願いします。」

> **Gemini → あなた:**
> 「承知しました。イベントの発行とpropsによるデータ連携ですね。以下のように修正します。」

*(...具体的なコードの修正案を提示...)*

---

このように、**「骨格作成 → モック → 連携」** というサイクルを小さく回すことで、常に動くものを確認しながら、一歩ずつ着実にアプリケーションを完成に近づけていくことができます。これが、Geminiとのバイブコーディングにおけるインクリメンタルな開発の進め方です。
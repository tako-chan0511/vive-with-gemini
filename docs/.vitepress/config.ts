import { defineConfig } from "vitepress";

export default defineConfig({
  title: "",
  description: "A VitePress Site",

  head: [
    [
      "script",
      { src: "https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js" },
    ],
    ["script", {}, `mermaid.initialize({ startOnLoad: true });`],
    ["link", { rel: "stylesheet", href: "/custom.css" }],
  ],

  themeConfig: {
    nav: [
      { text: "ホーム", link: "/" },
      { text: "開発ストーリー", link: "/development-story" },
      { text: "Tips集", link: "/tips" },
      { text: "コラム", link: "/column" },
      {
        text: "関連リンク",
        items: [
          {
            text: "SkillTrail",
            link: "https://hara0511skilltrail.vercel.app/",
          },
          { text: "GameHub", link: "https://toppage-five.vercel.app/" },
        ],
      },
    ],

    sidebar: [
      {
        text: '<span class="highlight-title">序文</span>',
        collapsible: true,
        items: [{ text: "はじめに", link: "/Introduction" }],
      },
      {
        text: '<span class="highlight-title">メインストーリー</span>',
        collapsible: true,
        items: [
          { text: "1. Vive with Gemini：AI時代の新しい開発様式", link: "/" },
          {
            text: "2. 共通認識：AIマーケットアナリスト",
            link: "/inception-deck",
          },
          {
            text: "3. 開発ストーリー：AIマーケットアナリスト",
            link: "/development-story",
          },
          { text: "4. 実践：AI駆動TDD", link: "/refactoring" },
        ],
      },
      {
        text: '<span class="highlight-title">コラム</span>',
        collapsible: true,
        items: [
          { text: "AI時代のエンジニア進化論", link: "/column" },
          {
            text: "ViveコーディングとJSフレームワーク",
            link: "/why-vive-with-js-frameworks",
          },
          {
            text: "マルチエージェント・コラボレーション考察",
            link: "/multi-agent-collaboration",
          },
        ],
      },

      {
        text: '<span class="highlight-title">各種資料</span>',
        collapsible: true,
        items: [
          { text: "Tips with gemini", link: "/tips" },
          { text: "想定Q&A", link: "/q-and-a" },
          { text: "付録：環境構築ガイド", link: "/appendix-environment" },
          { text: "付録：VitePressガイド", link: "/appendix-vitePress" },
          { text: "付録：Vue3-pythonガイド", link: "/appendix-vue3-python" },
          { text: "付録：API-pytestガイド", link: "/appendix-pytest" },
           { text: "付録：API-Migrationガイド", link: "/appendix-api-migration" },
          
        ],
      },
      // --- ここから追加 ---
      {
        text: '<span class="highlight-title">APIリファレンス</span>',
        collapsible: true,
        items: [
          { text: "概要", link: "/api-reference/" },
          { text: "名言ジェネレーター", link: "/api-reference/quote" },
          { text: "統計表の分類取得", link: "/api-reference/get-categories" },
          { text: "住所緯度経度変換", link: "/api-reference/geocode" },
          { text: "アクセスカウント取得", link: "/api-reference/get-count" },
          { text: "いいねカウント取得", link: "/api-reference/like" },
          { text: "アクセス数（トラック）情報取得", link: "/api-reference/track" },
          { text: "政策情報サマリー", link: "/api-reference/summarize" },
          { text: "企業ニュース要約分析", link: "/api-reference/analyze-company-news" },
          { text: "追加質問応答", link: "/api-reference/ask-follow-up" },
          { text: "株価情報取得", link: "/api-reference/fetch-stock-quote" },
          { text: "統計データ分析", link: "/api-reference/analyze-stats" },
         { text: "統計メタ情報取得", link: "/api-reference/get-meta-info" },
         { text: "統計検索", link: "/api-reference/search-stats" },
          { text: "ユーザ質問AI回答", link: "/api-reference/answer-question" },
         { text: "記事URLからコンテンツを抽出", link: "/api-reference/fetch-article-content" },
          { text: "ニュース記事取得", link: "/api-reference/fetch-news" },
           { text: "ニュース要約", link: "/api-reference/summarize-article" },
        ],
      },
      // --- ここまで追加 ---
      {
        text: '<span class="highlight-title">共有会資料</span>',
        collapsible: true,
        items: [{ text: "アジェンダ（案）", link: "/agenda" }],
      },
      {
        text: '<span class="highlight-title">フィードバック（slido)</span>',
        collapsible: true,
        items: [
          { text: "質問を送る", link: "/question-form" },
          { text: "＜工事中＞今までのQ&Aを見る", link: "/q-and-a-session" },
        ],
      },
      {
        text: "作者情報",
        items: [{ text: "作者プロフィール詳細", link: "/profile" }],
      },
    ],
  },
});

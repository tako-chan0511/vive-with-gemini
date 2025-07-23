import { defineConfig } from "vitepress"; // ★★★ この行が抜けていました ★★★

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Vive with Gemini",
  description: "A VitePress Site",

  // サイトのテーマに関する設定
  themeConfig: {
    // ナビゲーションメニューの設定
    nav: [
      { text: "ホーム", link: "/" },
      { text: "インセプションデッキ", link: "/inception-deck" },
      { text: "デモシナリオ", link: "/demo-scenario" },
      { text: "コード集", link: "/code-snippets" },
      { text: "Q&A", link: "/q-and-a" }, // ★この行を追加
    ],

    // サイドバーの設定
    // サイドバーの設定
    sidebar: [
      {
        text: "プロジェクト資料",
        collapsible: true,
        items: [
          { text: "インセプションデッキ", link: "/inception-deck" },
          { text: "デモシナリオ", link: "/demo-scenario" },
          { text: "コード集", link: "/code-snippets" },
          { text: "Q&A", link: "/q-and-a" },
        ],
      },
      {
        text: "ケーススタディ",
        collapsible: true,
        items: [
          { text: "AIマーケットアナリスト開発記", link: "/development-story" }, // ★テキストを修正
        ],
      },
    ],
  },
});

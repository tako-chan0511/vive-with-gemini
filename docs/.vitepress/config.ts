import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Vive with Gemini",
  description: "A VitePress Site",

  themeConfig: {
    nav: [
      { text: 'ホーム', link: '/' },
      { text: 'インセプションデッキ', link: '/inception-deck' },
      { text: 'デモシナリオ', link: '/demo-scenario' },
      { text: 'コード集', link: '/code-snippets' },
      { text: 'Tips集', link: '/tips' },
      { text: 'Q&A', link: '/q-and-a' } // ★Q&Aへのリンクを追加
    ],

    sidebar: [
      {
        text: 'プロジェクト資料',
        collapsible: true,
        items: [
          { text: 'インセプションデッキ', link: '/inception-deck' },
          { text: 'デモシナリオ', link: '/demo-scenario' },
          { text: 'コード集', link: '/code-snippets' },
          { text: 'Tips集', link: '/tips' },
          { text: 'Q&A', link: '/q-and-a' } // ★Q&Aへのリンクを追加
        ]
      },
      {
        text: 'ケーススタディ',
        collapsible: true,
        items: [
          { text: 'AIマーケットアナリスト開発記', link: '/development-story' }
        ]
      }
    ]
  }
})
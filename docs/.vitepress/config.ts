import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Vive with Gemini",
  description: "A VitePress Site",

  themeConfig: {
    nav: [
      { text: 'ホーム', link: '/' },
      { text: '開発ストーリー', link: '/development-story' },
      { text: 'Tips集', link: '/tips' }
    ],

    sidebar: [
      {
        text: '私たちの物語',
        collapsible: true,
        items: [
          { text: '私たちが目指すもの', link: '/' },
          { text: '設計思想 (Inception Deck)', link: '/inception-deck' },
          { text: 'AIマーケットアナリスト開発記', link: '/development-story' },
          { text: 'リファクタリング実践', link: '/refactoring' }, // ★リンクを修正
        ]
      },
      {
        text: '各種資料',
        collapsible: true,
        items: [
          { text: 'コード集', link: '/code-snippets' },
          { text: 'Tips集', link: '/tips' },
          { text: 'Q&A', link: '/q-and-a' },
        ]
      }
    ]
  }
})
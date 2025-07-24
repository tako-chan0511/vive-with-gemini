import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Vive with Gemini",
  description: "A VitePress Site",

  head: [
    ['script', { src: 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js' }],
    ['script', {}, `mermaid.initialize({ startOnLoad: true });`],
    // カスタムCSSファイルを読み込むためのリンクを追加
    // ['link', { rel: 'stylesheet', href: '/custom.css' }]
  ],

  themeConfig: {
    nav: [
      { text: 'ホーム', link: '/' },
      { text: '開発ストーリー', link: '/development-story' },
      { text: 'Tips集', link: '/tips' },
      // 関連リンクを追加
      { text: 'SkillTrail', link: 'https://hara0511skilltrail.vercel.app/' },
      { text: 'GameHub', link: 'https://toppage-five.vercel.app/' }
    ],

    sidebar: [
      {
        text: '私たちの物語',
        collapsible: true,
        items: [
          // 物語の順序がわかるように番号を追加
          { text: '1. 私たちが目指すもの', link: '/' },
          { text: '2. 共通認識 (Inception Deck)', link: '/inception-deck' },
          { text: '3. AIマーケットアナリスト開発記', link: '/development-story' },
          { text: '4. 実践：AI駆動TDD', link: '/refactoring' },
        ]
      },
      {
        text: '各種資料',
        collapsible: true,
        items: [
          // 'コード集'を削除
          { text: 'Tips集', link: '/tips' },
          { text: 'Q&A', link: '/q-and-a' },
          { text: '付録：環境構築ガイド', link: '/appendix-environment' } 
        ]
      }
    ]
  }
})

import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Vive with Gemini",
  description: "A VitePress Site",

  head: [
    ['script', { src: 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js' }],
    ['script', {}, `mermaid.initialize({ startOnLoad: true });`],
  ],

  themeConfig: {
    nav: [
      { text: 'ホーム', link: '/' },
      { text: '開発ストーリー', link: '/development-story' },
      { text: 'Tips集', link: '/tips' },
      // 👇 ここから追記
      { text: 'コラム', link: '/column' },
      // 👆 ここまで追記
      {
        text: '関連リンク',
        items: [
          { text: 'SkillTrail', link: 'https://hara0511skilltrail.vercel.app/' },
          { text: 'GameHub', link: 'https://toppage-five.vercel.app/' }
        ]
      }
    ],

    sidebar: [
      {
        text: '私たちの物語',
        collapsible: true,
        items: [
          { text: '1. 私たちが目指すもの', link: '/' },
          { text: '2. 共通認識 (Inception Deck)', link: '/inception-deck' },
          { text: '3. AIマーケットアナリスト開発記', link: '/development-story' },
          { text: '4. 実践：AI駆動TDD', link: '/refactoring' },
        ]
      },
      // 👇 ここから追記
      {
        text: 'コラム',
        collapsible: true,
        items: [
          { text: 'AI時代のエンジニア進化論', link: '/column' },
          { text: 'ViveコーディングとJSフレームワーク', link: '/why-vive-with-js-frameworks' },
        ]
      },
      // 👆 ここまで追記
      {
        text: '各種資料',
        collapsible: true,
        items: [
          { text: 'Tips集', link: '/tips' },
          { text: 'Q&A', link: '/q-and-a' },
          { text: '付録：環境構築ガイド', link: '/appendix-environment' }
        ]
      },
      {
        text: 'フィードバック（slido)',
        collapsible: true,
        items: [
          { text: '質問を送る', link: '/question-form' },
          { text: '今までのQ&Aを見る', link: '/q-and-a-session' }
        ]
      }
    ]
  }
})
// .vitepress/config.ts
import { defineConfig } from "vitepress";

export default defineConfig({
  title: "",
  description: "A VitePress Site",

  // config.ts の head をこの配列に置き換え
head: [
  [
    "script",
    { type: "module" },
    `
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';

/* ---- init (guard) ---- */
if (!window.__MERMAID_INITIALIZED__) {
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  mermaid.initialize({
    startOnLoad: false,
    theme: prefersDark ? 'dark' : 'default',
    securityLevel: 'loose'
  });
  window.__MERMAID_INITIALIZED__ = true;
}

/* ---- render helpers ---- */
const doRender = (selector = '.mermaid') => {
  try { mermaid.run({ querySelector: selector }); } catch {}
};
window.renderMermaid = doRender; // ← 手動で呼びたいとき用

// .mermaid が DOM に現れたタイミングで描画
const renderWhenReady = (selector = '.mermaid') => {
  if (document.querySelector(selector)) {
    requestAnimationFrame(() => doRender(selector));
    return;
  }
  const obs = new MutationObserver(() => {
    if (document.querySelector(selector)) {
      obs.disconnect();
      requestAnimationFrame(() => doRender(selector));
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
  // 保険（1.5秒後に一度は試行）
  setTimeout(() => { obs.disconnect(); doRender(selector); }, 1500);
};

/* ---- first paint ---- */
if (document.readyState !== 'loading') renderWhenReady();
else window.addEventListener('DOMContentLoaded', () => renderWhenReady());

/* ---- SPA route & hash navigation ---- */
// ルート遷移（サイドバーのページ切替）
window.addEventListener('vitepress:afterRouteChanged', () => {
  // DOM 差し替え完了後に実行（2フレーム待ち）
  requestAnimationFrame(() => requestAnimationFrame(() => renderWhenReady()));
});
// 同一ページ内の見出しジャンプ（#hash）
window.addEventListener('hashchange', () => {
  requestAnimationFrame(() => renderWhenReady());
});

// details の展開などで後から要素が出た場合にも追従
document.addEventListener('toggle', (e) => {
  if (e.target instanceof HTMLDetailsElement) {
    requestAnimationFrame(() => renderWhenReady());
  }
});

/* ---- theme change follow ---- */
const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
mql?.addEventListener('change', (e) => {
  mermaid.initialize({
    startOnLoad: false,
    theme: e.matches ? 'dark' : 'default',
    securityLevel: 'loose'
  });
  renderWhenReady();
});
    `,
  ],
  ["link", { rel: "stylesheet", href: "/custom.css" }],
],


  vite: { optimizeDeps: { exclude: ["mermaid"] } },

  markdown: {
    mermaid: true
  },


  themeConfig: {
    nav: [
      { text: "ホーム", link: "/" },
      { text: "開発ストーリー", link: "/development-story" },
      { text: "Tips集", link: "/tips" },
      { text: "コラム", link: "/column" },
      {
        text: "関連リンク",
        items: [
          { text: "SkillTrail", link: "https://hara0511skilltrail.vercel.app/" },
          { text: "GameHub", link: "https://toppage-five.vercel.app/" },
        ],
      },
    ],
    sidebar: [
      { text: '<span class="highlight-title">序文</span>', collapsible: true, collapsed: true, items: [{ text: "はじめに", link: "/Introduction" }] },
      { text: '<span class="highlight-title">メインストーリー</span>', collapsible: true, collapsed: true, items: [
        { text: "1. Vive with Gemini：AI時代の新しい開発様式", link: "/" },
        { text: "2. 共通認識：AIマーケットアナリスト", link: "/inception-deck" },
        { text: "3. 開発ストーリー：AIマーケットアナリスト", link: "/development-story" },
        { text: "4. 実践：AI駆動TDD", link: "/refactoring" },
      ]},
      { text: '<span class="highlight-title">コラム</span>', collapsible: true, collapsed: true, items: [
        { text: "AI時代のエンジニア進化論", link: "/column" },
        { text: "ViveコーディングとJSフレームワーク", link: "/why-vive-with-js-frameworks" },
        { text: "マルチエージェント・コラボレーション考察", link: "/multi-agent-collaboration" },
      ]},
      { text: '<span class="highlight-title">AI活用Tips</span>', collapsible: true, collapsed: true, items: [
        { text: "Tips with gemini", link: "/tips" },
        { text: "想定Q&A", link: "/q-and-a" },
      ]},
      { text: '<span class="highlight-title">環境他Tips</span>', collapsible: true, collapsed: true, items: [
        { text: "付録：環境構築ガイド", link: "/appendix/environment" },
        { text: "付録：VitePressガイド", link: "/appendix/vitePress" },
        { text: "付録：Vue3-pythonガイド", link: "/appendix/vue3-python" },
        { text: "付録：API-pytestガイド", link: "/appendix/pytest" },
        { text: "付録：API-Migrationガイド", link: "/appendix/api-migration-with-verce" },
        { text: "付録：API-Migration環境ガイド", link: "/appendix/migration-env-setting-guide" },
        { text: "付録：VSCode-Backlog-TortoiseGit-etc環境ガイド", link: "/appendix/VSCode-Backlog-TortoiseGit-etc" },
        { text: "付録：SSH-GIT-Setup環境ガイド", link: "/appendix/ssh-git-setup" },
        { text: "付録：Python WebAPI with Aurora 連携アーキテクチャ設計ガイド", link: "/appendix/Python-WebAPI-with-Aurora" },
        { text: "付録：API設計ガイド", link: "/appendix/api-design-guide" },
        { text: "付録：AWS比較（Django vs FastAPI）ガイド", link: "/appendix/django-fastapi-aws-api-comparison" },
        { text: "付録：FastAPI-Auroraガイド", link: "/appendix/FastAPI-Aurora" },
        { text: "my-recipes：ローカル環境（vue-python)ガイド", link: "/appendix/vue_fastapi_setup_guide" },
        { text: "my-recipes：Docker開発環境移行（vue-python)ガイド", link: "/appendix/docker-setup-local" },
        { text: "my-recipes：Docker完全版移行（vue-python)ガイド", link: "/appendix/docker-setup-all" },
        { text: "my-recipes：Web/APIサーバ要素説明（vue-python)ガイド", link: "/appendix/web-api-server-description" },
        { text: "仕事：GithubとBacklog-git比較（VSCode編）", link: "/appendix/github_vs_backlog_git" },
        { text: "my-recipes：Render-BluePrint（Docker/CICD編）", link: "/appendix/my-recipes-render-blueprint" },
        { text: "my-recipes：Render-vs-AWS-deploy（Docker/CICD編）", link: "/appendix/render-vs-aws-deploy" },
        { text: "my-recipes：Render CI/CDガイド（Docker/CICD編）", link: "/appendix/render_ci_cd_guide" },
        { text: "WebAPI開発AIフロー", link: "/appendix/webapi_ai_fullflow" },
        { text: "Kitchen-Stackローカル環境", link: "/appendix/kitchen-stack-localsetup" },
        { text: "同機・非同期アーキテクチャ図", link: "/appendix/Sync-async-archtecture" },
        { text: "同機・非同期+APIGatewayアーキテクチャ図", link: "/appendix/Sync-async-APIGAteway-archtecture" },

      ]},
      {
        text: '<span class="highlight-title">APIリファレンス</span>',
        collapsible: true,
        collapsed: true,
        items: [
          { text: "概要", link: "/api-reference/" },
          { text: "名言ジェネレーター", link: "/api-reference/quote" },
          { text: "楽天レシピカテゴリ取得", link: "/api-reference/get-categories" },
          { text: "楽天レシピランキング取得", link: "/api-reference/recipe_ranking" },
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
      {
        text: '<span class="highlight-title">共有会資料</span>',
        collapsible: true,
        collapsed: true,
        items: [{ text: "アジェンダ（案）", link: "/agenda" }],
      },
      {
        text: '<span class="highlight-title">フィードバック（slido)</span>',
        collapsible: true,
        collapsed: true,
        items: [
          { text: "質問を送る", link: "/question-form" },
          { text: "＜工事中＞今までのQ&Aを見る", link: "/q-and-a-session" },
        ],
      },
      {
        text: '<span class="highlight-title">作者情報</span>',
        collapsed: true,
        items: [{ text: "作者プロフィール詳細", link: "/profile" }],
      },
    ],
  },
});

// .vitepress/config.ts
import { defineConfig } from "vitepress";

export default defineConfig({
  title: "",
  base: '/vive-with-gemini/',
  description: "A VitePress Site",

  head: [
    [
      "script",
      { type: "module" },
      `
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';

/* ============ Mermaid 初期化 ============ */
if (!window.__MERMAID_INIT__) {
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  mermaid.initialize({
    startOnLoad: false,
    theme: prefersDark ? 'dark' : 'default',
    securityLevel: 'loose',
  });
  window.__MERMAID_INIT__ = true;
}

/* ============ ユーティリティ ============ */
// pre.mermaid → div.mermaid に昇格（未変換のみ）
function upgradePreToDiv(root = document) {
  root.querySelectorAll('pre.mermaid').forEach(pre => {
    if (pre.dataset.upgraded === '1') return;
    const code = pre.textContent ?? '';
    const holder = document.createElement('div');
    holder.className = 'mermaid';
    holder.textContent = code;
    pre.replaceWith(holder);
    holder.dataset.upgraded = '1';
  });
}

// 実行（存在する .mermaid 未処理分のみ）
function runMermaid() {
  try {
    mermaid.run({ querySelector: '.mermaid:not([data-processed])' });
  } catch {}
}

// レンダリング本体
function renderNow() {
  // ドキュメント領域（存在しなければ document 全体）
  const root = document.querySelector('.VPContent') || document;
  upgradePreToDiv(root);
  runMermaid();
}

// 「確実に描画」するために何度かリトライ
function scheduleRender() {
  if (window.__MERMAID_RENDERING__) return;
  window.__MERMAID_RENDERING__ = true;

  const delays = [0, 30, 80, 160, 320, 640]; // 何度か試す
  delays.forEach(d => setTimeout(renderNow, d));

  // 最後にフラグを戻す
  setTimeout(() => { window.__MERMAID_RENDERING__ = false; }, delays.at(-1) + 50);
}

/* ============ イベントに広くフック ============ */
// 初回
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', scheduleRender, { once: true });
} else {
  scheduleRender();
}

// ルート遷移（VitePress SPA）
window.addEventListener('vitepress:afterRouteChanged', () => {
  // 差し替え完了後に数回トライ
  scheduleRender();
});

// ハッシュ遷移（右 TOC クリック含む）
window.addEventListener('hashchange', () => {
  scheduleRender();
});

// クリック（左サイドバー・右 TOC を含め、内部リンクなら予約）
document.addEventListener('click', (ev) => {
  const a = ev.target?.closest?.('a');
  if (!a) return;

  // 外部リンク・_blank は対象外
  const href = a.getAttribute('href') || '';
  if (!href || a.target === '_blank' || /^(https?:|mailto:|tel:)/i.test(href)) return;

  // 内部の a クリックで、描画を予約（SPA 遷移でも再描画）
  requestAnimationFrame(scheduleRender);
});

// DOM 差し替え検出（.VPContent 直下を監視）
const contentRoot = document.querySelector('.VPContent') || document.body;
const mo = new MutationObserver((mutations) => {
  // mermaid ノードが入ってきたら少し待って描画
  if (mutations.some(m => Array.from(m.addedNodes).some(
        n => n.nodeType === 1 && (n.matches?.('pre.mermaid, .mermaid') || n.querySelector?.('pre.mermaid, .mermaid'))
     ))) {
    setTimeout(scheduleRender, 30);
  }
});
mo.observe(contentRoot, { childList: true, subtree: true });

// ダーク/ライト切替（次レンダ時に反映）
const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
mql?.addEventListener('change', (e) => {
  mermaid.initialize({
    startOnLoad: false,
    theme: e.matches ? 'dark' : 'default',
    securityLevel: 'loose',
  });
  scheduleRender();
});
      `,
    ],
    ["link", { rel: "stylesheet", href: "/custom.css" }],
  ],

  vite: {
    optimizeDeps: { exclude: ["mermaid"] },
    server: {
      watch: {
        // WSL や Windows のマウント上でファイル変更を確実に検知させる
        usePolling: true,
      },
    },
  },

  themeConfig: {
    nav: [
      { text: "ホーム", link: "/" },
      { text: "開発ストーリー", link: "/development-story" },
      { text: "Tips集!", link: "/tips" },
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
        collapsed: true,
        items: [{ text: "はじめに", link: "/Introduction" }],
      },
      {
        text: '<span class="highlight-title">メインストーリー</span>',
        collapsed: true,
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
        text: '<span class="highlight-title">📺動画📺</span>',
        collapsed: true,
        items: [
          { text: "動画一覧", link: "/videos" },
        ],
      },
      {
        text: '<span class="highlight-title">コラム</span>',
        collapsed: true,
        items: [
          { text: "1.AI時代のエンジニア進化論!", link: "/column" },
          {
            text: "2.ViveコーディングとJSフレームワーク",
            link: "/why-vive-with-js-frameworks",
          },
          {
            text: "3.マルチエージェント・コラボレーション考察",
            link: "/multi-agent-collaboration",
          },
          {
            text: "4.AIと共に動くチーム：Vive-with-Geminiが導いた“自然発生アジャイル”",
            link: "/ai-agile-vive-with-gemini"
          },
          {
            text: "4.1 現場で磨かれるAI活用術",
            link: "/ai-agile-vive-with-gemini-extended"
          },
        {
            text: "4.2 2015年ころのAIと、今のAIは何が違うのか？",
            link: "/ai-agile-vive-with-gemini-column-2015-vs-2025"
          },
        ],
      },
      {
        text: '<span class="highlight-title">AI活用Tips</span>',
        collapsed: true,
        items: [
          { text: "Tips with gemini", link: "/tips" },
          { text: "想定Q&A", link: "/q-and-a" },
        ],
      },

  {
  text: '<span class="highlight-title">環境他Tips</span>',
  collapsed: true,
  items: [
    {
      text: 'Game Hub関連',
      collapsed: true,
      items: [
        { text: 'AI時代のフルスタック戦略：Nuxt3への道', link: '/appendix/migration-vue3-to-nuxt3' },
        { text: '完全無料枠GameHubガイド', link: '/appendix/prepetual-zero-cost-automation' },
        { text: 'Toppage_Digital_playgroud', link: '/appendix/topgage-digital-playground' },       
        { text: 'PlantUML:テキストを真実に変える', link: '/appendix/PlantUML_Code-First_Architecture' },
        { text: 'DB活用ガイド', link: '/appendix/Vercel_Supabase_Upstash_Integration_Guide' },
        { text: 'LINUX活用ガイド', link: '/appendix/Linux_Full-Cycle_Engineering_Stack' },
        { text: 'LINUX活用詳細ガイド', link: '/appendix/Dev_Ops_CLI_Handbook' },
        { text: 'API整合性のためのSagaパターン活用ガイド', link: '/appendix/Serverless_Distributed_Consistency' },
        { text: '①分散トランザクション整合性:実務的な設計ガイド', link: '/appendix/TX-A01' },
        { text: '②Sagaパターン設計チェックリスト：分散システムの整合性を守るガイド', link: '/appendix/TX-A02' },
        { text: '③AWSサーバーレスでの分散整合性：3つの実装パターン比較ガイド', link: '/appendix/TX-A03' },
        { text: 'サーバーレス連携基盤：最新アーキテクチャとDB設計手法ガイド', link: '/appendix/Serverless_Data_Access_Optimization' },
        { text: 'rg（ripgrep）活用ユースケース Top10', link: '/appendix/The_Ultimate_rg_Developer_Guide' },
        { text: 'fzf活用術開（発効率を劇的に変える）', link: '/appendix/fzf_Command_Line_Mastery' },
        { text: 'AWKによるデータ処理ガイド', link: '/appendix/AWK_Developer_Cookbook' },
        { text: 'sed コマンド活用術', link: '/appendix/Sed_For_Developers' },
        { text: 'tree コマンド開発者向けガイド', link: '/appendix/Tree_Command_Developer_Mastery' },
        { text: 'vi（Vim）tree コマンド開発者向けガイド', link: '/appendix/Vi_10_Developer_Use_Cases' },
        { text: 'git-fzfコマンド開発者向けガイド', link: '/appendix/Git_Fzf_Workflow_Accelerator' },
        { text: 'Regex（正規表現）活用ガイド', link: '/appendix/Regex_Recipes_for_Developers' },
        
        
      ],
    },
    {
      text: 'REST API関連',
      collapsed: true,
      items: [
        { text: 'The_Digital_Handshake（初級）', link: '/appendix/The_Digital_Handshake' },
        { text: 'The_Digital_Handshake（中級）', link: '/appendix/Level_Up_Your_REST_APIs' },

      
      ],
    },
    {
      text: 'Git/Github関連',
      collapsed: true,
      items: [
        { text: 'Gitメンタルモデル解説', link: '/appendix/Git_Mental_Model' },
        { text: 'Gitコマンド早見表', link: '/appendix/Git_Map_Command_Guide' },
      
      ],
    },
    {
      text: 'ネットワーク関連',
      collapsed: true,
      items: [
        { text: 'WSL2ネットワークの謎を解く', link: '/appendix/WSL2_Networking_Five_Layer_Mastery' },
        { text: 'WSL2：MirroredModeネットワーク解説', link: '/appendix/WSL2_Networking_Modernization_Guide' },
        { text: 'AI_Offense_Defense_Hybrid_Playbook', link: '/appendix/AI_Offense_Defense_Hybrid_Playbook' },
        { text: 'Proxy_Wizard_AI_Handbook', link: '/appendix/Proxy_Wizard_AI_Handbook' },
        { text: 'Closed_Network_Proxy_Mastery', link: '/appendix/Closed_Network_Proxy_Mastery' },
        { text: 'Intranet_Command_Survival', link: '/appendix/Intranet_Command_Survival' },
        { text: 'Securing_the_Remote_Perimeter', link: '/appendix/Securing_the_Remote_Perimeter' },
        { text: 'Closed_Network_curl_Grimoire', link: '/appendix/Closed_Network_curl_Grimoire' },
        { text: 'プロのnetshテクニック', link: '/appendix/プロのnetshテクニック' },
        { text: 'Closed_Network_CLI_Survival', link: '/appendix/Closed_Network_CLI_Survival' },
        { text: '★「十分」の先へ：LLM評価実践ガイド', link: '/appendix/Engineered LLM Reliability' },
        { text: '★Vモデルとの比較_AI_Quality', link: '/appendix/Engineering_Generative_AI_Quality' },
        { text: '★LLMの評価：「感覚」から検証可能な品質へ', link: '/appendix/Engineering_LLM_Reliability' },
        { text: '★AI_Tuning_Specialist_Blueprint', link: '/appendix/AI_Tuning_Specialist_Blueprint' },
        { text: '★Private_AI_Kitchen_Sovereignty', link: '/appendix/Private_AI_Kitchen_Sovereignty' },
        { text: '★Tsuzumi_LoRA_OpenShift_Disconnected_Deployment', link: '/appendix/Tsuzumi_LoRA_OpenShift_Disconnected_Deployment' },
        { text: '★Modern_Network_Boundary_Control', link: '/appendix/Modern_Network_Boundary_Control' },
        { text: '★Dynamic_Multi-Flavor_AI_Serving', link: '/appendix/Dynamic_Multi-Flavor_AI_Serving' },
        { text: '★Enterprise_Sovereign_AI_Strategy', link: '/appendix/Enterprise_Sovereign_AI_Strategy' },
        { text: '★インセプションデッキ：Sovereign_AI_Kitchen', link: '/appendix/Sovereign_AI_Kitchen' },
        { text: '★InferenceServiceを理解する', link: '/appendix/Efficient_Multi-LoRA_on_RHOAI' },

   
      
      ],
    },
    {
      text: 'OpenShift AI デプロイ関連',
      collapsed: true,
      items: [
        { text: 'プライベートAIキッチンの構築', link: '/appendix/The_Private_AI_Kitchen_Blueprint' },
        { text: 'Modern_Network_Boundary_Control', link: '/appendix/Modern_Network_Boundary_Control' },
        { text: 'Dynamic_Multi-Flavor_AI_Serving', link: '/appendix/Dynamic_Multi-Flavor_AI_Serving' },
        { text: 'Enterprise_Sovereign_AI_Strategy', link: '/appendix/Enterprise_Sovereign_AI_Strategy' },
        { text: 'インセプションデッキ：Sovereign_AI_Kitchen', link: '/appendix/Sovereign_AI_Kitchen' },
        { text: 'InferenceServiceを理解する', link: '/appendix/Efficient_Multi-LoRA_on_RHOAI' },
        { text: '「十分」の先へ：LLM評価実践ガイド', link: '/appendix/Engineered LLM Reliability' },
        { text: 'Vモデルとの比較_AI_Quality', link: '/appendix/Engineering_Generative_AI_Quality' },
        { text: 'LLMの評価：「感覚」から検証可能な品質へ', link: '/appendix/Engineering_LLM_Reliability' },
        { text: 'AI_Tuning_Specialist_Blueprint', link: '/appendix/AI_Tuning_Specialist_Blueprint' },
        { text: 'Private_AI_Kitchen_Sovereignty', link: '/appendix/Private_AI_Kitchen_Sovereignty' },
        { text: 'Tsuzumi_LoRA_OpenShift_Disconnected_Deployment', link: '/appendix/Tsuzumi_LoRA_OpenShift_Disconnected_Deployment' },
        { text: '動的AIサービング：効率的なカスタムモデルデプロイ', link: '/appendix/Dynamic_Multi-LoRA_Strategy' },
        { text: '【音声】＜基本・運用設計（推論）＞完全閉域網での巨大LLM運用と動的LoRA設計', link: '/appendix/Sovereign_AI_via_Dynamic_LoRA' },
        { text: '【音声】＜詳細設計・構築マニュフェスト（推論）＞動的LoRAで構築する完全閉域網の生成AI基盤', link: '/appendix/Sovereign_AI_Dynamic_LoRA_Blueprint' },
        { text: '【音声】＜テスト計画・PoC仕様書（推論）＞完全閉域網で絶対に落ちない動的LoRA基盤の限界突破テスト', link: '/appendix/Invincible_Air-Gapped_AI_Infrastructure' },


      ],
    },
    {
      text: 'Dify（ディファイ）関連',
      collapsed: true,
      items: [
        { text: 'Dify_AI__AIアプリ開発ブートキャンプ', link: '/appendix/Dify_AI_App_Development_Bootcamp' },
        { text: 'Dify失敗パターンとパラメータ調整ガイド', link: '/appendix/Dify失敗パターンとパラメータ調整ガイド' },
        { text: 'RAGの精度を最大化する：高品質ナレッジベース構築ガイド', link: '/appendix/RAG_Accuracy_Engineering_vitepress' },
         
      ],
    },
    {
      text: 'AI＆IaC関連',
      collapsed: true,
      items: [
        { text: 'IaC_Evolution_Configuration_to_Immutability', link: '/appendix/IaC_Evolution_Configuration_to_Immutability' },
        { text: 'Guardrails_Red_Teaming_and_Kubernetes_vitepress', link: '/appendix/Guardrails_Red_Teaming_and_Kubernetes_vitepress' },
        { text: 'OWASP Top 10 for LLM Applications 2025（全体像）', link: '/appendix/OWASP_LLM_Top_10_2025_vitepress' },
        { text: 'KubernetesによるAI/ML基盤の最適化戦略：2段階スケーリングとGPU共有（MIG・タイムスライシング）', link: '/appendix/AI_GPU_Scaling_and_Sharing_on_Kubernetes_vitepress' },
        { text: 'WSL2で構築するスケーラブルなAI評価基盤：Docker→Kubernetes→並列評価→自動化（ローカル実装ガイド）', link: '/appendix/WSL2_AI_Eval_Platform_vitepress' },
        { text: 'DeepEval on Kubernetes：スケーラブルなLLM評価アーキテクチャ', link: '/appendix/Kubernetes_Parallel_LLM_Evaluation_vitepress' },
        { text: 'スクリプトからスケールへ：Kubernetesによる並列LLM評価', link: '/appendix/Parallel_LLM_Evaluation_on_Kubernetes_vitepress' },
        { text: 'DeepEval_Metrics_And_Customization_Guide', link: '/appendix/DeepEval_Metrics_And_Customization_Guide' },
        { text: 'Kubernetes_Indexed_Jobs_Scaling_AI_ML_vitepress', link: '/appendix/Kubernetes_Indexed_Jobs_Scaling_AI_ML_vitepress' },
        { text: 'GPUのスライス：KubernetesでAIを賢く実行する方法（MIG / Time-Slicing）', link: '/appendix/GPU_Slicing_Kubernetes_AI_Efficiency_vitepress' },
        { text: 'AIエージェントの防御', link: '/appendix/AI_Agent_Fortress_Defense' },
       

        
      ],
    },
    {
      text: 'セットアップ / 開発環境',
      collapsed: true,
      items: [
        { text: '付録：環境構築ガイド', link: '/appendix/environment' },
        { text: '付録：SSH-GIT-Setup環境ガイド', link: '/appendix/ssh-git-setup' },
        { text: '付録：VSCode-Backlog-TortoiseGit-etc環境ガイド', link: '/appendix/VSCode-Backlog-TortoiseGit-etc' },
        { text: 'Kitchen-Stackローカル環境', link: '/appendix/kitchen-stack-localsetup' },
      ],
    },
    {
      text: 'フレームワーク / ツール',
      collapsed: true,
      items: [
        { text: '付録：VitePressガイド', link: '/appendix/vitePress' },
        { text: '付録：Vue3-pythonガイド', link: '/appendix/vue3-python' },
        { text: '付録：API-pytestガイド', link: '/appendix/pytest' },
        { text: '■Marmaid文法', link: '/appendix/mermaid' },
      ],
    },
    {
      text: 'API設計 / アーキテクチャ',
      collapsed: true,
      items: [
        { text: '付録：API設計ガイド', link: '/appendix/api-design-guide' },
        { text: '同機・非同期アーキテクチャ図', link: '/appendix/Sync-async-archtecture' },
        { text: '同機・非同期+APIGatewayアーキテクチャ図', link: '/appendix/Sync-async-APIGAteway-archtecture' },
        { text: 'API－Gateway（Ngonx）アーキテクチャ図', link: '/appendix/api-gateway-nginx' },
        { text: '付録：Python WebAPI with Aurora 連携アーキテクチャ設計ガイド', link: '/appendix/Python-WebAPI-with-Aurora' },
        { text: '付録：FastAPI-Auroraガイド', link: '/appendix/FastAPI-Aurora' },
        { text: '付録：AWS比較（Django vs FastAPI）ガイド', link: '/appendix/django-fastapi-aws-api-comparison' },
      ],
    },
    {
      text: 'my-recipes（実装手引き）',
      collapsed: true,
      items: [
        { text: 'my-recipes：ローカル環境（vue-python)ガイド', link: '/appendix/vue_fastapi_setup_guide' },
        { text: 'my-recipes：Docker開発環境移行（vue-python)ガイド', link: '/appendix/docker-setup-local' },
        { text: 'my-recipes：Docker完全版移行（vue-python)ガイド', link: '/appendix/docker-setup-all' },
        { text: 'my-recipes：Web/APIサーバ要素説明（vue-python)ガイド', link: '/appendix/web-api-server-description' },
      ],
    },
    {
      text: 'デプロイ / CI・CD / マイグレーション',
      collapsed: true,
      items: [
        { text: '付録：API-Migrationガイド', link: '/appendix/api-migration-with-verce' },
        { text: '付録：API-Migration環境ガイド', link: '/appendix/migration-env-setting-guide' },
        { text: 'my-recipes：Render-BluePrint（Docker/CICD編）', link: '/appendix/my-recipes-render-blueprint' },
        { text: 'my-recipes：Render-vs-AWS-deploy（Docker/CICD編）', link: '/appendix/render-vs-aws-deploy' },
        { text: 'my-recipes：Render CI/CDガイド（Docker/CICD編）', link: '/appendix/render_ci_cd_guide' },
      ],
    },
    {
      text: 'プロセス / ナレッジ',
      collapsed: true,
      items: [
        { text: 'WebAPI開発AIフロー', link: '/appendix/webapi_ai_fullflow' },
        { text: '■シーケンス図受付版（async-worker）', link: '/appendix/sequence-async-worker' },
        { text: '■シーケンス図完成版（async-worker）', link: '/appendix/sequence-async-worker-with-completion' },
        { text: '仕事：GithubとBacklog-git比較（VSCode編）', link: '/appendix/github_vs_backlog_git' },
      ],
    },
  ],
},
      {
        text: '<span class="highlight-title">APIリファレンス</span>',
        collapsed: true,
        items: [
          { text: "概要", link: "/api-reference/" },
          { text: "名言ジェネレーター", link: "/api-reference/quote" },
          {
            text: "楽天レシピカテゴリ取得",
            link: "/api-reference/get-categories",
          },
          {
            text: "楽天レシピランキング取得",
            link: "/api-reference/recipe_ranking",
          },
          { text: "住所緯度経度変換", link: "/api-reference/geocode" },
          { text: "アクセスカウント取得", link: "/api-reference/get-count" },
          { text: "いいねカウント取得", link: "/api-reference/like" },
          {
            text: "アクセス数（トラック）情報取得",
            link: "/api-reference/track",
          },
          { text: "政策情報サマリー", link: "/api-reference/summarize" },
          {
            text: "企業ニュース要約分析",
            link: "/api-reference/analyze-company-news",
          },
          { text: "追加質問応答", link: "/api-reference/ask-follow-up" },
          { text: "株価情報取得", link: "/api-reference/fetch-stock-quote" },
          { text: "統計データ分析", link: "/api-reference/analyze-stats" },
          { text: "統計メタ情報取得", link: "/api-reference/get-meta-info" },
          { text: "統計検索", link: "/api-reference/search-stats" },
          { text: "ユーザ質問AI回答", link: "/api-reference/answer-question" },
          {
            text: "記事URLからコンテンツを抽出",
            link: "/api-reference/fetch-article-content",
          },
          { text: "ニュース記事取得", link: "/api-reference/fetch-news" },
          { text: "ニュース要約", link: "/api-reference/summarize-article" },
        ],
      },
      {
        text: '<span class="highlight-title">共有会資料</span>',
        collapsed: true,
        items: [{ text: "アジェンダ（案）", link: "/agenda" }],
      },
      {
        text: '<span class="highlight-title">フィードバック（slido)</span>',
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

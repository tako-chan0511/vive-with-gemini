import { usePreferredDark, useDark } from "@vueuse/core";
import { shallowRef, inject, computed, ref, watch, onUnmounted, reactive, markRaw, readonly, nextTick, defineComponent, h } from "vue";
function deserializeFunctions(r) {
  return Array.isArray(r) ? r.map(deserializeFunctions) : typeof r == "object" && r !== null ? Object.keys(r).reduce((t, n) => (t[n] = deserializeFunctions(r[n]), t), {}) : typeof r == "string" && r.startsWith("_vp-fn_") ? new Function(`return ${r.slice(7)}`)() : r;
}
const siteData = deserializeFunctions(JSON.parse('{"lang":"en-US","dir":"ltr","title":"VitePress","description":"A VitePress Site","base":"/vive-with-gemini/","head":[],"router":{"prefetchLinks":true},"appearance":true,"themeConfig":{"nav":[{"text":"ホーム","link":"/"},{"text":"開発ストーリー","link":"/development-story"},{"text":"Tips集!","link":"/tips"},{"text":"コラム","link":"/column"},{"text":"関連リンク","items":[{"text":"SkillTrail","link":"https://hara0511skilltrail.vercel.app/"},{"text":"GameHub","link":"https://toppage-five.vercel.app/"}]}],"sidebar":[{"text":"<span class=\\"highlight-title\\">序文</span>","collapsed":true,"items":[{"text":"はじめに","link":"/Introduction"}]},{"text":"<span class=\\"highlight-title\\">メインストーリー</span>","collapsed":true,"items":[{"text":"1. Vive with Gemini：AI時代の新しい開発様式","link":"/"},{"text":"2. 共通認識：AIマーケットアナリスト","link":"/inception-deck"},{"text":"3. 開発ストーリー：AIマーケットアナリスト","link":"/development-story"},{"text":"4. 実践：AI駆動TDD","link":"/refactoring"}]},{"text":"<span class=\\"highlight-title\\">📺動画📺</span>","collapsed":true,"items":[{"text":"動画一覧","link":"/videos"}]},{"text":"<span class=\\"highlight-title\\">コラム</span>","collapsed":true,"items":[{"text":"1.AI時代のエンジニア進化論!","link":"/column"},{"text":"2.ViveコーディングとJSフレームワーク","link":"/why-vive-with-js-frameworks"},{"text":"3.マルチエージェント・コラボレーション考察","link":"/multi-agent-collaboration"},{"text":"4.AIと共に動くチーム：Vive-with-Geminiが導いた“自然発生アジャイル”","link":"/ai-agile-vive-with-gemini"},{"text":"4.1 現場で磨かれるAI活用術","link":"/ai-agile-vive-with-gemini-extended"},{"text":"4.2 2015年ころのAIと、今のAIは何が違うのか？","link":"/ai-agile-vive-with-gemini-column-2015-vs-2025"}]},{"text":"<span class=\\"highlight-title\\">AI活用Tips</span>","collapsed":true,"items":[{"text":"Tips with gemini","link":"/tips"},{"text":"想定Q&A","link":"/q-and-a"}]},{"text":"<span class=\\"highlight-title\\">環境他Tips</span>","collapsed":true,"items":[{"text":"Game Hub関連","collapsed":true,"items":[{"text":"AI時代のフルスタック戦略：Nuxt3への道","link":"/appendix/migration-vue3-to-nuxt3"},{"text":"完全無料枠GameHubガイド","link":"/appendix/prepetual-zero-cost-automation"},{"text":"Toppage_Digital_playgroud","link":"/appendix/topgage-digital-playground"},{"text":"PlantUML:テキストを真実に変える","link":"/appendix/PlantUML_Code-First_Architecture"},{"text":"DB活用ガイド","link":"/appendix/Vercel_Supabase_Upstash_Integration_Guide"},{"text":"LINUX活用ガイド","link":"/appendix/Linux_Full-Cycle_Engineering_Stack"},{"text":"LINUX活用詳細ガイド","link":"/appendix/Dev_Ops_CLI_Handbook"},{"text":"API整合性のためのSagaパターン活用ガイド","link":"/appendix/Serverless_Distributed_Consistency"},{"text":"①分散トランザクション整合性:実務的な設計ガイド","link":"/appendix/TX-A01"},{"text":"②Sagaパターン設計チェックリスト：分散システムの整合性を守るガイド","link":"/appendix/TX-A02"},{"text":"③AWSサーバーレスでの分散整合性：3つの実装パターン比較ガイド","link":"/appendix/TX-A03"},{"text":"サーバーレス連携基盤：最新アーキテクチャとDB設計手法ガイド","link":"/appendix/Serverless_Data_Access_Optimization"},{"text":"rg（ripgrep）活用ユースケース Top10","link":"/appendix/The_Ultimate_rg_Developer_Guide"},{"text":"fzf活用術開（発効率を劇的に変える）","link":"/appendix/fzf_Command_Line_Mastery"},{"text":"AWKによるデータ処理ガイド","link":"/appendix/AWK_Developer_Cookbook"},{"text":"sed コマンド活用術","link":"/appendix/Sed_For_Developers"},{"text":"tree コマンド開発者向けガイド","link":"/appendix/Tree_Command_Developer_Mastery"},{"text":"vi（Vim）tree コマンド開発者向けガイド","link":"/appendix/Vi_10_Developer_Use_Cases"},{"text":"git-fzfコマンド開発者向けガイド","link":"/appendix/Git_Fzf_Workflow_Accelerator"},{"text":"Regex（正規表現）活用ガイド","link":"/appendix/Regex_Recipes_for_Developers"}]},{"text":"REST API関連","collapsed":true,"items":[{"text":"The_Digital_Handshake（初級）","link":"/appendix/The_Digital_Handshake"},{"text":"The_Digital_Handshake（中級）","link":"/appendix/Level_Up_Your_REST_APIs"}]},{"text":"Git/Github関連","collapsed":true,"items":[{"text":"Gitメンタルモデル解説","link":"/appendix/Git_Mental_Model"},{"text":"Gitコマンド早見表","link":"/appendix/Git_Map_Command_Guide"}]},{"text":"ネットワーク関連","collapsed":true,"items":[{"text":"WSL2ネットワークの謎を解く","link":"/appendix/WSL2_Networking_Five_Layer_Mastery"},{"text":"WSL2：MirroredModeネットワーク解説","link":"/appendix/WSL2_Networking_Modernization_Guide"},{"text":"AI_Offense_Defense_Hybrid_Playbook","link":"/appendix/AI_Offense_Defense_Hybrid_Playbook"},{"text":"Proxy_Wizard_AI_Handbook","link":"/appendix/Proxy_Wizard_AI_Handbook"},{"text":"Closed_Network_Proxy_Mastery","link":"/appendix/Closed_Network_Proxy_Mastery"},{"text":"Intranet_Command_Survival","link":"/appendix/Intranet_Command_Survival"},{"text":"Securing_the_Remote_Perimeter","link":"/appendix/Securing_the_Remote_Perimeter"},{"text":"Closed_Network_curl_Grimoire","link":"/appendix/Closed_Network_curl_Grimoire"},{"text":"プロのnetshテクニック","link":"/appendix/プロのnetshテクニック"},{"text":"Closed_Network_CLI_Survival","link":"/appendix/Closed_Network_CLI_Survival"},{"text":"★「十分」の先へ：LLM評価実践ガイド","link":"/appendix/Engineered LLM Reliability"},{"text":"★Vモデルとの比較_AI_Quality","link":"/appendix/Engineering_Generative_AI_Quality"},{"text":"★LLMの評価：「感覚」から検証可能な品質へ","link":"/appendix/Engineering_LLM_Reliability"},{"text":"★AI_Tuning_Specialist_Blueprint","link":"/appendix/AI_Tuning_Specialist_Blueprint"},{"text":"★Private_AI_Kitchen_Sovereignty","link":"/appendix/Private_AI_Kitchen_Sovereignty"},{"text":"★Tsuzumi_LoRA_OpenShift_Disconnected_Deployment","link":"/appendix/Tsuzumi_LoRA_OpenShift_Disconnected_Deployment"},{"text":"★Modern_Network_Boundary_Control","link":"/appendix/Modern_Network_Boundary_Control"},{"text":"★Dynamic_Multi-Flavor_AI_Serving","link":"/appendix/Dynamic_Multi-Flavor_AI_Serving"},{"text":"★Enterprise_Sovereign_AI_Strategy","link":"/appendix/Enterprise_Sovereign_AI_Strategy"},{"text":"★インセプションデッキ：Sovereign_AI_Kitchen","link":"/appendix/Sovereign_AI_Kitchen"},{"text":"★InferenceServiceを理解する","link":"/appendix/Efficient_Multi-LoRA_on_RHOAI"}]},{"text":"OpenShift AI デプロイ関連","collapsed":true,"items":[{"text":"プライベートAIキッチンの構築","link":"/appendix/The_Private_AI_Kitchen_Blueprint"},{"text":"Modern_Network_Boundary_Control","link":"/appendix/Modern_Network_Boundary_Control"},{"text":"Dynamic_Multi-Flavor_AI_Serving","link":"/appendix/Dynamic_Multi-Flavor_AI_Serving"},{"text":"Enterprise_Sovereign_AI_Strategy","link":"/appendix/Enterprise_Sovereign_AI_Strategy"},{"text":"インセプションデッキ：Sovereign_AI_Kitchen","link":"/appendix/Sovereign_AI_Kitchen"},{"text":"InferenceServiceを理解する","link":"/appendix/Efficient_Multi-LoRA_on_RHOAI"},{"text":"「十分」の先へ：LLM評価実践ガイド","link":"/appendix/Engineered LLM Reliability"},{"text":"Vモデルとの比較_AI_Quality","link":"/appendix/Engineering_Generative_AI_Quality"},{"text":"LLMの評価：「感覚」から検証可能な品質へ","link":"/appendix/Engineering_LLM_Reliability"},{"text":"AI_Tuning_Specialist_Blueprint","link":"/appendix/AI_Tuning_Specialist_Blueprint"},{"text":"Private_AI_Kitchen_Sovereignty","link":"/appendix/Private_AI_Kitchen_Sovereignty"},{"text":"Tsuzumi_LoRA_OpenShift_Disconnected_Deployment","link":"/appendix/Tsuzumi_LoRA_OpenShift_Disconnected_Deployment"},{"text":"動的AIサービング：効率的なカスタムモデルデプロイ","link":"/appendix/Dynamic_Multi-LoRA_Strategy"},{"text":"【音声】＜基本・運用設計（推論）＞完全閉域網での巨大LLM運用と動的LoRA設計","link":"/appendix/Sovereign_AI_via_Dynamic_LoRA"},{"text":"【音声】＜詳細設計・構築マニュフェスト（推論）＞動的LoRAで構築する完全閉域網の生成AI基盤","link":"/appendix/Sovereign_AI_Dynamic_LoRA_Blueprint"},{"text":"【音声】＜テスト計画・PoC仕様書（推論）＞完全閉域網で絶対に落ちない動的LoRA基盤の限界突破テスト","link":"/appendix/Invincible_Air-Gapped_AI_Infrastructure"},{"text":"【音声】＜動的LoRA：OpenShift AI設定と対応InferenceServiceの関係＞","link":"/appendix/Dynamic_LoRA_Deployment_Guide"}]},{"text":"Dify（ディファイ）関連","collapsed":true,"items":[{"text":"Dify_AI__AIアプリ開発ブートキャンプ","link":"/appendix/Dify_AI_App_Development_Bootcamp"},{"text":"Dify失敗パターンとパラメータ調整ガイド","link":"/appendix/Dify失敗パターンとパラメータ調整ガイド"},{"text":"RAGの精度を最大化する：高品質ナレッジベース構築ガイド","link":"/appendix/RAG_Accuracy_Engineering_vitepress"}]},{"text":"AI＆IaC関連","collapsed":true,"items":[{"text":"IaC_Evolution_Configuration_to_Immutability","link":"/appendix/IaC_Evolution_Configuration_to_Immutability"},{"text":"Guardrails_Red_Teaming_and_Kubernetes_vitepress","link":"/appendix/Guardrails_Red_Teaming_and_Kubernetes_vitepress"},{"text":"OWASP Top 10 for LLM Applications 2025（全体像）","link":"/appendix/OWASP_LLM_Top_10_2025_vitepress"},{"text":"KubernetesによるAI/ML基盤の最適化戦略：2段階スケーリングとGPU共有（MIG・タイムスライシング）","link":"/appendix/AI_GPU_Scaling_and_Sharing_on_Kubernetes_vitepress"},{"text":"WSL2で構築するスケーラブルなAI評価基盤：Docker→Kubernetes→並列評価→自動化（ローカル実装ガイド）","link":"/appendix/WSL2_AI_Eval_Platform_vitepress"},{"text":"DeepEval on Kubernetes：スケーラブルなLLM評価アーキテクチャ","link":"/appendix/Kubernetes_Parallel_LLM_Evaluation_vitepress"},{"text":"スクリプトからスケールへ：Kubernetesによる並列LLM評価","link":"/appendix/Parallel_LLM_Evaluation_on_Kubernetes_vitepress"},{"text":"DeepEval_Metrics_And_Customization_Guide","link":"/appendix/DeepEval_Metrics_And_Customization_Guide"},{"text":"Kubernetes_Indexed_Jobs_Scaling_AI_ML_vitepress","link":"/appendix/Kubernetes_Indexed_Jobs_Scaling_AI_ML_vitepress"},{"text":"GPUのスライス：KubernetesでAIを賢く実行する方法（MIG / Time-Slicing）","link":"/appendix/GPU_Slicing_Kubernetes_AI_Efficiency_vitepress"},{"text":"AIエージェントの防御","link":"/appendix/AI_Agent_Fortress_Defense"}]},{"text":"セットアップ / 開発環境","collapsed":true,"items":[{"text":"付録：環境構築ガイド","link":"/appendix/environment"},{"text":"付録：SSH-GIT-Setup環境ガイド","link":"/appendix/ssh-git-setup"},{"text":"付録：VSCode-Backlog-TortoiseGit-etc環境ガイド","link":"/appendix/VSCode-Backlog-TortoiseGit-etc"},{"text":"Kitchen-Stackローカル環境","link":"/appendix/kitchen-stack-localsetup"}]},{"text":"フレームワーク / ツール","collapsed":true,"items":[{"text":"付録：VitePressガイド","link":"/appendix/vitePress"},{"text":"付録：Vue3-pythonガイド","link":"/appendix/vue3-python"},{"text":"付録：API-pytestガイド","link":"/appendix/pytest"},{"text":"■Marmaid文法","link":"/appendix/mermaid"}]},{"text":"API設計 / アーキテクチャ","collapsed":true,"items":[{"text":"付録：API設計ガイド","link":"/appendix/api-design-guide"},{"text":"同機・非同期アーキテクチャ図","link":"/appendix/Sync-async-archtecture"},{"text":"同機・非同期+APIGatewayアーキテクチャ図","link":"/appendix/Sync-async-APIGAteway-archtecture"},{"text":"API－Gateway（Ngonx）アーキテクチャ図","link":"/appendix/api-gateway-nginx"},{"text":"付録：Python WebAPI with Aurora 連携アーキテクチャ設計ガイド","link":"/appendix/Python-WebAPI-with-Aurora"},{"text":"付録：FastAPI-Auroraガイド","link":"/appendix/FastAPI-Aurora"},{"text":"付録：AWS比較（Django vs FastAPI）ガイド","link":"/appendix/django-fastapi-aws-api-comparison"}]},{"text":"my-recipes（実装手引き）","collapsed":true,"items":[{"text":"my-recipes：ローカル環境（vue-python)ガイド","link":"/appendix/vue_fastapi_setup_guide"},{"text":"my-recipes：Docker開発環境移行（vue-python)ガイド","link":"/appendix/docker-setup-local"},{"text":"my-recipes：Docker完全版移行（vue-python)ガイド","link":"/appendix/docker-setup-all"},{"text":"my-recipes：Web/APIサーバ要素説明（vue-python)ガイド","link":"/appendix/web-api-server-description"}]},{"text":"デプロイ / CI・CD / マイグレーション","collapsed":true,"items":[{"text":"付録：API-Migrationガイド","link":"/appendix/api-migration-with-verce"},{"text":"付録：API-Migration環境ガイド","link":"/appendix/migration-env-setting-guide"},{"text":"my-recipes：Render-BluePrint（Docker/CICD編）","link":"/appendix/my-recipes-render-blueprint"},{"text":"my-recipes：Render-vs-AWS-deploy（Docker/CICD編）","link":"/appendix/render-vs-aws-deploy"},{"text":"my-recipes：Render CI/CDガイド（Docker/CICD編）","link":"/appendix/render_ci_cd_guide"}]},{"text":"プロセス / ナレッジ","collapsed":true,"items":[{"text":"WebAPI開発AIフロー","link":"/appendix/webapi_ai_fullflow"},{"text":"■シーケンス図受付版（async-worker）","link":"/appendix/sequence-async-worker"},{"text":"■シーケンス図完成版（async-worker）","link":"/appendix/sequence-async-worker-with-completion"},{"text":"仕事：GithubとBacklog-git比較（VSCode編）","link":"/appendix/github_vs_backlog_git"}]}]},{"text":"<span class=\\"highlight-title\\">APIリファレンス</span>","collapsed":true,"items":[{"text":"概要","link":"/api-reference/"},{"text":"名言ジェネレーター","link":"/api-reference/quote"},{"text":"楽天レシピカテゴリ取得","link":"/api-reference/get-categories"},{"text":"楽天レシピランキング取得","link":"/api-reference/recipe_ranking"},{"text":"住所緯度経度変換","link":"/api-reference/geocode"},{"text":"アクセスカウント取得","link":"/api-reference/get-count"},{"text":"いいねカウント取得","link":"/api-reference/like"},{"text":"アクセス数（トラック）情報取得","link":"/api-reference/track"},{"text":"政策情報サマリー","link":"/api-reference/summarize"},{"text":"企業ニュース要約分析","link":"/api-reference/analyze-company-news"},{"text":"追加質問応答","link":"/api-reference/ask-follow-up"},{"text":"株価情報取得","link":"/api-reference/fetch-stock-quote"},{"text":"統計データ分析","link":"/api-reference/analyze-stats"},{"text":"統計メタ情報取得","link":"/api-reference/get-meta-info"},{"text":"統計検索","link":"/api-reference/search-stats"},{"text":"ユーザ質問AI回答","link":"/api-reference/answer-question"},{"text":"記事URLからコンテンツを抽出","link":"/api-reference/fetch-article-content"},{"text":"ニュース記事取得","link":"/api-reference/fetch-news"},{"text":"ニュース要約","link":"/api-reference/summarize-article"}]},{"text":"<span class=\\"highlight-title\\">共有会資料</span>","collapsed":true,"items":[{"text":"アジェンダ（案）","link":"/agenda"}]},{"text":"<span class=\\"highlight-title\\">フィードバック（slido)</span>","collapsed":true,"items":[{"text":"質問を送る","link":"/question-form"},{"text":"＜工事中＞今までのQ&Aを見る","link":"/q-and-a-session"}]},{"text":"<span class=\\"highlight-title\\">作者情報</span>","collapsed":true,"items":[{"text":"作者プロフィール詳細","link":"/profile"}]}]},"locales":{},"scrollOffset":134,"cleanUrls":false}'));
const __vite_import_meta_env__ = {};
const EXTERNAL_URL_RE = /^(?:[a-z]+:|\/\/)/i;
const APPEARANCE_KEY = "vitepress-theme-appearance";
const HASH_RE = /#.*$/;
const HASH_OR_QUERY_RE = /[?#].*$/;
const INDEX_OR_EXT_RE = /(?:(^|\/)index)?\.(?:md|html)$/;
const inBrowser = typeof document !== "undefined";
const notFoundPageData = {
  relativePath: "404.md",
  filePath: "",
  title: "404",
  description: "Not Found",
  headers: [],
  frontmatter: { sidebar: false, layout: "page" },
  lastUpdated: 0,
  isNotFound: true
};
function isActive(currentPath, matchPath, asRegex = false) {
  if (matchPath === void 0) {
    return false;
  }
  currentPath = normalize(`/${currentPath}`);
  if (asRegex) {
    return new RegExp(matchPath).test(currentPath);
  }
  if (normalize(matchPath) !== currentPath) {
    return false;
  }
  const hashMatch = matchPath.match(HASH_RE);
  if (hashMatch) {
    return (inBrowser ? location.hash : "") === hashMatch[0];
  }
  return true;
}
function normalize(path) {
  return decodeURI(path).replace(HASH_OR_QUERY_RE, "").replace(INDEX_OR_EXT_RE, "$1");
}
function isExternal(path) {
  return EXTERNAL_URL_RE.test(path);
}
function getLocaleForPath(siteData2, relativePath) {
  return Object.keys((siteData2 == null ? void 0 : siteData2.locales) || {}).find((key) => key !== "root" && !isExternal(key) && isActive(relativePath, `/${key}/`, true)) || "root";
}
function resolveSiteDataByRoute(siteData2, relativePath) {
  var _a, _b, _c, _d, _e, _f, _g;
  const localeIndex = getLocaleForPath(siteData2, relativePath);
  return Object.assign({}, siteData2, {
    localeIndex,
    lang: ((_a = siteData2.locales[localeIndex]) == null ? void 0 : _a.lang) ?? siteData2.lang,
    dir: ((_b = siteData2.locales[localeIndex]) == null ? void 0 : _b.dir) ?? siteData2.dir,
    title: ((_c = siteData2.locales[localeIndex]) == null ? void 0 : _c.title) ?? siteData2.title,
    titleTemplate: ((_d = siteData2.locales[localeIndex]) == null ? void 0 : _d.titleTemplate) ?? siteData2.titleTemplate,
    description: ((_e = siteData2.locales[localeIndex]) == null ? void 0 : _e.description) ?? siteData2.description,
    head: mergeHead(siteData2.head, ((_f = siteData2.locales[localeIndex]) == null ? void 0 : _f.head) ?? []),
    themeConfig: {
      ...siteData2.themeConfig,
      ...(_g = siteData2.locales[localeIndex]) == null ? void 0 : _g.themeConfig
    }
  });
}
function createTitle(siteData2, pageData) {
  const title = pageData.title || siteData2.title;
  const template = pageData.titleTemplate ?? siteData2.titleTemplate;
  if (typeof template === "string" && template.includes(":title")) {
    return template.replace(/:title/g, title);
  }
  const templateString = createTitleTemplate(siteData2.title, template);
  if (title === templateString.slice(3)) {
    return title;
  }
  return `${title}${templateString}`;
}
function createTitleTemplate(siteTitle, template) {
  if (template === false) {
    return "";
  }
  if (template === true || template === void 0) {
    return ` | ${siteTitle}`;
  }
  if (siteTitle === template) {
    return "";
  }
  return ` | ${template}`;
}
function hasTag(head, tag) {
  const [tagType, tagAttrs] = tag;
  if (tagType !== "meta")
    return false;
  const keyAttr = Object.entries(tagAttrs)[0];
  if (keyAttr == null)
    return false;
  return head.some(([type, attrs]) => type === tagType && attrs[keyAttr[0]] === keyAttr[1]);
}
function mergeHead(prev, curr) {
  return [...prev.filter((tagAttrs) => !hasTag(curr, tagAttrs)), ...curr];
}
const INVALID_CHAR_REGEX = /[\u0000-\u001F"#$&*+,:;<=>?[\]^`{|}\u007F]/g;
const DRIVE_LETTER_REGEX = /^[a-z]:/i;
function sanitizeFileName(name) {
  const match = DRIVE_LETTER_REGEX.exec(name);
  const driveLetter = match ? match[0] : "";
  return driveLetter + name.slice(driveLetter.length).replace(INVALID_CHAR_REGEX, "_").replace(/(^|\/)_+(?=[^/]*$)/, "$1");
}
const KNOWN_EXTENSIONS = /* @__PURE__ */ new Set();
function treatAsHtml(filename) {
  var _a;
  if (KNOWN_EXTENSIONS.size === 0) {
    const extraExts = typeof process === "object" && ((_a = process.env) == null ? void 0 : _a.VITE_EXTRA_EXTENSIONS) || (__vite_import_meta_env__ == null ? void 0 : __vite_import_meta_env__.VITE_EXTRA_EXTENSIONS) || "";
    ("3g2,3gp,aac,ai,apng,au,avif,bin,bmp,cer,class,conf,crl,css,csv,dll,doc,eps,epub,exe,gif,gz,ics,ief,jar,jpe,jpeg,jpg,js,json,jsonld,m4a,man,mid,midi,mjs,mov,mp2,mp3,mp4,mpe,mpeg,mpg,mpp,oga,ogg,ogv,ogx,opus,otf,p10,p7c,p7m,p7s,pdf,png,ps,qt,roff,rtf,rtx,ser,svg,t,tif,tiff,tr,ts,tsv,ttf,txt,vtt,wav,weba,webm,webp,woff,woff2,xhtml,xml,yaml,yml,zip" + (extraExts && typeof extraExts === "string" ? "," + extraExts : "")).split(",").forEach((ext2) => KNOWN_EXTENSIONS.add(ext2));
  }
  const ext = filename.split(".").pop();
  return ext == null || !KNOWN_EXTENSIONS.has(ext.toLowerCase());
}
const dataSymbol = Symbol();
const siteDataRef = shallowRef(siteData);
function initData(route) {
  const site = computed(() => resolveSiteDataByRoute(siteDataRef.value, route.data.relativePath));
  const appearance = site.value.appearance;
  const isDark = appearance === "force-dark" ? ref(true) : appearance === "force-auto" ? usePreferredDark() : appearance ? useDark({
    storageKey: APPEARANCE_KEY,
    initialValue: () => appearance === "dark" ? "dark" : "auto",
    ...typeof appearance === "object" ? appearance : {}
  }) : ref(false);
  const hashRef = ref(inBrowser ? location.hash : "");
  if (inBrowser) {
    window.addEventListener("hashchange", () => {
      hashRef.value = location.hash;
    });
  }
  watch(() => route.data, () => {
    hashRef.value = inBrowser ? location.hash : "";
  });
  return {
    site,
    theme: computed(() => site.value.themeConfig),
    page: computed(() => route.data),
    frontmatter: computed(() => route.data.frontmatter),
    params: computed(() => route.data.params),
    lang: computed(() => site.value.lang),
    dir: computed(() => route.data.frontmatter.dir || site.value.dir),
    localeIndex: computed(() => site.value.localeIndex || "root"),
    title: computed(() => createTitle(site.value, route.data)),
    description: computed(() => route.data.description || site.value.description),
    isDark,
    hash: computed(() => hashRef.value)
  };
}
function useData() {
  const data = inject(dataSymbol);
  if (!data) {
    throw new Error("vitepress data not properly injected in app");
  }
  return data;
}
function joinPath(base, path) {
  return `${base}${path}`.replace(/\/+/g, "/");
}
function withBase(path) {
  return EXTERNAL_URL_RE.test(path) || !path.startsWith("/") ? path : joinPath(siteDataRef.value.base, path);
}
function pathToFile(path) {
  let pagePath = path.replace(/\.html$/, "");
  pagePath = decodeURIComponent(pagePath);
  pagePath = pagePath.replace(/\/$/, "/index");
  {
    if (inBrowser) {
      const base = "/vive-with-gemini/";
      pagePath = sanitizeFileName(pagePath.slice(base.length).replace(/\//g, "_") || "index") + ".md";
      let pageHash = __VP_HASH_MAP__[pagePath.toLowerCase()];
      if (!pageHash) {
        pagePath = pagePath.endsWith("_index.md") ? pagePath.slice(0, -9) + ".md" : pagePath.slice(0, -3) + "_index.md";
        pageHash = __VP_HASH_MAP__[pagePath.toLowerCase()];
      }
      if (!pageHash)
        return null;
      pagePath = `${base}${"assets"}/${pagePath}.${pageHash}.js`;
    } else {
      pagePath = `./${sanitizeFileName(pagePath.slice(1).replace(/\//g, "_"))}.md.js`;
    }
  }
  return pagePath;
}
let contentUpdatedCallbacks = [];
function onContentUpdated(fn) {
  contentUpdatedCallbacks.push(fn);
  onUnmounted(() => {
    contentUpdatedCallbacks = contentUpdatedCallbacks.filter((f) => f !== fn);
  });
}
function getScrollOffset() {
  let scrollOffset = siteDataRef.value.scrollOffset;
  let offset = 0;
  let padding = 24;
  if (typeof scrollOffset === "object" && "padding" in scrollOffset) {
    padding = scrollOffset.padding;
    scrollOffset = scrollOffset.selector;
  }
  if (typeof scrollOffset === "number") {
    offset = scrollOffset;
  } else if (typeof scrollOffset === "string") {
    offset = tryOffsetSelector(scrollOffset, padding);
  } else if (Array.isArray(scrollOffset)) {
    for (const selector of scrollOffset) {
      const res = tryOffsetSelector(selector, padding);
      if (res) {
        offset = res;
        break;
      }
    }
  }
  return offset;
}
function tryOffsetSelector(selector, padding) {
  const el = document.querySelector(selector);
  if (!el)
    return 0;
  const bot = el.getBoundingClientRect().bottom;
  if (bot < 0)
    return 0;
  return bot + padding;
}
const RouterSymbol = Symbol();
const fakeHost = "http://a.com";
const getDefaultRoute = () => ({
  path: "/",
  component: null,
  data: notFoundPageData
});
function createRouter(loadPageModule, fallbackComponent) {
  const route = reactive(getDefaultRoute());
  const router = {
    route,
    go
  };
  async function go(href = inBrowser ? location.href : "/") {
    var _a, _b;
    href = normalizeHref(href);
    if (await ((_a = router.onBeforeRouteChange) == null ? void 0 : _a.call(router, href)) === false)
      return;
    if (inBrowser && href !== normalizeHref(location.href)) {
      history.replaceState({ scrollPosition: window.scrollY }, "");
      history.pushState({}, "", href);
    }
    await loadPage(href);
    await ((_b = router.onAfterRouteChange ?? router.onAfterRouteChanged) == null ? void 0 : _b(href));
  }
  let latestPendingPath = null;
  async function loadPage(href, scrollPosition = 0, isRetry = false) {
    var _a, _b;
    if (await ((_a = router.onBeforePageLoad) == null ? void 0 : _a.call(router, href)) === false)
      return;
    const targetLoc = new URL(href, fakeHost);
    const pendingPath = latestPendingPath = targetLoc.pathname;
    try {
      let page = await loadPageModule(pendingPath);
      if (!page) {
        throw new Error(`Page not found: ${pendingPath}`);
      }
      if (latestPendingPath === pendingPath) {
        latestPendingPath = null;
        const { default: comp, __pageData } = page;
        if (!comp) {
          throw new Error(`Invalid route component: ${comp}`);
        }
        await ((_b = router.onAfterPageLoad) == null ? void 0 : _b.call(router, href));
        route.path = inBrowser ? pendingPath : withBase(pendingPath);
        route.component = markRaw(comp);
        route.data = true ? markRaw(__pageData) : readonly(__pageData);
        if (inBrowser) {
          nextTick(() => {
            let actualPathname = siteDataRef.value.base + __pageData.relativePath.replace(/(?:(^|\/)index)?\.md$/, "$1");
            if (!siteDataRef.value.cleanUrls && !actualPathname.endsWith("/")) {
              actualPathname += ".html";
            }
            if (actualPathname !== targetLoc.pathname) {
              targetLoc.pathname = actualPathname;
              href = actualPathname + targetLoc.search + targetLoc.hash;
              history.replaceState({}, "", href);
            }
            if (targetLoc.hash && !scrollPosition) {
              let target = null;
              try {
                target = document.getElementById(decodeURIComponent(targetLoc.hash).slice(1));
              } catch (e) {
                console.warn(e);
              }
              if (target) {
                scrollTo(target, targetLoc.hash);
                return;
              }
            }
            window.scrollTo(0, scrollPosition);
          });
        }
      }
    } catch (err) {
      if (!/fetch|Page not found/.test(err.message) && !/^\/404(\.html|\/)?$/.test(href)) {
        console.error(err);
      }
      if (!isRetry) {
        try {
          const res = await fetch(siteDataRef.value.base + "hashmap.json");
          window.__VP_HASH_MAP__ = await res.json();
          await loadPage(href, scrollPosition, true);
          return;
        } catch (e) {
        }
      }
      if (latestPendingPath === pendingPath) {
        latestPendingPath = null;
        route.path = inBrowser ? pendingPath : withBase(pendingPath);
        route.component = fallbackComponent ? markRaw(fallbackComponent) : null;
        const relativePath = inBrowser ? pendingPath.replace(/(^|\/)$/, "$1index").replace(/(\.html)?$/, ".md").replace(/^\//, "") : "404.md";
        route.data = { ...notFoundPageData, relativePath };
      }
    }
  }
  if (inBrowser) {
    if (history.state === null) {
      history.replaceState({}, "");
    }
    window.addEventListener("click", (e) => {
      if (e.defaultPrevented || !(e.target instanceof Element) || e.target.closest("button") || // temporary fix for docsearch action buttons
      e.button !== 0 || e.ctrlKey || e.shiftKey || e.altKey || e.metaKey)
        return;
      const link = e.target.closest("a");
      if (!link || link.closest(".vp-raw") || link.hasAttribute("download") || link.hasAttribute("target"))
        return;
      const linkHref = link.getAttribute("href") ?? (link instanceof SVGAElement ? link.getAttribute("xlink:href") : null);
      if (linkHref == null)
        return;
      const { href, origin, pathname, hash, search } = new URL(linkHref, link.baseURI);
      const currentUrl = new URL(location.href);
      if (origin === currentUrl.origin && treatAsHtml(pathname)) {
        e.preventDefault();
        if (pathname === currentUrl.pathname && search === currentUrl.search) {
          if (hash !== currentUrl.hash) {
            history.pushState({}, "", href);
            window.dispatchEvent(new HashChangeEvent("hashchange", {
              oldURL: currentUrl.href,
              newURL: href
            }));
          }
          if (hash) {
            scrollTo(link, hash, link.classList.contains("header-anchor"));
          } else {
            window.scrollTo(0, 0);
          }
        } else {
          go(href);
        }
      }
    }, { capture: true });
    window.addEventListener("popstate", async (e) => {
      var _a;
      if (e.state === null)
        return;
      const href = normalizeHref(location.href);
      await loadPage(href, e.state && e.state.scrollPosition || 0);
      await ((_a = router.onAfterRouteChange ?? router.onAfterRouteChanged) == null ? void 0 : _a(href));
    });
    window.addEventListener("hashchange", (e) => {
      e.preventDefault();
    });
  }
  return router;
}
function useRouter() {
  const router = inject(RouterSymbol);
  if (!router) {
    throw new Error("useRouter() is called without provider.");
  }
  return router;
}
function useRoute() {
  return useRouter().route;
}
function scrollTo(el, hash, smooth = false) {
  let target = null;
  try {
    target = el.classList.contains("header-anchor") ? el : document.getElementById(decodeURIComponent(hash).slice(1));
  } catch (e) {
    console.warn(e);
  }
  if (target) {
    let scrollToTarget = function() {
      if (!smooth || Math.abs(targetTop - window.scrollY) > window.innerHeight)
        window.scrollTo(0, targetTop);
      else
        window.scrollTo({ left: 0, top: targetTop, behavior: "smooth" });
    };
    const targetPadding = parseInt(window.getComputedStyle(target).paddingTop, 10);
    const targetTop = window.scrollY + target.getBoundingClientRect().top - getScrollOffset() + targetPadding;
    requestAnimationFrame(scrollToTarget);
  }
}
function normalizeHref(href) {
  const url = new URL(href, fakeHost);
  url.pathname = url.pathname.replace(/(^|\/)index(\.html)?$/, "$1");
  if (siteDataRef.value.cleanUrls)
    url.pathname = url.pathname.replace(/\.html$/, "");
  else if (!url.pathname.endsWith("/") && !url.pathname.endsWith(".html"))
    url.pathname += ".html";
  return url.pathname + url.search + url.hash;
}
const runCbs = () => contentUpdatedCallbacks.forEach((fn) => fn());
const Content = defineComponent({
  name: "VitePressContent",
  props: {
    as: { type: [Object, String], default: "div" }
  },
  setup(props) {
    const route = useRoute();
    const { frontmatter, site } = useData();
    watch(frontmatter, runCbs, { deep: true, flush: "post" });
    return () => h(props.as, site.value.contentProps ?? { style: { position: "relative" } }, [
      route.component ? h(route.component, {
        onVnodeMounted: runCbs,
        onVnodeUpdated: runCbs,
        onVnodeUnmounted: runCbs
      }) : "404 Page Not Found"
    ]);
  }
});
export {
  Content as C,
  EXTERNAL_URL_RE as E,
  RouterSymbol as R,
  isActive as a,
  useRoute as b,
  inBrowser as c,
  createTitle as d,
  initData as e,
  dataSymbol as f,
  getScrollOffset as g,
  createRouter as h,
  isExternal as i,
  mergeHead as m,
  onContentUpdated as o,
  pathToFile as p,
  siteDataRef as s,
  treatAsHtml as t,
  useData as u,
  withBase as w
};

# 動画一覧

## このページはvive-with-gemini内の動画（NoteBookLMやVideoPadなど活用）をまとめています。

<div class="video-controls">
  <label class="video-toggle">
    <input type="checkbox" v-model="reverseOrder" />
    逆順表示
  </label>
  <label class="video-search">
    <span>タイトル検索</span>
    <span
      class="video-help"
      title="AND検索: Kubernetes LLM（スペース区切りでAND）&#10;OR検索: Kubernetes OR LLM または Kubernetes|LLM"
    >
      使い方
    </span>
    <input
      type="search"
      v-model="searchQuery"
      placeholder="タイトル/関連ドキュメント/タグ（スペース=AND、OR=OR）"
    />
  </label>
  <label class="video-filter">
    <span>大分類</span>
    <select v-model="selectedCategory">
      <option value="">すべて</option>
      <option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
    </select>
  </label>
  <label class="video-filter">
    <span>小分類</span>
    <select v-model="selectedSubCategory">
      <option value="">すべて</option>
      <option
        v-for="subCategory in subCategories"
        :key="subCategory"
        :value="subCategory"
      >
        {{ subCategory }}
      </option>
    </select>
  </label>
  <label class="video-filter">
    <span>難易度</span>
    <select v-model="selectedLevel">
      <option value="">すべて</option>
      <option v-for="level in levels" :key="level" :value="level">{{ level }}</option>
    </select>
  </label>
  <label class="video-filter">
    <span>タグ</span>
    <select v-model="selectedTag">
      <option value="">すべて</option>
      <option v-for="tag in tags" :key="tag" :value="tag">{{ tag }}</option>
    </select>
  </label>
  <button class="video-reset" type="button" @click="clearFilters" :disabled="!hasActiveFilters">
    絞り込み解除
  </button>
  <span class="video-count">{{ displayVideos.length }} 件</span>
</div>

<div class="video-sections" v-if="displayVideos.length > 0">
<section class="video-category-section" v-for="categorySection in groupedVideoSections" :key="categorySection.key">
<h2 class="video-category-title">
大分類：{{ categorySection.name }}
<span class="video-section-count">{{ categorySection.count }}件</span>
</h2>
<div class="video-grid">
<div class="video-item" v-for="video in categorySection.videos" :key="video.iframe">
<p class="video-classline"><span class="video-label">中分類：</span>{{ video.subCategory }}</p>
<p class="video-classline"><span class="video-label">タグ：</span>{{ video.tags.join(' / ') }}</p>
<p class="video-classline"><span class="video-label">難易度：</span>{{ video.level }}</p>
<h4>{{ video.title }}</h4>
<p>
関連ドキュメント：
<a :href="withBase(video.doc)">{{ video.docText }}</a>
</p>
<div class="video-container">
<iframe
:src="video.iframe"
allow="autoplay; encrypted-media"
loading="lazy"
></iframe>
</div>
</div>
</div>
</section>
</div>

<p class="video-empty" v-if="displayVideos.length === 0">
  該当する動画が見つかりませんでした。
</p>

<script setup>
import { computed, ref, watch } from 'vue'
import { withBase } from 'vitepress'

// true で逆順表示
const reverseOrder = ref(true)
const searchQuery = ref('')
const selectedCategory = ref('')
const selectedSubCategory = ref('')
const selectedLevel = ref('')
const selectedTag = ref('')

const videos = [
  {
    title: "AI時代のフルスタック戦略：Nuxt_3への道",
    doc: "/appendix/migration-vue3-to-nuxt3",
    docText: "Vue3→Nuxt3 マイグレーション",
    category: "開発基盤・生産性",
    subCategory: "フロントエンド基盤",
    level: "中級",
    tags: ["Nuxt3", "Vue3", "フルスタック", "マイグレーション"],
    iframe: "https://drive.google.com/file/d/180HOAT6XoaKNBNXUY51BBlplPFMulFZb/preview",
  },
  {
    title: "PlantUML__テキストを真実に変える",
    doc: "/appendix/PlantUML_Code-First_Architecture",
    docText: "PlantUMLガイド",
    category: "開発基盤・生産性",
    subCategory: "設計ドキュメント",
    level: "初級",
    tags: ["PlantUML", "設計", "アーキテクチャ", "図解"],
    iframe: "https://drive.google.com/file/d/1Nzz73gCWjV2OhnqEEDeyYNjLeJqZJYiT/preview",
  },
  {
    title: "Topgage_デジタル・プレイグラウンド",
    doc: "/appendix/topgage-digital-playground",
    docText: "Toppage_Digital_Playgroud",
    category: "開発基盤・生産性",
    subCategory: "プロジェクト構築",
    level: "初級",
    tags: ["GameHub", "Toppage", "プロダクト", "フロントエンド"],
    iframe: "https://drive.google.com/file/d/1T55AWlj1A3A1VY5VSbhQW6QHrZIsbmAn/preview",
  },
  {
    title: "永久無料の開発スタック",
    doc: "/appendix/prepetual-zero-cost-automation",
    docText: "完全無料枠GameHubガイド",
    category: "開発基盤・生産性",
    subCategory: "開発環境設計",
    level: "初級",
    tags: ["無料枠", "開発環境", "GameHub", "コスト最適化"],
    iframe: "https://drive.google.com/file/d/1wTbVq-KK5I08YI_mUvor2rTnbq5pCxs4/preview",
  },
  {
    title: "DevOps__フルサイクルエンジニアへの道",
    doc: "/appendix/Dev_Ops_CLI_Handbook",
    docText: "LINUX活用詳細ガイド",
    category: "開発基盤・生産性",
    subCategory: "DevOps/CLI",
    level: "中級",
    tags: ["DevOps", "CLI", "Linux", "運用"],
    iframe: "https://drive.google.com/file/d/12dpT-QT-LqXVW1uD1Bw40DswyxEmMCMK/preview",
  },
  {
    title: "フルサイクル・エンジニアリングスタック",
    doc: "/appendix/Linux_Full-Cycle_Engineering_Stack",
    docText: "LINUX活用ガイド",
    category: "開発基盤・生産性",
    subCategory: "Linux実践",
    level: "中級",
    tags: ["Linux", "フルサイクル", "開発基盤", "実践"],
    iframe: "https://drive.google.com/file/d/1mKyN8z5L0KXsQBQXUFiDMrMw49Ktx-qs/preview",
  },
  {
    title: "サーバーレスデータアクセス：エンタープライズ設計図",
    doc: "/appendix/Serverless_Data_Access_Optimization",
    docText: "サーバレス連携基盤：最新アーキテクチャとDB設計手法ガイド",
    category: "クラウド設計・アーキテクチャ",
    subCategory: "データアクセス設計",
    level: "上級",
    tags: ["Serverless", "データアクセス", "DB設計", "エンタープライズ"],
    iframe: "https://drive.google.com/file/d/14yISXJYaU77kixQjsbioGH8Tnh3DAB5A/preview",
  },
  {
    title: "企業クラウド開発ガイド",
    doc: "/appendix/Sync-async-APIGAteway-archtecture",
    docText: "同期・非同期アーキテクチャ図（APIGateway付き）",
    category: "クラウド設計・アーキテクチャ",
    subCategory: "API連携設計（同期/非同期）",
    level: "中級",
    tags: ["クラウド", "API Gateway", "同期", "非同期"],
    iframe: "https://drive.google.com/file/d/1k1y5pgbv0GUUmVpMlJvXesXa09J_N4Et/preview",
  },
  {
    title: "AWSのSagaパターンを解き明かす",
    doc: "/appendix/Serverless_Distributed_Consistency",
    docText: "API整合性のためのSagaパターン活用ガイド",
    category: "クラウド設計・アーキテクチャ",
    subCategory: "分散整合性（Saga）",
    level: "上級",
    tags: ["AWS", "Saga", "分散トランザクション", "整合性"],
    iframe: "https://drive.google.com/file/d/1YIr2BX1MlYmTObGyDPocT71ZDLOu9QTH/preview",
  },
  {
    title: "WSL2ネットワークの謎を解く",
    doc: "/appendix/WSL2_Networking_Five_Layer_Mastery",
    docText: "WSL２:NATネットワーク解説",
    category: "開発基盤・生産性",
    subCategory: "ネットワーク/WSL2",
    level: "中級",
    tags: ["WSL2", "ネットワーク", "NAT", "開発環境"],
    iframe: "https://drive.google.com/file/d/1KlwA-_ZfMYrxyJzwjya-A03OipcgqQ2z/preview",
  },
  {
    title: "Gitを解き明かす：メンタルモデル",
    doc: "/appendix/Git_Mental_Model",
    docText: "Gitメンタルモデル解説",
    category: "開発基盤・生産性",
    subCategory: "Git基礎",
    level: "初級",
    tags: ["Git", "メンタルモデル", "バージョン管理", "基礎"],
    iframe: "https://drive.google.com/file/d/1Jt0JfSg5cf5felWtX1wA56nKjISkttnF/preview",
  },
  {
    title: "コマンドラインをレベルアップ",
    doc: "/appendix/Git_Fzf_Workflow_Accelerator",
    docText: "Git-fzfコマンド開発者向けガイド",
    category: "開発基盤・生産性",
    subCategory: "CLI効率化（git-fzf）",
    level: "中級",
    tags: ["Git", "fzf", "CLI", "開発効率"],
    iframe: "https://drive.google.com/file/d/1BvQ88nKUFlVMYa-k2gBSKaQ413mqxqcq/preview",
  },
  {
    title: "あなたのターミナルのスーパーパワー：fzf入門",
    doc: "/appendix/fzf_Command_Line_Mastery",
    docText: "fzf活用術（開発効率を劇的に変える）",
    category: "開発基盤・生産性",
    subCategory: "CLI効率化（fzf）",
    level: "初級",
    tags: ["fzf", "ターミナル", "CLI", "入門"],
    iframe: "https://drive.google.com/file/d/1rK1u2NuIIDKcyP3Z72YZs_lT1YzEwSb_/preview",
  },
  {
    title: "開発者のための正規表現レシピ",
    doc: "/appendix/Regex_Recipes_for_Developers",
    docText: "Regex（正規表現）活用ガイド",
    category: "開発基盤・生産性",
    subCategory: "テキスト処理/Regex",
    level: "初級",
    tags: ["Regex", "正規表現", "テキスト処理", "開発効率"],
    iframe: "https://drive.google.com/file/d/1DRJPC3oo05AGIogETGoeFxTTclCcdQeo/preview",
  },
  {
    title: "Difyで「LLMアプリを作って公開する」全体像",
    doc: "/appendix/Dify失敗パターンとパラメータ調整ガイド",
    docText: "Dify_AI__AIアプリ開発ブートキャンプ",
    category: "LLMアプリ構築",
    subCategory: "Dify入門",
    level: "初級",
    tags: ["Dify", "LLMアプリ", "公開", "入門"],
    iframe: "https://drive.google.com/file/d/186520MLmJv9X0hAUnWU5Iv-25zm53zN6/preview",
  },
  {
    title: "Difyチューニング実践ガイド",
    doc: "/appendix/Dify失敗パターンとパラメータ調整ガイド",
    docText: "Dify失敗パターンとパラメータ調整ガイド",
    category: "LLMアプリ構築",
    subCategory: "Dify最適化",
    level: "中級",
    tags: ["Dify", "パラメータ調整", "評価", "チューニング"],
    iframe: "https://drive.google.com/file/d/1dqlatyxplvP-wOcmn6KVleEo5v5ZmvUD/preview",
  },
  {
    title: "AI革命：「道具」から「相棒」へ",
    doc: "/ai-agile-vive-with-gemini-column-2015-vs-2025",
    docText: "【コラム】2015年ころのAIと今のAIは何が違うのか？",
    category: "コラム・概念",
    subCategory: "AI活用論",
    level: "初級",
    tags: ["AI", "コラム", "開発スタイル", "概念"],
    iframe: "https://drive.google.com/file/d/1TvVYK-SYBnnSc_aBUawExw69IuaHKfcA/preview",
  },
  {
    title: "IaCの進化：ミュータブル_vs_イミュータブル",
    doc: "/appendix/IaC_Evolution_Configuration_to_Immutability",
    docText: "IaCの進化：ミュータブル_vs_イミュータブル",
    category: "クラウド設計・アーキテクチャ",
    subCategory: "IaC設計思想",
    level: "中級",
    tags: ["IaC", "イミュータブル", "構成管理", "クラウド"],
    iframe: "https://drive.google.com/file/d/1qVP7WNCKBrdnk8MaeBzZdvFmtOROBdzO/preview",
  },
  {
    title: "ガードレール、レッドチーミング、Kubernetes",
    doc: "/appendix/IaC_Evolution_Configuration_to_Immutability",
    docText: "ガードレール、レッドチーミング、Kubernetes",
    category: "AIセキュリティ・ガバナンス",
    subCategory: "ガードレール/攻撃検証",
    level: "上級",
    tags: ["ガードレール", "レッドチーミング", "Kubernetes", "セキュリティ"],
    iframe: "https://drive.google.com/file/d/18AS_60vuZd9FRaN9ZpJLgrvAjyEAJ6gU/preview",
  },
  {
    title: "OWASP_LLM_Top_10_2025_vitepress",
    doc: "/appendix/OWASP_LLM_Top_10_2025_vitepress",
    docText: "OWASP_LLM_Top_10_2025_vitepress",
    category: "AIセキュリティ・ガバナンス",
    subCategory: "LLM脅威モデル（OWASP）",
    level: "中級",
    tags: ["OWASP", "LLM Top 10", "脅威モデル", "セキュリティ"],
    iframe: "https://drive.google.com/file/d/18GPJM16KT4FQFLiQlWlUURZ7x8EyVMSA/preview",
  },
  {
    title: "LLMアプリ安全開発ロードマップ",
    doc: "/appendix/OWASP_LLM_Top_10_2025_vitepress",
    docText: "OWASP_LLM_Top_10_2025_vitepress",
    category: "AIセキュリティ・ガバナンス",
    subCategory: "セキュア開発プロセス",
    level: "中級",
    tags: ["LLM", "セキュア開発", "ロードマップ", "実践"],
    iframe: "https://drive.google.com/file/d/17mFlstTqynZOjIACb8UUYasnF22XxjuY/preview",
  },
  {
    title: "LLMテストのスケーリング：DockerからKubernetesへ",
    doc: "/appendix/AI_GPU_Scaling_and_Sharing_on_Kubernetes_vitepress",
    docText: "AI_GPU_Scaling_and_Sharing_on_Kubernetes_vitepress",
    category: "LLM評価・運用スケーリング",
    subCategory: "評価基盤移行（Docker→K8s）",
    level: "中級",
    tags: ["LLM評価", "Docker", "Kubernetes", "スケーリング"],
    iframe: "https://drive.google.com/file/d/1airg3s0Vg6rHwKsM83fE9ySBdb7hcjnY/preview",
  },
  {
    title: "KubernetesでのAI_GPUスケーリングと共有",
    doc: "/appendix/AI_GPU_Scaling_and_Sharing_on_Kubernetes_vitepress",
    docText: "AI_GPU_Scaling_and_Sharing_on_Kubernetes_vitepress",
    category: "LLM評価・運用スケーリング",
    subCategory: "GPU運用（共有/配分）",
    level: "上級",
    tags: ["GPU", "Kubernetes", "共有", "スケーリング"],
    iframe: "https://drive.google.com/file/d/1qPvahmalGFIKAf4DtFTeoZndv8WAAfJc/preview",
  },
  {
    title: "AI評価ファクトリーの構築",
    doc: "/appendix/WSL2_AI_Eval_Platform_vitepress",
    docText: "WSL2_AI_Eval_Platform_vitepress",
    category: "LLM評価・運用スケーリング",
    subCategory: "評価パイプライン設計",
    level: "上級",
    tags: ["LLM評価", "評価基盤", "パイプライン", "運用"],
    iframe: "https://drive.google.com/file/d/1zUPdGYgMs_waCTgYtzRupKhYFel2vXh0/preview",
  },
  {
    title: "K8sによるLLMテスト工場の構築",
    doc: "/appendix/Kubernetes_Parallel_LLM_Evaluation_vitepress",
    docText: "Kubernetes_Parallel_LLM_Evaluation_vitepress",
    category: "LLM評価・運用スケーリング",
    subCategory: "Kubernetes並列評価",
    level: "上級",
    tags: ["Kubernetes", "LLM評価", "並列処理", "テスト工場"],
    iframe: "https://drive.google.com/file/d/1Bxj-gzTq807nDVBY0TzwnlfikOdl9qVG/preview",
  },
  {
    title: "スクリプトからスケールへ：Kubernetesによる並列LLM評価",
    doc: "/appendix/Parallel_LLM_Evaluation_on_Kubernetes_vitepress",
    docText: "Parallel_LLM_Evaluation_on_Kubernetes_vitepress",
    category: "LLM評価・運用スケーリング",
    subCategory: "Kubernetes並列評価",
    level: "上級",
    tags: ["Kubernetes", "LLM評価", "並列処理", "スケール"],
    iframe: "https://drive.google.com/file/d/1nB3g-qK5sXvsGzWVmZIio_q9BH1Y8tic/preview",
  },
  {
    title: "LLM品質を測定可能にする：DeepEvalガイド",
    doc: "/appendix/DeepEval_Metrics_And_Customization_Guide",
    docText: "DeepEval_Metrics_And_Customization_Guide",
    category: "LLM評価・運用スケーリング",
    subCategory: "評価指標/DeepEval",
    level: "中級",
    tags: ["DeepEval", "LLM評価", "メトリクス", "品質管理"],
    iframe: "https://drive.google.com/file/d/1wnF8eg9HV7dkZMww8HVr7JNBI70h5cSK/preview",
  },
  {
    title: "Kubernetes_Indexed_Jobs__大規模並列タスクをマスターする",
    doc: "/appendix/Kubernetes_Indexed_Jobs_Scaling_AI_ML_vitepress",
    docText: "Kubernetes_Indexed_Jobs_Scaling_AI_ML_vitepress",
    category: "LLM評価・運用スケーリング",
    subCategory: "Kubernetesバッチ/Indexed Jobs",
    level: "上級",
    tags: ["Kubernetes", "Indexed Jobs", "バッチ", "大規模処理"],
    iframe: "https://drive.google.com/file/d/1LYs4g4_uzDGeMnaWiHWdGYxsPc5DSZrM/preview",
  },
  {
    title: "GPUのスライス：KubernetesでAIを賢く実行する方法",
    doc: "/appendix/GPU_Slicing_Kubernetes_AI_Efficiency_vitepress",
    docText: "GUP MIG タイムスライシング Kubernetes K8s docker",
    category: "LLM評価・運用スケーリング",
    subCategory: "GPU最適化（MIG/Time-slicing）",
    level: "上級",
    tags: ["GPU", "MIG", "Time-slicing", "Kubernetes"],
    iframe: "https://drive.google.com/file/d/1D5MwZ5N5y4EvgqNr-4r6wfjoNIX7RS_k/preview",
  },
  {
    title: "RAGの精度を最大化する：高品質ナレッジベース構築ガイド",
    doc: "/appendix/RAG_Accuracy_Engineering_vitepress",
    docText: "RAG ナレッジベース　チャンク　前処理　Dify",
    category: "LLMアプリ構築",
    subCategory: "RAG品質改善",
    level: "中級",
    tags: ["RAG", "ナレッジベース", "チャンク設計", "精度改善"],
    iframe: "https://drive.google.com/file/d/1UIwPEDVMLfWpIdsu0E2uUeRWH05yFK9f/preview",
  },
  {
    title: "AIエージェント防御",
    doc: "/appendix/AI_Agent_Fortress_Defense",
    docText: "AI エージェント　防御　プロンプトインジェクション　IPI Dify",
    category: "AIセキュリティ・ガバナンス",
    subCategory: "エージェント防御",
    level: "上級",
    tags: ["AIエージェント", "プロンプトインジェクション", "防御", "Dify"],
    iframe: "https://drive.google.com/file/d/16lTuOa4nt0dE46pUAb67l6TWWibFq0n2/preview",
  },
  {
    title: "REST_API__デジタル世界の握手",
    doc: "/appendix/The_Digital_Handshake",
    docText: "RESTAPI GET POST PUT DELETE PATCH 冪等性　リソース　JSON　HTTPS",
    category: "RESTAPI",
    subCategory: "RESTAPI（初級）",
    level: "初級",
    tags: ["RESTAPI", "冪等性", "ステートレス", "リソース"],
    iframe: "https://drive.google.com/file/d/1EMWez7m17ODqba15PDNUwPfO5u-MzaaR/preview",
  },
]

const categories = computed(() => [...new Set(videos.map((video) => video.category))])
const levels = ["初級", "中級", "上級"]

const subCategories = computed(() => {
  const base = selectedCategory.value
    ? videos.filter((video) => video.category === selectedCategory.value)
    : videos
  return [...new Set(base.map((video) => video.subCategory))]
})

const tags = computed(() => {
  const base = videos.filter((video) => {
    if (selectedCategory.value && video.category !== selectedCategory.value) return false
    if (selectedSubCategory.value && video.subCategory !== selectedSubCategory.value) return false
    if (selectedLevel.value && video.level !== selectedLevel.value) return false
    return true
  })
  return [...new Set(base.flatMap((video) => video.tags))]
})

watch(subCategories, (list) => {
  if (selectedSubCategory.value && !list.includes(selectedSubCategory.value)) {
    selectedSubCategory.value = ''
  }
})

watch(tags, (list) => {
  if (selectedTag.value && !list.includes(selectedTag.value)) {
    selectedTag.value = ''
  }
})

const hasActiveFilters = computed(() => {
  return Boolean(
    searchQuery.value.trim() ||
      selectedCategory.value ||
      selectedSubCategory.value ||
      selectedLevel.value ||
      selectedTag.value,
  )
})

const clearFilters = () => {
  searchQuery.value = ''
  selectedCategory.value = ''
  selectedSubCategory.value = ''
  selectedLevel.value = ''
  selectedTag.value = ''
}

const matchesSearch = (video, query) => {
  if (!query) return true

  const haystack = `${video.title} ${video.docText} ${video.category} ${video.subCategory} ${video.level} ${video.tags.join(' ')}`.toLowerCase()
  if (query.includes(' or ') || query.includes('|')) {
    const terms = query
      .split(/\s+or\s+|\|/i)
      .map((term) => term.trim())
      .filter(Boolean)
    return terms.some((term) => haystack.includes(term))
  }

  const terms = query
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean)
  return terms.every((term) => haystack.includes(term))
}

const displayVideos = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  const filtered = videos.filter((video) => {
    if (!matchesSearch(video, query)) return false
    if (selectedCategory.value && video.category !== selectedCategory.value) return false
    if (selectedSubCategory.value && video.subCategory !== selectedSubCategory.value) return false
    if (selectedLevel.value && video.level !== selectedLevel.value) return false
    if (selectedTag.value && !video.tags.includes(selectedTag.value)) return false
    return true
  })

  return reverseOrder.value ? [...filtered].reverse() : filtered
})

const groupedVideoSections = computed(() => {
  const categoryMap = new Map()

  for (const video of displayVideos.value) {
    if (!video) continue

    const categoryName = video.category || '未分類'

    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, {
        key: `category-${categoryName}`,
        name: categoryName,
        count: 0,
        videos: [],
      })
    }

    const categorySection = categoryMap.get(categoryName)
    categorySection.count += 1
    categorySection.videos.push(video)
  }

  return [...categoryMap.values()]
})
</script>

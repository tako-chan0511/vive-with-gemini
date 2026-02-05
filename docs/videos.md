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
      placeholder="タイトル/関連ドキュメント名（スペース=AND、OR=OR）"
    />
  </label>
  <span class="video-count">{{ displayVideos.length }} 件</span>
</div>

<div class="video-grid">
  <div class="video-item" v-for="video in displayVideos" :key="video.iframe">
    <h2>{{ video.title }}</h2>
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

<p class="video-empty" v-if="displayVideos.length === 0">
  該当する動画が見つかりませんでした。
</p>

<script setup>
import { computed, ref } from 'vue'
import { withBase } from 'vitepress'

// true で逆順表示
const reverseOrder = ref(true)
const searchQuery = ref('')

const videos = [
  {
    title: "AI時代のフルスタック戦略：Nuxt_3への道",
    doc: "/appendix/migration-vue3-to-nuxt3",
    docText: "Vue3→Nuxt3 マイグレーション",
    iframe: "https://drive.google.com/file/d/180HOAT6XoaKNBNXUY51BBlplPFMulFZb/preview",
  },
  {
    title: "PlantUML__テキストを真実に変える",
    doc: "/appendix/PlantUML_Code-First_Architecture",
    docText: "PlantUMLガイド",
    iframe: "https://drive.google.com/file/d/1Nzz73gCWjV2OhnqEEDeyYNjLeJqZJYiT/preview",
  },
  {
    title: "Topgage_デジタル・プレイグラウンド",
    doc: "/appendix/topgage-digital-playground",
    docText: "Toppage_Digital_Playgroud",
    iframe: "https://drive.google.com/file/d/1T55AWlj1A3A1VY5VSbhQW6QHrZIsbmAn/preview",
  },
  {
    title: "永久無料の開発スタック",
    doc: "/appendix/prepetual-zero-cost-automation",
    docText: "完全無料枠GameHubガイド",
    iframe: "https://drive.google.com/file/d/1wTbVq-KK5I08YI_mUvor2rTnbq5pCxs4/preview",
  },
  {
    title: "DevOps__フルサイクルエンジニアへの道",
    doc: "/appendix/Dev_Ops_CLI_Handbook",
    docText: "LINUX活用詳細ガイド",
    iframe: "https://drive.google.com/file/d/12dpT-QT-LqXVW1uD1Bw40DswyxEmMCMK/preview",
  },
  {
    title: "フルサイクル・エンジニアリングスタック",
    doc: "/appendix/Linux_Full-Cycle_Engineering_Stack",
    docText: "LINUX活用ガイド",
    iframe: "https://drive.google.com/file/d/1mKyN8z5L0KXsQBQXUFiDMrMw49Ktx-qs/preview",
  },
  {
    title: "サーバーレスデータアクセス：エンタープライズ設計図",
    doc: "/appendix/Serverless_Data_Access_Optimization",
    docText: "サーバレス連携基盤：最新アーキテクチャとDB設計手法ガイド",
    iframe: "https://drive.google.com/file/d/14yISXJYaU77kixQjsbioGH8Tnh3DAB5A/preview",
  },
  {
    title: "企業クラウド開発ガイド",
    doc: "/appendix/Sync-async-APIGAteway-archtecture",
    docText: "同期・非同期アーキテクチャ図（APIGateway付き）",
    iframe: "https://drive.google.com/file/d/1k1y5pgbv0GUUmVpMlJvXesXa09J_N4Et/preview",
  },
  {
    title: "AWSのSagaパターンを解き明かす",
    doc: "/appendix/Serverless_Distributed_Consistency",
    docText: "API整合性のためのSagaパターン活用ガイド",
    iframe: "https://drive.google.com/file/d/1YIr2BX1MlYmTObGyDPocT71ZDLOu9QTH/preview",
  },
  {
    title: "WSL2ネットワークの謎を解く",
    doc: "/appendix/WSL2_Networking_Five_Layer_Mastery",
    docText: "WSL２:NATネットワーク解説",
    iframe: "https://drive.google.com/file/d/1KlwA-_ZfMYrxyJzwjya-A03OipcgqQ2z/preview",
  },
  {
    title: "Gitを解き明かす：メンタルモデル",
    doc: "/appendix/Git_Mental_Model",
    docText: "Gitメンタルモデル解説",
    iframe: "https://drive.google.com/file/d/1Jt0JfSg5cf5felWtX1wA56nKjISkttnF/preview",
  },
  {
    title: "コマンドラインをレベルアップ",
    doc: "/appendix/Git_Fzf_Workflow_Accelerator",
    docText: "Git-fzfコマンド開発者向けガイド",
    iframe: "https://drive.google.com/file/d/1BvQ88nKUFlVMYa-k2gBSKaQ413mqxqcq/preview",
  },
  {
    title: "あなたのターミナルのスーパーパワー：fzf入門",
    doc: "/appendix/fzf_Command_Line_Mastery",
    docText: "fzf活用術（開発効率を劇的に変える）",
    iframe: "https://drive.google.com/file/d/1rK1u2NuIIDKcyP3Z72YZs_lT1YzEwSb_/preview",
  },
  {
    title: "開発者のための正規表現レシピ",
    doc: "/appendix/Regex_Recipes_for_Developers",
    docText: "Regex（正規表現）活用ガイド",
    iframe: "https://drive.google.com/file/d/1DRJPC3oo05AGIogETGoeFxTTclCcdQeo/preview",
  },
  {
    title: "Difyで「LLMアプリを作って公開する」全体像",
    doc: "/appendix/Dify失敗パターンとパラメータ調整ガイド",
    docText: "Dify_AI__AIアプリ開発ブートキャンプ",
    iframe: "https://drive.google.com/file/d/186520MLmJv9X0hAUnWU5Iv-25zm53zN6/preview",
  },
  {
    title: "Difyチューニング実践ガイド",
    doc: "/appendix/Dify失敗パターンとパラメータ調整ガイド",
    docText: "Dify失敗パターンとパラメータ調整ガイド",
    iframe: "https://drive.google.com/file/d/1dqlatyxplvP-wOcmn6KVleEo5v5ZmvUD/preview",
  },
  {
    title: "AI革命：「道具」から「相棒」へ",
    doc: "/ai-agile-vive-with-gemini-column-2015-vs-2025",
    docText: "【コラム】2015年ころのAIと今のAIは何が違うのか？",
    iframe: "https://drive.google.com/file/d/1TvVYK-SYBnnSc_aBUawExw69IuaHKfcA/preview",
  },
  {
    title: "IaCの進化：ミュータブル_vs_イミュータブル",
    doc: "/appendix/IaC_Evolution_Configuration_to_Immutability",
    docText: "IaCの進化：ミュータブル_vs_イミュータブル",
    iframe: "https://drive.google.com/file/d/1qVP7WNCKBrdnk8MaeBzZdvFmtOROBdzO/preview",
  },
  {
    title: "ガードレール、レッドチーミング、Kubernetes",
    doc: "/appendix/IaC_Evolution_Configuration_to_Immutability",
    docText: "ガードレール、レッドチーミング、Kubernetes",
    iframe: "https://drive.google.com/file/d/18AS_60vuZd9FRaN9ZpJLgrvAjyEAJ6gU/preview",
  },
  {
    title: "OWASP_LLM_Top_10_2025_vitepress",
    doc: "/appendix/OWASP_LLM_Top_10_2025_vitepress",
    docText: "OWASP_LLM_Top_10_2025_vitepress",
    iframe: "https://drive.google.com/file/d/18GPJM16KT4FQFLiQlWlUURZ7x8EyVMSA/preview",
  },
  {
    title: "LLMアプリ安全開発ロードマップ",
    doc: "/appendix/OWASP_LLM_Top_10_2025_vitepress",
    docText: "OWASP_LLM_Top_10_2025_vitepress",
    iframe: "https://drive.google.com/file/d/17mFlstTqynZOjIACb8UUYasnF22XxjuY/preview",
  },
  {
    title: "LLMテストのスケーリング：DockerからKubernetesへ",
    doc: "/appendix/AI_GPU_Scaling_and_Sharing_on_Kubernetes_vitepress",
    docText: "AI_GPU_Scaling_and_Sharing_on_Kubernetes_vitepress",
    iframe: "https://drive.google.com/file/d/1airg3s0Vg6rHwKsM83fE9ySBdb7hcjnY/preview",
  },
  {
    title: "KubernetesでのAI_GPUスケーリングと共有",
    doc: "/appendix/AI_GPU_Scaling_and_Sharing_on_Kubernetes_vitepress",
    docText: "AI_GPU_Scaling_and_Sharing_on_Kubernetes_vitepress",
    iframe: "https://drive.google.com/file/d/1qPvahmalGFIKAf4DtFTeoZndv8WAAfJc/preview",
  },
  {
    title: "AI評価ファクトリーの構築",
    doc: "/appendix/WSL2_AI_Eval_Platform_vitepress",
    docText: "WSL2_AI_Eval_Platform_vitepress",
    iframe: "https://drive.google.com/file/d/1zUPdGYgMs_waCTgYtzRupKhYFel2vXh0/preview",
  },
  {
    title: "K8sによるLLMテスト工場の構築",
    doc: "/appendix/Kubernetes_Parallel_LLM_Evaluation_vitepress",
    docText: "Kubernetes_Parallel_LLM_Evaluation_vitepress",
    iframe: "https://drive.google.com/file/d/1Bxj-gzTq807nDVBY0TzwnlfikOdl9qVG/preview",
  },
  {
    title: "スクリプトからスケールへ：Kubernetesによる並列LLM評価",
    doc: "/appendix/Parallel_LLM_Evaluation_on_Kubernetes_vitepress",
    docText: "Parallel_LLM_Evaluation_on_Kubernetes_vitepress",
    iframe: "https://drive.google.com/file/d/1nB3g-qK5sXvsGzWVmZIio_q9BH1Y8tic/preview",
  },
  {
    title: "LLM品質を測定可能にする：DeepEvalガイド",
    doc: "/appendix/DeepEval_Metrics_And_Customization_Guide",
    docText: "DeepEval_Metrics_And_Customization_Guide",
    iframe: "https://drive.google.com/file/d/1wnF8eg9HV7dkZMww8HVr7JNBI70h5cSK/preview",
  },
]

const displayVideos = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  const filtered = query
    ? videos.filter((video) => {
        const haystack = `${video.title} ${video.docText}`.toLowerCase()
        if (query.includes(' or ') || query.includes('|')) {
          const terms = query.split(/\s+or\s+|\|/i).map((t) => t.trim()).filter(Boolean)
          return terms.some((term) => haystack.includes(term))
        }
        const terms = query.split(/\s+/).map((t) => t.trim()).filter(Boolean)
        return terms.every((term) => haystack.includes(term))
      })
    : videos
  return reverseOrder.value ? [...filtered].reverse() : filtered
})
</script>

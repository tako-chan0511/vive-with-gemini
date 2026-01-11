<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

interface Props {
  code: string
}

const props = defineProps<Props>()

const svg = ref('')

// 動的 import 用
let mermaid: any = null

onMounted(async () => {
  // SSR 対策：ブラウザ環境でだけ動かす
  if (typeof window === 'undefined') return

  if (!mermaid) {
    // クライアント側でだけ Mermaid を読み込む
    const m = await import('mermaid')
    mermaid = m.default ?? m
  }

  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
  })

  renderDiagram(props.code)
})

watch(
  () => props.code,
  async (newCode) => {
    if (!mermaid) return
    renderDiagram(newCode)
  }
)

async function renderDiagram(code: string) {
  try {
    const { svg: renderedSvg } = await mermaid.render(
      `mermaid-${Math.random().toString(36).slice(2)}`,
      code
    )
    svg.value = renderedSvg
  } catch (e) {
    svg.value = `<pre style="color:red;">Mermaid render error: ${String(
      e
    )}</pre>`
  }
}
</script>

<template>
  <div class="mermaid-wrapper" v-html="svg"></div>
</template>

<style scoped>
.mermaid-wrapper {
  margin: 1rem 0;
}
</style>

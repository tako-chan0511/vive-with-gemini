<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import mermaid from 'mermaid'

interface Props {
  code: string
}

const props = defineProps<Props>()
const svg = ref('')

onMounted(async () => {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default', // ダークモードなどに合わせて変更可
  })
  renderDiagram(props.code)
})

watch(
  () => props.code,
  (newCode) => {
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
    svg.value = `<pre style="color:red;">Mermaid render error: ${String(e)}</pre>`
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

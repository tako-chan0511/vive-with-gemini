<script setup lang="ts">
import { onMounted } from 'vue'
import { syncPresenterMode, usePresenterMode } from '../presenterMode'

defineProps<{
  label?: string
  next?: string
  time?: string
}>()

const visible = usePresenterMode()

onMounted(syncPresenterMode)
</script>

<template>
  <aside
    v-if="visible"
    class="presenter-stop"
    role="note"
    :aria-label="['発表者用の画面停止ポイント', label, next, time && `経過目安 ${time}`].filter(Boolean).join('。')"
  >
    <span class="presenter-stop__mark" aria-hidden="true">◆</span>
    <span class="presenter-stop__details">
      <span v-if="label">{{ label }}</span>
      <span v-if="next">次：{{ next }}</span>
      <span v-if="time">経過目安 {{ time }}</span>
    </span>
  </aside>
</template>

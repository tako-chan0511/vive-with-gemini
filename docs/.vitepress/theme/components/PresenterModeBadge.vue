<script setup lang="ts">
import { onMounted } from 'vue'
import { syncPresenterMode, usePresenterMode } from '../presenterMode'

const visible = usePresenterMode()

onMounted(syncPresenterMode)
</script>

<template>
  <div v-if="visible" class="presenter-mode-badge" role="status">
    🎙 Presenter mode
  </div>
</template>

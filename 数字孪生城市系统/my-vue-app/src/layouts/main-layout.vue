<template>
  <div class="main-layout">
    <TopNav />

    <main class="page-content">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import TopNav from '@/components/layout/top-nav.vue'
</script>

<style scoped>
.main-layout {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  background: #f3f7fa;
}

.page-content {
  width: 100%;
  height: 0;
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
}
</style>

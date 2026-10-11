<template>
    <section class="city-roaming-page">
        <ThreeCityScene />
        <RoamingHelpPanel />
    </section>
</template>

<script setup lang="ts">
import RoamingHelpPanel from '@/components/city-roaming/roaming-help-panel.vue'
import ThreeCityScene from '@/components/city-roaming/three-city-scene.vue'
</script>

<style scoped>
.city-roaming-page {
    position: relative;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    background: #dbe7f3;
}

.city-roaming-page :deep(.page-container) {
    position: absolute;
    inset: 0;
}
</style>

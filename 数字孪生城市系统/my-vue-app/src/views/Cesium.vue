<template>
    <div id="cesiumContainer"></div>
    <TopToolbar v-if="cesiumStore.viewer && cesiumStore.osmBuildingTile" />
    <LeftToolbar v-if="cesiumStore.viewer && cesiumStore.osmBuildingTile" />
    <RightToolbar v-if="cesiumStore.viewer && cesiumStore.osmBuildingTile" />
    <BottomToorbar v-if="cesiumStore.viewer && cesiumStore.osmBuildingTile" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useCesiumStore } from '../stores/cesium.ts'
import { initCesiumScene } from '@/util/initCesiumScene.ts';

import LeftToolbar from '@/components/LeftToolbar/index.vue'
import RightToolbar from '@/components/RightToolbar/index.vue'
import TopToolbar from '@/components/TopToolbar/index.vue'
import BottomToorbar from '@/components/BottomToolbar/index.vue'

const cesiumStore = useCesiumStore();

onMounted(async () => {
    await cesiumStore.initViewer('cesiumContainer');
    initCesiumScene()
})
onUnmounted(() => {
    cesiumStore.destroyViewer();
})
</script>

<style>
html,
body,
#app,
#cesiumContainer {
    width: 100vw;
    height: 100vh;
    margin: 0;
    padding: 0;
    overflow: hidden
}
</style>
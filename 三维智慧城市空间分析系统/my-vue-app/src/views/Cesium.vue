<template>
  <div id="cesiumContainer"></div>
    <TopToolbar v-if="cesiumStore.viewer&&cesiumStore.osmBuildingTile"/>
    <LeftToolbar v-if="cesiumStore.viewer&&cesiumStore.osmBuildingTile" />
    <RightToolbar v-if="cesiumStore.viewer&&cesiumStore.osmBuildingTile"/>
</template>

<script setup lang="ts">
import {onMounted,onUnmounted} from 'vue';
import {useCesiumStore} from '../stores/cesium.ts'

import LeftToolbar from '../components/LeftToolbar.vue'
import RightToolbar from '../components/RightToolbar.vue'
import TopToolbar from '../components/TopToolbar.vue'

const cesiumStore=useCesiumStore();

onMounted(async()=>{
  await cesiumStore.initViewer('cesiumContainer');
})
onUnmounted(()=>{
    cesiumStore.destoryViewer();
})
</script>

<style>
  html,body,#app,#cesiumContainer{width:100vw;height:100vh;margin:0;padding:0;overflow:hidden}
</style>
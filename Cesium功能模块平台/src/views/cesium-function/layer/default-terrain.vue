<template>
  <div class="page-container">
    <CesiumMap @ready="onMapReady"/>
  </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import {initCesiumBase} from '@/utils/cesium'

let viewer:Cesium.Viewer
const onMapReady=(cesiumViewer:Cesium.Viewer)=>{
    viewer=cesiumViewer
    initCesiumBase(viewer,{
        destination:{lng:117.1336,lat:36.6772,height:5000},
        orientation:{heading:180,pitch:-30,roll:0},
        terrain:true
    })
}
</script>

<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>
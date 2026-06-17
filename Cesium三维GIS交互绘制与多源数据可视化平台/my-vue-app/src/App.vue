<template>
  <div id="cesiumContainer"></div>
  <DrawTool v-if="viewer" :viewer="viewer" />
  <AdjustTool v-if="tileset" :tileset="tileset"/>
  <Coordinate v-if="viewer" :viewer="viewer"/>
  <Message v-if="viewer&&tileset" :viewer="viewer"/>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium';
import { onMounted,ref} from 'vue';
import DrawTool from './components/DrawTool.vue';
import AdjustTool from './components/AdjustTool.vue';
import Coordinate from './components/Coordinate.vue';
import Message from './components/Message.vue';

const viewer=ref<Cesium.Viewer>();
const tileset=ref<Cesium.Cesium3DTileset>();

onMounted(async()=>{
  Cesium.Ion.defaultAccessToken='您的Token');
  viewer.value.scene.globe.depthTestAgainstTerrain=true;
  const Load=async()=>{
      tileset.value=await Cesium.Cesium3DTileset.fromUrl('/data/da_yan_ta/tileset.json')
      viewer.value!.scene.primitives.add(tileset.value)
      viewer.value!.zoomTo(tileset.value)
    } 
    await Load();
})
</script>

<style>
  html,body,#app,#cesiumContainer{width:100%;height:100%;margin:0;padding:0;overflow:hidden}
</style>
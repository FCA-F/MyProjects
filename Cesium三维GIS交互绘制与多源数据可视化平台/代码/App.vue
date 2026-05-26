<template>
  <div id="cesiumContainer"></div>
  <DrawTool v-if="viewer" :viewer="viewer" />
  <AdjustTool v-if="tileset" :viewer="viewer" :tileset="tileset"/>
  <Coordinate v-if="viewer" :viewer="viewer"/>
  <Message v-if="tileset" :viewer="viewer"/>
</template>

<script setup>
import * as Cesium from 'cesium';
import { onMounted, ref } from 'vue';
import DrawTool from './components/DrawTool.vue';
import AdjustTool from './components/AdjustTool.vue';
import Coordinate from './components/Coordinate.vue';
import Message from './components/Message.vue';

const viewer=ref(null);
const tileset=ref(null);

onMounted(async()=>{
  Cesium.Ion.defaultAccessToken='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxYTdiYzE2NC1lOTkyLTQyZmEtYWIxNy1kYzUyOWEzZWI5ODAiLCJpZCI6NDEzOTI0LCJpYXQiOjE3NzUzNTc3MzZ9.GKTAtYPpDqexLD4sF7vBfZx_1NbTsqh26FImdc4HWkY';
  viewer.value=new Cesium.Viewer('cesiumContainer');
  viewer.value.scene.globe.depthTestAgainstTerrain = true;
  const Load=async()=>{
      tileset.value=await Cesium.Cesium3DTileset.fromUrl('/data/da_yan_ta/tileset.json')
      viewer.value.scene.primitives.add(tileset.value)
      await viewer.value.zoomTo(tileset.value)
    } 
    await Load();
})
</script>

<style>
  html,body,#app,#cesiumContainer{width:100%;height:100%;margin:0;padding:0;overflow:hidden}
</style>
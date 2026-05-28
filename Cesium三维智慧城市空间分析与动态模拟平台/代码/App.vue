<template>
  <div id="cesiumContainer"></div>

  <div class="left-toolbar">
    <Layer v-if="osmBuildingTile" :viewer="viewer"/>
    <BuildingRender v-if="osmBuildingTile" :viewer="viewer" :osmBuildingTile="osmBuildingTile"/>
    <SunlightAnalysis v-if="osmBuildingTile" :viewer="viewer"/>
    <Inundation v-if="osmBuildingTile" :viewer="viewer"/>
    <VisbilityAnalysis v-if="osmBuildingTile" :viewer="viewer"/>
    <BufferAnalysis v-if="osmBuildingTile" :viewer="viewer"/>
    <CoordinateMeasurement v-if="osmBuildingTile" :viewer="viewer" :annotations="annotations"/>
    <DistanceMeasurement v-if="osmBuildingTile" :viewer="viewer"/>
    <CarMovement v-if="osmBuildingTile" :viewer="viewer"/>
  </div>

  <div class="right-toolbar">
    <ScreenShot v-if="osmBuildingTile" :viewer="viewer"/>
    <SetView v-if="osmBuildingTile" :viewer="viewer"/>
    <Mask v-if="osmBuildingTile" :viewer="viewer"/>
    <RemoveEntities v-if="osmBuildingTile" :viewer="viewer" :annotations="annotations"/>
    <div></div><!--拖底-->
  </div>
</template>

<script setup>
import * as Cesium from 'cesium';
import {ref,onMounted} from 'vue';

import BuildingRender from './components/BuildingRender.vue'
import Layer from './components/Layer.vue'
import SunlightAnalysis from './components/SunlightAnalysis.vue'
import Inundation from './components/InundationAnalysis.vue'
import VisbilityAnalysis from './components/VisibilityAnalysis.vue'
import BufferAnalysis from './components/BufferAnalysis.vue'
import CoordinateMeasurement from './components/CoordinateMeasurement.vue'
import DistanceMeasurement from './components/DistanceMeasurement.vue'
import CarMovement from './components/CarMovement.vue'
import ScreenShot from './components/ScreenShot.vue'
import SetView from './components/SetView.vue'
import RemoveEntities from './components/RemoveEntities.vue'
import Mask from './components/Mask.vue'


const viewer=ref();
const terrain=ref();
const osmBuildingTile=ref();
const annotations=ref();

onMounted(async()=>{
  Cesium.Ion.defaultAccessToken='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxYTdiYzE2NC1lOTkyLTQyZmEtYWIxNy1kYzUyOWEzZWI5ODAiLCJpZCI6NDEzOTI0LCJpYXQiOjE3NzUzNTc3MzZ9.GKTAtYPpDqexLD4sF7vBfZx_1NbTsqh26FImdc4HWkY';
  viewer.value=new Cesium.Viewer("cesiumContainer",{
    baseLayerPicker:false,
    animation:false,
    timeline:false,
    contextOptions:{webgl:{preserveDrawingBuffer:true}}//截图设置
    });
  viewer.value.scene.globe.enableLighting=true;
  viewer.value.scene.globe.depthTestAgainstTerrain=true;

  annotations.value=viewer.value.scene.primitives.add(new Cesium.LabelCollection());//标签对象

  const load=async()=>
  {
    terrain.value=await Cesium.createWorldTerrainAsync({requestVertexNormals:true});//坡度坡向设置：requestVertexNormals:true
    osmBuildingTile.value=await Cesium.createOsmBuildingsAsync();
    viewer.value.terrainProvider=terrain.value;
    viewer.value.scene.primitives.add(osmBuildingTile.value);
    viewer.value.camera.setView({destination:Cesium.Cartesian3.fromDegrees(114.39564,30.52214,2000)});
  }
  load();
})
</script>

<style>
  html,body,#app,#cesiumContainer{width:100%;height:100%;margin:0;padding:0;overflow:hidden}
  .left-toolbar{
    position: absolute;top:10px;left:10px;background-color:rgb(0,0,0,0.7);
    padding:10px;
    display:flex;/*纵向弹性布局，子元素自动从上到下排列*/
    flex-direction:column;
    gap:15px;/* 模块之间的间距，自动分配*/
    min-width:220px;
  }
  .right-toolbar{
    position: absolute;top:60px;right:-120px;
    padding:10px;
    display:flex;/*纵向弹性布局，子元素自动从上到下排列*/
    flex-direction:column;
    gap:15px;/* 模块之间的间距，自动分配*/
    min-width:220px;
  }
  /*通用样式 */
  .toolbar{display:flex;flex-direction:column;color:white;gap:5px}/*工具栏*/
  .oneText{text-align:left;color:yellow;width:100px;font-weight:bold}/*标题文本*/
  .twoText{text-align:center;color:white;width:100px;font-size:16px;font-family:''}/*二级文本*/
  .row{display:flex;gap:4px}/*同行*/

  .drawBtn{background-color:green;width:80px}
  .startOrStopBtn{background-color:blue;width:100px}/*开关按钮*/
  .functionBtn{background-color:dodgerblue;width:80px}
  .AssistiveBtn{background-color:deeppink;width:80px;}

  .red{background-color:red}/*红色高亮*/
  .input{background-color:white;color:black}
</style>
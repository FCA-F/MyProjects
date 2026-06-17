<template>
  <div class="toolbar">
    <div class="oneText">图层</div>
    <el-radio-group v-model="layerStyle" class="radio">
      <el-radio value="default" >默认</el-radio>
      <el-radio value="contour">
        等高线
        <el-button @click="isShowContourSpace=!isShowContourSpace" icon="setting" circle size="small"></el-button>
      </el-radio>
      <el-radio value="slope" >坡度</el-radio>
      <el-radio value="aspect" >坡向</el-radio>
    </el-radio-group>
  </div>

  <div v-if="isShowContourSpace==true">
    <div class="contourSpaceTitle">等高线间距</div>
    <div>
      <el-slider v-model.number="contourSpace" :min="0" :max="300" show-input style="el-slider"/>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import {ref,watch} from 'vue'
import {useCesiumStore} from '../../stores/cesium.ts'

const cesiumStore=useCesiumStore();
const viewer=cesiumStore.viewer as Cesium.Viewer;
const layerStyle=ref('default');//图层样式
const isShowContourSpace=ref(false)
const contourSpace=ref(150);//等高线间距

let contourMaterial=Cesium.Material.fromType('ElevationContour');//等高线
contourMaterial.uniforms.spacing=150;
contourMaterial.uniforms.width=2;
contourMaterial.uniforms.color=Cesium.Color.RED;
let slopeRamp=[0.0,0.1,0.2,0.3,0.4,0.5,0.6];//坡度梯度
let aspectRamp=[0.0,0.2,0.4,0.6,0.8,0.9,1.0];//坡向梯度

//监听图层样式
watch(layerStyle,(layerStyle)=>{
    switch(layerStyle)
    {
        case 'default':
            switchDefaultMaterial();break;
        case 'contour':
            switchContourMaterial();break;
        case 'slope':
            switchSlopeMaterial();break;
        case 'aspect':
            switchAspectMaterial();break;
    }
})
//切换默认图层
const switchDefaultMaterial=()=>
{
    viewer.scene.globe.material=undefined;
}
//切换等高线图层
const switchContourMaterial=()=>
{
    viewer.scene.globe.material=contourMaterial;
}
//切换坡度图层
const switchSlopeMaterial=()=>
{
    let material=Cesium.Material.fromType('SlopeRamp');
    material.uniforms.image=getSlopeRampCanvas();
    viewer.scene.globe.material=material;
}
//切换坡向图层
const switchAspectMaterial=()=>
{
    let material=Cesium.Material.fromType('AspectRamp');
    material.uniforms.image=getAspectRampCanvas();
    viewer.scene.globe.material=material;
}
//绘制坡度画布
function getSlopeRampCanvas()
{
    let canvas=document.createElement('canvas');
    canvas.width=100;
    canvas.height=1;
    let context=canvas.getContext('2d') as CanvasRenderingContext2D;
    let gradient=context.createLinearGradient(0,0,100,0);//(x1,y1,x2,y2)
    gradient.addColorStop(slopeRamp[0],Cesium.Color.RED.toCssColorString());
    gradient.addColorStop(slopeRamp[1],Cesium.Color.ORANGE.toCssColorString());
    gradient.addColorStop(slopeRamp[2],Cesium.Color.YELLOW.toCssColorString());
    gradient.addColorStop(slopeRamp[3],Cesium.Color.GREEN.toCssColorString());
    gradient.addColorStop(slopeRamp[4],Cesium.Color.CYAN.toCssColorString());
    gradient.addColorStop(slopeRamp[5],Cesium.Color.BLUE.toCssColorString());
    gradient.addColorStop(slopeRamp[6],Cesium.Color.PURPLE.toCssColorString());
    context.fillStyle=gradient;
    context.fillRect(0,0,100,1);
    return canvas;
}
//绘制坡向画布
function getAspectRampCanvas()
{
    let canvas=document.createElement('canvas');
    canvas.width=100;
    canvas.height=1;
    let context=canvas.getContext('2d') as CanvasRenderingContext2D;
    let gradient=context.createLinearGradient(0,0,100,0);//(x1,y1,x2,y2)
    gradient.addColorStop(aspectRamp[0],Cesium.Color.RED.toCssColorString());
    gradient.addColorStop(aspectRamp[1],Cesium.Color.YELLOW.toCssColorString());
    gradient.addColorStop(aspectRamp[2],Cesium.Color.YELLOW.toCssColorString());
    gradient.addColorStop(aspectRamp[3],Cesium.Color.GREEN.toCssColorString());
    gradient.addColorStop(aspectRamp[4],Cesium.Color.CYAN.toCssColorString());
    gradient.addColorStop(aspectRamp[5],Cesium.Color.BLUE.toCssColorString());
    gradient.addColorStop(aspectRamp[6],Cesium.Color.PURPLE.toCssColorString());
    context.fillStyle=gradient;
    context.fillRect(0,0,100,1);
    return canvas;
}
//监听等高线间距
watch(contourSpace,(contourSpace)=>{
    contourMaterial.uniforms.spacing=contourSpace;
})
</script>

<style scoped>
.toolbar {
  display: flex;
  flex-direction: column;
  gap:6px;
}

.oneText{text-align:center;
  font-size:20px;
  font-weight:600;
  color:#45a0eb; 
  margin-bottom:8px;
}

:deep(.radio) {
  display:flex !important;
  gap:1px; /*单选横向间距*/
}

.contourSpaceTitle{
  font-size:16px;
  margin:4px 0;
}

:deep(.el-slider) {
  width: 330px;
}
</style>
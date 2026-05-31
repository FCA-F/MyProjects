<template>
    <div class="toolbar">
        <label class="oneText">图层</label>
        <div class="row">
            <button @click="layerStyle='default'" :class="['buttonStyle',layerStyle==='default'?'red':'']">默认</button>
            <button @click="layerStyle='contour'" :class="['buttonStyle',layerStyle==='contour'?'red':'']">等高线</button>
            <button @click="layerStyle='slope'" :class="['buttonStyle',layerStyle==='slope'?'red':'']">坡度</button>
            <button @click="layerStyle='aspect'" :class="['buttonStyle',layerStyle==='aspect'?'red':'']">坡向</button>
        </div>
        <label class="twoText">等高线间距</label>
        <div>
            <input type="range" v-model.number="contourSpace" min="0" max="300" style="width:120px">
            <input type="text" v-model.number="contourSpace" class="input white" style="width:120px;height:20px">
        </div>
    </div>
</template>
    

<script setup lang="ts">
import * as Cesium from 'cesium'
import {ref,watch} from 'vue'

const {viewer}=defineProps<{viewer:Cesium.Viewer}>();
const layerStyle=ref('default');//图层样式
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
    .buttonStyle{background-color:white;color:black;width:70px;height:25px;cursor:pointer;display:flex;align-items:center;justify-content:center;}
    .twoText{text-align:center;color:white;width:100px;font-size:16px;font-family:''}/*二级文本*/
    .red{background-color:red}
</style>
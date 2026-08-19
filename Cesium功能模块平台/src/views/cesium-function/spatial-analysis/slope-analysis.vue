<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady"/>
        <DraggableModal title="坡度分析">
            <div class="row">
                <el-button class="draw-button" @click="switchSlopeMaterial" :color="isShow?'red':'green'">{{ isShow?'清除':'分析' }}</el-button>
            </div>
            <div class="row">
                <label class="label">最小坡度</label>
                <el-input v-model.number="minSlope" class="input"></el-input>
            </div>
            <div class="row">
                <label class="label">最大坡度</label>
                <el-input v-model.number="maxSlope" class="input"></el-input>
            </div>
        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import {initCesiumBase} from '@/utils/cesium'
import { ElMessage } from 'element-plus';
import '@/components/Common/draggable-modal.css'

let viewer:Cesium.Viewer

const isShow=ref(false)
const minSlope=ref(0.0)
const maxSlope=ref(1.0)
let slopeRamp:number[]=[0.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0];//坡度梯度
let slopeMaterial=Cesium.Material.fromType('SlopeRamp');

const onMapReady=(cesiumViewer:Cesium.Viewer)=>{
    viewer=cesiumViewer

    initCesiumBase(viewer,{
        destination:{lng:117.12043,lat:36.68173,height:2000},
        orientation:{heading:140,pitch:-30,roll:0},
        terrain:true,
        requestVertexNormals:true,
        depthTestAgainstTerrain:true,
    })
}

//切换坡度图层
const switchSlopeMaterial=()=>
{
    if(isShow.value){
        isShow.value=false
        viewer.scene.globe.material=undefined;
        console.log(viewer.scene.globe.material)
    }
    else{
        isShow.value=true
        slopeMaterial.uniforms.image=getSlopeRampCanvas();
        viewer.scene.globe.material=slopeMaterial;
        console.log(viewer.scene.globe.material)
    }
}

//绘制坡度画布
const getSlopeRampCanvas=()=>
{
    let slopeRamp=getSlopeRamp()
    console.log(slopeRamp)
    if(!slopeRamp) return
    let canvas=document.createElement('canvas');
    canvas.width=100;
    canvas.height=1;
    let context=canvas.getContext('2d') as CanvasRenderingContext2D;
    let gradient=context.createLinearGradient(0,0,100,0);//(x1,y1,x2,y2)

    gradient.addColorStop(slopeRamp[0], Cesium.Color.RED.toCssColorString())
    gradient.addColorStop(slopeRamp[1], Cesium.Color.ORANGE.toCssColorString())
    gradient.addColorStop(slopeRamp[2], Cesium.Color.YELLOW.toCssColorString())
    gradient.addColorStop(slopeRamp[3], Cesium.Color.GREEN.toCssColorString())
    gradient.addColorStop(slopeRamp[4], Cesium.Color.CYAN.toCssColorString())
    gradient.addColorStop(slopeRamp[5], Cesium.Color.BLUE.toCssColorString())
    gradient.addColorStop(slopeRamp[6], Cesium.Color.PURPLE.toCssColorString())
    gradient.addColorStop(slopeRamp[7], Cesium.Color.MAGENTA.toCssColorString())
    gradient.addColorStop(slopeRamp[8], Cesium.Color.BROWN.toCssColorString())
    gradient.addColorStop(slopeRamp[9], Cesium.Color.WHITE.toCssColorString())
    context.fillStyle=gradient;
    context.fillRect(0,0,100,1);
    return canvas;
}

const getSlopeRamp=()=>{
    if(minSlope.value<0||minSlope.value>1){
        ElMessage({
            message: '最小值输入错误，请输入0-1之间的数',
            type: 'warning',
        })
        return
    }
    if(maxSlope.value<0||maxSlope.value>1){
        ElMessage({
            message: '最大值输入错误，请输入0-1之间的数',
            type: 'warning',
        })
        return
    }
    let distance=maxSlope.value-minSlope.value;
    let gap=distance/9;
    if(distance<=0){
        ElMessage({
            message: '输入错误，最大值小于等于最小值',
            type: 'warning',
        })
        return;
    }
    let slopeRamp:number[]=[]
    let value=minSlope.value;
    slopeRamp.push(value)
    for(let i=0;i<9;i++){
        value+=gap
        if(value>1) value=1
        slopeRamp.push(value)
    }
    return slopeRamp
}
</script>
<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>
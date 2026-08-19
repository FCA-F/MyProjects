<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady"/>
        <DraggableModal title="等高线分析" :isMove="false">
            <div class="row">
                <el-button class="draw-button" @click="switchContourMaterial" :color="isShow?'red':'green'">{{ isShow?'清除':'分析' }}</el-button>
            </div>
            <div class="row">
                等高线间距
            </div>
            <div class="row">
                <el-slider v-model.number="contourSpace" :min="0" :max="300" show-input class="slider-input" />
            </div>
            <div class="row">
                等高线宽度
            </div>
            <div class="row">
                <el-slider v-model.number="contourWidth" :min="0" :max="10" show-input class="slider-input"/>
            </div>
        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import {initCesiumBase} from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

let viewer:Cesium.Viewer

const onMapReady=(cesiumViewer:Cesium.Viewer)=>{
    viewer=cesiumViewer

    initCesiumBase(viewer,{
        destination:{lng:117.12043,lat:36.68173,height:2000},
        orientation:{heading:140,pitch:-30,roll:0},
        terrain:true,
        osm:true,
        depthTestAgainstTerrain:true,
    })
}

const isShow=ref(false)
const contourSpace=ref(150);//等高线间距
const contourWidth=ref(2)

let contourMaterial=Cesium.Material.fromType('ElevationContour');//等高线
contourMaterial.uniforms.spacing=150;
contourMaterial.uniforms.width=2;
contourMaterial.uniforms.color=Cesium.Color.RED;

//切换等高线图层
const switchContourMaterial=()=>
{
    if(isShow.value){
        isShow.value=false
        console.log(viewer.scene.globe.material)
        viewer.scene.globe.material=undefined;
    }
    else{
        isShow.value=true
        console.log(viewer.scene.globe.material)
        viewer.scene.globe.material=contourMaterial;
    }
}

//监听等高线间距
watch(contourSpace,(contourSpace)=>{
    contourMaterial.uniforms.spacing=contourSpace;
})

watch(contourWidth,(contourWidth)=>{
    contourMaterial.uniforms.width=contourWidth;
})
</script>
<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>
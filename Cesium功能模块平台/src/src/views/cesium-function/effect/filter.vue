<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
        <DraggableModal title="滤镜" :isMove="false">
            <div class="row">
                <el-button @click="switchFilter" class="draw-button" :color="isShow?'red':'green'">{{ isShow?'消除':'开启' }}</el-button>
            </div>
            <div class="row">
                <span class="label">混合比例</span>
                <el-slider v-model="mixDegree" :min="0" :max="1" :step="0.01" show-input class="slider-input"/>
            </div>
            <div class="row">
                <span class="label">滤镜颜色</span>
                <el-color-picker v-model="filterColor" class="slider-input"/>
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
const isShow=ref(false)
const filterColor=ref('red')
const mixDegree=ref(0.5)


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

const fragmentShader=`

    uniform sampler2D colorTexture; 
    in vec2 v_textureCoordinates;    

    uniform vec4 filterColor;           //滤镜颜色
    uniform float extent;

    void main()
    {
        vec2 uv=v_textureCoordinates;
        vec4 sceneColor=texture(colorTexture,uv);
        out_FragColor=mix(sceneColor,filterColor,extent);
    }
`;

let filterStage:Cesium.PostProcessStage|undefined;

const addFilter=()=>{
    filterStage=new Cesium.PostProcessStage({//后生成阶段
        fragmentShader:fragmentShader,
        uniforms:{
            filterColor:Cesium.Color.fromCssColorString(filterColor.value),
            extent:mixDegree.value
        }
    })
    viewer.scene.postProcessStages.add(filterStage)
}

const removeFilter=()=>{
    viewer.scene.postProcessStages.remove(filterStage!)
}

const switchFilter=()=>{
    if(isShow.value){
        isShow.value=false
        removeFilter()
    }
    else{
        isShow.value=true
        removeFilter()
        addFilter()
    }
}

watch([mixDegree,filterColor],()=>{
    if(isShow.value){
        removeFilter()
        addFilter()
    }
})
</script>
<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>
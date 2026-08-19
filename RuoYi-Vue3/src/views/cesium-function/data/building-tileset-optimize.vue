<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
        <DraggableModal title="3DTiles性能优化" :isMove="false">
            <div class="row">
                <el-button @click="switchShow"  :color="isShow?'red':'green'" class="draw-button">{{ isShow?'移除模型':'加载模型' }}</el-button>
            </div>
            <div class="row">
                <label class="label-long">屏幕空间误差</label>
                <el-slider v-model="maximumScreenSpaceError" :min="1" :max="128" :step="1"  show-input class="slider-input"/>
            </div>
            <div class="row">
                <label class="label-long">最大内存限制</label>
                <el-slider v-model="maximumMemoryUsage" :min="1" :max="2048" :step="1"  show-input class="slider-input"/>
            </div>
            <div class="row">
                <label class="label-long">最大溢出内存限制</label>
                <el-slider v-model="maximumOverflowMemoryUsage" :min="1" :max="2048" :step="1"  show-input class="slider-input"/>
            </div>
            <div class="row">
                <label class="label-long">动态屏幕误差</label>
                <el-switch v-model="dynamicScreenSpaceError" />
            </div>
            <div v-if="dynamicScreenSpaceError" class="modal-body">
                <div class="row">
                    <label class="label-long">误差密度</label>
                    <el-slider v-model="dynamicScreenSpaceErrorDensity" :min="0" :max="0.01" :step="0.0001" show-input class="slider-input"/>
                </div>
                <div class="row">
                    <label class="label-long">误差因子</label>
                    <el-slider v-model="dynamicScreenSpaceErrorFactor" :min="1" :max="24" :step="1" show-input class="slider-input"/>
                </div>
                <div class="row">
                    <label class="label-long">高度衰减</label>
                    <el-slider v-model="dynamicScreenSpaceErrorHeightFalloff" :min="0" :max="1" :step="0.01" show-input class="slider-input"/>
                </div>
            </div>
            <div class="row">
                <label class="label-long">渐进加载</label>
                <el-slider v-model="progressiveResolutionHeightFraction" :min="0" :max="1" :step="0.01" show-input class="slider-input"/>
            </div>
            <div class="row">
                <label class="label-long">中心优先加载</label>
                <el-switch v-model="foveatedScreenSpaceError" />
            </div>
            <div v-if="foveatedScreenSpaceError" class="modal-body">
                <div class="row">
                    <label class="label-long">中心范围</label>
                    <el-slider v-model="foveatedConeSize" :min="0" :max="1" :step="0.01" show-input class="slider-input"/>
                </div>
                <div class="row">
                    <label class="label-long">延迟时间</label>
                    <el-slider v-model="foveatedTimeDelay" :min="0" :max="2" :step="0.1" show-input class="slider-input"/>
                </div>
            </div>
            <div class="row">
                <label class="label-long">优先叶子瓦片</label>
                <el-switch v-model="preferLeaves" />
            </div>
            <div class="row">
                <label class="label-long">多重采样抗锯齿</label>
                <el-slider v-model="msaaSamples" :min="1" :max="8" :step="1" show-input class="slider-input"/>
            </div>
            <div class="row">
                <label class="label-long">快速抗锯齿</label>
                <el-switch v-model="fxaa" />
            </div>
            <div class="row">
                <label class="label-long">雾效</label>
                <el-switch v-model="fog" />
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
let tileset:Cesium.Cesium3DTileset

const isShow=ref(true)

const maximumScreenSpaceError=ref(16)//屏幕空间误差!
const maximumMemoryUsage=ref(512)//最大内存限制
const maximumOverflowMemoryUsage=ref(512)//最大溢出内存限制

const dynamicScreenSpaceError=ref(false)//动态误差
const dynamicScreenSpaceErrorDensity=ref(0.00278)//影响动态误差增长速度。值越大，远处越容易降精度。
const dynamicScreenSpaceErrorFactor=ref(4.0)//动态误差强度。值越大，性能越好，但远处更糊。
const dynamicScreenSpaceErrorHeightFalloff=ref(0.25)//高度衰减比例

const progressiveResolutionHeightFraction=ref(0.3)//渐进分辨率高度比例，先低精度快速显示，再逐步补清晰
const foveatedScreenSpaceError=ref(true)//中心视野优先加载，屏幕边缘瓦片延后加载
const foveatedConeSize=ref(0.1)//中心优先范围，值越小越偏向屏幕中心，边缘越容易延后
const foveatedTimeDelay=ref(0.2)//相机停止后延迟加载边缘瓦片的时间，单位秒
const preferLeaves=ref(true)//优先加载叶子瓦片，对有LOD的数据可能更快显示最终细节

const msaaSamples=ref(4)//多重采样抗锯齿采样数，值越大边缘越平滑，但GPU开销越高；1表示关闭MSAA
const fxaa=ref(true)//快速近似抗锯齿，开启后边缘更平滑，但会增加少量后处理开销

const fog=ref(true)//雾效开关，关闭可减少雾效渲染开销

const onMapReady=async (cesiumViewer:Cesium.Viewer)=>{
    viewer=cesiumViewer

    await initCesiumBase(viewer,{
        debugShowFramesPerSecond:true
    })

    tileset=await Cesium.Cesium3DTileset.fromUrl("http://localhost:82/tiles/tileset.json",{
    })
    viewer.scene.primitives.add(tileset)
    viewer.zoomTo(tileset)
}

const switchShow=async ()=>{
    if(isShow.value){
        isShow.value=false
        viewer.scene.primitives.remove(tileset)
    }
    else{
        isShow.value=true
        viewer.scene.primitives.remove(tileset)
        tileset=await Cesium.Cesium3DTileset.fromUrl("http://localhost:82/tiles/tileset.json")
        viewer.scene.primitives.add(tileset)
    }
}

watch(maximumScreenSpaceError,(maximumScreenSpaceError)=>{
    tileset.maximumScreenSpaceError=maximumScreenSpaceError
})
watch([maximumMemoryUsage,maximumOverflowMemoryUsage],([maximumMemoryUsage,maximumOverflowMemoryUsage])=>{
    tileset.cacheBytes=maximumMemoryUsage*1024*1024
    tileset.maximumCacheOverflowBytes=maximumOverflowMemoryUsage*1024*1024
})
watch([dynamicScreenSpaceError,dynamicScreenSpaceErrorDensity,dynamicScreenSpaceErrorFactor,dynamicScreenSpaceErrorHeightFalloff],([dynamicScreenSpaceError,dynamicScreenSpaceErrorDensity,dynamicScreenSpaceErrorFactor,dynamicScreenSpaceErrorHeightFalloff])=>{
    tileset.dynamicScreenSpaceError=dynamicScreenSpaceError
    tileset.dynamicScreenSpaceErrorDensity=dynamicScreenSpaceErrorDensity
    tileset.dynamicScreenSpaceErrorFactor=dynamicScreenSpaceErrorFactor
    tileset.dynamicScreenSpaceErrorHeightFalloff=dynamicScreenSpaceErrorHeightFalloff
})
watch([progressiveResolutionHeightFraction,foveatedScreenSpaceError,foveatedConeSize,foveatedTimeDelay,preferLeaves],([progressiveResolutionHeightFraction,foveatedScreenSpaceError,foveatedConeSize,foveatedTimeDelay,preferLeaves])=>{
    tileset.progressiveResolutionHeightFraction=progressiveResolutionHeightFraction
    tileset.foveatedScreenSpaceError=foveatedScreenSpaceError
    tileset.foveatedConeSize=foveatedConeSize
    tileset.foveatedTimeDelay=foveatedTimeDelay
    tileset.preferLeaves=preferLeaves
})
watch([msaaSamples,fxaa,fog],([msaaSamples,fxaa,fog])=>{
    viewer.scene.msaaSamples=msaaSamples
    viewer.scene.postProcessStages.fxaa.enabled=fxaa
    viewer.scene.fog.enabled=fog
})

</script>
<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>


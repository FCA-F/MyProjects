<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
        <DraggableModal title="限高分析">
            <div class="row">
                <el-button @click="switchEffect" class="draw-button" :color="isShow ? 'red' : 'green'">{{ isShow ? '消除'
                    : '开启'
                    }}</el-button>
            </div>
            <div class="row">
                <span class="label">限高</span>
                <el-input v-model="limitHeight" class="input"></el-input>
                <span class="label-end">米</span>
            </div>
            <div class="row">
                <label class="label">限高线</label>
                <el-switch v-model="isDrawLine" />
            </div>
        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import { initCesiumBase } from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

let viewer: Cesium.Viewer
let osmBuildings: Cesium.Cesium3DTileset | undefined

const isShow = ref(false)
const isDrawLine = ref(true)
const limitHeight = ref(50)
const groundHeight = ref(22)


const onMapReady = async (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer

    const result = await initCesiumBase(viewer, {
        destination: { lng: 114.40740, lat: 30.50721, height: 1000 },
        orientation: { heading: 185, pitch: -30, roll: 0 },
        terrain: true,
        osm: true,
        depthTestAgainstTerrain: true,
    })

    osmBuildings = result?.osmBuildings
}
const openEffect = () => {
    if (!osmBuildings) return
    osmBuildings.showOutline = false
    const customShader = new Cesium.CustomShader({
        //考虑光照模型
        lightingModel: Cesium.LightingModel.PBR,
        uniforms: {
            groundHeight: { type: Cesium.UniformType.FLOAT, value: groundHeight.value },
            limitHeight: { type: Cesium.UniformType.FLOAT, value: limitHeight.value },//基准高度
            isDrawLine: { type: Cesium.UniformType.BOOL, value: isDrawLine.value },
            normalColor: {
                type: Cesium.UniformType.VEC3,
                value: Cesium.Color.GREEN
            },
            overColor: {
                type: Cesium.UniformType.VEC3,
                value: Cesium.Color.RED
            },
            lineColor: {
                type: Cesium.UniformType.VEC3,
                value: Cesium.Color.YELLOW
            }
        },
        fragmentShaderText: `
        void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {  //参数：信息结构体、材质
            //像点相对地面高度
            float relativeHeight = fsInput.attributes.positionMC.z-groundHeight;  //像点高度-地面高度=像点相对高度

            //是否超出限高
            float isOverLimitHeight=step(limitHeight,relativeHeight);
            //建筑着色
            material.diffuse= mix(normalColor, overColor, isOverLimitHeight);    //material.diffuse：当前像素的“底色”
            
            //是否是线
            float isLine=1.0-step(0.5,abs(relativeHeight-limitHeight));//0.5米限高线
            //画线
            if(isDrawLine)
            material.diffuse= mix( material.diffuse, lineColor, isLine);
        }     
        `
        /*坐标系说明
            positionMC:模型自身坐标（建模时的坐标）
            positionWC:世界坐标（地球坐标）
            positionEC:相机坐标
        */
    });
    //将定义好的着色器作用域建筑tilesets
    osmBuildings.customShader = customShader;
}
const closeEffect = () => {
    if (!osmBuildings) return
    osmBuildings.showOutline = true
    osmBuildings.customShader = undefined
}
const switchEffect = () => {
    if (isShow.value) {
        isShow.value = false
        closeEffect()
    }
    else {
        isShow.value = true
        openEffect()
    }
}

watch(isDrawLine, (isDrawLine) => {
    openEffect()
})

/*
    本程序为指定海拔，若数据有真实底部海拔信息可制作高精度
*/


</script>
<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>

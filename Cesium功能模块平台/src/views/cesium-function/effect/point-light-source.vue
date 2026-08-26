<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
        <DraggableModal title="点光源" :isMove="false">
            <div class="row">
                <el-button @click="switchDraw" :color="isDraw ? 'red' : 'greenyellow'" class="draw-button">{{
                    isDraw?'停止':'绘制' }}</el-button>
            </div>
            <div class="row">
                <label class="label">半径</label>
                <el-slider v-model.number="LIGHT_RADIUS" :min="500" :max="5000" :step="1" show-input
                    class="slider-input" />
            </div>
            <div class="row">
                <label class="label">衰减指数</label>
                <el-slider v-model.number="LIGHT_DECAY" :min="0" :max="5" :step="0.1" show-input class="slider-input" />
            </div>
            <div class="row">
                <label class="label">强度</label>
                <el-slider v-model.number="LIGHT_INTENSITY" :min="0" :max="10" :step="0.1" show-input
                    class="slider-input" />
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
let handler: Cesium.ScreenSpaceEventHandler

let osmBuildings: Cesium.Cesium3DTileset | undefined
let removePreUpdateListener: (() => void) | undefined

const isDraw = ref(false)
let pointCartesian: Cesium.Cartesian3
let pointEntity: Cesium.Entity

const LIGHT_RADIUS = ref(1500.0)//半径
const LIGHT_DECAY = ref(2.0)//衰减指数
const LIGHT_INTENSITY = ref(4.0)//强度倍率
const LIGHT_COLOR = Cesium.Color.fromCssColorString('#ffd27a')

let pointLightPosition: Cesium.Cartesian3 | undefined
const scratchLightPositionEC = new Cesium.Cartesian3()
const paramsVec3 = new Cesium.Cartesian3()

const onMapReady = async (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer
    handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)

    const initResult = await initCesiumBase(viewer, {
        destination: { lng: 114.40740, lat: 30.50721, height: 1000 },
        orientation: { heading: 185, pitch: -15, roll: 0 },
        terrain: true,
        osm: true,
        depthTestAgainstTerrain: true,
    })

    osmBuildings = initResult?.osmBuildings
    osmBuildings!.showOutline = false

    viewer.scene.highDynamicRange = true
    viewer.scene.globe.enableLighting = true
    viewer.clock.currentTime = Cesium.JulianDate.fromIso8601('2024-01-01T23:00:00Z')
}

const switchDraw = () => {
    if (isDraw.value) {
        isDraw.value = false
        stopDraw()
    }
    else {
        isDraw.value = true
        runDraw()
    }
}

const runDraw = () => {
    handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        const pickPosition = viewer.scene.pickPosition(e.position)
        if (!pickPosition) return

        pointCartesian = addHeight(pickPosition)
        pointEntity = addPoint()

        addPointLight()

        isDraw.value = false
        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

const stopDraw = () => {
    isDraw.value = false
    handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
}
//高度抬升
const addHeight = (position: Cesium.Cartesian3) => {
    let cartographic = Cesium.Cartographic.fromCartesian(position)
    let height = viewer.scene.globe.getHeight(cartographic)
    cartographic.height = height! + 140
    position = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, cartographic.height)
    return position
}
//添加点entity
const addPoint = () => {
    viewer.entities.remove(pointEntity)
    return viewer.entities.add({
        position: pointCartesian,
        ellipsoid: {
            radii: new Cesium.Cartesian3(8, 8, 8), // 半径 8 米的球
            material: LIGHT_COLOR,                  // 球的颜色
        },
    })
}
//添加光源
const addPointLight = () => {
    if (!pointCartesian) {
        return
    }
    removePointLight()

    pointLightPosition = pointCartesian

    updateLightShaderParams()
    osmBuildings!.customShader = createPointLightShader()
    removePreUpdateListener = viewer.scene.preUpdate.addEventListener(updateLightShaderParams)

    viewer.scene.requestRender()
}


const removePointLight = () => {

    if (removePreUpdateListener) {
        removePreUpdateListener()
        removePreUpdateListener = undefined
    }


    osmBuildings!.customShader = undefined
    viewer.scene.requestRender()
}

//光点的世界坐标->相机坐标
const updateLightShaderParams = () => {
    Cesium.Matrix4.multiplyByPoint(
        viewer.camera.viewMatrix,  // 世界坐标 → 相机坐标的变换矩阵
        pointLightPosition!,        // 光源的世界坐标
        scratchLightPositionEC     // 输出：光源的相机坐标（这就是传给 shader 的 u_pointLightPositionEC）
    )
    paramsVec3.x = LIGHT_RADIUS.value,
        paramsVec3.y = LIGHT_DECAY.value,
        paramsVec3.z = LIGHT_INTENSITY.value//半径，衰减，强度
}


const createPointLightShader = () => new Cesium.CustomShader({
    mode: Cesium.CustomShaderMode.MODIFY_MATERIAL,//改完的材质，继续走完整的 PBR 光照计算，含太阳光等
    lightingModel: Cesium.LightingModel.PBR,//基于物理引擎继续渲染
    uniforms: {
        u_pointLightPositionEC: {
            type: Cesium.UniformType.VEC3,
            value: scratchLightPositionEC,
        },
        u_pointLightColor: {
            type: Cesium.UniformType.VEC4,
            value: LIGHT_COLOR,
        },
        u_pointLightParams: {
            type: Cesium.UniformType.VEC3,
            value: paramsVec3 //半径，衰减，强度
        },
    },
    fragmentShaderText: `
    void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)
    {
      vec3 positionEC = fsInput.attributes.positionEC;//像素在相机坐标系下的位置
      vec3 normalEC = normalize(fsInput.attributes.normalEC);//像素在相机坐标系下的朝向
      vec3 lightVec3 = u_pointLightPositionEC - positionEC;//片元指向光源
      float distanceToLight = length(lightVec3);//片元到光源位置
      vec3 lightDirection = lightVec3 / max(distanceToLight, 0.001);//正则化，光线在相机坐标系下朝向

      float ratio = u_pointLightParams.x;//半径
      float decay = u_pointLightParams.y;//衰减
      float intensity = u_pointLightParams.z;//强度
      float distanceProportion = distanceToLight / max(ratio, 0.001);//距离占总半径比
      float LightProportion = pow(clamp(1.0 - distanceProportion, 0.0, 1.0), decay + 1.0);//亮度占比
      float angle = max(dot(normalEC, lightDirection), 0.0);//dot点积，两个方向越相近值越大

      vec3 lightRgb = u_pointLightColor.rgb * LightProportion * intensity * angle;//光颜色*亮度占比*强度*夹角
      material.diffuse = clamp(material.diffuse + lightRgb * 0.35, vec3(0.0), vec3(1.0));//光与Cesium其他光照互动
      material.emissive += lightRgb * 0.85;//不受其他光照影响，保底发光
    }
  `,
})


onBeforeUnmount(() => {
    removePointLight()
})
</script>
<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>

<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
        <DraggableModal title="泛光特效">
            <div class="row">
                <el-button @click="switchEffect" class="draw-button" :color="isShow?'red':'green'">{{ isShow?'消除':'开启' }}</el-button>
            </div>
            <div class="row">
                <span class="label">周期</span>
                <el-input v-model="period" class="input"></el-input>
                <span class="label-end">秒</span>
            </div>
            <div class="row">
                <span class="label">渐变高度</span>
                <el-input v-model="gradientRange" class="input"></el-input>
                <span class="label-end">米</span>
            </div>
            <div class="row">
                <span class="label">基准高度</span>
                <el-input v-model="groundHeight" class="input"></el-input>
                <span class="label-end">米</span>
            </div>
            <div class="row">
                <label class="label">渐变颜色</label>
                <el-color-picker v-model="color1" style="width:120px;height:35px"/>
                <el-color-picker v-model="color2" style="width:120px;height:35px"/>
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
let osmBuildings:Cesium.Cesium3DTileset|undefined

const isShow=ref(false)
const period=ref(360)//光圈周期
const gradientRange=ref(100)//渐变范围（高度）
const groundHeight=ref(22)
const color1=ref('#3399ff')
const color2=ref('#99d9ff')


const onMapReady=async(cesiumViewer:Cesium.Viewer)=>{
    viewer=cesiumViewer

    const result=await initCesiumBase(viewer,{
        destination:{lng:114.39564,lat:30.52214,height:1000},
        orientation:{heading:140,pitch:-30,roll:0},
        terrain:true,
        osm:true,
        depthTestAgainstTerrain:true,
    })

    osmBuildings=result?.osmBuildings
}
const openEffect=()=>{
    if(!osmBuildings) return
    osmBuildings.showOutline = false
    const customShader = new Cesium.CustomShader({
    //不考虑光照模型
    lightingModel: Cesium.LightingModel.UNLIT,
    uniforms:{
        period:{type:Cesium.UniformType.FLOAT,value:period.value},//光圈周期
        gradientRange:{type:Cesium.UniformType.FLOAT,value:gradientRange.value},//渐变高度
        groundHeight:{type:Cesium.UniformType.FLOAT,value:groundHeight.value},//基准高度
        color1: {
            type: Cesium.UniformType.VEC3,
            value: cssColorToVec3(color1.value)
        },
        color2: {
            type: Cesium.UniformType.VEC3,
            value: cssColorToVec3(color2.value)
        }
    },
    fragmentShaderText: `
        void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {  //参数：信息结构体、材质
            //周期高度
            float periodHeight = fract(czm_frameNumber / period) ;   //czm_frameNumber:Cesium 内置全局变量，每渲染1帧自动+1​,Shader 里唯一的时间基准（没有它就没法做动画）；fract:取小数部分
            //像点相对地面高度
            float relativeHeight = fsInput.attributes.positionMC.z-groundHeight;  //像点高度-地面高度=像点相对高度

            //建筑着色
            float modelGray = relativeHeight / gradientRange + sin(periodHeight*czm_twoPi) * 0.1;    //底部暗，高处明，加上sin呼吸随机
            material.diffuse= mix(color1, color2, modelGray);    //material.diffuse：当前像素的“底色”，浅蓝与深蓝混合

            //光圈着色
            float haloMovementRange = 400.0;  // 光环的移动范围(高度)
            float relativeHaloHeight = clamp(relativeHeight / haloMovementRange, 0.0, 1.0);   //当前像素在光环活动范围内的相对位置
            float periodHeight101 = abs(periodHeight - 0.5) * 2.0;   //[0,1]->[1,0,1]，上升->上升+下降
            float isHalo = step(0.01, abs(relativeHaloHeight - periodHeight101)); //像素是否是光环，距离接近就是光环
            material.diffuse += material.diffuse*(1.0-isHalo);  //如果是光环，光环加亮
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
const closeEffect=()=>{
    if(!osmBuildings) return
    osmBuildings.showOutline = true
    osmBuildings.customShader=undefined
}
const switchEffect=()=>{
    if(isShow.value){
        isShow.value=false
        closeEffect()
    }
    else{
        isShow.value=true
        openEffect()
    }
}
const cssColorToVec3 = (cssColor: string) => {
  const c = Cesium.Color.fromCssColorString(cssColor)
  return new Cesium.Cartesian3(c.red, c.green, c.blue)
}

watch([color1,color2],([color1,color2])=>{
    openEffect()
})
//无参数普通建筑渲染
/*
const openEffect=()=>{
    if(!osmBuildings) return
    const customShader = new Cesium.CustomShader({
    //不考虑光照模型
    lightingModel: Cesium.LightingModel.UNLIT,
    fragmentShaderText: `
        void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {  //参数：信息结构体、材质
            //周期高度
            float periodHeight = fract(czm_frameNumber / 360.0) ;   //czm_frameNumber:Cesium 内置全局变量，每渲染1帧自动+1​,Shader 里唯一的时间基准（没有它就没法做动画）；fract:取小数部分
            //建筑
            float groundHeight = 22.0;   // 地面高度
            float gradientRange = 100.0;   // 高亮的范围
            float relativeHeight = fsInput.attributes.positionMC.z-groundHeight;  //像点高度-地面高度=像点相对高度
            float modelGray = relativeHeight / gradientRange + sin(periodHeight*czm_twoPi) * 0.1;    //底部暗，高处明，加上sin呼吸随机
            material.diffuse= mix(vec3(0.2, 0.6, 1.0), vec3(0.6, 0.85, 1.0), modelGray);    //material.diffuse：当前像素的“底色”，浅蓝与深蓝混合
            //光圈
            float haloMovementRange = 400.0;  // 光环的移动范围(高度)
            float haloRelativeHeight = clamp(relativeHeight / haloMovementRange, 0.0, 1.0);   //当前像素在光环活动范围内的相对位置
            float periodHeight101 = abs(periodHeight - 0.5) * 2.0;   //[0,1]->[1,0,1]，上升->上升+下降
            float isHalo = step(0.01, abs(haloRelativeHeight - periodHeight101)); //像素是否是光环，距离接近就是光环
            material.diffuse += material.diffuse*(1.0-isHalo);  //如果是光环，光环加亮
        }     
        `
        坐标系说明
            positionMC:模型自身坐标（建模时的坐标）
            positionWC:世界坐标（地球坐标）
            positionEC:相机坐标
        
      });
      //将定义好的着色器作用域建筑tilesets
      osmBuildings.customShader = customShader;
}
*/
</script>
<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>

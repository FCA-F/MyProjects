<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
        <DraggableModal title="雾" :isMove="false">
            <div class="row">
                <el-button @click="switchFog" class="draw-button" :color="isShow?'red':'green'">{{ isShow?'消除':'开启' }}</el-button>
            </div>
            <div>可视距离(米):</div>
            <div class="row">
                <el-slider v-model.number="visibleDistance" :min="0" :max="50000" show-input class="slider-input" />
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
const visibleDistance=ref(10000)

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

//region 雾
//片元着色器
const fragmentShader=`

    uniform sampler2D colorTexture;  //颜色纹理
    uniform sampler2D depthTexture;  //深度纹理

    in vec2 v_textureCoordinates;    //屏幕采样点坐标（从顶点着色器传入）

    uniform vec4 fogByDistance;      //雾距离渐变(x:起始距离, y:起始透明度, z:终点距离, w:终点透明度)
    uniform vec4 fogColor;           //雾颜色

    float getDistance()  // 获得距离（米）
    {
        float depth=czm_unpackDepth(texture(depthTexture,v_textureCoordinates));//depth:[0,1]
        if (depth==0.0) 
        {
            return czm_infinity;
        }
        vec4 eyeCoordinate=czm_windowToEyeCoordinates(gl_FragCoord.xy, depth);//gl_FragCoord.xy:屏幕坐标，如（800，600）,eyeCoordinate:齐次坐标:(x,y,z,w),gl_FragCoord.xy决定方向（屏幕坐标）,depth决定距离
        return -eyeCoordinate.z/eyeCoordinate.w;//真实米数
    }

    float getAlphaByDistance(float distance,vec4 fogByDistance)  // 获得透明度
    {
        float startDistance=fogByDistance.x;   // 雾起始距离
        float startAlpha=fogByDistance.y;      // 雾起始透明度
        float endDistance=fogByDistance.z;     // 雾终止距离
        float endAlpha=fogByDistance.w;        // 雾终止透明度
        float alpha=clamp((distance-startDistance)/(endDistance-startDistance),0.0,1.0);
        return alpha;
    }

    vec4 blendColor(float alpha,vec4 fogColor)  // 混合颜色（雾和场景）
    {
        vec4 sceneColor=texture(colorTexture,v_textureCoordinates);  // 场景颜色
        return fogColor*alpha+sceneColor*(1.0-alpha);
    }

    void main()
    {
        float distance=getDistance();  // 距离
        float alpha=getAlphaByDistance(distance,fogByDistance);         // 雾透明度
        out_FragColor=blendColor(alpha,fogColor);                       // 片元颜色（最终修改目标）
    }
`;

let fogPostProcessStage:Cesium.PostProcessStage|undefined;

const addFog=()=>{
    fogPostProcessStage=new Cesium.PostProcessStage({//后生成阶段
        fragmentShader:fragmentShader,
        uniforms:{
            fogByDistance:new Cesium.Cartesian4(0,0,visibleDistance.value,1),//x:起始距离,y:起始雾透明度,z:终点距离，w:终点透明度
            fogColor:Cesium.Color.WHITE
        }
    })
    viewer.scene.postProcessStages.add(fogPostProcessStage)
}

const removeFog=()=>{
    if(Cesium.defined(fogPostProcessStage))
    viewer.scene.postProcessStages.remove(fogPostProcessStage)
}

const switchFog=()=>{
    if(isShow.value){
        isShow.value=false
        removeFog()
    }
    else{
        isShow.value=true
        removeFog()
        addFog()
    }
}

watch(visibleDistance,(visibleDistance)=>{
    if(isShow.value){
        removeFog()
        addFog()
    }
})
</script>
<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>
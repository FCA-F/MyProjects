<template>
  <div class="page-container">
    <CesiumMap @ready="onMapReady"/>
    <DraggableModal title="天际线分析" v-if="osmBuildings" :isMove="false">
        <div class="row">
          <el-button @click="switchSkyline" class="draw-button" :color="isSkyline?'red':'greenyellow'">{{ isSkyline?'停止':'分析' }}</el-button>
        </div>
        <div class="row">
            <el-button @click="drawViewPoint" class="draw-button" color="#1E88E5">{{ isDrawViewPoint?'绘制中...':'绘制视点' }}</el-button>
            <span style="font-size: 13px ;">使用视点</span>  
            <el-switch v-model="isUseViewPoint"/>
        </div>
        <div v-if="isUseViewPoint">
            <div class="row">
          <span class="label">高度</span>
          <el-slider show-input class="slider-input"
            v-model="height"
            :min="-200"
            :max="200"
            :step="1"
            @change="setView"
          />
        </div>
        <div class="row">
          <span class="label">朝向角</span>
          <el-slider show-input class="slider-input"
            v-model="heading"
            :min="-180"
            :max="180"
            :step="1"
            @input="setView"
          />
        </div>
        <div class="row" >
          <span class="label">俯仰角</span>
          <el-slider show-input class="slider-input"
            v-model="pitch"
            :min="-45"
            :max="45"
            :step="1"
            @input="setView"
          />
        </div>
        </div>
        
        <div class="row">
          <span class="label">线宽</span>
          <el-input class="input" v-model="skylineWidth" :min="1" :max="8"/>
        </div>
        <div class="row">
          <span class="label">颜色</span>
          <el-color-picker v-model="skylineColor" show-alpha class="input"/>
        </div>
    </DraggableModal>
  </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import { onBeforeUnmount, ref } from 'vue'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import {initCesiumBase} from '@/utils/cesium'
import { ElMessage } from 'element-plus'
import '@/components/Common/draggable-modal.css'

let viewer:Cesium.Viewer
let handler:Cesium.ScreenSpaceEventHandler
let skylineStage:Cesium.PostProcessStage|undefined//天际线后处理
let viewPoint:Cesium.Entity|undefined//视点

const osmBuildings=shallowRef<Cesium.Cesium3DTileset|undefined>()//建筑
const isSkyline=ref(true)//是否开启天际线
const isDrawViewPoint=ref(false)//是否绘制视点
const isUseViewPoint=ref(false)//是否使用视点
const skylineColor=ref('red')//天际线颜色
const skylineWidth=ref(3)//天际线宽度

const height=ref(0)
const heading=ref(0)
const pitch=ref(0)

const skylineShader=`
uniform sampler2D colorTexture;
uniform sampler2D depthTexture;
uniform vec4 lineColor;
uniform float lineWidth;

in vec2 v_textureCoordinates;

void main()
{
    vec2 uv=v_textureCoordinates;
    vec4 color=texture(colorTexture, v_textureCoordinates);
    /*
        czm_viewport视口vec4:(x, y, width, height),
        x, y视口左下角在画布上的像素坐标（通常是 0, 0），z：视口宽度（像素），w：视口高度（像素）
        pixel = vec2(lineWidth / width, lineWidth / height);
        把"像素距离"转换成了"纹理坐标里的偏移量"，去采样相邻像素的深度
    */
    vec2 pixel=1.0 / czm_viewport.zw;  //uv为[0,1],pixel为1个uv偏移步长

    float centerDepth=czm_readDepth(depthTexture, uv);//返回[0,1]深度
    bool centerIsSky=  centerDepth>= 1.0;//深度大于1为天空

    float edge=0.0;//是不是天际线
    bool found=false;//判断找没找到相同的，找到了跳出深循环
    //采样周围九宫格，判断周围是有相反
    for(int x=-1;x<=1;x++)
    {
        if(found) break;
        for(int y=-1;y<=1;y++)
        {
            vec2 offset=vec2(float(x),float(y))*(lineWidth*pixel);//uv偏移
            float aroundDepth=czm_readDepth(depthTexture, uv+offset);
            bool aroundIsSky= aroundDepth>= 1.0;

            if(centerIsSky != aroundIsSky)
            {
                edge=1.0;
                found=true;
                break;
            }
        }
    }

    out_FragColor=mix(color,lineColor,edge*lineColor.a);//edge乘个透明度，可以设置透明
}
`


const onMapReady=async(cesiumViewer:Cesium.Viewer)=>{
    viewer=cesiumViewer
    handler=new Cesium.ScreenSpaceEventHandler(viewer.canvas)
    const res=await initCesiumBase(viewer,{
        destination:{lng: 114.4074049,lat: 30.507212,height:100},
        orientation:{heading:160,pitch:0,roll:0},
        terrain:true,
        osm:true,
        depthTestAgainstTerrain:true
    })
    osmBuildings.value=res?.osmBuildings
    viewer.scene.postProcessStages.fxaa.enabled=true//抗锯齿
    addSkyline()
}

const switchSkyline=()=>{
    if(!isSkyline.value){
        isSkyline.value=true
        runAnalysis()
    }
    else{
        isSkyline.value=false
        stopAnalysis()
    }
}

const runAnalysis=()=>{
    setView()
    addSkyline()
}

const setView=()=>{
    if(!viewPoint) return
    if(!isUseViewPoint.value) return
    //位置+高度
    let position=viewPoint.position!.getValue(viewer.clock.currentTime) as Cesium.Cartesian3
    let cartographic=Cesium.Cartographic.fromCartesian(position)
    cartographic.height+=height.value
    position=Cesium.Cartesian3.fromRadians(cartographic.longitude,cartographic.latitude,cartographic.height)

    viewer.scene.camera.setView({
        destination:position,
        orientation:{
            heading:Cesium.Math.toRadians(heading.value),
            pitch:Cesium.Math.toRadians(pitch.value),
            roll:0
        }
    })
}

const addSkyline=()=>{
    skylineStage=new Cesium.PostProcessStage({
        name:'skyline-analysis',
        fragmentShader:skylineShader,
        uniforms:{
            lineColor:()=>Cesium.Color.fromCssColorString(skylineColor.value),
            lineWidth:()=>skylineWidth.value
        }
    })
    viewer.scene.postProcessStages.add(skylineStage!)
}
const stopAnalysis=()=>{
    viewer.scene.postProcessStages.remove(skylineStage!)
}

const drawViewPoint=()=>{
    isDrawViewPoint.value=true
    handler.setInputAction((e:Cesium.ScreenSpaceEventHandler.PositionedEvent)=>{
        let pickPosition=viewer.scene.pickPosition(e.position)
        if(!pickPosition) return
        viewer.entities.remove(viewPoint!)
        viewPoint=viewer.entities.add({
            position:pickPosition,
            point:{
                color:Cesium.Color.YELLOW,
                pixelSize:10,
                disableDepthTestDistance:Number.POSITIVE_INFINITY
            },
            label:{
                text:'观察点',
                font:'20px sans-serif',
                style:Cesium.LabelStyle.FILL_AND_OUTLINE,
                fillColor:Cesium.Color.WHITE,
                outlineColor:Cesium.Color.BLACK,
                outlineWidth:3,
                pixelOffset:new Cesium.Cartesian2(0,-25),
                disableDepthTestDistance:Number.POSITIVE_INFINITY
            }
        })
        isDrawViewPoint.value=false
        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
    },Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

watch(isUseViewPoint,()=>{
    if(!viewPoint){
        ElMessage.warning('未绘制视点')
        isUseViewPoint.value=false
    }
    if(isUseViewPoint.value&&isSkyline.value){//分析时如果开启视点，跳到视点
        setView()
    }
})

onBeforeUnmount(()=>{
    viewer.scene.postProcessStages.remove(skylineStage!)
    skylineStage=undefined
})

</script>

<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>

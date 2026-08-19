<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady"/>
        <DraggableModal title="坡向分析">
            <div class="row">
                <el-button class="draw-button" @click="switchAspectMaterial" :color="isShow?'red':'green'">{{ isShow?'清除':'分析' }}</el-button>
            </div>
            <div class="aspect-legend">
                <div class="legend-title">坡向颜色提示</div>
                <div class="legend-list">
                    <div class="legend-item"><span class="legend-swatch north"></span><span>北</span></div>
                    <div class="legend-item"><span class="legend-swatch east"></span><span>东</span></div>
                    <div class="legend-item"><span class="legend-swatch south"></span><span>南</span></div>
                    <div class="legend-item"><span class="legend-swatch west"></span><span>西</span></div>
                </div>
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
const aspectRamp=[0.0,0.2,0.4,0.6,0.8,0.9,1.0]//坡向梯度
const material=Cesium.Material.fromType('AspectRamp')

//绘制坡向画布
const getAspectRampCanvas=()=>
{
    let canvas=document.createElement('canvas')
    canvas.width=100
    canvas.height=1
    let context=canvas.getContext('2d') as CanvasRenderingContext2D
    let gradient=context.createLinearGradient(0,0,100,0)//(x1,y1,x2,y2)
    gradient.addColorStop(aspectRamp[0],Cesium.Color.RED.toCssColorString())
    gradient.addColorStop(aspectRamp[1],Cesium.Color.YELLOW.toCssColorString())
    gradient.addColorStop(aspectRamp[2],Cesium.Color.YELLOW.toCssColorString())
    gradient.addColorStop(aspectRamp[3],Cesium.Color.GREEN.toCssColorString())
    gradient.addColorStop(aspectRamp[4],Cesium.Color.CYAN.toCssColorString())
    gradient.addColorStop(aspectRamp[5],Cesium.Color.BLUE.toCssColorString())
    gradient.addColorStop(aspectRamp[6],Cesium.Color.PURPLE.toCssColorString())
    context.fillStyle=gradient
    context.fillRect(0,0,100,1)
    return canvas
}

material.uniforms.image=getAspectRampCanvas()

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

const switchAspectMaterial=()=>
{
    if(isShow.value){
        isShow.value=false
        viewer.scene.globe.material=undefined
    }
    else{
        isShow.value=true
        viewer.scene.globe.material=material
        console.log(viewer.scene.globe.material)
    }
}
</script>
<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}

.aspect-legend {
  margin: 4px 0 10px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #d9e2ef;
  border-radius: 6px;
}

.legend-title {
  font-size: 13px;
  font-weight: 600;
  color: #2f3a4a;
  margin-bottom: 8px;
}

.legend-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #445065;
}

.legend-swatch {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  flex: 0 0 auto;
}

.legend-swatch.north { background: #ff0000; }
.legend-swatch.east { background: #ffd400; }
.legend-swatch.south { background: #07a84d; }
.legend-swatch.west { background: #6a00ff; }

.legend-tip {
  margin-top: 6px;
  font-size: 11px;
  color: #6c7788;
}
</style>

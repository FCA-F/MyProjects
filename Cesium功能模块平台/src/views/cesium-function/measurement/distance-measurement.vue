<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady"/>
        <DraggableModal title="距离测量">
            <div class="row">
                <el-button @click="measureDistance" :color="isDraw?'red':'greenyellow'" class="draw-button">绘制</el-button>
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

const isDraw=ref(false);
let viewer:Cesium.Viewer
let handler:Cesium.ScreenSpaceEventHandler

let isMouse=false

const onMapReady=(cesiumViewer:Cesium.Viewer)=>{
    viewer=cesiumViewer
    handler=new Cesium.ScreenSpaceEventHandler(viewer.canvas);

    initCesiumBase(viewer,{
        destination:{lng:117.12043,lat:36.68173,height:2000},
        orientation:{heading:140,pitch:-30,roll:0},
        terrain:true,
        osm:true,
        depthTestAgainstTerrain:true,
    })
}

const measureDistance=()=>
{
    let distancePositions:Cesium.Cartesian3[]=[];
    let distance=0;
    let activePositions:Cesium.Cartesian3[]=[];
    let dynamicShape:Cesium.Entity|undefined;
    let dynamicPositions:Cesium.CallbackProperty|undefined;
    if(!isDraw.value)
    {
        isDraw.value=true;

        //采点
        handler.setInputAction((event:Cesium.ScreenSpaceEventHandler.PositionedEvent)=>{
        let pickPosition=viewer.scene.pickPosition(event.position);
        if(!Cesium.defined(pickPosition))
        return;
        if(!activePositions.length)//第一次
        {
            //距离与标签
            distancePositions.push(pickPosition);
            drawDistanceLable(pickPosition,0);
            //线
            isMouse=true;
            activePositions.push(pickPosition);
            dynamicPositions=new Cesium.CallbackProperty(()=>{return activePositions},false);
            dynamicShape=drawDistanceLine(dynamicPositions);
        }
        else
        {
            distancePositions.push(pickPosition);
            distance=getDistance(distancePositions);
            drawDistanceLable(pickPosition,distance);
            activePositions.push(pickPosition);
        }
        },Cesium.ScreenSpaceEventType.LEFT_CLICK);
        //追踪
        handler.setInputAction((event:Cesium.ScreenSpaceEventHandler.MotionEvent)=>{
            if(!isMouse)
            return;
            let pickPosition=viewer.scene.pickPosition(event.endPosition);
            if(!Cesium.defined(pickPosition))
            return;
            if(activePositions.length>1)
            activePositions.pop();
            activePositions.push(pickPosition);
        },Cesium.ScreenSpaceEventType.MOUSE_MOVE)
        //确认图形，结束
        handler.setInputAction(()=>{
            isDraw.value=false;
            handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
            handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
            activePositions.pop();
            drawDistanceLine(activePositions);
            viewer.entities.remove(dynamicShape!);
            isMouse=false;
            distance=0;
            distancePositions=[];
            activePositions=[];
            dynamicShape=undefined;
        },Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    }
    else
    {
        isDraw.value=false;

        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
        distancePositions=[],distance=0,activePositions=[],dynamicShape=undefined,isMouse=false;
    }
}
    

//计算距离函数
const getDistance=(distancePositions:Cesium.Cartesian3[])=>
{
    let distance=0;
    for(let i=0;i<=distancePositions.length-2;i++)
    {
        distance+=Cesium.Cartesian3.distance(distancePositions[i],distancePositions[i+1]);
    }
    return distance;
}
//画点、标签函数
const drawDistanceLable=(pickPosition:Cesium.Cartesian3,distance:number)=>
{
    viewer.entities.add({
        position:pickPosition,
        point:{
            pixelSize:8,
            color:Cesium.Color.YELLOW,
            disableDepthTestDistance:Number.POSITIVE_INFINITY
        },
        label:{
            text:distance.toFixed(2)+'meter',
            font:'20px',
            showBackground:true,
            horizontalOrigin:Cesium.HorizontalOrigin.LEFT,
            verticalOrigin:Cesium.VerticalOrigin.BOTTOM,
            disableDepthTestDistance:Number.POSITIVE_INFINITY
        }
    })
}
//画线函数
const drawDistanceLine=(positions:Cesium.Cartesian3[]|Cesium.CallbackProperty)=>
{
    let shape=viewer.entities.add({
        polyline:{
            positions:positions,
            material:Cesium.Color.RED,
            width:4,
            depthFailMaterial:Cesium.Color.RED}
    })
    return shape;
}

</script>
<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>
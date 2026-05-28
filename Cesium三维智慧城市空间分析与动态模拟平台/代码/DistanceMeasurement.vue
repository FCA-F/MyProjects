<template>
    <div class="toorbal">
        <div class="row">
            <label class="oneText">距离测量</label>
            <button @click="measureDistance()" :class="['drawBtn',isDraw?'red':'']" >绘制</button>
        </div>
    </div>
</template>
<script setup>
import * as Cesium from 'cesium'
import {ref,onMounted,onUnmounted} from 'vue'

const props=defineProps({viewer:{type:Object,required:true}});
const viewer=props.viewer;

const isDraw=ref(false);
let isMouse=false;
let handler;

onMounted(()=>{
    handler=new Cesium.ScreenSpaceEventHandler(viewer.canvas);
})


const measureDistance=()=>
{
    let distancePositions=[],distance=0,activePositions=[],dynamicShape,dynamicPositions;
    if(!isDraw.value)
    {
        isDraw.value=true;

        //采点
        handler.setInputAction((event)=>{
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
            let dynamicPositions=new Cesium.CallbackProperty(()=>{return activePositions},false);
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
        handler.setInputAction((event)=>{
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
        handler.setInputAction((event)=>{
            activePositions.pop();
            drawDistanceLine(activePositions);
            viewer.entities.remove(dynamicShape);
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
        distancePositions=[],distance=0,activePositions=[],dynamicShape=undefined,dynamicPositions=undefined,isMouse=false;
    }
}
    

//计算距离函数
const getDistance=(distancePositions)=>
{
    let distance=0;
    for(let i=0;i<=distancePositions.length-2;i++)
    {
        distance+=Cesium.Cartesian3.distance(distancePositions[i],distancePositions[i+1]);
    }
    return distance;
}
//画点、标签函数
const drawDistanceLable=(pickPosition,distance)=>
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
const drawDistanceLine=(positions)=>
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

onUnmounted(()=>{
    handler.destroy();
})
</script>
<style scoped>

</style>
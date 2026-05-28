<template>
    <div class="toolbar">
        <div class="row">
            <label class="oneText">淹没分析</label>
            <button @click="drawInundationRegion" :class="['drawBtn',isDraw?'red':'']">绘制</button>
        </div>
        <div class="row">
            <label class="twoText">最大高度</label>
            <input v-model.number="maxInundationHeight" class="input">
        </div>
        <div class="row">
            <label class="twoText">上涨速度</label>
            <input v-model.number="step" class="input">
        </div>
        <div class="row">
            <label class="twoText">水位高度</label>
            <input v-model.number="waterHeight" class="input">
        </div>
        <div class="row">
            <button @click="InundationAnalysis()" :class="['startOrStopBtn',isWater?'red':'']">{{ startOrStopText }}</button>
            <button @click="Zero()" class="AssistiveBtn">水位归零</button>
        </div>   
    </div>
</template>
<script setup>
import * as Cesium from 'cesium'
import {ref,onMounted,onUnmounted} from 'vue'

const props=defineProps({viewer:{type:Object,required:true}})
const viewer=props.viewer

const isDraw=ref(false);//是否绘制
const isWater=ref(false);//是否涨水
const waterHeight=ref(0);//当前水位高度
const step=ref(0.02);//水位上升间隔
const maxInundationHeight=ref(500)//最大淹没高度
const startOrStopText=ref("开始")//按钮文本

let handler;
let dynamicShape=undefined,activePositions=[];//动态临时图形，绘制图形点集
let isMouse=false;//鼠标移动追踪

onMounted(()=>{
    handler=new Cesium.ScreenSpaceEventHandler(viewer.canvas);
})


const drawInundationRegion=()=>
{
    if(!isDraw.value)
    {
        isDraw.value=true;
        //采点(左键)
        handler.setInputAction((event)=>{
            let pickPosition=viewer.scene.pickPosition(event.position);
            if(!Cesium.defined(pickPosition))
            return;
            if(!activePositions.length)
            {
                isMouse=true;
                activePositions.push(pickPosition);
                let dynamicPositions=new Cesium.CallbackProperty(
                    function (){return new Cesium.PolygonHierarchy(activePositions)},false);
                dynamicShape=drawPolygon(dynamicPositions);
            }
            else
            {
                activePositions.push(pickPosition);
            }
        },Cesium.ScreenSpaceEventType.LEFT_CLICK)

        //移动追踪绘制（移动）
        handler.setInputAction((event)=>{
            if(!isMouse)
            return;
            let pickPosition=viewer.scene.pickPosition(event.endPosition);
            if(!Cesium.defined(pickPosition))
            return;
            if(activePositions.length>1)
            activePositions.pop();
            activePositions.push(pickPosition);
        },Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        //确认，终止（右键）
        handler.setInputAction((event)=>{
            activePositions.pop();
            viewer.entities.remove(dynamicShape);
            drawInundationPolygon(activePositions);
            isMouse=false;
            activePositions=[];
            dynamicShape=undefined;
        },Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    }
    else
    {
        isDraw.value=false;

        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
        dynamicShape=undefined,isMouse=false,activePositions=[];
    }
}

//绘制普通静态面
const drawPolygon=(positions)=>
{
    let polygon=viewer.entities.add({
        polygon:{
            hierarchy:positions,
            material:Cesium.Color.RED
        }
    })
    return polygon;
}

//绘制动态水面
const drawInundationPolygon=(positions)=>{
    let polygon=viewer.entities.add({
        polygon:{
            hierarchy:positions,
            height:new Cesium.CallbackProperty(updateHeight,false),
            extrudedHeight:0,
            material:Cesium.Color.BLUE
        }
    })
    return polygon;
}

//开始/终止涨水
const InundationAnalysis=()=>
{
    if(!isWater.value)
    {
        isWater.value=true;
        startOrStopText.value='结束'
    }
    else
    {
        isWater.value=false;
        startOrStopText.value='开始'
    }
}
const Zero=()=>
{
    waterHeight.value=0;
}
//涨水
const updateHeight=()=>
{
    if(isWater.value)
    if(waterHeight.value+step.value<maxInundationHeight.value)
    waterHeight.value=Number((waterHeight.value+step.value).toFixed(5));
    else if(waterHeight.value<maxInundationHeight.value&&waterHeight.value+step.value>maxInundationHeight.value)
    waterHeight.value=Number(maxInundationHeight.value.toFixed(5));
    return waterHeight.value;
}

onUnmounted(()=>{
    handler.destroy();
})
</script>

<style scoped>

</style>
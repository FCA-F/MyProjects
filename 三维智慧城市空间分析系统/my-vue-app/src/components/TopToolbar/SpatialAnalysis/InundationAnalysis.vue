<template>
    <div v-if="isShow"
        ref="modal"
        @mousedown="startMove"
        :style="{left:modal_x+'px',top:modal_y+'px'}"
        class="modal"
    >
        <!-- 标题栏 -->
        <div class="modal-header">
            <span class="title">淹没分析</span>
            <el-button @click="closeModal" circle class="close-modal-btn" color="red" icon="closeBold"></el-button>
        </div>

        <!-- 表单内容区 -->
        <div class="modal-body">
            <div class="row" style="justify-content:center;">
                <el-button @click="drawInundationRegion" :color="isDraw?'red':'greenyellow'" class="drawButton" round>绘制</el-button>
            </div>
            <div class="row">
                <label class="label">最大高度</label>
                <el-input v-model.number="maxInundationHeight" class="input"/>
            </div>
            <div class="row">
                <label class="label">上涨速度</label>
                <el-input v-model.number="step" class="input"/>
            </div>
            <div class="row">
                <label class="label">水位高度</label>
                <el-input v-model.number="waterHeight" class="input"/>
            </div>
            <div class="row">
                <el-button @click="InundationAnalysis()" :color="isWater?'red':'green'" class="button">{{ startOrStopText }}</el-button>
                <el-button @click="Zero()" class="button" color="purple">水位归零</el-button>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import * as Cesium from 'cesium'
import {ref,onMounted,onUnmounted} from 'vue'
import {useCesiumStore} from '../../../stores/cesium.ts'

let viewer:Cesium.Viewer;

const isDraw=ref(false);//是否绘制
const isWater=ref(false);//是否涨水
const waterHeight=ref(0);//当前水位高度
const step=ref(0.02);//水位上升间隔
const maxInundationHeight=ref(500)//最大淹没高度
const startOrStopText=ref("开始")//按钮文本

let handler:Cesium.ScreenSpaceEventHandler;
let activePositions:Cesium.Cartesian3[]=[];//动态临时图形，绘制图形点集
let dynamicPositions:Cesium.CallbackProperty|undefined;
let dynamicShape:Cesium.Entity|undefined;
let isMouse=false;//鼠标移动追踪

onMounted(()=>{
    const cesiumStore=useCesiumStore();
    viewer=cesiumStore.viewer as Cesium.Viewer;
    handler=new Cesium.ScreenSpaceEventHandler(viewer.canvas);
})


const drawInundationRegion=()=>
{
    if(!isDraw.value)
    {
        isDraw.value=true;
        //采点(左键)
        handler.setInputAction((event:Cesium.ScreenSpaceEventHandler.PositionedEvent)=>{
            let pickPosition=viewer.scene.pickPosition(event.position);
            if(!Cesium.defined(pickPosition))
            return;
            if(!activePositions.length)
            {
                isMouse=true;
                activePositions.push(pickPosition);
                dynamicPositions=new Cesium.CallbackProperty(
                    ()=>{return new Cesium.PolygonHierarchy(activePositions)},false);
                dynamicShape=drawPolygon(dynamicPositions);
            }
            else
            {
                activePositions.push(pickPosition);
            }
        },Cesium.ScreenSpaceEventType.LEFT_CLICK)

        //移动追踪绘制（移动）
        handler.setInputAction((event:Cesium.ScreenSpaceEventHandler.MotionEvent)=>{
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
        handler.setInputAction(()=>{
            activePositions.pop();
            viewer.entities.remove(dynamicShape!);
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
const drawPolygon=(positions:Cesium.PolygonHierarchy|Cesium.CallbackProperty)=>
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
const drawInundationPolygon=(positions:Cesium.Cartesian3[])=>{
    let polygon=viewer.entities.add({
        polygon:{
            hierarchy:positions,
            height:new Cesium.CallbackProperty(updateHeight,false),
            extrudedHeight:0,
            material:Cesium.Color.SKYBLUE.withAlpha(0.7)
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

//鼠标移动
const modal=ref();
const isShow=ref(true);
const modal_x=ref(200);
const modal_y=ref(200);

let offsetX:number,offsetY:number;

const startMove=(e:MouseEvent)=>{
    offsetX=e.clientX-modal.value.offsetLeft;
    offsetY=e.clientY-modal.value.offsetTop;
    document.addEventListener('mousemove',beMoving);
    document.addEventListener('mouseup',stopMove)
}

const beMoving=(e:MouseEvent)=>{
    modal_x.value=e.clientX-offsetX;
    modal_y.value=e.clientY-offsetY;
}

const stopMove=()=>{
    document.removeEventListener('mousemove',beMoving);
}

const closeModal=()=>{
    isShow.value=false;
    document.removeEventListener('mousemove',beMoving);
    document.removeEventListener('mouseup',stopMove);
    handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
}

onUnmounted(()=>{
    document.removeEventListener('mousemove',beMoving);
    document.removeEventListener('mouseup',stopMove);
    handler.destroy();
})
</script>

<style scoped>
.modal{position:absolute;width:400px;height:350px;background-color:#ffffff;
    border-radius:12px;z-index:1;overflow: hidden;
}
/* 弹窗标题栏 */
.modal-header {height:50px;background-color:#1E88E5;display:flex;align-items:center;justify-content:center;position:relative;}
.title {font-size:18px;font-weight:bold;color:#fff;}
/* 关闭按钮 */
.close-modal-btn{position:absolute;top:10px;right:15px;}
/*内容区域*/
.modal-body{padding:30px 25px;display:flex;flex-direction:column;gap:20px}
/*表单项行*/
.row{display:flex;align-items:center;gap:15px;justify-content:center}
/*标签文本*/
.label{width:80px;font-size:15px;font-weight:500;color:#333;text-align:left;}
/*输入*/
.input{width:300px;height:32px}
/*按钮*/
.button{width:100px;height:30px}
/*绘制按钮*/
.drawButton{width:150px;height:40px}
</style>
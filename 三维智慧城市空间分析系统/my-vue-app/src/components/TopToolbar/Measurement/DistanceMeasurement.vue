<template>
    <div v-if="isShow"
        ref="modal"
        @mousedown="startMove"
        :style="{left:modal_x+'px',top:modal_y+'px'}"
        class="modal"
    >
        <!-- 标题栏 -->
        <div class="modal-header">
            <span class="title">距离测量</span>
            <el-button @click="closeModal" circle class="close-modal-btn" color="red" icon="closeBold"></el-button>
        </div>

        <!-- 表单内容区 -->
        <div class="modal-body">
            <div class="row" style="justify-content:center">
                <el-button @click="measureDistance()" :color="isDraw?'red':'greenyellow'" class="drawButton" >绘制</el-button>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import * as Cesium from 'cesium'
import {ref,onMounted,onUnmounted} from 'vue'
import {useCesiumStore} from '../../../stores/cesium.ts'

const cesiumStore=useCesiumStore();
const viewer=cesiumStore.viewer as Cesium.Viewer;

const isDraw=ref(false);
let isMouse=false;
let handler:Cesium.ScreenSpaceEventHandler;

onMounted(()=>{
    handler=new Cesium.ScreenSpaceEventHandler(viewer.canvas);
})


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
    handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    document.removeEventListener('mousemove',beMoving);
    document.removeEventListener('mouseup',stopMove);
}

onUnmounted(()=>{
    document.removeEventListener('mousemove',beMoving);
    document.removeEventListener('mouseup',stopMove);
    handler.destroy();
})

</script>
<style scoped>
.modal{position:absolute;width:400px;height:150px;background-color:#ffffff;
    border-radius:12px;z-index:1;overflow:hidden;
}
/* 弹窗标题栏 */
.modal-header {height:50px;background-color:#1E88E5;display:flex;align-items:center;justify-content:center;position:relative;}
/*标题*/
.title {font-size:18px;font-weight:bold;color:#fff;}
/* 关闭按钮 */
.close-modal-btn{position:absolute;top:10px;right:15px;}
/* 内容区域 */
.modal-body{padding:30px 25px;display:flex;flex-direction:column;gap:20px}
/* 表单项行 */
.row{display:flex;align-items:center;gap:15px;}
/*标签*/
.label{width:80px;font-size:15px;font-weight:500;color:#333;text-align:left;}
/*按钮*/
.drawButton{width:150px;height:40px}
</style>
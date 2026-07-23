<template>
    <div v-if="isShow"
        ref="modal"
        @mousedown="startMove"
        :style="{left:modal_x+'px',top:modal_y+'px'}"
        class="modal"
    >
        <!-- 标题栏 -->
        <div class="modal-header">
            <span class="title">遮罩</span>
            <el-button @click="closeModal" circle class="close-modal-btn" color="red" icon="closeBold"></el-button>
        </div>

        <!-- 表单内容区 -->
        <div class="modal-body">
            <div class="row">
                <el-button @click="isDraw=!isDraw" :color="isDraw?'red':'green'">绘制</el-button>
            </div>
            <div class="row">
                <el-button @click="addMask" :color="'blue'">遮罩</el-button>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import * as Cesium from 'cesium'
import {ref,onMounted,onUnmounted,watch} from 'vue'
import {useCesiumStore} from '../../../stores/cesium.ts'

let viewer:Cesium.Viewer;
let handler:Cesium.ScreenSpaceEventHandler;

const isDraw=ref(false)

let positionsArray:Cesium.Cartesian3[][]=[]
let entityArray:Cesium.Entity[]=[]

let activePositions:Cesium.Cartesian3[]=[];
let floatingPosition:Cesium.Cartesian3|undefined;
let dynamicPositions:Cesium.CallbackProperty|undefined;
let dynamicShape:Cesium.Entity|undefined;

onMounted(()=>{
    const cesiumStore=useCesiumStore();
    viewer=cesiumStore.viewer as Cesium.Viewer;
    handler=new Cesium.ScreenSpaceEventHandler(viewer.canvas);
})

let isMouseMove=false
watch(isDraw,(isDraw)=>{
    if(isDraw){
        handler.setInputAction((e:Cesium.ScreenSpaceEventHandler.PositionedEvent)=>{
            let pickPosition=viewer.scene.pickPosition(e.position)
            if(!Cesium.defined(pickPosition)) return
            if(activePositions.length==0)
            {
                isMouseMove=true;
                dynamicPositions=new Cesium.CallbackProperty(()=>{
                    const positions=floatingPosition?[...activePositions,floatingPosition]:activePositions
                    return new Cesium.PolygonHierarchy(positions)
                },false)
                dynamicShape=addPolygon(dynamicPositions)
            }
            activePositions.push(pickPosition)
        },Cesium.ScreenSpaceEventType.LEFT_CLICK)

        handler.setInputAction((e:Cesium.ScreenSpaceEventHandler.MotionEvent)=>{
            if(!isMouseMove) return
            let pickPosition=viewer.scene.pickPosition(e.endPosition)
            if(!Cesium.defined(pickPosition)) return
            floatingPosition=pickPosition
        },Cesium.ScreenSpaceEventType.MOUSE_MOVE)

        handler.setInputAction(()=>{
            if(activePositions.length>2){
                let polygon=addPolygon(new Cesium.PolygonHierarchy(activePositions))
                positionsArray.push(activePositions)
                entityArray.push(polygon)
            }
            isMouseMove=false
            if(dynamicShape){
                viewer.entities.remove(dynamicShape)
            }
            activePositions=[]
            floatingPosition=undefined
            dynamicPositions=undefined
            dynamicShape=undefined
        },Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    }
    else{
        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
        handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE)
        handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK)
        isMouseMove=false
        if(dynamicShape){
            viewer.entities.remove(dynamicShape)
        }
        activePositions=[]
        floatingPosition=undefined
        dynamicPositions=undefined
        dynamicShape=undefined
    }
})

const addPolygon=(positions:Cesium.CallbackProperty|Cesium.PolygonHierarchy)=>{
    let polygon=viewer.entities.add({
        polygon:{
            hierarchy:positions,
            material:Cesium.Color.RED.withAlpha(0.5)
        }
    })
    return polygon
}

const addMask=()=>{
    if(positionsArray.length==0) return
    let holes=positionsArray.map(positions=>new Cesium.PolygonHierarchy(positions))
    let outerPositions=Cesium.Cartesian3.fromDegreesArray([80,10, 140,10, 140,60, 80,60, 80,10])
    let mask=viewer.entities.add({
        polygon:{
            hierarchy:new Cesium.PolygonHierarchy(outerPositions,holes),
            material:Cesium.Color.BLACK.withAlpha(0.7),
        }
    })

    entityArray.map(entity=>{
        viewer.entities.remove(entity)
    })
    positionsArray=[]
    entityArray=[]

    return mask
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
    handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
    handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    viewer.scene.globe.enableLighting=false;
    viewer.shadows=false;
    viewer.clock.shouldAnimate=false;
    document.removeEventListener('mousemove',beMoving);
    document.removeEventListener('mouseup',stopMove);
}

onUnmounted(()=>{
    handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
    handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    viewer.scene.globe.enableLighting=false;
    viewer.shadows=false;
    viewer.clock.shouldAnimate=false;
    document.removeEventListener('mousemove',beMoving);
    document.removeEventListener('mouseup',stopMove);
})
</script>
<style scoped>
.modal{position:absolute;width:400px;height:350px;background-color:#ffffff;
        border-radius:12px;z-index:1;overflow:hidden;
}
/* 弹窗标题栏 */
.modal-header {height:50px;background-color:#1E88E5;display:flex;align-items:center;justify-content:center;position:relative;}
.title {font-size:18px;font-weight:bold;color:#fff;}
/* 关闭按钮 */
.close-modal-btn{position:absolute;top:10px;right:15px;}
/* 内容区域 */
.modal-body{padding:30px 25px;display:flex;flex-direction:column;gap:20px}
/* 表单项行 */
.row{display:flex;align-items:center;gap:15px;justify-content:center}
/*标签*/
.label{width:80px;font-size:15px;font-weight:500;color:#333;text-align:left;}
/*输入*/
.input{width:300px;height:32px}
/*日期*/
:deep(.el-date-editor){width: 300px!important;height:32px!important;}
/*按钮*/
.button{width:100px;height:30px}
</style>

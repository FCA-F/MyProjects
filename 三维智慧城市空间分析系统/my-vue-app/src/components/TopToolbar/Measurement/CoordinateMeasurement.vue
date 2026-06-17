<template>
    <div v-if="isShow"
        ref="modal"
        @mousedown="startMove"
        :style="{left:modal_x+'px',top:modal_y+'px'}"
        class="modal"
    >
        <!-- 标题栏 -->
        <div class="modal-header">
            <span class="title">坐标测量</span>
            <el-button @click="closeModal" circle class="close-modal-btn" color="red" icon="closeBold"></el-button>
        </div>

        <!-- 表单内容区 -->
        <div class="modal-body">
            <div class="row">
                <el-button @click="measureCoordinate" :color="isDraw?'red':'greenyellow'" class="drawButton">绘制</el-button>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import * as Cesium from 'cesium'
import {ref,onMounted,onUnmounted} from 'vue'
import {useCesiumStore} from '../../../stores/cesium.ts'

let viewer:Cesium.Viewer;
let annotations:Cesium.LabelCollection;

const isDraw=ref(false);
let handler:Cesium.ScreenSpaceEventHandler;

onMounted(()=>{
    const cesiumStore=useCesiumStore();
    viewer=cesiumStore.viewer as Cesium.Viewer;
    annotations=cesiumStore.annotations as Cesium.LabelCollection;
    handler=new Cesium.ScreenSpaceEventHandler(viewer.canvas);
})

const measureCoordinate=()=>
{
    if(!isDraw.value)
    {
        isDraw.value=true;

        //采点
        handler.setInputAction((event:Cesium.ScreenSpaceEventHandler.PositionedEvent)=>{
            let pickPosition=viewer.scene.pickPosition(event.position);
            if(!pickPosition)
            return;
            createLabel(pickPosition);
        },Cesium.ScreenSpaceEventType.LEFT_CLICK);
        //删点
        handler.setInputAction(()=>{
            viewer.entities.removeAll();
            annotations.removeAll();
        },Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    }
    else
    {
        isDraw.value=false;
        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    }
}


//绘制点与标签
const createLabel=(cartesian:Cesium.Cartesian3)=>
{
    let cartographic=Cesium.Cartographic.fromCartesian(cartesian);
    let lon=Cesium.Math.toDegrees(cartographic.longitude);
    let lat=Cesium.Math.toDegrees(cartographic.latitude);
    let height=cartographic.height;
    //添加点
    viewer.entities.add({
        position:cartesian,
        point:{
            pixelSize:8,
            color:Cesium.Color.RED,
            outlineColor:Cesium.Color.YELLOW,
            outlineWidth:2,
            disableDepthTestDistance:1000
        }
    })
    //添加标签
    annotations.add({
        position:cartesian,
        text:'Lon: '+lon.toFixed(10)+'\u00B0\n'+
                'Lat: '+lat.toFixed(10)+'\u00B0\n'+
                'Height: '+height.toFixed(10)+'\u00B0'+'m',
        showBackground:true,
        font:'15px',
        horizontalOrigin:Cesium.HorizontalOrigin.LEFT,
        verticalOrigin:Cesium.VerticalOrigin.BOTTOM,
        disableDepthTestDistance:1000
    })
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
.modal-header{height:50px;background-color:#1E88E5;display:flex;align-items:center;justify-content:center;position:relative;}
/*标题*/
.title {font-size:18px;font-weight:bold;color:#fff;}
/* 关闭按钮 */
.close-modal-btn{position:absolute;top:10px;right:15px;}
/* 内容区域 */
.modal-body{padding:30px 25px;display:flex;flex-direction:column;gap:20px}
/* 表单项行 */
.row{display:flex;align-items:center;justify-content:center;gap:15px;}
/*标签*/
.label{width:80px;font-size:15px;font-weight:500;color:#333;text-align:left;}
/*按钮*/
.drawButton{width:150px;height:40px}
</style>
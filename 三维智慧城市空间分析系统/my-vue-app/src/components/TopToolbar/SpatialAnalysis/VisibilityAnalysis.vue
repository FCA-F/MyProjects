<template>
     <div v-if="isShow"
        ref="modal"
        @mousedown="startMove"
        :style="{left:modal_x+'px',top:modal_y+'px'}"
        class="modal"
    >
        <!-- 标题栏 -->
        <div class="modal-header">
            <span class="title">通视分析</span>
            <el-button @click="closeModal" circle class="close-modal-btn" color="red" icon="closeBold"></el-button>
        </div>

        <!-- 表单内容区 -->
        <div class="modal-body">
            <div class="row" style="justify-content:center;">
                <el-button @click="drawPolyline" :color="isDraw?'red':'greenyellow'" class="drawButton" round>绘制</el-button>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import * as Cesium from 'cesium'
import {ref,onMounted,onUnmounted} from 'vue'
import {useCesiumStore} from '../../../stores/cesium.ts'

let viewer:Cesium.Viewer;
const isDraw=ref(false);
let positions:Cesium.Cartesian3[]=[];
let handler:Cesium.ScreenSpaceEventHandler;

onMounted(()=>{
    const cesiumStore=useCesiumStore();
    viewer=cesiumStore.viewer as Cesium.Viewer;
    handler=new Cesium.ScreenSpaceEventHandler(viewer.canvas);
})

const drawPolyline=()=>
{
    if(!isDraw.value)
    {
        isDraw.value=true;

        handler.setInputAction((event:Cesium.ScreenSpaceEventHandler.PositionedEvent)=>{
            let pickPosition=viewer.scene.pickPosition(event.position);
            if(!Cesium.defined(pickPosition))
            return;
            drawPoint(pickPosition);
            if(positions.length==0)
            {
                positions.push(pickPosition);
            }
            else if(positions.length==1)
            {
                positions.push(pickPosition);
                selectPolyine(positions);
                positions=[];
            }
        },Cesium.ScreenSpaceEventType.LEFT_CLICK);
    }
    else
    {
        isDraw.value=false;

        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    }
}

const selectPolyine=(positions:Cesium.Cartesian3[])=>
{
    let subtract=Cesium.Cartesian3.subtract(positions[1],positions[0],new Cesium.Cartesian3());
    let direction=Cesium.Cartesian3.normalize(subtract,new Cesium.Cartesian3());
    let ray=new Cesium.Ray(positions[0],direction);
    let pickObject=(viewer.scene as any).pickFromRay(ray,[]);
    let middlePoint;
    if(Cesium.defined(pickObject))
    middlePoint=pickObject.position;
    if(middlePoint==undefined||
        Cesium.Cartesian3.distance(positions[0],middlePoint)>Cesium.Cartesian3.distance(positions[0],positions[1])
    )
    {
        addPolyline(positions[0],positions[1],'GREEN');
    }
    else
    {
        addPolyline(positions[0],middlePoint,'GREEN');
        addPolyline(middlePoint,positions[1],'RED');
    }
}

const addPolyline=(point1:Cesium.Cartesian3,point2:Cesium.Cartesian3,color:keyof typeof Cesium.Color)=>//keyof:取所有键,typeof:取类型
{
    let positions=[point1,point2];
    viewer.entities.add({
        polyline:{
            positions:positions,
            material:Cesium.Color[color] as Cesium.Color,
            width:6,
            depthFailMaterial:Cesium.Color[color] as Cesium.Color
        }
    })
}

const drawPoint=(position:Cesium.Cartesian3)=>
{
    viewer.entities.add({
        position:position,
        point:{
            pixelSize:8,
            color:Cesium.Color.YELLOW,
            disableDepthTestDistance:Number.POSITIVE_INFINITY
        }
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
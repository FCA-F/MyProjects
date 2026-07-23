<template>
    <div v-if="isShow"
        ref="modal"
        @mousedown="startMove"
        :style="{left:modal_x+'px',top:modal_y+'px'}"
        class="modal"
    >
        <!-- 标题栏 -->
        <div class="modal-header">
            <span class="title">缓冲区分析</span>
            <el-button @click="closeModal" circle class="close-modal-btn" color="red" icon="closeBold"></el-button>
        </div>

        <!-- 表单内容区 -->
        <div class="modal-body">
            <div class="row">
                <label class="label">范围</label>
                <el-input v-model.number="bufferSize" class="input"/>
            </div>
            <div class="row">
                <label class="label">类型</label>
                <el-select v-model="bufferType" :class="['input',bufferType?'red':'']" placeholder="请选择类型">
                    <el-option v-for="item in options" :key="item.value" :label="item.label" :value="item.value"/>
                </el-select>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import * as Cesium from 'cesium'
import * as turf from '@turf/turf';
import {ref,onMounted,onUnmounted,watch} from 'vue'
import {useCesiumStore} from '@/stores/cesium'

let viewer:Cesium.Viewer;

const bufferType=ref('');
const options=[
    {value:'null',label:''},
    {value:'point',label:'点'},
    {value:'polyline',label:'线'},
    {value:'polygon',label:'面'}
]
const bufferSize=ref(60);

let isMouse=false
let activePositions:Cesium.Cartesian3[]=[];
let dynamicPositions:Cesium.CallbackProperty|undefined;
let dynamicShape:Cesium.Entity|undefined;
let handler:Cesium.ScreenSpaceEventHandler;

onMounted(()=>{
    const cesiumStore=useCesiumStore();
    viewer=cesiumStore.viewer as Cesium.Viewer;
    handler=new Cesium.ScreenSpaceEventHandler(viewer.canvas);
})

watch(bufferType,()=>{
    try{
        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    }catch(e){};
    drawBuffer();
})

const drawBuffer=()=>
{
    if(bufferType.value=='')
    return;
    handler.setInputAction((event:Cesium.ScreenSpaceEventHandler.PositionedEvent)=>{
        let pickPosition=viewer.scene.pickPosition(event.position);
        if(!Cesium.defined(pickPosition))
        return;
        if(bufferType.value=='point')
        {
            addShape(pickPosition);
            addBuffer([pickPosition]);
            return;
        }
        if(activePositions.length==0)//开始
        {
            isMouse=true;
            activePositions.push(pickPosition);
            dynamicPositions=new Cesium.CallbackProperty(()=>{
                if(bufferType.value=='polygon'){return new Cesium.PolygonHierarchy(activePositions)}
                else{return activePositions};
            },false);
            dynamicShape=addShape(dynamicPositions);
        }
        else
        {
            activePositions.push(pickPosition);
        }
    },Cesium.ScreenSpaceEventType.LEFT_CLICK);

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

    handler.setInputAction(()=>{
        activePositions.pop();
        viewer.entities.remove(dynamicShape!);
        if(activePositions.length)
        {
            if(bufferType.value=='polygon')
            addShape(new Cesium.PolygonHierarchy(activePositions));
            else
            addShape(activePositions);
        }
        if(activePositions.length)
        addBuffer(activePositions);
        isMouse=false;
        dynamicPositions=undefined;
        dynamicShape=undefined;
        activePositions=[];
    },Cesium.ScreenSpaceEventType.RIGHT_CLICK)
}

const addShape=(positions:Cesium.Cartesian3|Cesium.Cartesian3[]|Cesium.PolygonHierarchy|Cesium.CallbackProperty|undefined)=>
{
    let shape;
    if(!positions)
    return;
    if(bufferType.value=='point')
    {
        shape=viewer.entities.add({
            position:positions as Cesium.Cartesian3,
            point:{
                pixelSize:5,
                color:Cesium.Color.RED
            }
        })
    }
    else if(bufferType.value=='polyline')
    {
        shape=viewer.entities.add({
            polyline:{
            positions:positions as Cesium.Cartesian3[],
            material:Cesium.Color.RED,
            width:5,
            clampToGround:true,
            zIndex:1
            }
        })
    }
    else if(bufferType.value=='polygon')
    {
        shape=viewer.entities.add({
            polygon:{
                hierarchy:positions as Cesium.PolygonHierarchy,
                material:Cesium.Color.RED,
                zIndex:1
            }
        })
    }
    return shape;
}

const addBuffer=(cartesianArray:Cesium.Cartesian3[])=>
{
    if(cartesianArray.length==0)
    return;
    let cartographicArray=cartesianArray.map(cartesian=>Cesium.Cartographic.fromCartesian(cartesian));
    let degreeArray=cartographicArray.map((cartographic)=>{
        let lon=Cesium.Math.toDegrees(cartographic.longitude);
        let lat=Cesium.Math.toDegrees(cartographic.latitude);
        return [lon,lat];
    })

    let bufferShape;
    if(bufferType.value=='point')
    bufferShape=turf.point(degreeArray[0]);
    else if(bufferType.value=='polyline'&&cartesianArray.length>=2)
    bufferShape=turf.lineString(degreeArray);
    else if(bufferType.value=='polygon'&&cartesianArray.length>=3)
    {
        degreeArray.push(degreeArray[0]);
        bufferShape=turf.polygon([degreeArray]);
    }
    if(bufferShape==undefined)
    return;

    let buffer=turf.buffer(bufferShape,bufferSize.value,{units:'meters'});

    let bufferDegreeArray=buffer!.geometry.coordinates[0] as number[][];
    let bufferCartesianArray=bufferDegreeArray.map(degree=>Cesium.Cartesian3.fromDegrees(degree[0],degree[1]));
    let hierarchy=new Cesium.PolygonHierarchy(bufferCartesianArray);

    viewer.entities.add({
        polygon:{
            hierarchy:hierarchy,
            material:Cesium.Color.YELLOW.withAlpha(0.5),
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
/*弹窗*/
.modal{position:absolute;width:400px;height:200px;background-color:#ffffff;
    border-radius:12px;z-index:1;overflow:hidden;
}
/*标题栏*/
.modal-header {height:50px;background-color:#1E88E5;display:flex;align-items:center;justify-content:center;position:relative;}
/*标题*/
.title {font-size:18px;font-weight:bold;color:#fff;}
/*关闭按钮*/
.close-modal-btn{position:absolute;top:10px;right:15px;}
/*内容区域*/
.modal-body{padding:30px 25px;display:flex;flex-direction:column;gap:20px}
/*表单项行*/
.row{display:flex;align-items:center;gap:15px;justify-content:center}
/*标签*/
.label{width:60px;font-size:15px;font-weight:500;color:#333;text-align:left;}
/*输入*/
.input{width:300px;height:32px}
/*按钮*/
.button{width:100px;height:30px}
</style>
    

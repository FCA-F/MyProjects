<template>
    <div class="toolbar">
        <label class="oneText">缓冲区分析</label>
        <div class="row">
            <label class="twoText">范围</label>
            <input v-model.number="bufferSize" class="input">
        </div>
        <div class="row">
            <label class="twoText">类型</label>
            <select v-model="bufferType" :class="['select input',bufferType?'red':'']">
                <option value=""></option>
                <option value="point">点</option>
                <option value="polyline">线</option>
                <option value="polygon">面</option>
            </select>
        </div>
    </div>
</template>
<script setup lang="ts">
import * as Cesium from 'cesium'
import * as turf from '@turf/turf';
import {ref,onMounted,onUnmounted,watch} from 'vue'

const {viewer}=defineProps<{viewer:Cesium.Viewer}>();

const bufferType=ref('');
const bufferSize=ref(60);

let isMouse=false
let activePositions:Cesium.Cartesian3[]=[];
let dynamicPositions:Cesium.CallbackProperty|undefined;
let dynamicShape:Cesium.Entity|undefined;
let handler:Cesium.ScreenSpaceEventHandler;

onMounted(()=>{
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
    let degreeArray=cartographicArray.map(function (cartographic){
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

onUnmounted(()=>{
    handler.destroy();
})

</script>
<style scoped>
    .select{width:170px}
</style>
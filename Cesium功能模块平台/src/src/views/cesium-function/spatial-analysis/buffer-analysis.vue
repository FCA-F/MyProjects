<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady"/>
        <DraggableModal title="缓冲区分析">
            <div class="row">
                <label class="label">范围</label>
                <el-input v-model.number="bufferSize" class="input"/>
            </div>
            <div class="row">
                <label class="label">类型</label>
                <el-select v-model="bufferType" class="input" placeholder="请选择类型">
                    <el-option v-for="item in options" :key="item.value" :label="item.label" :value="item.value"/>
                </el-select>
            </div>
        </DraggableModal>
    </div>
</template>
<script setup lang="ts">
import * as Cesium from 'cesium'
import * as turf from '@turf/turf';
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import {initCesiumBase} from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

let viewer:Cesium.Viewer
let handler:Cesium.ScreenSpaceEventHandler

const onMapReady=(cesiumViewer:Cesium.Viewer)=>{
    viewer=cesiumViewer
    handler=new Cesium.ScreenSpaceEventHandler(viewer.canvas)

    initCesiumBase(viewer,{
        destination:{lng:117.12043,lat:36.68173,height:2000},
        orientation:{heading:140,pitch:-30,roll:0},
        terrain:true,
        requestVertexNormals:true,
        depthTestAgainstTerrain:true,
    })
}

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
                material:Cesium.Color.RED.withAlpha(0.7),
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
</script>
<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>

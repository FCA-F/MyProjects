<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady"/>
        <DraggableModal title="通视分析">
            <div class="row" style="justify-content:center;">
                <el-button @click="drawPolyline" :color="isDraw?'red':'greenyellow'" class="draw-button">绘制</el-button>
            </div>
        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import {initCesiumBase} from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

let viewer:Cesium.Viewer
let handler:Cesium.ScreenSpaceEventHandler;

const isDraw=ref(false);
let positions:Cesium.Cartesian3[]=[];


const onMapReady=(cesiumViewer:Cesium.Viewer)=>{
    viewer=cesiumViewer
    handler=new Cesium.ScreenSpaceEventHandler(viewer.canvas)
    initCesiumBase(viewer,{
        destination:{lng: 114.407404963,lat: 30.5072124340,height:1000},
        orientation:{heading:140,pitch:-30,roll:0},
        terrain:true,
        osm:true,
        depthTestAgainstTerrain:true,
    })
}

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
</script>
<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>
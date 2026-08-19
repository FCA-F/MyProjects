<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady"/>
        <DraggableModal title="坐标测量">
            <div class="row">
                <el-button @click="measureCoordinate" :color="isDraw?'red':'greenyellow'" class="draw-button">绘制</el-button>
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

const isDraw=ref(false);
let viewer:Cesium.Viewer
let handler:Cesium.ScreenSpaceEventHandler

const onMapReady=(cesiumViewer:Cesium.Viewer)=>{
    viewer=cesiumViewer
    handler=new Cesium.ScreenSpaceEventHandler(viewer.canvas);

    initCesiumBase(viewer,{
        destination:{lng: 114.40740,lat: 30.50721,height:1000},
        orientation:{heading:185,pitch:-30,roll:0},
        terrain:true,
        osm:true,
        depthTestAgainstTerrain:true,
    })
}

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
        },
        label:{
            text:'Lon: '+lon.toFixed(10)+'\u00B0\n'+
                    'Lat: '+lat.toFixed(10)+'\u00B0\n'+
                    'Height: '+height.toFixed(10)+'\u00B0'+'m',
            showBackground:true,
            font:'15px',
            horizontalOrigin:Cesium.HorizontalOrigin.LEFT,
            verticalOrigin:Cesium.VerticalOrigin.BOTTOM,
            disableDepthTestDistance:1000
        }
    })
    console.log('lon: '+lon+'\nlat: '+lat+'\nheight:'+height)
}

onUnmounted(()=>{
    handler.destroy();
})

</script>
<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>
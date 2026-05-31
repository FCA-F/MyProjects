<template>
    <div class="toorbal">
        <div class="row">
            <label class="oneText">坐标测量</label>
            <button @click="measureCoordinate()" :class="['drawBtn',isDraw?'red':'']" >绘制</button>
        </div>
    </div>
</template>
<script setup lang="ts">
import * as Cesium from 'cesium'
import {ref,onMounted,onUnmounted} from 'vue'
//viewer,标签集
const {viewer,annotations}=defineProps<{viewer:Cesium.Viewer,annotations:Cesium.LabelCollection}>();

const isDraw=ref(false);
let handler:Cesium.ScreenSpaceEventHandler;


onMounted(()=>{
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

onUnmounted(()=>{
    handler.destroy();
})

</script>
<style scoped>
</style>
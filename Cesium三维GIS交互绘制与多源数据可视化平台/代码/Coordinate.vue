<template>
    <div class="displayCoordinate">
        <input type="text" v-model="coordinate">
    </div>
</template>

<script setup>
import * as Cesium from 'cesium';
import {onMounted,ref} from 'vue';

const props=defineProps({
    viewer:{type:Object,required:true}
})

let viewer=props.viewer;
const coordinate=ref(null);
let handler;

onMounted(()=>
{
    handler=new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    handler.setInputAction((event)=>
    {
        let position=viewer.scene.pickPosition(event.endPosition);
        if(!Cesium.defined(position))
        {
            coordinate.value='---';
            return;
        }
        let cartographic=Cesium.Cartographic.fromCartesian(position);
        let lon=Cesium.Math.toDegrees(cartographic.longitude);
        let lat=Cesium.Math.toDegrees(cartographic.latitude);
        let height=cartographic.height;
        coordinate.value=`${lon.toFixed(3)}  ,${lat.toFixed(3)},  ${height.toFixed(3)}`;
    },Cesium.ScreenSpaceEventType.MOUSE_MOVE)
});
</script>

<style scoped>
    .displayCoordinate{position:absolute;top:10px;left:750px}
</style>
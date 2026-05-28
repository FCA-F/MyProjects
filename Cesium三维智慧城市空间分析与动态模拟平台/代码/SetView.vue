<template>
    <div class="toolbar">
        <button @click="setView()" class="functionBtn">定位</button>
    </div>
</template>
<script setup>
import * as Cesium from 'cesium'

const props=defineProps({viewer:{type:Object,required:true}});
const viewer=props.viewer;

const setView=()=>
{
    viewer.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(114.39564,30.52214,2000)});
}

</script>
<style scoped>

</style>
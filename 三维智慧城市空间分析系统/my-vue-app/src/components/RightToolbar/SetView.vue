<template>
    <div class="toolbar">
        <el-button @click="setView()" type="primary" class="functionBtn">定位</el-button>
    </div>
</template>
<script setup lang="ts">
import * as Cesium from 'cesium'
import {useCesiumStore} from '../../stores/cesium.ts'

const cesiumStore=useCesiumStore();
const viewer=cesiumStore.viewer as Cesium.Viewer;

const setView=()=>
{
    viewer.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(114.39564,30.52214,2000)});
}

</script>
<style scoped>

</style>
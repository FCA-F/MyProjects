<template>
    <div class="toolbar">
        <el-button 
      type="danger" 
      @click="removeEntities()" 
      icon="Delete"
      class="functionBtn"
    >
      清空
    </el-button>
    </div>
</template>
<script setup lang="ts">
import * as Cesium from 'cesium'
import {useCesiumStore} from '@/stores/cesium.ts'

const cesiumStore=useCesiumStore();
const viewer=cesiumStore.viewer as Cesium.Viewer;
const annotations=cesiumStore.annotations as Cesium.LabelCollection;

const removeEntities=()=>
{
    viewer.entities.removeAll();
    annotations.removeAll();
}

</script>
<style scoped>
    .functionBtn{width:70px;}
</style>
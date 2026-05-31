<template>
    <div class="toolbar">
        <button @click="removeEntities()" class="functionBtn red">移除</button>
    </div>
</template>
<script setup lang="ts">
import * as Cesium from 'cesium'

const {viewer,annotations}=defineProps<{viewer:Cesium.Viewer,annotations:Cesium.LabelCollection}>();

const removeEntities=()=>
{
    viewer.entities.removeAll();
    annotations.removeAll();
}

</script>
<style scoped>
    
</style>
<template>
    <div class="toolbar">
        <button @click="removeEntities()" class="functionBtn red">移除</button>
    </div>
</template>
<script setup>
import * as Cesium from 'cesium'

const props=defineProps({viewer:{type:Object,required:true},annotations:{type:Object,required:true}});
const viewer=props.viewer;
const annotations=props.annotations;

const removeEntities=()=>
{
    viewer.entities.removeAll();
    annotations.removeAll();
}

</script>
<style scoped>
    
</style>
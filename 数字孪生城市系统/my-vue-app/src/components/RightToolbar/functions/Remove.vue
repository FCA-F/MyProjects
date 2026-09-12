<template>
    <div class="toolbar">
        <el-button @click="isRemove=!isRemove" :color="isRemove?'red':'green'" class="functionBtn">移除</el-button>
    </div>
</template>
<script setup lang="ts">
import * as Cesium from 'cesium'
import {onMounted,ref,watch} from 'vue'
import {useCesiumStore} from '@/stores/cesium'

const cesiumStore=useCesiumStore();
let viewer:Cesium.Viewer;
let handler:Cesium.ScreenSpaceEventHandler;
let annotations:Cesium.LabelCollection;

const isRemove=ref(false)

onMounted(()=>{
    viewer=cesiumStore.viewer as Cesium.Viewer
    handler=new Cesium.ScreenSpaceEventHandler(viewer.canvas)
    annotations=cesiumStore.annotations as Cesium.LabelCollection
})

watch(isRemove,(isRemove)=>{
    if(isRemove){
        handler.setInputAction((e:Cesium.ScreenSpaceEventHandler.PositionedEvent)=>{
            let obj=viewer.scene.pick(e.position)
            if(Cesium.defined(obj)){
                if(obj.id instanceof Cesium.Entity){
                    viewer.entities.remove(obj.id)
                }
                else if(obj.id instanceof Cesium.LabelCollection){
                    viewer.scene.primitives.remove(obj.primitives)
                }
                annotations.remove(obj.id)
            }            
        },Cesium.ScreenSpaceEventType.LEFT_CLICK)
    }
})

</script>
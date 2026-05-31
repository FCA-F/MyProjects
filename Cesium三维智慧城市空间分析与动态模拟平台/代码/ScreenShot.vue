<template>
    <div class="toolbar">
        <button @click="savePicture()" class="functionBtn">截图</button>
    </div>
</template>
<script setup lang="ts">
import * as Cesium from 'cesium'

const {viewer}=defineProps<{viewer:Cesium.Viewer}>();

const savePicture=()=>
{

        let saveLink=document.createElement('a');//创建链接
        saveLink.href=viewer.scene.canvas.toDataURL('image/png');//下载地址
        saveLink.download='截图';//截图的名字
        document.body.appendChild(saveLink);
        saveLink.click();
        document.body.removeChild(saveLink);

    
}

</script>
<style scoped>

</style>
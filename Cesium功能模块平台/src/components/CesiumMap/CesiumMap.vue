<template>
    <div ref="cesiumContainer" class="map"></div>
</template>
<script setup lang="ts">
import * as Cesium from 'cesium'
import { ref, onMounted, onBeforeUnmount } from 'vue'

//请输入您的密钥
Cesium.Ion.defaultAccessToken = '请输入您的密钥'

let viewer: Cesium.Viewer | null

const cesiumContainer = ref<HTMLDivElement | null>(null)

const emit = defineEmits<{
    (e: 'ready', viewer: Cesium.Viewer): void
}>()

onMounted(() => {
    if (!cesiumContainer.value) {
        console.log('Cesium容器加载失败')
        return
    }

    //创建viewer
    viewer = new Cesium.Viewer(cesiumContainer.value, {
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        baseLayerPicker: false,
        navigationHelpButton: false,
        animation: false,
        timeline: false,
        fullscreenButton: false,
    });

    (viewer.cesiumWidget.creditContainer as any).style.display = "none";//关掉cesium标识

    console.log('viewer加载完成')

    emit('ready', viewer)
}
)
onBeforeUnmount(() => {
    if (viewer) {
        viewer.destroy()
        viewer = null
    }
})
</script>
<style scoped>
.map {
    height: 100%;
    width: 100%
}
</style>
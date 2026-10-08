<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import { initCesiumBase } from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

let viewer: Cesium.Viewer
let glb: Cesium.Entity

const onMapReady = (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer

    initCesiumBase(viewer, {
        destination: { lng: 114.40740, lat: 30.50721, height: 1000 },
        orientation: { heading: 185, pitch: -30, roll: 0 },
        terrain: true,
        osm: true,
        depthTestAgainstTerrain: true,
    })

    loadGLB()
    viewer.zoomTo(glb)
}

const loadGLB = () => {
    glb = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(114.40740, 30.50721, 200), // 固定位置属性，减小callback开销
        model: {
            uri: '/data/UAV.glb',
            scale: 10.0,
        },
    })
}

</script>
<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>

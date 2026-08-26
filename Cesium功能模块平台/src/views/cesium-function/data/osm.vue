<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
        <DraggableModal>

        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import { initCesiumBase } from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

let viewer: Cesium.Viewer
let tileset: Cesium.Cesium3DTileset

const onMapReady = async (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer

    await initCesiumBase(viewer, {
        destination: { lng: 114.40740, lat: 30.50721, height: 1000 },
        orientation: { heading: 185, pitch: -30, roll: 0 },
        osm: true,
        terrain: true,
        depthTestAgainstTerrain: true,
    })

    tileset = await Cesium.Cesium3DTileset.fromUrl("/data/jinan_OSM/tileset.json")
    viewer.scene.primitives.add(tileset)

    // 缩放至数据范围
    viewer.zoomTo(tileset);
}

</script>
<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>

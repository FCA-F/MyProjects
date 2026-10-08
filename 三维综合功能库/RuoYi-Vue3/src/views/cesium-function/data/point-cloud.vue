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

const onMapReady = async (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer

    loadPointCloud()
}

const loadPointCloud = async () => {
    const pointCloud = await Cesium.Cesium3DTileset.fromIonAssetId(4622779)
    pointCloud.style = new Cesium.Cesium3DTileStyle({
        pointSize: 3,                    // 点大小
        color: 'color("greenyellow")', // 点颜色
    })
    viewer.scene.primitives.add(pointCloud)
    viewer.zoomTo(pointCloud)
}

</script>
<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>

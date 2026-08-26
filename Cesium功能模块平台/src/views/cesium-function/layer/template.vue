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
import {initCesiumBase} from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

let viewer:Cesium.Viewer

const onMapReady = (cesiumViewer: Cesium.Viewer) => {
  viewer = cesiumViewer

  initCesiumBase(viewer, {
    destination:{lng: 114.40740,lat: 30.50721,height:1000},
    orientation:{heading:185,pitch:-30,roll:0},
    terrain:true,
    osm:true,
    depthTestAgainstTerrain:true,
  })

}

</script>
<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>


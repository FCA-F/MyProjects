<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
        <DraggableModal title="海量点">
            <div class="row">
                <el-button type="primary" @click="setPrimitivePoints">生成数据</el-button>
                <el-button @click="clearDataset">清除</el-button>
            </div>
            <div class="row">
                <span class="label">点数量</span>
                <el-input-number v-model.number="pointCount" :min="1000" :max="1000000" :step="1000" />
            </div>
            <div class="row">
                <span class="label">点大小</span>
                <el-input-number v-model.number="pixelSize" :min="1" :max="15" :step="1" />
            </div>
        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import { initCesiumBase } from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

let viewer: Cesium.Viewer
let pointPrimitiveCollection: Cesium.PointPrimitiveCollection | undefined

const pointCount = ref(100000)
const pixelSize = ref(4)

interface PointData {
    longitude: number
    latitude: number
}

let sourcePoints: PointData[] = []

const onMapReady = (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer

    initCesiumBase(viewer, {
        destination: { lng: 102, lat: 40, height: 5000000 },
        debugShowFramesPerSecond: true
    })

    setPrimitivePoints()
}

const setPrimitivePoints = () => {
    //清除前置
    viewer.scene.primitives.remove(pointPrimitiveCollection)
    pointPrimitiveCollection = undefined

    pointPrimitiveCollection = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection())
    sourcePoints = createRandomPointsCoordinates(pointCount.value)
    renderPoints()
}

const clearDataset = () => {
    viewer.scene.primitives.remove(pointPrimitiveCollection)
    pointPrimitiveCollection = undefined
    sourcePoints = []
}

const renderPoints = () => {
    if (!pointPrimitiveCollection) return

    for (const pt of sourcePoints) {
        pointPrimitiveCollection.add({
            position: Cesium.Cartesian3.fromDegrees(pt.longitude, pt.latitude),
            pixelSize: pixelSize.value,
            color: Cesium.Color.YELLOW,
            outlineColor: Cesium.Color.WHITE.withAlpha(0.8),
            outlineWidth: 0.1,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
        })
    }
}

const createRandomPointsCoordinates = (count: number): PointData[] => {
    const points: PointData[] = []
    for (let i = 0; i < count; i++) {
        points.push({
            longitude: Cesium.Math.randomBetween(70, 135),
            latitude: Cesium.Math.randomBetween(20, 55)
        })
    }
    return points
}


watch(pointCount, () => {
    if (pointPrimitiveCollection) {
        setPrimitivePoints()
    }
})

watch(pixelSize, () => {
    if (pointPrimitiveCollection) {
        pointPrimitiveCollection.removeAll()
        renderPoints()
    }
})

onBeforeUnmount(() => {
    viewer.scene.primitives.remove(pointPrimitiveCollection)
    pointPrimitiveCollection = undefined
    sourcePoints = []
})
</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
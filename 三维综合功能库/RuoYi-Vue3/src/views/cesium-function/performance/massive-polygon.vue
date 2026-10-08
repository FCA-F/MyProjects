<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
        <DraggableModal title="海量面">
            <div class="row">
                <span class="label">面数量</span>
                <el-input-number v-model.number="polygonCount" :min="1000" :max="1000000" :step="1000"
                    @change="my_main" />
            </div>
        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import { onBeforeUnmount } from 'vue'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import { initCesiumBase } from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

const polygonCount = ref(100000)

let viewer: Cesium.Viewer
let polygonPrimitive: Cesium.Primitive | undefined

let polygonInstances: Cesium.GeometryInstance[] = []


const onMapReady = (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer

    void initCesiumBase(viewer, {
        destination: { lng: 102, lat: 40, height: 5000000 },
        debugShowFramesPerSecond: true
    })

    my_main()
}

const my_main = () => {
    createRandomFeatures()
    addPrimitives()
}

const createRandomFeatures = () => {
    clear()

    for (let i = 0; i < polygonCount.value; i++) {
        const longitude = Cesium.Math.randomBetween(70, 135)
        const latitude = Cesium.Math.randomBetween(20, 55)
        const positions = [
            longitude,
            latitude,
            longitude + Math.random() * 0.8,
            latitude,
            longitude,
            latitude + Math.random() * 0.8,
        ]

        const polygonColor = i % 2 === 0 ? 'red' : 'green'

        polygonInstances.push(
            new Cesium.GeometryInstance({
                geometry: new Cesium.PolygonGeometry({
                    polygonHierarchy: new Cesium.PolygonHierarchy(
                        Cesium.Cartesian3.fromDegreesArray(positions),
                    ),
                    height: 0,
                    vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
                }),
                attributes: {
                    color: Cesium.ColorGeometryInstanceAttribute.fromColor(
                        Cesium.Color.fromCssColorString(polygonColor),
                    ),
                },
                id: `polygon${i}`,
            }),
        )
    }
}

const addPrimitives = () => {
    polygonPrimitive = new Cesium.Primitive({
        geometryInstances: polygonInstances,
        appearance: new Cesium.PerInstanceColorAppearance({
            closed: false,//false-背面剔除
        }),
    })

    viewer.scene.primitives.add(polygonPrimitive)

}

const clear = () => {
    viewer.scene.primitives.remove(polygonPrimitive)
    polygonPrimitive = undefined
    polygonInstances = []
}

onBeforeUnmount(() => {
    clear()
})
</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>

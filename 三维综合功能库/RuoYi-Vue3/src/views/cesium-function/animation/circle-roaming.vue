<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
        <DraggableModal title="绕点漫游">
            <div class="row">
                <el-button @click="drawCenter" :color="isDrawCenter ? 'red' : 'greenyellow'" class="draw-button">
                    {{ isDrawCenter ? '取消选点' : '绘制中心点' }}
                </el-button>
            </div>
            <div class="row">
                <el-button @click="startRoaming" type="primary" size="small" class="button"
                    :disabled="!routePositions.length">
                    开始漫游
                </el-button>
                <el-button @click="pauseRoaming" size="small" class="button" :disabled="!isRoaming">
                    {{ isPaused ? '继续' : '暂停' }}
                </el-button>
                <el-button @click="stopRoaming" type="danger" size="small" class="button" :disabled="!isRoaming">
                    停止
                </el-button>
            </div>
            <div class="row">
                <span class="label" style="width:90px">半径(m)</span>
                <el-input-number v-model="circleRadius" :min="10" :max="10000" :step="10" :disabled="isRoaming"
                    controls-position="right" class="input" />
            </div>
            <div class="row">
                <span class="label" style="width:90px">圈高(m)</span>
                <el-input-number v-model="circleHeight" :min="0" :max="10000" :step="10" :disabled="isRoaming"
                    controls-position="right" class="input" />
            </div>
            <div class="row">
                <span class="label" style="width:90px">速度(m/s)</span>
                <el-input-number v-model="speed" :min="1" :max="2000" :step="10" :disabled="isRoaming"
                    controls-position="right" class="input" />
            </div>
        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import { onBeforeUnmount, ref, watch } from 'vue'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import { initCesiumBase } from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

let viewer: Cesium.Viewer
let handler: Cesium.ScreenSpaceEventHandler

const isDrawCenter = ref(false)
const isRoaming = ref(false)
const isPaused = ref(false)
const circleRadius = ref(2000)
const circleHeight = ref(500)
const speed = ref(500)

let centerPosition: Cesium.Cartesian3 | undefined
let centerEntity: Cesium.Entity | undefined
let routeEntity: Cesium.Entity | undefined
let roamingEntity: Cesium.Entity | undefined
let sampledPosition: Cesium.SampledPositionProperty | undefined
let routePositions: Cesium.Cartesian3[] = []
let roamStartTime = Cesium.JulianDate.now()
let totalRoamTime = 0

const onMapReady = (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer
    handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)

    void initCesiumBase(viewer, {
        destination: { lng: 114.4074, lat: 30.50721, height: 2000 },
        orientation: { heading: 185, pitch: -30, roll: 0 },
        terrain: true,
        osm: true,
        depthTestAgainstTerrain: true,
    })
}

//绘制部分

const drawCenter = () => {
    if (!viewer || !handler) return

    if (isDrawCenter.value) {
        cancelPick()
        return
    }

    if (isRoaming.value) {
        stopRoaming()
    }

    clearAll()

    isDrawCenter.value = true

    handler.setInputAction((event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        const pickPosition = viewer.scene.pickPosition(event.position)
        if (!Cesium.defined(pickPosition)) return
        centerPosition = pickPosition
        addCenterPoint()
        addRouteLine()
        cancelPick()
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    handler.setInputAction(() => {
        cancelPick()
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
}

const addCenterPoint = () => {
    if (!centerPosition) return
    viewer.entities.remove(centerEntity!)

    centerEntity = viewer.entities.add({
        position: centerPosition,
        point: {
            pixelSize: 10,
            color: Cesium.Color.ORANGE,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
    })
}

const addRouteLine = () => {
    if (!centerPosition) return
    viewer.entities.remove(routeEntity!)

    routePositions = buildRoutePositions(centerPosition, circleRadius.value, circleHeight.value)

    routeEntity = viewer.entities.add({
        polyline: {
            positions: routePositions,
            material: Cesium.Color.CYAN,
            width: 3,
            arcType: Cesium.ArcType.NONE,
            depthFailMaterial: Cesium.Color.CYAN,
        },
    })
}

const buildRoutePositions = (
    center: Cesium.Cartesian3,
    radius: number,
    heightOffset: number,
    segments = 400,
) => {
    const cartographic = Cesium.Cartographic.fromCartesian(center)
    const cartesian = Cesium.Cartesian3.fromRadians(
        cartographic.longitude,
        cartographic.latitude,
        cartographic.height + heightOffset,
    )
    const transform = Cesium.Transforms.eastNorthUpToFixedFrame(cartesian)
    const positions: Cesium.Cartesian3[] = []

    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2
        const localPosition = new Cesium.Cartesian3(
            radius * Math.cos(angle),
            radius * Math.sin(angle),
            0,
        )
        positions.push(Cesium.Matrix4.multiplyByPoint(transform, localPosition, new Cesium.Cartesian3()))
    }

    return positions
}

const cancelPick = () => {
    isDrawCenter.value = false
    if (!handler) return
    handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
    handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK)
}

const clearAll = () => {
    viewer.entities.remove(centerEntity!)
    viewer.entities.remove(routeEntity!)
    viewer.entities.remove(roamingEntity!)

    centerEntity = undefined
    routeEntity = undefined
    roamingEntity = undefined

    centerPosition = undefined
    sampledPosition = undefined
    routePositions = []
}

//漫游部分
const startRoaming = () => {
    if (!centerPosition || routePositions.length < 2) return

    stopRoaming()

    const distances: number[] = [0]
    let totalDistance = 0
    for (let i = 1; i < routePositions.length; i++) {
        totalDistance += Cesium.Cartesian3.distance(routePositions[i - 1], routePositions[i])
        distances.push(totalDistance)
    }

    totalRoamTime = totalDistance / speed.value
    roamStartTime = Cesium.JulianDate.now()

    sampledPosition = new Cesium.SampledPositionProperty()
    sampledPosition.setInterpolationOptions({
        interpolationDegree: 1,
        interpolationAlgorithm: Cesium.LinearApproximation,
    })

    routePositions.forEach((position, index) => {
        const time = Cesium.JulianDate.addSeconds(
            roamStartTime,
            distances[index] / speed.value,
            new Cesium.JulianDate(),
        )
        sampledPosition!.addSample(time, position)
    })

    roamingEntity = viewer.entities.add({
        position: sampledPosition,
        orientation: new Cesium.VelocityOrientationProperty(sampledPosition),
        ellipsoid: {
            radii: new Cesium.Cartesian3(16, 16, 16),
            material: Cesium.Color.YELLOW,
        },
        viewFrom: new Cesium.Cartesian3(1000, 0, 1000),
    })

    viewer.clock.startTime = roamStartTime.clone()
    viewer.clock.currentTime = roamStartTime.clone()
    viewer.clock.stopTime = Cesium.JulianDate.addSeconds(roamStartTime, totalRoamTime, new Cesium.JulianDate())
    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP
    viewer.clock.shouldAnimate = true
    viewer.trackedEntity = roamingEntity

    isRoaming.value = true
    isPaused.value = false
}

const pauseRoaming = () => {
    if (!isRoaming.value) return
    viewer.clock.shouldAnimate = isPaused.value
    isPaused.value = !isPaused.value
}

const stopRoaming = () => {
    if (!viewer) return
    viewer.clock.shouldAnimate = false
    viewer.trackedEntity = undefined
    viewer.entities.remove(roamingEntity!)

    roamingEntity = undefined
    sampledPosition = undefined
    isRoaming.value = false
    isPaused.value = false
}

watch([circleRadius, circleHeight], () => {
    if (centerPosition) {
        addRouteLine()
    }
})

onBeforeUnmount(() => {
    if (handler) {
        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
        handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK)
        handler.destroy()
    }
    stopRoaming()
    clearAll()
})
</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>

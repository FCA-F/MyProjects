<template>
    <DraggableModal title="汽车移动">
        <div class="row">
            <el-button class="draw-button" @click="switchMove" :color="isMove ? 'red' : 'greenyellow'">
                {{ isMove ? '停止' : '移动' }}
            </el-button>
        </div>
        <div class="row">
            <span class="label">跟踪</span>
            <el-switch v-model="isTrack" />
        </div>
    </DraggableModal>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import * as Cesium from 'cesium'
import { useCesiumStore } from '@/stores/cesium.ts'
import DraggableModal from '@/components/TopToolbar/draggable-modal.vue'
import '@/components/TopToolbar/draggable-modal.css'

type RoutePoint = {
    lng: number
    lat: number
    height: number
}

const cesiumStore = useCesiumStore()
const isMove = ref(false)
const isTrack = ref(false)

const routePoints: RoutePoint[] = [
    { lng: 117.03065169, lat: 36.67380497, height: 23.82481164 },
    { lng: 117.02947235, lat: 36.67560048, height: 20.87155183 },
    { lng: 117.02797883, lat: 36.67816962, height: 23.64148582 },
    { lng: 117.02760775, lat: 36.67825748, height: 22.88846683 },
    { lng: 117.02650727, lat: 36.67824359, height: 22.91991459 },
    { lng: 117.02534735, lat: 36.67830130, height: 20.46495346 },
    { lng: 117.02298438, lat: 36.67836925, height: 22.54384129 },
    { lng: 117.02037840, lat: 36.67840251, height: 24.95460848 },
    { lng: 117.01927287, lat: 36.67835385, height: 20.53034656 },
    { lng: 117.01769770, lat: 36.67816123, height: 20.35587000 },
    { lng: 117.01688080, lat: 36.67801687, height: 15.71641116 },
    { lng: 117.01551619, lat: 36.67789194, height: 19.74629257 },
    { lng: 117.01351310, lat: 36.67786957, height: 20.02466254 },
    { lng: 117.01274002, lat: 36.67776263, height: 21.92601663 },
    { lng: 117.01125712, lat: 36.67713509, height: 19.23104080 },
    { lng: 117.01128711, lat: 36.67672299, height: 19.06082264 },
    { lng: 117.01111093, lat: 36.67605048, height: 21.58784163 },
    { lng: 117.01055819, lat: 36.67520862, height: 22.41291137 },
    { lng: 117.00997372, lat: 36.67454850, height: 21.25772695 },
    { lng: 117.00988331, lat: 36.67385701, height: 21.03000680 },
    { lng: 117.00994191, lat: 36.67281143, height: 19.80295663 },
    { lng: 117.00999089, lat: 36.67230114, height: 19.95275475 },
    { lng: 117.01050880, lat: 36.67166626, height: 18.71866505 },
    { lng: 117.01344759, lat: 36.67166419, height: 21.17571904 },
    { lng: 117.01785250, lat: 36.67157727, height: 17.28120297 },
    { lng: 117.02216119, lat: 36.67208528, height: 21.01680552 },
    { lng: 117.02715470, lat: 36.67291941, height: 22.74115759 },
    { lng: 117.02946752, lat: 36.67327985, height: 23.06824113 },
]

const carSpeed = 20

let carEntity: Cesium.Entity | undefined
let sampledPosition: Cesium.SampledPositionProperty | undefined
let clockSnapshot:
    | {
        startTime: Cesium.JulianDate
        stopTime: Cesium.JulianDate
        currentTime: Cesium.JulianDate
        multiplier: number
        shouldAnimate: boolean
        clockRange: Cesium.ClockRange
        clockStep: Cesium.ClockStep
        canAnimate: boolean
        depthTestAgainstTerrain: boolean
        trackedEntity: Cesium.Entity | undefined
    }
    | undefined

const syncTrackState = () => {
    const viewer = cesiumStore.viewer
    if (!viewer || !carEntity) {
        return
    }

    viewer.trackedEntity = isTrack.value ? carEntity : undefined
}

const buildCarMove = (viewer: Cesium.Viewer) => {
    if (carEntity) {
        viewer.entities.remove(carEntity)
        carEntity = undefined
    }

    const positions = routePoints.map((point) =>
        Cesium.Cartesian3.fromDegrees(point.lng, point.lat, point.height),
    )

    let totalDistance = 0
    const distances = [0]
    for (let i = 1; i < positions.length; i++) {
        totalDistance += Cesium.Cartesian3.distance(positions[i - 1], positions[i])
        distances.push(totalDistance)
    }

    const startTime = Cesium.JulianDate.now()
    const stopTime = Cesium.JulianDate.addSeconds(
        startTime,
        totalDistance / carSpeed,
        new Cesium.JulianDate(),
    )

    sampledPosition = new Cesium.SampledPositionProperty()
    sampledPosition.setInterpolationOptions({
        interpolationDegree: 1,
        interpolationAlgorithm: Cesium.LinearApproximation,
    })

    positions.forEach((position, index) => {
        const time = Cesium.JulianDate.addSeconds(
            startTime,
            distances[index] / carSpeed,
            new Cesium.JulianDate(),
        )
        sampledPosition!.addSample(time, position)
    })

    clockSnapshot = {
        startTime: Cesium.JulianDate.clone(viewer.clock.startTime, new Cesium.JulianDate()),
        stopTime: Cesium.JulianDate.clone(viewer.clock.stopTime, new Cesium.JulianDate()),
        currentTime: Cesium.JulianDate.clone(viewer.clock.currentTime, new Cesium.JulianDate()),
        multiplier: viewer.clock.multiplier,
        shouldAnimate: viewer.clock.shouldAnimate,
        clockRange: viewer.clock.clockRange,
        clockStep: viewer.clock.clockStep,
        canAnimate: viewer.clock.canAnimate,
        depthTestAgainstTerrain: viewer.scene.globe.depthTestAgainstTerrain,
        trackedEntity: viewer.trackedEntity,
    }

    viewer.scene.globe.depthTestAgainstTerrain = true
    viewer.clock.startTime = startTime
    viewer.clock.stopTime = stopTime
    viewer.clock.currentTime = startTime
    viewer.clock.clockRange = Cesium.ClockRange.CLAMPED
    viewer.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER
    viewer.clock.multiplier = 1
    viewer.clock.canAnimate = true
    viewer.clock.shouldAnimate = false
    viewer.trackedEntity = undefined

    carEntity = viewer.entities.add({
        position: sampledPosition,
        orientation: new Cesium.VelocityOrientationProperty(sampledPosition),
        model: {
            uri: '/data/car/scene.gltf',
            scale: 10,
            minimumPixelSize: 64,
            maximumScale: 500,
        },
    })

    void viewer.zoomTo(carEntity)
}

const switchMove = () => {
    const viewer = cesiumStore.viewer
    if (!viewer || !carEntity) {
        return
    }

    if (isMove.value) {
        viewer.clock.shouldAnimate = false
        isMove.value = false
        return
    }

    if (Cesium.JulianDate.compare(viewer.clock.currentTime, viewer.clock.stopTime) >= 0) {
        viewer.clock.currentTime = Cesium.JulianDate.clone(viewer.clock.startTime, new Cesium.JulianDate())
    }

    viewer.clock.shouldAnimate = true
    viewer.clock.canAnimate = true
    isMove.value = true
    syncTrackState()
}

watch(isTrack, () => {
    syncTrackState()
})

const stopWatch = watch(
    () => cesiumStore.viewer,
    (viewer) => {
        if (!viewer || carEntity) {
            return
        }

        buildCarMove(viewer)
        syncTrackState()
    },
    { immediate: true },
)

onBeforeUnmount(() => {
    stopWatch()

    const viewer = cesiumStore.viewer
    if (viewer && carEntity) {
        viewer.entities.remove(carEntity)
        carEntity = undefined
    }

    if (viewer && clockSnapshot) {
        viewer.clock.startTime = Cesium.JulianDate.clone(clockSnapshot.startTime, new Cesium.JulianDate())
        viewer.clock.stopTime = Cesium.JulianDate.clone(clockSnapshot.stopTime, new Cesium.JulianDate())
        viewer.clock.currentTime = Cesium.JulianDate.clone(clockSnapshot.currentTime, new Cesium.JulianDate())
        viewer.clock.multiplier = clockSnapshot.multiplier
        viewer.clock.shouldAnimate = clockSnapshot.shouldAnimate
        viewer.clock.clockRange = clockSnapshot.clockRange
        viewer.clock.clockStep = clockSnapshot.clockStep
        viewer.clock.canAnimate = clockSnapshot.canAnimate
        viewer.scene.globe.depthTestAgainstTerrain = clockSnapshot.depthTestAgainstTerrain
        viewer.trackedEntity = clockSnapshot.trackedEntity
    }
})
</script>

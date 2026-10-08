<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
        <DraggableModal title="无人机投影">
            <div class="row">
                <el-button class="draw-button" :color="isFlying ? 'red' : 'greenyellow'" @click="toggleFlight">
                    {{ isFlying ? '停止' : (isPaused ? '继续' : '开始') }}
                </el-button>
            </div>
            <div class="row">
                <el-button size="small" type="primary" class="button" :disabled="!isFlying" @click="pauseFlight">
                    {{ isPaused ? '继续' : '暂停' }}
                </el-button>
                <el-button size="small" type="danger" class="button" @click="() => stopFlight()" :disabled="!isFlying">
                    停止重置
                </el-button>
            </div>
            <div class="row">
                <span class="label" style="width:90px">速度(m/s)</span>
                <el-input-number v-model="speed" :min="1" :max="1000" :step="10" :disabled="isFlying"
                    controls-position="right" class="input" />
            </div>
            <div class="row">
                <span class="label" style="width:90px">投影半径(m)</span>
                <el-input-number v-model="projectionRadius" :min="30" :max="1000" :step="10" controls-position="right"
                    class="input" />
            </div>
        </DraggableModal>
        <video ref="videoElement" muted autoplay loop playsinline style="display: none">
            <source src="/data/video.mp4" type="video/mp4" />
        </video>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import { onBeforeUnmount, ref } from 'vue'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import { initCesiumBase } from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

type FlightPoint = {
    lng: number
    lat: number
    height: number
}

let viewer: Cesium.Viewer
let videoSynchronizer: Cesium.VideoSynchronizer | undefined

const videoElement = ref<HTMLVideoElement | null>(null)
const speed = ref(300)//速度
const projectionRadius = ref(180)//视频半径
const isFlying = ref(false)
const isPaused = ref(false)

let routeEntity: Cesium.Entity | undefined
let droneEntity: Cesium.Entity | undefined
let projectionEntity: Cesium.Entity | undefined
let projectionConeEntity: Cesium.Entity | undefined
let sampledPosition: Cesium.SampledPositionProperty | undefined//无人机飞行轨迹
let roamStartTime = Cesium.JulianDate.now()
let totalRoamTime = 0
//飞行轨迹
const flightRoute = [
    { lng: 114.3992, lat: 30.5138, height: 850 },
    { lng: 114.3992, lat: 30.4938, height: 850 },
    { lng: 114.4192, lat: 30.4938, height: 850 },
    { lng: 114.4192, lat: 30.5138, height: 850 },
].map((point) => Cesium.Cartesian3.fromDegrees(point.lng, point.lat, point.height))


const onMapReady = async (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer

    await initCesiumBase(viewer, {
        destination: { lng: 114.408, lat: 30.521, height: 2500 },
        orientation: { heading: 185, pitch: -30, roll: 0 },
        terrain: true,
        shouldAnimate: false,
        osm: true,
        depthTestAgainstTerrain: true,
    })

    viewer.scene.globe.depthTestAgainstTerrain = true
    addVideoSynchronizer()
    buildRouteEntity()
}
//视频绑定时钟
const addVideoSynchronizer = () => {
    if (!videoElement.value || videoSynchronizer) {
        return
    }

    videoSynchronizer = new Cesium.VideoSynchronizer({
        clock: viewer.clock,
        element: videoElement.value,
    })
}
//路径entity
const buildRouteEntity = () => {
    viewer.entities.remove(routeEntity!)
    routeEntity = viewer.entities.add({
        polyline: {
            positions: flightRoute,
            material: new Cesium.PolylineGlowMaterialProperty({
                color: Cesium.Color.CYAN.withAlpha(0.9),
                glowPower: 0.15,
            }),
            width: 4,
            arcType: Cesium.ArcType.NONE,
            depthFailMaterial: Cesium.Color.CYAN.withAlpha(0.6),
        },
    })
}
//飞行轨迹SampledPositionProperty（[time,position]...）
const buildFlightTrack = () => {
    const distances: number[] = [0]
    let totalDistance = 0

    for (let i = 1; i < flightRoute.length; i++) {
        totalDistance += Cesium.Cartesian3.distance(flightRoute[i - 1], flightRoute[i])
        distances.push(totalDistance)
    }

    totalRoamTime = totalDistance / speed.value
    roamStartTime = Cesium.JulianDate.now()

    sampledPosition = new Cesium.SampledPositionProperty()
    sampledPosition.setInterpolationOptions({
        interpolationDegree: 1,
        interpolationAlgorithm: Cesium.LinearApproximation,
    })

    flightRoute.forEach((position, index) => {
        const time = Cesium.JulianDate.addSeconds(
            roamStartTime,
            distances[index] / speed.value,
            new Cesium.JulianDate(),
        )
        sampledPosition!.addSample(time, position)
    })
}
//投影中心点
const getProjectionCenter = () => {
    if (!sampledPosition) {
        return undefined
    }

    const currentPosition = sampledPosition.getValue(viewer.clock.currentTime, new Cesium.Cartesian3())
    if (!currentPosition) {
        return undefined
    }

    const cartographic = Cesium.Cartographic.fromCartesian(currentPosition)
    return Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 20)//指定高程，用于圆锥
}
//视频投影
const buildProjectionEntity = () => {
    viewer.entities.remove(projectionEntity!)
    projectionEntity = viewer.entities.add({
        position: new Cesium.CallbackPositionProperty((time, result) => {
            const center = getProjectionCenter()
            return center ? Cesium.Cartesian3.clone(center, result) : undefined
        }, false),
        ellipse: {
            semiMajorAxis: projectionRadius.value,
            semiMinorAxis: projectionRadius.value,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            //stRotation为ENU坐标系
            stRotation: new Cesium.CallbackProperty(() => getProjectionStRotation(), false),//旋转
            material: new Cesium.ImageMaterialProperty({
                image: videoElement.value!,
                color: Cesium.Color.CYAN.withAlpha(0.8),
            })
        },
    })
}
//投影圆锥
const buildProjectionCone = () => {
    viewer.entities.remove(projectionConeEntity!)
    projectionConeEntity = viewer.entities.add({
        position: new Cesium.CallbackPositionProperty((time, result) => {
            const center = getProjectionConeCenter()
            return center ? Cesium.Cartesian3.clone(center, result) : undefined
        }, false),
        cylinder: {
            length: new Cesium.CallbackProperty(() => getProjectionConeLength(), false),
            topRadius: 0,
            bottomRadius: projectionRadius.value,
            material: Cesium.Color.CYAN.withAlpha(0.18),
            slices: 48,
        },
    })
}
//获取圆锥中心
const getProjectionConeCenter = () => {
    const dronePosition = getDronePosition()//无人机中心
    const center = getProjectionCenter()//投影中心
    if (!dronePosition || !center) {
        return undefined
    }

    return Cesium.Cartesian3.midpoint(dronePosition, center, new Cesium.Cartesian3())
}
//视频旋转，与无人机朝向一致
const getProjectionStRotation = () => {
    if (!sampledPosition) {
        return 0
    }

    //当前位置
    const currentPosition = getDronePosition()
    //下一0.1秒位置位置
    const nextTime = Cesium.JulianDate.addSeconds(viewer.clock.currentTime, 0.2, new Cesium.JulianDate())
    let nextPosition = sampledPosition.getValue(nextTime, new Cesium.Cartesian3())

    if (!nextPosition) {
        return 0
    }
    //朝向
    const direction = Cesium.Cartesian3.subtract(nextPosition, currentPosition!, new Cesium.Cartesian3())
    if (Cesium.Cartesian3.magnitude(direction) === 0) {
        return 0
    }

    Cesium.Cartesian3.normalize(direction, direction)

    const enu = Cesium.Transforms.eastNorthUpToFixedFrame(currentPosition!)
    const inverseEnu = Cesium.Matrix4.inverse(enu, new Cesium.Matrix4())
    //方向*(世界->局部)=局部方向，asVector忽略平移
    const localDirection = Cesium.Matrix4.multiplyByPointAsVector(inverseEnu, direction, new Cesium.Cartesian3())
    //朝东偏了多少度
    return Math.atan2(localDirection.x, localDirection.y)
}
//获取圆锥的长度
const getProjectionConeLength = () => {
    const dronePosition = getDronePosition()//无人机中心
    const center = getProjectionCenter()//投影中心
    if (!dronePosition || !center) {
        return 0
    }

    return Cesium.Cartesian3.distance(dronePosition, center)
}
//无人机当前位置
const getDronePosition = () => {
    if (!sampledPosition) {
        return undefined
    }

    return sampledPosition.getValue(viewer.clock.currentTime, new Cesium.Cartesian3())
}
//无人机entity
const buildDroneEntity = () => {
    viewer.entities.remove(droneEntity!)
    droneEntity = viewer.entities.add({
        position: sampledPosition,
        orientation: new Cesium.VelocityOrientationProperty(sampledPosition!),
        model: {
            uri: '/data/UAV.glb',
            scale: 10.0,
            minimumPixelSize: 64,
            maximumScale: 500,
        },
        path: {
            leadTime: 0,
            trailTime: 120,
            width: 2,
            material: Cesium.Color.YELLOW.withAlpha(0.9),
            resolution: 1,
        }
    })
}
//开始飞行
const startFlight = () => {
    if (!videoElement.value) {
        return
    }

    addVideoSynchronizer()
    stopFlight(false)
    buildRouteEntity()
    buildFlightTrack()
    buildProjectionEntity()
    buildProjectionCone()
    buildDroneEntity()

    viewer.clock.startTime = roamStartTime.clone()
    viewer.clock.currentTime = roamStartTime.clone()
    viewer.clock.stopTime = Cesium.JulianDate.addSeconds(roamStartTime, totalRoamTime, new Cesium.JulianDate())
    viewer.clock.clockRange = Cesium.ClockRange.CLAMPED
    viewer.clock.shouldAnimate = true

    isFlying.value = true
    isPaused.value = false

    viewer.zoomTo(droneEntity!)
}
//暂停飞行
const pauseFlight = () => {
    if (!isFlying.value) {
        return
    }
    viewer.clock.shouldAnimate = isPaused.value
    isPaused.value = !isPaused.value
}
//停止飞行
const stopFlight = (clearTrack = true) => {
    if (!viewer) {
        return
    }

    viewer.clock.shouldAnimate = false
    if (clearTrack) {
        viewer.trackedEntity = undefined
        viewer.entities.remove(droneEntity!)
        viewer.entities.remove(projectionEntity!)
        viewer.entities.remove(projectionConeEntity!)
        droneEntity = undefined
        projectionEntity = undefined
        projectionConeEntity = undefined
        sampledPosition = undefined
        isFlying.value = false
        isPaused.value = false
    }
}

const toggleFlight = () => {
    if (isFlying.value) {
        stopFlight()
        return
    }
    startFlight()
}

watch(projectionRadius, () => {
    viewer.entities.remove(projectionEntity!)
    viewer.entities.remove(projectionConeEntity!)
    buildProjectionEntity()
    buildProjectionCone()
})

onBeforeUnmount(() => {
    if (viewer) {
        viewer.trackedEntity = undefined
        viewer.entities.remove(routeEntity!)
        viewer.entities.remove(droneEntity!)
        viewer.entities.remove(projectionEntity!)
        viewer.entities.remove(projectionConeEntity!)
    }

    if (videoSynchronizer) {
        videoSynchronizer = undefined
    }

    if (droneEntity) droneEntity = undefined
    if (projectionEntity) projectionEntity = undefined
    if (projectionConeEntity) projectionConeEntity = undefined
    if (routeEntity) routeEntity = undefined
    if (sampledPosition) sampledPosition = undefined
})
</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>

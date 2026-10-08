<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
        <DraggableModal title="路径漫游">
            <div class="row">
                <el-button @click="drawPath" :color="isDraw ? 'red' : 'greenyellow'" class="draw-button">
                    {{ isDraw ? '取消绘制' : '绘制路径' }}
                </el-button>
            </div>
            <div class="row" v-if="pathCartesians.length > 1">
                <el-button @click="startRoaming" type="primary" size="small" class="button">开始漫游</el-button>
                <el-button @click="pauseRoaming" size="small" class="button">
                    {{ isPaused ? '继续' : '暂停' }}
                </el-button>
                <el-button @click="stopRoaming" size="small" type="danger" class="button">停止</el-button>
            </div>
            <div class="row" v-if="pathCartesians.length > 1">
                <span class="label" style="width:100px">速度(m/s)</span>
                <el-input v-model="speed" :min="10" :max="200" :step="10" :disabled="isRoaming" class="input" />
            </div>
        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import { initCesiumBase } from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'
import { ref } from 'vue'

let viewer: Cesium.Viewer
let handler: Cesium.ScreenSpaceEventHandler

const isDraw = ref(false)
const isRoaming = ref(false)
const isPaused = ref(false)
const speed = ref(50) // 默认速度 m/s

let pathEntity: Cesium.Entity | undefined
let pathCartesians: Cesium.Cartesian3[] = []
let roamingEntity: Cesium.Entity | undefined
let sampledPosition: Cesium.SampledPositionProperty | undefined
let roamStartTime = Cesium.JulianDate.now()
let totalRoamTime = 0

const onMapReady = (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer
    handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)

    initCesiumBase(viewer, {
        destination: { lng: 114.40740, lat: 30.50721, height: 1000 },
        orientation: { heading: 185, pitch: -30, roll: 0 },
        terrain: true,
        osm: true,
        depthTestAgainstTerrain: true,
    })
}

const drawPath = () => {
    if (isRoaming.value) stopRoaming()// 如果正在漫游，先停掉
    viewer.entities.remove(pathEntity!)

    pathEntity = undefined
    pathCartesians = []

    let activePositions: Cesium.Cartesian3[] = []
    let dynamicShape: Cesium.Entity | undefined
    let dynamicPositions: Cesium.CallbackProperty | undefined
    let isMouse = false

    if (!isDraw.value) {
        isDraw.value = true

        handler.setInputAction((event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
            let pickPosition = viewer.scene.pickPosition(event.position)
            if (!Cesium.defined(pickPosition)) return
            if (!activePositions.length) {
                isMouse = true
                activePositions.push(pickPosition)
                dynamicPositions = new Cesium.CallbackProperty(() => activePositions, false)
                dynamicShape = drawPolyline(dynamicPositions)
            } else {
                activePositions.push(pickPosition)
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

        handler.setInputAction((event: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
            if (!isMouse) return
            let pickPosition = viewer.scene.pickPosition(event.endPosition)
            if (!Cesium.defined(pickPosition)) return
            if (activePositions.length > 1) activePositions.pop()
            activePositions.push(pickPosition)
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

        handler.setInputAction(() => {
            // 结束绘制
            isDraw.value = false
            handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
            handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE)
            handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK)

            if (activePositions.length > 1) {
                activePositions.pop()
                pathEntity = drawPolyline(activePositions)
                pathCartesians = [...activePositions]
            }

            viewer.entities.remove(dynamicShape!)
            isMouse = false
            activePositions = []
            dynamicShape = undefined
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    } else {
        // 取消绘制
        isDraw.value = false
        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
        handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE)
        handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK)
        activePositions = []
        dynamicShape = undefined
        isMouse = false
    }

    // 画线函数
    const drawPolyline = (positions: Cesium.Cartesian3[] | Cesium.CallbackProperty) => {
        return viewer.entities.add({
            polyline: {
                positions: positions,
                material: Cesium.Color.RED,
                width: 4,
                arcType: Cesium.ArcType.NONE,
                depthFailMaterial: Cesium.Color.RED,
            },
        })
    }
}

// 开始漫游
const startRoaming = () => {
    if (pathCartesians.length < 2) return

    // 清除之前的漫游实体
    if (roamingEntity) {
        viewer.entities.remove(roamingEntity)
        roamingEntity = undefined
    }

    // 根据路径点计算距离和时间
    const distances: number[] = [0]//到每个点的累计米数
    let totalDistance = 0
    for (let i = 1; i < pathCartesians.length; i++) {
        const d = Cesium.Cartesian3.distance(pathCartesians[i - 1], pathCartesians[i])
        totalDistance += d
        distances.push(totalDistance)
    }

    totalRoamTime = totalDistance / speed.value
    roamStartTime = Cesium.JulianDate.now()

    // 创建时间采样位置属性
    sampledPosition = new Cesium.SampledPositionProperty()//时间->位置的采样属性
    sampledPosition.setInterpolationOptions({//让他走实现
        interpolationDegree: 1,//插值阶数
        interpolationAlgorithm: Cesium.LinearApproximation,//线性
    })

    pathCartesians.forEach((pos, i) => {
        const time = Cesium.JulianDate.addSeconds(roamStartTime, distances[i] / speed.value, new Cesium.JulianDate())//到每个点的时间
        sampledPosition!.addSample(time, pos)
    })

    // 创建漫游实体（用一个小球表示，也可以换成 glTF 模型）
    roamingEntity = viewer.entities.add({
        position: sampledPosition,//挂上动态时间
        orientation: new Cesium.VelocityOrientationProperty(sampledPosition!),
        point: {
            pixelSize: 10,
            color: Cesium.Color.YELLOW,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        // 相机偏移：后方 30m，上方 15m，俯视前方
        viewFrom: new Cesium.Cartesian3(0, 0, 500),
    })

    // 配置时钟
    viewer.clock.startTime = roamStartTime.clone()
    viewer.clock.currentTime = roamStartTime.clone()
    viewer.clock.stopTime = Cesium.JulianDate.addSeconds(roamStartTime, totalRoamTime, new Cesium.JulianDate())
    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP
    viewer.clock.shouldAnimate = true

    // 锁定相机跟随
    viewer.trackedEntity = roamingEntity

    isRoaming.value = true//漫游
    isPaused.value = false//暂停
}

// 暂停/继续
const pauseRoaming = () => {
    if (!isRoaming.value) return
    viewer.clock.shouldAnimate = isPaused.value
    isPaused.value = !isPaused.value
}

// 停止漫游
const stopRoaming = () => {
    viewer.clock.shouldAnimate = false
    viewer.trackedEntity = undefined
    if (roamingEntity) {
        viewer.entities.remove(roamingEntity)
        roamingEntity = undefined
    }
    isRoaming.value = false
    isPaused.value = false
}

onBeforeUnmount(() => {
    if (handler) {
        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
        handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK)
        handler.destroy()
    }
    stopRoaming()
})

</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>

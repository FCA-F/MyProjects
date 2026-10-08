<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />

        <DraggableModal title="视频绘制">
            <div class="row">
                <el-button class="draw-button" :color="isDraw ? 'red' : 'greenyellow'" @click="switchDraw">
                    {{ isDraw ? '停止' : '绘制' }}
                </el-button>
            </div>
            <div class="row">
                <el-radio-group v-model="drawType" class="mode-group">
                    <el-radio value="plane">水平</el-radio>
                    <el-radio value="wall">垂直</el-radio>
                </el-radio-group>
            </div>
            <div class="row" v-if="drawType == 'wall'">
                <label class="label">高度</label>
                <el-input v-model.number="wallHeight" class="input" />
            </div>
        </DraggableModal>
        <video id="myVideo" ref="videoElement" muted autoplay loop playsinline style="display: none">
            <source src="/data/video.mp4" type="video/mp4" />
        </video>
    </div>

</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import { onBeforeUnmount, ref, watch } from 'vue'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import { initCesiumBase } from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

type VideoDrawType = 'plane' | 'wall'

let viewer: Cesium.Viewer
let handler: Cesium.ScreenSpaceEventHandler
let videoSynchronizer: Cesium.VideoSynchronizer | undefined

let activePositions: Cesium.Cartesian3[] = []
let dynamicPositions: Cesium.CallbackProperty | undefined
let dynamicEntity: Cesium.Entity | undefined

const wallHeight = ref(50)
const videoElement = ref<HTMLVideoElement | null>(null)
const drawType = ref<VideoDrawType>('plane')
const isDraw = ref(false)

const onMapReady = (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer
    handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)
    initCesiumBase(viewer, {
        destination: { lng: 114.4074, lat: 30.50721, height: 1000 },
        orientation: { heading: 0, pitch: -30, roll: 0 },
        terrain: true,
        shouldAnimate: true,
        osm: true,
    })
    addVideoSynchronizer()
}
//将视频与cesium时钟绑定
const addVideoSynchronizer = () => {
    if (!videoElement.value || videoSynchronizer) {
        return
    }

    videoSynchronizer = new Cesium.VideoSynchronizer({
        clock: viewer.clock,
        element: videoElement.value,
    })
}

const getPlaneStRotation = () => {
    return -viewer.camera.heading
}

const switchDraw = () => {
    if (!videoElement.value) {
        return
    }
    if (isDraw.value) {
        stopDraw()
    }
    else {
        startDraw()
    }
}

const startDraw = () => {

    stopDraw()
    isDraw.value = true
    let isMouse = false

    if (drawType.value == 'plane') {
        const planeStRotation = getPlaneStRotation()
        handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
            const pickPosition = viewer.scene.pickPosition(e.position)
            if (!Cesium.defined(pickPosition)) {
                return
            }
            if (activePositions.length == 0) {
                isMouse = true
                activePositions.push(pickPosition)
                dynamicPositions = new Cesium.CallbackProperty(() => {
                    return createRectangle(activePositions)
                }, false)
                dynamicEntity = addRectangle(dynamicPositions, planeStRotation)
            }
            else {
                activePositions.push(pickPosition)
                const rectangle = createRectangle(activePositions)
                if (!rectangle) {
                    return
                }
                addRectangle(rectangle, planeStRotation)
                stopDraw()
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

        handler.setInputAction((event: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
            if (!isMouse) {
                return
            }
            const pickPosition = viewer.scene.pickPosition(event.endPosition)
            if (Cesium.defined(pickPosition)) {
                if (activePositions.length > 1) {
                    activePositions.pop()
                }
                activePositions.push(pickPosition)
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

        handler.setInputAction(() => {
            isDraw.value = false
            isMouse = false
            if (activePositions.length > 0) {
                activePositions.pop()
            }
            activePositions = []
            dynamicPositions = undefined
            stopDraw()
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    }
    else if (drawType.value == 'wall') {
        handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
            const pickPosition = viewer.scene.pickPosition(e.position)
            if (!Cesium.defined(pickPosition)) {
                return
            }
            if (activePositions.length == 0) {
                isMouse = true
                activePositions.push(pickPosition)
                dynamicPositions = new Cesium.CallbackProperty(() => {
                    return getWallTopPositions(activePositions)
                }, false)
                dynamicEntity = addWall(dynamicPositions, new Cesium.CallbackProperty(() => {
                    return getWallMinimumHeights(activePositions)
                }, false))
            }
            else {
                activePositions.push(pickPosition)
                addWall(getWallTopPositions(activePositions), getWallMinimumHeights(activePositions))
                stopDraw()
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

        handler.setInputAction((event: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
            if (!isMouse) {
                return
            }
            const pickPosition = viewer.scene.pickPosition(event.endPosition)
            if (Cesium.defined(pickPosition)) {
                if (activePositions.length > 1) {
                    activePositions.pop()
                }
                activePositions.push(pickPosition)
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

        handler.setInputAction(() => {
            isDraw.value = false
            isMouse = false
            if (activePositions.length > 0) {
                activePositions.pop()
            }
            activePositions = []
            dynamicPositions = undefined
            stopDraw()
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    }
}

const createRectangle = (positions: Cesium.Cartesian3[]) => {
    if (positions.length < 2) {
        const cartographic = Cesium.Cartographic.fromCartesian(positions[0])
        const delta = Cesium.Math.toRadians(0.000001)
        return new Cesium.Rectangle(
            cartographic.longitude - delta,
            cartographic.latitude - delta,
            cartographic.longitude + delta,
            cartographic.latitude + delta,
        )
    }

    const startCartographic = Cesium.Cartographic.fromCartesian(positions[0])
    const endCartographic = Cesium.Cartographic.fromCartesian(positions[1])
    const west = Math.min(startCartographic.longitude, endCartographic.longitude)
    const east = Math.max(startCartographic.longitude, endCartographic.longitude)
    const south = Math.min(startCartographic.latitude, endCartographic.latitude)
    const north = Math.max(startCartographic.latitude, endCartographic.latitude)

    if (east - west < Cesium.Math.toRadians(0.000001) || north - south < Cesium.Math.toRadians(0.000001)) {
        const delta = Cesium.Math.toRadians(0.000001)
        return new Cesium.Rectangle(west - delta, south - delta, east + delta, north + delta)
    }

    return new Cesium.Rectangle(west, south, east, north)
}

const addRectangle = (
    coordinates: Cesium.Rectangle | Cesium.CallbackProperty,
    stRotation: number,
) => {
    return viewer.entities.add({
        rectangle: {
            coordinates,
            stRotation,
            material: new Cesium.ImageMaterialProperty({
                image: videoElement.value!,
            }),
        },
    })
}

const addWall = (
    positions: Cesium.Cartesian3[] | Cesium.CallbackProperty,
    minimumHeights: number[] | Cesium.CallbackProperty,
) => {
    return viewer.entities.add({
        wall: {
            positions,
            minimumHeights,
            material: new Cesium.ImageMaterialProperty({
                image: videoElement.value!,
            }),
        },
    })
}

const getWallTopPositions = (positions: Cesium.Cartesian3[]) => {
    return positions.slice(0, 2).map((position) => {//slice，截取前两个元素
        const cartographic = Cesium.Cartographic.fromCartesian(position)
        return Cesium.Cartesian3.fromRadians(
            cartographic.longitude,
            cartographic.latitude,
            cartographic.height + wallHeight.value
        )
    })
}

const getWallMinimumHeights = (positions: Cesium.Cartesian3[]) => {
    return positions.slice(0, 2).map((position) => Cesium.Cartographic.fromCartesian(position).height)
}

const stopDraw = () => {
    isDraw.value = false
    handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
    handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    viewer.entities.remove(dynamicEntity!)
    activePositions = []
    dynamicEntity = undefined
    dynamicPositions = undefined

}

watch(drawType, () => {
    if (isDraw.value) {
        isDraw.value = false
        stopDraw()
    }
})

onBeforeUnmount(() => {
    stopDraw()
    handler.destroy()
})
</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>

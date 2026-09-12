<template>
    <DraggableModal title="遮罩">
        <div class="row">
            <el-button @click="isDraw = !isDraw" :color="isDraw ? 'red' : 'green'" class="draw-button">绘制</el-button>
        </div>
        <div class="row">
            <el-button @click="addMask" :color="'blue'" class="draw-button">遮罩</el-button>
        </div>
    </DraggableModal>

</template>
<script setup lang="ts">
import * as Cesium from 'cesium'
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useCesiumStore } from '@/stores/cesium.ts'
import DraggableModal from '@/components/TopToolbar/draggable-modal.vue'
import '@/components/TopToolbar/draggable-modal.css'

let viewer: Cesium.Viewer;
let handler: Cesium.ScreenSpaceEventHandler;

const isDraw = ref(false)

let positionsArray: Cesium.Cartesian3[][] = []
let entityArray: Cesium.Entity[] = []

let activePositions: Cesium.Cartesian3[] = [];
let floatingPosition: Cesium.Cartesian3 | undefined;
let dynamicPositions: Cesium.CallbackProperty | undefined;
let dynamicShape: Cesium.Entity | undefined;

onMounted(() => {
    const cesiumStore = useCesiumStore();
    viewer = cesiumStore.viewer as Cesium.Viewer;
    handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
})

let isMouseMove = false
watch(isDraw, (isDraw) => {
    if (isDraw) {
        handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
            let pickPosition = viewer.scene.pickPosition(e.position)
            if (!Cesium.defined(pickPosition)) return
            if (activePositions.length == 0) {
                isMouseMove = true;
                dynamicPositions = new Cesium.CallbackProperty(() => {
                    const positions = floatingPosition ? [...activePositions, floatingPosition] : activePositions
                    return new Cesium.PolygonHierarchy(positions)
                }, false)
                dynamicShape = addPolygon(dynamicPositions)
            }
            activePositions.push(pickPosition)
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

        handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
            if (!isMouseMove) return
            let pickPosition = viewer.scene.pickPosition(e.endPosition)
            if (!Cesium.defined(pickPosition)) return
            floatingPosition = pickPosition
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

        handler.setInputAction(() => {
            if (activePositions.length > 2) {
                let polygon = addPolygon(new Cesium.PolygonHierarchy(activePositions))
                positionsArray.push(activePositions)
                entityArray.push(polygon)
            }
            isMouseMove = false
            if (dynamicShape) {
                viewer.entities.remove(dynamicShape)
            }
            activePositions = []
            floatingPosition = undefined
            dynamicPositions = undefined
            dynamicShape = undefined
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    }
    else {
        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
        handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE)
        handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK)
        isMouseMove = false
        if (dynamicShape) {
            viewer.entities.remove(dynamicShape)
        }
        activePositions = []
        floatingPosition = undefined
        dynamicPositions = undefined
        dynamicShape = undefined
    }
})

const addPolygon = (positions: Cesium.CallbackProperty | Cesium.PolygonHierarchy) => {
    let polygon = viewer.entities.add({
        polygon: {
            hierarchy: positions,
            material: Cesium.Color.RED.withAlpha(0.5)
        }
    })
    return polygon
}

const addMask = () => {
    if (positionsArray.length == 0) return
    let holes = positionsArray.map(positions => new Cesium.PolygonHierarchy(positions))
    let outerPositions = Cesium.Cartesian3.fromDegreesArray([80, 10, 140, 10, 140, 60, 80, 60, 80, 10])
    let mask = viewer.entities.add({
        polygon: {
            hierarchy: new Cesium.PolygonHierarchy(outerPositions, holes),
            material: Cesium.Color.BLACK.withAlpha(0.7),
        }
    })

    entityArray.map(entity => {
        viewer.entities.remove(entity)
    })
    positionsArray = []
    entityArray = []

    return mask
}

onUnmounted(() => {
    handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
    handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    viewer.scene.globe.enableLighting = false;
    viewer.shadows = false;
    viewer.clock.shouldAnimate = false;
})
</script>

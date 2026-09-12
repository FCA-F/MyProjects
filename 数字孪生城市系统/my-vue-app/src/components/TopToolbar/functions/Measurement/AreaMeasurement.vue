<template>
    <DraggableModal title="面积测量">
        <div class="row">
            <el-button @click="drawPolygon" :color="isDraw ? 'red' : 'greenyellow'" class="draw-button">绘制</el-button>
        </div>
    </DraggableModal>

</template>
<script setup lang="ts">
import { onMounted, ref, onUnmounted } from 'vue'

import * as Cesium from 'cesium'
import * as turf from '@turf/turf'
import { useCesiumStore } from '@/stores/cesium.ts'
import DraggableModal from '@/components/TopToolbar/draggable-modal.vue'
import '@/components/TopToolbar/draggable-modal.css'

const cesiumStore = useCesiumStore();
const viewer = cesiumStore.viewer as Cesium.Viewer;
let handler: Cesium.ScreenSpaceEventHandler;

const isDraw = ref(false)

let isMouseMove = false;
let activePositions: Cesium.Cartesian3[] = [];
let dynamicPositions: Cesium.CallbackProperty | undefined;
let dynamicShape: Cesium.Entity | undefined;

onMounted(() => {
    handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)
})

const drawPolygon = () => {
    if (!isDraw.value) {
        isDraw.value = true;
        handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
            let position = viewer.scene.pickPosition(e.position);
            if (!Cesium.defined(position)) return;
            if (activePositions.length == 0) {
                activePositions.push(position);
                isMouseMove = true;
                dynamicPositions = new Cesium.CallbackProperty(() => {
                    return new Cesium.PolygonHierarchy(activePositions)
                }, false)
                dynamicShape = addPolygon(dynamicPositions)
            }
            else {
                activePositions.push(position);
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

        handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
            if (!isMouseMove)
                return
            let position = viewer.scene.pickPosition(e.endPosition)
            if (!Cesium.defined(position))
                return;
            if (activePositions.length > 1)
                activePositions.pop()
            activePositions.push(position);
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

        handler.setInputAction(() => {
            if (activePositions.length > 0)
                activePositions.pop()
            viewer.entities.remove(dynamicShape!)
            if (activePositions.length >= 3) {
                addPolygon(new Cesium.PolygonHierarchy(activePositions!))
                measurePolygonArea(activePositions)
            }
            isMouseMove = false
            dynamicShape = undefined
            dynamicPositions = undefined
            activePositions = []
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    }
    else {
        isDraw.value = false;
        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
        isMouseMove = false, dynamicShape = undefined, dynamicPositions = undefined, activePositions = [];
    }
}

const addPolygon = (positions: Cesium.PolygonHierarchy | Cesium.CallbackProperty) => {
    let polygon = viewer.entities.add({
        polygon: {
            hierarchy: positions,
            material: Cesium.Color.RED
        }
    })
    return polygon;
}

const measurePolygonArea = (positions: Cesium.Cartesian3[]) => {
    positions.push(positions[0])
    let cartographicPositions = positions.map(cartesian => Cesium.Cartographic.fromCartesian(cartesian))
    let degreePositions: number[][] = cartographicPositions.map((cartographic) => {
        let lon = Cesium.Math.toDegrees(cartographic.longitude)
        let lat = Cesium.Math.toDegrees(cartographic.latitude)
        return [lon, lat]
    })
    let polygon = turf.polygon([degreePositions])
    let area = turf.area(polygon);
    let polygonCenter = turf.centerOfMass(polygon)
    let [centerDegreesLon, centerDegreeLat] = polygonCenter.geometry.coordinates
    let centerCartesian = Cesium.Cartesian3.fromDegrees(centerDegreesLon, centerDegreeLat)
    addPoint(centerCartesian)
    addLabel(area, centerCartesian)
}

const addPoint = (position: Cesium.Cartesian3) => {
    let point = viewer.entities.add({
        position: position,
        point: {
            pixelSize: 10,
            color: Cesium.Color.BLUE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
    })
    return point;
}


const addLabel = (area: number, position: Cesium.Cartesian3) => {
    viewer.entities.add({
        position: position,
        label: {
            text: '面积: ' + area.toFixed(3) + '平方米',
            showBackground: true,
            font: '15px',
            horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
    })
}


onUnmounted(() => {

    handler.destroy();
})

</script>

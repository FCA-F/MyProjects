<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
        <DraggableModal title="面积测量">
            <div class="row">
                <el-button @click="drawPolygon" :color="isDraw ? 'red' : 'greenyellow'" class="draw-button">绘制</el-button>
            </div>
        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import * as turf from '@turf/turf'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import { initCesiumBase } from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

let viewer: Cesium.Viewer
let handler: Cesium.ScreenSpaceEventHandler;

const isDraw = ref(false)

let isMouseMove = false;
let activePositions: Cesium.Cartesian3[] = [];
let dynamicPositions: Cesium.CallbackProperty | undefined;
let dynamicShape: Cesium.Entity | undefined;

const onMapReady = (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer
    handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);

    initCesiumBase(viewer, {
        destination: { lng: 117.12043, lat: 36.68173, height: 2000 },
        orientation: { heading: 140, pitch: -30, roll: 0 },
        terrain: true,
        osm: true,
        depthTestAgainstTerrain: true,
    })
}

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
            isDraw.value = false
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
            material: Cesium.Color.SKYBLUE.withAlpha(0.5)
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

</script>
<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
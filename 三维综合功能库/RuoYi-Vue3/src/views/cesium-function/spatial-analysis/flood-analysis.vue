<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
        <DraggableModal title="淹没分析">
            <div class="row" style="justify-content:center;">
                <el-button @click="drawInundationRegion" :color="isDraw ? 'red' : 'greenyellow'" class="draw-button"
                    round>绘制</el-button>
            </div>
            <div class="row">
                <label class="label">最大高度</label>
                <el-input v-model.number="maxInundationHeight" class="input" />
            </div>
            <div class="row">
                <label class="label">上涨速度</label>
                <el-input v-model.number="step" class="input" />
            </div>
            <div class="row">
                <label class="label">水位高度</label>
                <el-input v-model.number="waterHeight" class="input" />
            </div>
            <div class="row">
                <el-button @click="InundationAnalysis()" :color="isWater ? 'red' : 'green'" class="button">{{
                    startOrStopText }}</el-button>
                <el-button @click="Zero()" class="button" color='#1E88E5'>水位归零</el-button>
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

let viewer: Cesium.Viewer
let handler: Cesium.ScreenSpaceEventHandler;

const isDraw = ref(false);//是否绘制
const isWater = ref(false);//是否涨水
const waterHeight = ref(0);//当前水位高度
const step = ref(0.02);//水位上升间隔
const maxInundationHeight = ref(500)//最大淹没高度
const startOrStopText = ref("开始")//按钮文本

let activePositions: Cesium.Cartesian3[] = [];//动态临时图形，绘制图形点集
let dynamicPositions: Cesium.CallbackProperty | undefined;
let dynamicShape: Cesium.Entity | undefined;
let isMouse = false;//鼠标移动追踪

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

const drawInundationRegion = () => {
    if (!isDraw.value) {
        isDraw.value = true;
        //采点(左键)
        handler.setInputAction((event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
            let pickPosition = viewer.scene.pickPosition(event.position);
            if (!Cesium.defined(pickPosition))
                return;
            if (!activePositions.length) {
                isMouse = true;
                activePositions.push(pickPosition);
                dynamicPositions = new Cesium.CallbackProperty(
                    () => { return new Cesium.PolygonHierarchy(activePositions) }, false);
                dynamicShape = drawPolygon(dynamicPositions);
            }
            else {
                activePositions.push(pickPosition);
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

        //移动追踪绘制（移动）
        handler.setInputAction((event: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
            if (!isMouse)
                return;
            let pickPosition = viewer.scene.pickPosition(event.endPosition);
            if (!Cesium.defined(pickPosition))
                return;
            if (activePositions.length > 1)
                activePositions.pop();
            activePositions.push(pickPosition);
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        //确认，终止（右键）
        handler.setInputAction(() => {
            activePositions.pop();
            viewer.entities.remove(dynamicShape!);
            drawInundationPolygon(activePositions);
            drawPolyline(activePositions)
            isMouse = false;
            activePositions = [];
            dynamicShape = undefined;
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    }
    else {
        isDraw.value = false;

        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
        dynamicShape = undefined, isMouse = false, activePositions = [];
    }
}

//绘制普通静态面
const drawPolygon = (positions: Cesium.PolygonHierarchy | Cesium.CallbackProperty) => {
    let polygon = viewer.entities.add({
        polygon: {
            hierarchy: positions,
            material: Cesium.Color.SKYBLUE.withAlpha(0.5)
        }
    })
    return polygon;
}

//绘制动态水面
const drawInundationPolygon = (positions: Cesium.Cartesian3[]) => {
    let polygon = viewer.entities.add({
        polygon: {
            hierarchy: positions,
            height: new Cesium.CallbackProperty(updateHeight, false),
            extrudedHeight: 0,
            material: Cesium.Color.SKYBLUE.withAlpha(0.7)
        }
    })
    return polygon;
}
//绘制水面边界线
const drawPolyline = (positions: Cesium.Cartesian3[]) => {
    positions.push(positions[0])
    let polyline = viewer.entities.add({
        polyline: {
            positions: positions,
            width: 3,
            material: Cesium.Color.BLUE.withAlpha(0.8),
            clampToGround: true,
        }
    })
    return polyline
}

//开始/终止涨水
const InundationAnalysis = () => {
    if (!isWater.value) {
        isWater.value = true;
        startOrStopText.value = '结束'
    }
    else {
        isWater.value = false;
        startOrStopText.value = '开始'
    }
}

const Zero = () => {
    waterHeight.value = 0;
}
//涨水
const updateHeight = () => {
    if (isWater.value)
        if (waterHeight.value + step.value < maxInundationHeight.value)
            waterHeight.value = Number((waterHeight.value + step.value).toFixed(5));
        else if (waterHeight.value < maxInundationHeight.value && waterHeight.value + step.value > maxInundationHeight.value)
            waterHeight.value = Number(maxInundationHeight.value.toFixed(5));
    return waterHeight.value;
}

</script>
<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
        <DraggableModal title="图形绘制">
            <div class="row">
                <el-button class="draw-button" @click="switchDraw" :color="isDraw ? 'red' : 'greenyellow'">{{ isDraw ?
                    '停止'
                    : '绘制' }}</el-button>
            </div>

            <div class="row">
                <el-select v-model="drawType" style="width:250px;height:30px" placeholder="绘制类型">
                    <el-option v-for="item in options" :key="item.value" :label="item.label" :value="item.value">
                    </el-option>
                </el-select>
            </div>
        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import { initCesiumBase } from '@/utils/cesium'
import { ElMessage } from 'element-plus'
import '@/components/Common/draggable-modal.css'

let viewer: Cesium.Viewer
let handler: Cesium.ScreenSpaceEventHandler;

let isDraw = ref(false);
let dynamicEntity: Cesium.Entity | undefined;
let activePositions: Cesium.Cartesian3[] = [];
let dynamicPositions: Cesium.CallbackProperty | undefined;


const options = [
    { label: "", value: "" },
    { label: "绘制点", value: "point" },
    { label: "绘制线", value: "polyline" },
    { label: "绘制面", value: "polygon" },
    { label: "绘制矩形", value: "rectangle" },
]

const drawType = ref<'' | 'point' | 'polyline' | 'polygon' | 'rectangle'>('')

const onMapReady = (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer
    handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)
    initCesiumBase(viewer, {
        destination: { lng: 117.1336, lat: 36.6772, height: 5000 },
    })
}

const switchDraw = () => {
    if (drawType.value == '') {
        isDraw.value = false
        ElMessage.warning('未选择绘制类型')
        return
    }
    if (isDraw.value) {
        isDraw.value = false
        stopDraw()
    }
    else {
        isDraw.value = true
        startDraw()
    }
}

const startDraw = () => {
    let isMouse = false
    //点
    if (drawType.value == 'point') {
        handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
            let pickPosition = viewer.scene.pickPosition(e.position)
            if (pickPosition) {
                addPoint(pickPosition)
                stopDraw()
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    }
    //线
    else if (drawType.value == 'polyline') {
        handler.setInputAction((event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
            let pickPosition = viewer.scene.pickPosition(event.position);
            if (!Cesium.defined(pickPosition))
                return;
            if (activePositions.length == 0) {
                isMouse = true;
                activePositions.push(pickPosition);
                dynamicPositions = new Cesium.CallbackProperty(() => {
                    return activePositions;
                }, false)
                dynamicEntity = addPolyline(dynamicPositions)
            }
            else {
                activePositions.push(pickPosition)
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
        //鼠标移动事件
        handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
            if (!isMouse)
                return;
            let pickPosition = viewer.scene.pickPosition(e.endPosition)
            if (Cesium.defined(pickPosition)) {
                if (activePositions.length > 1)
                    activePositions.pop();
                activePositions.push(pickPosition);
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

        //鼠标右击事件
        handler.setInputAction(() => {
            isDraw.value = false
            isMouse = false;
            activePositions.pop();
            if (activePositions.length > 1)
                addPolyline(activePositions)
            stopDraw()
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    }
    //面
    else if (drawType.value == 'polygon') {
        handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
            let position = viewer.scene.pickPosition(e.position);
            if (!Cesium.defined(position)) return;
            if (activePositions.length == 0) {
                activePositions.push(position);
                isMouse = true;
                dynamicPositions = new Cesium.CallbackProperty(() => {
                    return new Cesium.PolygonHierarchy(activePositions)
                }, false)
                dynamicEntity = addPolygon(dynamicPositions)
            }
            else {
                activePositions.push(position);
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

        handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
            if (!isMouse)
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
            isMouse = false
            if (activePositions.length > 0)
                activePositions.pop()
            viewer.entities.remove(dynamicEntity!)
            if (activePositions.length >= 3) {
                addPolygon(new Cesium.PolygonHierarchy(activePositions!))
            }
            stopDraw()
        }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    }
    //矩形
    else if (drawType.value == 'rectangle') {
        handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
            const pickPosition = viewer.scene.pickPosition(e.position)
            if (!pickPosition) {
                return
            }
            if (activePositions.length == 0) {
                activePositions.push(pickPosition)
                dynamicPositions = new Cesium.CallbackProperty(() => { return createRectangle(activePositions) }, false)
                dynamicEntity = addRectangle(dynamicPositions)
            }
            else {
                activePositions.push(pickPosition)
                addRectangle(createRectangle(activePositions)!)
                stopDraw()
            }

        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

        handler.setInputAction((event: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
            if (activePositions.length == 0) {
                return
            }
            const position = viewer.scene.pickPosition(event.endPosition)
            if (!position) {
                return
            }
            if (activePositions.length > 1)
                activePositions.pop()
            activePositions.push(position)
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    }
}

//添加点
const addPoint = (position: Cesium.Cartesian3) => {
    return viewer.entities.add({
        position: position,
        point: {
            pixelSize: 5,
            color: Cesium.Color.RED
        }
    })
}
//添加线
const addPolyline = (positions: Cesium.Cartesian3[] | Cesium.CallbackProperty) => {
    return viewer.entities.add({
        polyline: {
            positions: positions,
            material: Cesium.Color.RED,
            width: 4,
            depthFailMaterial: Cesium.Color.RED
        }
    })
}
//添加面
const addPolygon = (positions: Cesium.PolygonHierarchy | Cesium.CallbackProperty) => {
    return viewer.entities.add({
        polygon: {
            hierarchy: positions,
            material: Cesium.Color.SKYBLUE.withAlpha(0.5)
        }
    })
}
//添加矩形
const createRectangle = (positions: Cesium.Cartesian3[]) => {
    if (positions.length < 2) return new Cesium.Rectangle()
    const startCartographic = Cesium.Cartographic.fromCartesian(positions[0])
    const endCartographic = Cesium.Cartographic.fromCartesian(positions[1])
    const west = Math.min(startCartographic.longitude, endCartographic.longitude)
    const east = Math.max(startCartographic.longitude, endCartographic.longitude)
    const south = Math.min(startCartographic.latitude, endCartographic.latitude)
    const north = Math.max(startCartographic.latitude, endCartographic.latitude)
    if (east - west < Cesium.Math.toRadians(0.000001) || north - south < Cesium.Math.toRadians(0.000001)) {
        return undefined
    }
    return new Cesium.Rectangle(west, south, east, north)
}

const addRectangle = (rectangle: Cesium.Rectangle | Cesium.CallbackProperty) => {
    return viewer.entities.add({
        rectangle: {
            coordinates: rectangle,
            material: Cesium.Color.SKYBLUE.withAlpha(0.5)
        }
    })
}
//添加圆

//停止绘制
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

onBeforeUnmount(() => {
    handler.destroy()
})
</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
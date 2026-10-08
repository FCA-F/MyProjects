<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
        <div ref="popupRef" class="popup-box">
            <div class="popup-title">DIV弹窗</div>
            <div class="popup-content">
                <div>位置跟随世界坐标点</div>
                <div>拖动视角时会同步更新</div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import { onBeforeUnmount, ref } from 'vue'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import { initCesiumBase } from '@/utils/cesium'

let viewer: Cesium.Viewer
let updatePopupListener: (() => void) | undefined

const popupRef = ref<HTMLDivElement | null>(null)

const popupPosition = Cesium.Cartesian3.fromDegrees(120, 30, 1)

const onMapReady = async (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer

    await initCesiumBase(viewer, {
        destination: { lng: 120, lat: 30, height: 1000 },
    })

    updatePopup()
    updatePopupListener = viewer.scene.preRender.addEventListener(updatePopup)
}

const updatePopup = () => {
    if (!viewer || !popupRef.value) return

    const windowCoord = Cesium.SceneTransforms.worldToWindowCoordinates(
        viewer.scene,
        popupPosition,
    )

    if (!windowCoord) return

    const popup = popupRef.value
    popup.style.left = `${windowCoord.x}px`
    popup.style.top = `${windowCoord.y}px`
}

onBeforeUnmount(() => {
    if (viewer && updatePopupListener) {
        updatePopupListener()
        updatePopupListener = undefined
    }
})
</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100%;
    position: relative;
}

.popup-box {
    position: absolute;
    left: 0;
    top: 0;
    transform: translate(-50%, -100%);
    min-width: 160px;
    padding: 8px 10px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.92);
    color: #1f1f1f;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
    pointer-events: none;
    opacity: 1;
}

.popup-title {
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 4px;
}

.popup-content {
    font-size: 12px;
    line-height: 1.5;
}
</style>
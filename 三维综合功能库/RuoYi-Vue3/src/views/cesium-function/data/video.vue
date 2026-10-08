<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
        <DraggableModal>

        </DraggableModal>
        <!--id，ref，声音，自动播放，循环播放，展示-->
        <video id="myVideo" ref="videoElement" muted="true" autoplay="true" loop="true" style="display:none">
            <source src="/data/video.mp4" type="video/mp4">
        </video>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import { initCesiumBase } from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

let viewer: Cesium.Viewer
const videoElement = ref<HTMLVideoElement>()

const onMapReady = (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer

    initCesiumBase(viewer, {
        destination: { lng: 114.40740, lat: 30.50721, height: 1000 },
        orientation: { heading: 0, pitch: -30, roll: 0 },
        terrain: true,
        shouldAnimate: true
    })

    loadHorizontalVideo()
    loadVerticalVideo()
}

const loadHorizontalVideo = () => {
    // 视频同步器
    new Cesium.VideoSynchronizer({
        clock: viewer.clock,
        element: videoElement.value
    })

    // 添加一个矩形实体，把视频作为材质
    let videoRectangle = viewer.entities.add({
        rectangle: {
            // 定义矩形范围（西, 南, 东, 北）
            coordinates: Cesium.Rectangle.fromDegrees(
                114.40740, 30.50721,  // 左下角
                114.42740, 30.52721,  // 右上角
            ),
            material: new Cesium.ImageMaterialProperty({
                image: videoElement.value!,
            }),
            //height: 50,              // 离地高度（米），避免与地形穿插

        }
    })

}

const loadVerticalVideo = () => {
    let greenWall = viewer.entities.add({
        name: "视频墙",
        wall: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights([
                114.401918, 30.524281, 1000.0, 114.391418, 30.524281, 1000.0,
            ]),
            minimumHeights: [120, 120],
            material: new Cesium.ImageMaterialProperty({
                image: videoElement.value!,
            }),
        },
    });
}

</script>
<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>

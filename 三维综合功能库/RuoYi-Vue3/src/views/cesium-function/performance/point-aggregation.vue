<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
        <DraggableModal title="点聚合">
            <div class="row">
                <el-button type="primary" @click="createPointCluster">生成聚合点</el-button>
                <el-button @click="clearPointCluster">清除</el-button>
            </div>
            <div class="row">
                <span class="label">聚合范围</span>
                <el-input-number v-model.number="pixelRange" :min="20" :max="200" :step="10" />
            </div>
            <div class="row">
                <span class="label">最小数量</span>
                <el-input-number v-model.number="minimumClusterSize" :min="2" :max="20" :step="1" />
            </div>
            <div class="row">
                <span class="label">点数量</span>
                <el-input-number v-model.number="pointCount" :min="100" :max="100000" :step="1000" />
            </div>
            <div class="row">
                <el-switch v-model="clusterEnabled" active-text="启用聚合" inactive-text="关闭聚合" />
            </div>
        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import { onBeforeUnmount, ref, watch } from 'vue'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import { initCesiumBase } from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

let viewer: Cesium.Viewer
let pointDataSource: Cesium.CustomDataSource | undefined
const clusterImageCache = new Map<number, string>()

const pointCount = ref(10000)
const pixelRange = ref(100)
const minimumClusterSize = ref(3)
const clusterEnabled = ref(true)

const onMapReady = (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer

    initCesiumBase(viewer, {
        destination: { lng: 104, lat: 30, height: 9000000 },
        orientation: { heading: 0, pitch: -90, roll: 0 },
    })

    createPointCluster()
}

const createPointCluster = () => {
    if (!viewer) return

    clearPointCluster()

    pointDataSource = new Cesium.CustomDataSource('cluster-points')//自定义数据源
    viewer.dataSources.add(pointDataSource)

    for (let i = 0; i < pointCount.value; i++) {
        const lon = Cesium.Math.randomBetween(73, 135)
        const lat = Cesium.Math.randomBetween(18, 54)

        pointDataSource.entities.add({
            position: Cesium.Cartesian3.fromDegrees(lon, lat),
            point: {
                pixelSize: 10,
                color: Cesium.Color.YELLOW.withAlpha(0.9),
                outlineColor: Cesium.Color.WHITE,
                outlineWidth: 2,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
        })
    }

    const clustering = pointDataSource.clustering
    clustering.enabled = clusterEnabled.value
    clustering.pixelRange = pixelRange.value
    clustering.minimumClusterSize = minimumClusterSize.value

    clustering.clusterEvent.addEventListener((clusteredEntities, cluster) => {//(原始聚合对象，聚合结果)
        cluster.label.show = false//标签
        cluster.billboard.show = true//广告牌
        cluster.billboard.verticalOrigin = Cesium.VerticalOrigin.CENTER//图片中心对齐聚合点
        cluster.billboard.disableDepthTestDistance = Number.POSITIVE_INFINITY//不被遮挡
        cluster.billboard.image = getClusterImage(clusteredEntities.length)//聚合canvas图像
    })

}

const clearPointCluster = () => {
    if (!viewer || !pointDataSource) return

    viewer.dataSources.remove(pointDataSource, true)
    pointDataSource = undefined
}

const applyClusterOptions = () => {
    if (!pointDataSource) return

    pointDataSource.clustering.enabled = clusterEnabled.value
    pointDataSource.clustering.pixelRange = pixelRange.value
    pointDataSource.clustering.minimumClusterSize = minimumClusterSize.value
}

const getClusterImage = (count: number) => {
    const cachedImage = clusterImageCache.get(count)//是否有同样标签
    if (cachedImage) {
        return cachedImage
    }

    const size = Math.min(96, 34 + Math.log10(count) * 22)//标签大小
    const image = createClusterCanvas(size, count)
    clusterImageCache.set(count, image)
    return image
}

const createClusterCanvas = (size: number, count: number) => {
    const canvas = document.createElement('canvas')
    const devicePixelRatio = window.devicePixelRatio || 1
    const canvasSize = Math.ceil(size * devicePixelRatio)//逻辑像素*物理像素

    canvas.width = canvasSize
    canvas.height = canvasSize

    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    ctx.scale(devicePixelRatio, devicePixelRatio)//匹配实际画布
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2)
    ctx.fillStyle = getClusterColor(count)
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()

    ctx.font = `bold ${count >= 10000 ? 15 : 16}px Arial`
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(formatClusterCount(count), size / 2, size / 2)

    return canvas.toDataURL('image/png')
}
//颜色
const getClusterColor = (count: number) => {
    if (count >= 1000) return 'rgba(220, 53, 69, 0.88)'
    if (count >= 100) return 'rgba(245, 124, 0, 0.88)'
    return 'rgba(25, 118, 210, 0.88)'
}
//文本
const formatClusterCount = (count: number) => {
    if (count >= 10000) return `${Math.round(count / 1000)}k`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
    return `${count}`
}

watch([clusterEnabled, pixelRange, minimumClusterSize], applyClusterOptions)

watch(pointCount, () => {
    if (pointDataSource) {
        createPointCluster()
    }
})

onBeforeUnmount(() => {
    clearPointCluster()
    clusterImageCache.clear()
})
</script>
<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>

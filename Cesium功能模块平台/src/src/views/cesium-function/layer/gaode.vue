<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
        <DraggableModal title="高德底图">
            <div class="row">
                <label class="label">图层</label>
                <el-select v-model="imageryType" class="input">
                    <el-option v-for="item in options" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
            </div>
            <div class="row">
                <label class="label">叠加</label>
                <el-switch v-model="isStack" />
            </div>
        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import { ref, watch } from 'vue'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import { initCesiumBase } from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

let viewer: Cesium.Viewer
const imageryType = ref('vec')
const isStack = ref(false)

const options = [
    { value: 'default', label: 'Cesium默认底图' },
    { value: 'vec', label: '高德矢量地图' },
    { value: 'img', label: '高德卫星影像' },
    { value: 'road', label: '高德路网注记' },
]

const onMapReady = (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer
    initCesiumBase(viewer, {
        destination: { lng: 117.1336, lat: 36.6772, height: 5000 },
        osm: false,
    })
    loadImagery()
}

const loadImagery = () => {
    const t = imageryType.value

    if (t === 'default') {
        if (!isStack.value) viewer.imageryLayers.removeAll()
        Cesium.createWorldImageryAsync().then((provider) => {
            viewer.imageryLayers.addImageryProvider(provider)
        })
        return
    }

    if (!isStack.value) viewer.imageryLayers.removeAll()

    const urlMap: Record<string, string> = {
        vec: 'http://wprd0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=7',
        img: 'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
        road: 'http://wprd0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=8',
    }

    const provider = new Cesium.UrlTemplateImageryProvider({
        url: urlMap[t],
        subdomains: ['1', '2', '3', '4'],
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        minimumLevel: 3,
        maximumLevel: 18,
        credit: new Cesium.Credit('高德地图'),
    })
    viewer.imageryLayers.addImageryProvider(provider)
}

watch(imageryType, () => loadImagery())
</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
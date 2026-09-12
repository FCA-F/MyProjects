<template>
    <div class="toolbar">
        <div>
            <label class="oneText">图层</label>
            <label>地形</label>
            <el-switch v-model="cesiumStore.isTerrain" />
        </div>

        <el-select v-model="layerStyle">
            <el-option value="default" label="默认" />
            <el-option value="tianditu" label="天地图" />
            <el-option value="gaode" label="高德" />
        </el-select>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import { ref, watch, } from 'vue'
import { useCesiumStore } from '@/stores/cesium.ts'
import '@/styles/leftToolbar.css'

const cesiumStore = useCesiumStore()

const viewer = cesiumStore.viewer as Cesium.Viewer

const layerStyle = ref('default')


watch(layerStyle, (val) => {

    switch (val) {
        case 'tianditu':
            loadTianditu(viewer)
            break
        case 'gaode':
            loadGaode(viewer)
            break
        default:
            loadDefault(viewer)
            break
    }
})

const loadDefault = (v: Cesium.Viewer) => {
    v.imageryLayers.removeAll()
    Cesium.createWorldImageryAsync().then((provider) => {
        v.imageryLayers.addImageryProvider(provider)
    })
}

const loadTianditu = (v: Cesium.Viewer) => {
    v.imageryLayers.removeAll()
    const tianditu_Token = '424afc8601af28396bb101c3eae3b754'

    const imgImageryLayer = new Cesium.WebMapTileServiceImageryProvider({
        url: `http://t0.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&tk=${tianditu_Token}`,
        layer: 'img',
        style: 'default',
        format: 'tiles',
        tileMatrixSetID: 'w',
        maximumLevel: 18,
        subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'],
    })
    const ciaImageryLayer = new Cesium.WebMapTileServiceImageryProvider({
        url: `http://t0.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&tk=${tianditu_Token}`,
        layer: 'cva',
        style: 'default',
        format: 'tiles',
        tileMatrixSetID: 'w',
        maximumLevel: 18,
        subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'],
    })

    v.imageryLayers.addImageryProvider(imgImageryLayer)
    v.imageryLayers.addImageryProvider(ciaImageryLayer)
}

const loadGaode = (v: Cesium.Viewer) => {
    const provider = new Cesium.UrlTemplateImageryProvider({
        url: 'http://wprd0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=7',
        subdomains: ['1', '2', '3', '4'],
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        minimumLevel: 3,
        maximumLevel: 18,
        credit: new Cesium.Credit('高德地图'),
    })
    v.imageryLayers.addImageryProvider(provider)
}
</script>
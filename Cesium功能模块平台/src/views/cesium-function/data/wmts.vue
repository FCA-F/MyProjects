<template>
  <div class="page-container">
    <CesiumMap @ready="onMapReady"/>
  </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import {initCesiumBase} from '@/utils/cesium'

let viewer:Cesium.Viewer

const tileMatrixLabels = [];
for (let i = 0; i <= 5; i++) {
  tileMatrixLabels.push('EPSG:4326:' + i);
}

const wmtsProvider = new Cesium.WebMapTileServiceImageryProvider({
  url: 'http://localhost:8083/geoserver/gwc/service/wmts',
  layer: 'Cesium:HYP_LR_SR_W',
  style: '',
  format: 'image/png',
  tileMatrixSetID: 'EPSG:4326',
  tileMatrixLabels: tileMatrixLabels,
  tilingScheme: new Cesium.GeographicTilingScheme(),
  maximumLevel: 5
});

const onMapReady=(cesiumViewer:Cesium.Viewer)=>{
    viewer=cesiumViewer
    initCesiumBase(viewer,{
        destination:{lng:117.1336,lat:36.6772,height:5000},
    })
    
    viewer.imageryLayers.addImageryProvider(wmtsProvider);
    viewer.camera.flyHome(0);
}
/*
在WMS基础上，在GeoSever中，点击左侧栏Tile缓存-切片图层，找到刚刚的WMS，点击右边的Seed/Truncate，
设置参数后点submit提交
（
Number of tasks to use增加线程数可以加快切图速度。如果电脑性能一般，填 2 即可；如果性能较好，可以填 4；
Zoom stop一次性切到 15 级会生成海量瓦片，极其耗时且容易卡死。可以先切 0~5 级做测试
）
*/
</script>

<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>
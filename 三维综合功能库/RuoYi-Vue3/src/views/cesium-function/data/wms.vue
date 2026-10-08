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

// 栅格WMS 
const wmsProvider = new Cesium.WebMapServiceImageryProvider({
    url: 'http://localhost:8083/geoserver/Cesium/wms',  // ← GeoServer WMS 端点
    layers: 'Cesium:HYP_LR_SR_W',                        // ← 工作空间:图层名
    parameters: {
        service: 'WMS',
        version: '1.1.1',
        request: 'GetMap',
        format: 'image/png',
        transparent: false,   // 底图用 false（不透明），叠加层才用 true
        srs: 'EPSG:4326',     // 1.1.1 用 srs；1.3.0 用 crs
        styles: ''            // 用默认样式
    },
    tileWidth: 256,
    tileHeight: 256,
    maximumLevel: 8
});

//矢量WMS
const roadWMS = new Cesium.WebMapServiceImageryProvider({
  url: 'http://localhost:8083/geoserver/Cesium/wms',
  layers: 'Cesium:370100',           // ← 工作区:图层名，按你实际发布的填
  parameters: {
    service: 'WMS',
    version: '1.1.1',
    request: 'GetMap',
    format: 'image/png',
    transparent: true,                    // ← 关键，透明叠加
    srs: 'EPSG:4326',
    styles: ''                            // 用默认线样式
  }
});

const onMapReady=(cesiumViewer:Cesium.Viewer)=>{
    viewer=cesiumViewer
    initCesiumBase(viewer,{
        destination:{lng:117.1336,lat:36.6772,height:5000},
    })
    
    viewer.imageryLayers.addImageryProvider(wmsProvider);
    viewer.imageryLayers.addImageryProvider(roadWMS);
    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(117.0, 36.65, 200000)
    });
}
/*

GeoServer数据发布:
1.前置配置：
需记事本打开geoserver中的web.xml文件，去掉注释，不然域有问题

第 1 处：第 148 行左右（删掉<!--和-->）
xml
<!-- Uncomment following filter to enable CORS in Jetty. Do not forget the second config block further down. -->
<!--    
<filter>
   <filter-name>cross-origin</filter-name>
   <filter-class>org.eclipse.jetty.servlets.CrossOriginFilter</filter-class>
   <init-param>
     <param-name>chainPreflight</param-name>
     <param-value>false</param-value>
   </init-param>
   <init-param>
     <param-name>allowedOrigins</param-name>
     <param-value>*</param-value>
   </init-param>
   <init-param>
     <param-name>allowedMethods</param-name>
     <param-value>GET,POST,PUT,DELETE,HEAD,OPTIONS</param-value>
   </init-param>
   <init-param>
     <param-name>allowedHeaders</param-name>
     <param-value>*</param-value>
   </init-param>
 </filter>
 -->
第2处 ：第 209 行左右
<!-- Uncomment following filter-mapping to enable CORS -->
<!--
<filter-mapping>
    <filter-name>cross-origin</filter-name>
    <url-pattern>/*</url-pattern>
</filter-mapping>
-->

2.运行:打开geoserver目录下的/bin/startup.bat运行,浏览器输入http://localhost:8083/geoserver，默认用户名：admin,密码：geoserver

3.发布：在左侧栏数据-工作空间，添加新工作空间。
        在左侧栏存储仓库，选择geotiff，设置工作空间，连接参数（数据路径）等
        点击发布跳转到发布设置。设置Bounding Box，点击Compute from native bounds​ （从原生范围计算）。
        点击保存，发布成功。可以在数据浏览点openlayers查看
*/
</script>

<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>
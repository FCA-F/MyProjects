<template>
  <div class="page-container">
    <CesiumMap @ready="onMapReady"/>
    <DraggableModal title="天地图">
        <div class="row">
            <label class="label">图层</label>
            <el-select v-model="imageryType" class="input">
                <el-option v-for="item in options" :key="item.value" :label="item.label" :value="item.value"/>
            </el-select>
        </div>
        <div class="row">
            <label class="label">叠加</label>
            <el-switch v-model="isStack"/>
        </div>
    </DraggableModal>
  </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import {initCesiumBase} from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

let viewer:Cesium.Viewer
const imageryType=ref('default')
const isStack=ref(false)

const options=[
    {value:'default',label:'Cesium默认底图'},
    {value:'img',label:'影像㡳图'},
    {value:'cia',label:'影像注记'},
    {value:'vec',label:'矢量底图'},
    {value:'cva',label:'矢量注记'},
    {value:'ter',label:'地形晕渲'},
    {value:'cta',label:'地形注记'},
]
const tianditu_Token = '424afc8601af28396bb101c3eae3b754';  // ← 换成你申请的 Key


const onMapReady=(cesiumViewer:Cesium.Viewer)=>{
    viewer=cesiumViewer
    initCesiumBase(viewer,{
        destination:{lng:117.1336,lat:36.6772,height:5000}
    })
}
watch(imageryType,(imageryType)=>{
    //默认影像
    if(imageryType=='default'){
        if(!isStack.value) 
            viewer.imageryLayers.removeAll()
        Cesium.createWorldImageryAsync().then((provider) => {
            viewer.imageryLayers.addImageryProvider(provider)
        })
        return
    }
    //天地图影像
    if(!isStack.value) 
        viewer.imageryLayers.removeAll()
    const imageryLayer=new Cesium.WebMapTileServiceImageryProvider({
        url: `http://t0.tianditu.gov.cn/${imageryType}_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${imageryType}&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&tk=${tianditu_Token}`,
        layer: imageryType,
        style: 'default',
        format: 'tiles',
        tileMatrixSetID: 'w',
        maximumLevel: 18,
        subdomains: ['t0','t1','t2','t3','t4','t5','t6','t7']  // 8 个子域负载均衡
    });
    viewer.imageryLayers.addImageryProvider(imageryLayer);
})
/*

// 影像底图
var imgLayer = new Cesium.WebMapTileServiceImageryProvider({
  url: `http://t0.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&tk=${tk}`,
  layer: 'img',
  style: 'default',
  format: 'tiles',
  tileMatrixSetID: 'w',
  maximumLevel: 18,
  subdomains: ['t0','t1','t2','t3','t4','t5','t6','t7']  // 8 个子域负载均衡
});
viewer.imageryLayers.addImageryProvider(imgLayer);

*/

/*
添加方法：
1.前往天地图官网https://www.tianditu.gov.cn/,登录
2.打开个人主页，选择左侧栏开发管理-应用管理-我的应用，创建新应用。创建类型选择“浏览器端”，域名白名单设空，创建密钥
*/
</script>

<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>
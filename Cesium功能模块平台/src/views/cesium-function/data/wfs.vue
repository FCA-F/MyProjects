<template>
  <div class="page-container">
    <CesiumMap @ready="onMapReady"/>
    <DraggableModal title="WFS">
        <div class="row">
            <label class="label">属性</label>
        </div>
        <div v-if="roadEntity" class="modal-body">
            <div class="row">
                <span class="label">名称:</span>
                <span class="label">{{ roadName }}</span>
            </div>
            <div class="row">
                <span class="label">类型:</span>
                <span class="label">{{ roadClass }}</span>
            </div>
            <div class="row">
                <span class="label">id:</span>
                <span class="label">{{ roadId }}</span>
            </div>
        </div>
        <div v-else>
            <div class="label">(当前未选择道路)</div>
        </div>
    </DraggableModal>
  </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import {initCesiumBase} from '@/utils/cesium'

let viewer:Cesium.Viewer
let handler:Cesium.ScreenSpaceEventHandler

let roadEntity=ref<Cesium.Entity|undefined>()
const roadClass=ref<string|undefined>()
const roadName=ref<string|undefined>()
const roadId=ref<string|undefined>()

const wfsUrl = 'http://localhost:8083/geoserver/Cesium/wfs'// 指向 GeoServer 的 OGC 统一入口
  + '?service=WFS&version=1.0.0&request=GetFeature'//GetFeature获取要素数据
  + '&typeName=Cesium:370100'              // 工作区:图层名
  + '&outputFormat=application/json'//返回geojson格式
  + '&maxFeatures=10000';//限制数量，否则全量拉取会卡


const onMapReady=(cesiumViewer:Cesium.Viewer)=>{
    viewer=cesiumViewer
    initCesiumBase(viewer,{
        destination:{lng:117.1336,lat:36.6772,height:10000},
    })
    handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    
      fetch(wfsUrl)//浏览器发请求，相当于浏览器输入网址打开网页
    .then(res => res.json())//res将字符串转为对象
    .then(geojson => {
        // 2. 用 GeoJsonDataSource 加载
        return Cesium.GeoJsonDataSource.load(geojson, {
            stroke: Cesium.Color.YELLOW,
            strokeWidth: 4,
            clampToGround: true                     // 贴地
        });
    })
    .then(dataSource => {
        viewer.dataSources.add(dataSource);

    // 3. 点击道路弹属性
    
    handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        if(roadEntity.value&&roadEntity.value.polyline){
            (roadEntity.value.polyline as any).material=Cesium.Color.YELLOW
        }
        const pickedObject = viewer.scene.pick(e.position)
  
        if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.properties) {
                roadEntity.value=pickedObject.id;
                (roadEntity.value!.polyline as any).material=Cesium.Color.RED;//红色高亮

                const props = (roadEntity.value!.properties as any).getValue(viewer.clock.currentTime)
                roadName.value=props.name
                roadClass.value=props.fclass
                roadId.value=props.osm_id
            }
        else{
            roadEntity.value=undefined
        }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
})
}
/*
发布：
    同WMS一样，在GeoServer发布矢量，选择Shapefile
*/
/*
中文乱码问题:

如:
    geoserver-2.28.3-bin\data_dir\workspaces\Cesium\jinan_roads\datastore.xml
    把这一行：
    <entry key="charset">ISO-8859-1</entry>
    改成：
    <entry key="charset">GBK</entry>
*/
</script>

<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>
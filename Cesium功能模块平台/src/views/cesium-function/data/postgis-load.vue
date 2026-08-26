<template>
  <div class="page-container">
    <CesiumMap @ready="onMapReady"/>
    <DraggableModal title="PostGIS载入">
        <div v-if="selectObject" class="modal-body">
            <div class="row">
                <span class="label">区域:</span>
                <span class="label">{{ selectName }}</span>
            </div>
        </div>
        <div v-else class="modal-body">
            <span class="label-long">(当前未选择区域)</span>
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

const roadMVTUrl = 'http://localhost:8083/geoserver/gwc/service/tms/1.0.0/JINAN:jinan_road@EPSG%3A900913@pbf/{z}/{x}/{y}.pbf?flipY=true'
const regionMVTUrl='http://localhost:8083/geoserver/gwc/service/tms/1.0.0/JINAN:jinan_region@EPSG%3A900913@pbf/{z}/{x}/{y}.pbf?flipY=true'

let roadMVT:Cesium.MVTDataProvider
let regionMVT:Cesium.MVTDataProvider

const selectObject=ref()
const selectName=ref<string|undefined>()

const onMapReady=(cesiumViewer:Cesium.Viewer)=>{
    viewer=cesiumViewer
    initCesiumBase(viewer,{
        destination:{lng:117.1336,lat:36.6772,height:10000},
    })
    handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    
    loadRegionMVT()
    loadRoadMVT()
}

const loadRoadMVT=async()=>{
    roadMVT=await Cesium.MVTDataProvider.fromUrl(
        roadMVTUrl,
        {
            minZoom:10,
            maxZoom:14,
            extent: Cesium.Rectangle.fromDegrees(116.2, 36.0, 117.8, 37.6),//范围
        }
    )
    if(roadMVT){
        viewer.scene.primitives.add(roadMVT)
        roadMVT.tileset!.style=new Cesium.Cesium3DTileStyle({
            color:"color('yellow',1.0)",
            lineWidth: 2.5,
        })
    }
}

const loadRegionMVT=async()=>{
    regionMVT=await Cesium.MVTDataProvider.fromUrl(
        regionMVTUrl,
        {
            minZoom:10,
            maxZoom:14,
            extent: Cesium.Rectangle.fromDegrees(116.2, 36.0, 117.8, 37.6),//范围
        }
    )
    if(regionMVT){
        viewer.scene.primitives.add(regionMVT)
        regionMVT.tileset!.style=new Cesium.Cesium3DTileStyle({
            color:"color('orange',1.0)",
            outlineColor: "color('black', 1.0)",
            outlineWidth: 10,
            lineWidth: 2.5,
        })
    }

    handler.setInputAction((e:Cesium.ScreenSpaceEventHandler.PositionedEvent)=>{
        let pickObjects=viewer.scene.drillPick(e.position)//穿透采集，防止误采到线
        if(pickObjects.length>0){
            for(const pickObject of pickObjects){
                if(pickObject.tileset==regionMVT.tileset){
                    selectObject.value=pickObject
                    selectName.value=pickObject.getProperty('name')
                    updateStyle()
                    break
                }
            }
        }
        else{
            selectName.value=undefined
            updateStyle()
        }
    },Cesium.ScreenSpaceEventType.LEFT_CLICK)
}
const updateStyle=()=>{
    if(!regionMVT){
        return
    }
    regionMVT.tileset!.style=new Cesium.Cesium3DTileStyle({
        color:{
            conditions:[
                ["${feature['name']}==='"+selectName.value+"'","color('red')"],
                ["true","color('orange')"]
            ]
        },
    })
}
/*
pgAdmin 操作

1打开 pgAdmin，在左侧栏右键点击“数据库”，选择“创建-数据库”
2选择刚刚创建的数据库，点击菜单中的“工具-查询工具”
输入CREATE EXTENSION postgis;启用POSTGIS扩展
输入 SELECT postgis_full_version();执行查看版本

QGIS 操作

1在QGIS中打开图层。“图层-添加图层”添加图层。

2打开“图层-数据源管理器”。展开左侧的 PostgreSQL选项。
点击上方的新建按钮。

填写连接参数：
主机：localhost。
端口：5432。
数据库：刚才在 pgAdmin 里创建的库。

测试与保存：点击测试连接，用户名(postgres)和密码(Fca20041005)。

3在“数据库-数据库管理器”左侧，展开PostgreSQL->数据库->public
选择 public文件夹，点击导入图层或文件，导入文件时勾选创建空间索引。

后续在GeoServer中类型选择PostGIS创建，与普通wms\wmts\wfs\mvt一致
*/
</script>

<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>
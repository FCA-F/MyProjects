<template>
  <div class="page-container">
    <CesiumMap @ready="onMapReady"/>
    <DraggableModal title="MVT">
        <div class="row">
            <el-select v-model="fclassType" class="input">
                <el-option 
                    v-for="item in fclassOptions"
                    :key="item.value" :label="item.label" :value="item.value"
                >
                </el-option>
            </el-select>
        </div>
        <div class="row">
            <label>属性</label>
        </div>
        <div v-if="selectObject" class="modal-body">
            <div class="row">
                <span class="label">名称:</span>
                <span class="label">{{ selectName }}</span>
            </div>
            <div class="row">
                <span class="label">类型:</span>
                <span class="label">{{ selectFclass }}</span>
            </div>
            <div class="row">
                <span class="label">id:</span>
                <span class="label">{{ selectId }}</span>
            </div>
        </div>
        <div v-else class="modal-body">
            <span class="label-long">(当前未选择道路)</span>
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
let mvt:Cesium.MVTDataProvider
let handler:Cesium.ScreenSpaceEventHandler

const selectObject=ref()
const selectId=ref<string|undefined>()
const selectFclass=ref<string|undefined>()
const selectName=ref<string|undefined>()

const fclassType=ref<string|undefined>()

let fclassOptions=[
    {value:'residential',label:'residential'},
    {value:'secondary',label:'secondary'},
    {value:'tertiary',label:'tertiary'},
    {value:'service',label:'service'},
    {value:'motorway',label:'motorway'},
    {value:'tertiary',label:'tertiary'}
]


const onMapReady=async(cesiumViewer:Cesium.Viewer)=>{
    viewer=cesiumViewer
    handler=new Cesium.ScreenSpaceEventHandler(viewer.canvas)

    initCesiumBase(viewer,{
        destination:{lng:117.1336,lat:36.6772,height:20000},
    })

    //**MVT载入
    mvt = await Cesium.MVTDataProvider.fromUrl(
        "http://localhost:8083/geoserver/gwc/service/tms/1.0.0/Cesium:370100@EPSG%3A900913@pbf/{z}/{x}/{y}.pbf?flipY=true",
        {
            minZoom: 10,
            maxZoom: 14,
            extent: Cesium.Rectangle.fromDegrees(116.2, 36.0, 117.8, 37.6),//范围
        }
    )

    if(mvt){
        viewer.scene.primitives.add(mvt)
        mvt.tileset!.style = new Cesium.Cesium3DTileStyle({
            color: "color('yellow', 1.0)",
            lineWidth: 2.5,
        })
    }
    //**MVT载入完毕


    handler.setInputAction((e:Cesium.ScreenSpaceEventHandler.PositionedEvent)=>{
        let pickObject=viewer.scene.pick(e.position)
        if(pickObject){
            selectObject.value=pickObject
            selectId.value=pickObject.getProperty('osm_id')
            selectFclass.value=pickObject.getProperty('fclass')
            selectName.value=pickObject.getProperty('name')
            
            updateStyle()
        }
        else{
            selectObject.value=undefined
            selectId.value=undefined
            selectFclass.value=undefined
            selectName.value=undefined
            updateStyle()
        }
    },Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

const updateStyle=()=>{
    if(!mvt){
        return
    }
    mvt.tileset!.style=new Cesium.Cesium3DTileStyle({
        color:{
            conditions:[
                ["${feature['osm_id']}==='"+selectId.value+"'","color('red')"],
                ["${feature['fclass']}==='"+fclassType.value+"'","color('cyan')"],
                ["true","color('yellow')"]
            ]
        },
        lineWidth:2
    })
}
watch(fclassType,()=>{
    updateStyle()
})
/*
发布：
    下载插件：
    先查看GeoServer 版本，下载和 GeoServer 完全同版本的 vectortiles 扩展包，解压后把所有.jar 放到：
    GeoServer/webapps/geoserver/WEB-INF/lib，启动GeoServer

    GeoServer先发布矢量，然后在左侧栏的数据-图层中选择发布的矢量
    点击去选择“图层缓存菜单”，勾选application/vnd.mapbox-vector-tile，可能需要最下面有EPSG:900913
*/
</script>

<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>
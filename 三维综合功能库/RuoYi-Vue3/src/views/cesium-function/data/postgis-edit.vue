<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
        <DraggableModal title="PostGIS编辑（后续会用springboot完善）">
            <div v-if="selectObject" class="modal-body">
                <div class="row">
                    <span class="label">Id:</span>
                    <span class="label">{{ selectId }}</span>
                </div>
                <div class="row">
                    <span class="label">名称:</span>
                    <span class="label">{{ selectName }}</span>
                </div>
                <div class="row">
                    <el-button class="delete-btn" :disabled="isDeleting || !selectId" @click="deleteSelectedRoad"
                        color="red">
                        {{ isDeleting ? '删除中...' : '删除选中道路' }}
                    </el-button>
                </div>
                <div v-if="deleteMessage" class="label">{{ deleteMessage }}</div>
            </div>
            <div v-else class="modal-body">
                <span class="label-long">(当前未选择道路)</span>
                <div v-if="deleteMessage" class="label">{{ deleteMessage }}</div>
            </div>
        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import { initCesiumBase } from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

let viewer: Cesium.Viewer
let handler: Cesium.ScreenSpaceEventHandler

const roadWorkspace = 'JINAN'
const roadTypeName = 'jinan_road'
const roadLayerName = `${roadWorkspace}:${roadTypeName}`
const roadNamespace = 'www.jinan.com'
const roadIdField = 'osm_id'
const geoserverWfsUrl = 'http://localhost:8083/geoserver/wfs'
const roadMVTUrl = `http://localhost:8083/geoserver/gwc/service/tms/1.0.0/${roadLayerName}@EPSG%3A900913@pbf/{z}/{x}/{y}.pbf?flipY=true`

let roadMVT: Cesium.MVTDataProvider | undefined

const selectObject = ref()
const selectId = ref<string | undefined>()
const selectName = ref<string | undefined>()
const isDeleting = ref(false)
const deleteMessage = ref('')

const onMapReady = (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer
    initCesiumBase(viewer, {
        destination: { lng: 117.1336, lat: 36.6772, height: 10000 },
    })
    handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);

    loadRoadMVT()
    setPickRoadHandler()
}

const loadRoadMVT = async () => {
    roadMVT = await Cesium.MVTDataProvider.fromUrl(
        roadMVTUrl,
        {
            minZoom: 10,
            maxZoom: 14,
            extent: Cesium.Rectangle.fromDegrees(116.2, 36.0, 117.8, 37.6),//范围
        }
    )
    if (roadMVT) {
        viewer.scene.primitives.add(roadMVT)
        roadMVT.tileset!.style = new Cesium.Cesium3DTileStyle({
            color: "color('#00e5c8',1.0)",
            lineWidth: 2.5,
        })
    }
}

const setPickRoadHandler = () => {
    handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        let pickObject = viewer.scene.pick(e.position)
        deleteMessage.value = ''
        if (pickObject && typeof pickObject.getProperty === 'function') {
            selectObject.value = pickObject
            selectId.value = pickObject.getProperty('osm_id')
            selectName.value = pickObject.getProperty('name')
            roadMVT!.tileset!.style = new Cesium.Cesium3DTileStyle({
                color: {
                    conditions: [
                        ["${feature['osm_id']}==='" + selectId.value + "'", "color('red')"],
                        ["true", "color('#00e5c8')"]
                    ]
                }
            })
        }
        else {
            clearSelectedRoad()
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

}

const deleteSelectedRoad = async () => {
    if (!selectId.value || isDeleting.value) return

    const roadId = selectId.value
    if (!window.confirm(`确认删除道路 ${roadId} 吗？`)) return

    isDeleting.value = true
    deleteMessage.value = ''
    await deleteRoadByWfsT(roadId)
    clearSelectedRoad()
    await reloadRoadMVT()//刷新，从而使MVT可以实时显示
    deleteMessage.value = `已删除道路 ${roadId}`
    isDeleting.value = false
}

const deleteRoadByWfsT = async (roadId: string) => {
    //删除操作
    const res = await fetch(geoserverWfsUrl, {
        method: 'POST',//事务操作（增删改）
        headers: {
            'Content-Type': 'text/xml;charset=UTF-8',//Content-Type：HTTP 协议里的一个标准字段名，意思是"我发的内容是什么类型"。text/xml：内容类型是 XML 文本。就像文件后缀名 .xml 一样，告诉服务器"请用 XML 解析器来读这个 body"。charset=UTF-8：字符编码是 UTF-8。意思是"里面的中文、特殊字符都用 UTF-8 规则解码"，防止出现乱码。
        },
        body: buildDeleteRoadXml(roadId),
    })

    //提取报错，说人话
    const text = await res.text()
    const wfsException = parseWfsException(text)
    if (!res.ok || wfsException || text.includes('ExceptionReport')) {
        throw new Error(wfsException || `WFS-T delete failed: ${res.status}`)
    }
}

//创建删除xml
const buildDeleteRoadXml = (roadId: string) => {
    return `<?xml version="1.0" encoding="UTF-8"?>  
<wfs:Transaction service="WFS" version="1.1.0"  
    xmlns:wfs="http://www.opengis.net/wfs"
    xmlns:ogc="http://www.opengis.net/ogc"
    xmlns:${roadWorkspace}="${roadNamespace}">
    <wfs:Delete typeName="${roadLayerName}">
        <ogc:Filter>
            <ogc:PropertyIsEqualTo>
                <ogc:PropertyName>${roadIdField}</ogc:PropertyName>
                <ogc:Literal>${escapeXml(roadId)}</ogc:Literal>
            </ogc:PropertyIsEqualTo>
        </ogc:Filter>
    </wfs:Delete>
</wfs:Transaction>`
}
/*
const buildDeleteRoadXml = (roadId: string) => {
    return `<?xml version="1.0" encoding="UTF-8"?>  //xml标准开头
<wfs:Transaction service="WFS" version="1.1.0"  //wfs: 是一个前缀，表示这个标签来自 WFS 标准。Transaction 意思是“我要执行一个事务操作”（增/删/改都叫事务）
    xmlns:wfs="http://www.opengis.net/wfs"//凡是带 wfs: 前缀的标签，都遵循 WFS 标准的定义
    xmlns:ogc="http://www.opengis.net/ogc"//凡是带 ogc: 前缀的标签，都遵循 OGC 通用标准
    xmlns:${roadWorkspace}="${roadNamespace}">//给业务数据（济南道路图层）起的前缀
    <wfs:Delete typeName="${roadLayerName}">
        <ogc:Filter>//过滤语句
            <ogc:PropertyIsEqualTo>//等于号
                <ogc:PropertyName>${roadIdField}</ogc:PropertyName>//字段名
                <ogc:Literal>${escapeXml(roadId)}</ogc:Literal>//值，escapeXml用于去除危险字段
            </ogc:PropertyIsEqualTo>
        </ogc:Filter>
    </wfs:Delete>
</wfs:Transaction>`
}
*/

//去掉xml危险字符
const escapeXml = (value: string) => {
    return value
        .replace(/&/g, '&amp;')// /是正则表达式，同“”，g代表全局，&amp;表示&
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

/*
    输出错误
    getElementsByTagNameNS：按"命名空间 + 标签名"查找元素。
    '*'：通配符，意思是"不管前缀是什么，只要标签名叫 ExceptionText 就行"。因为不同版本的 GeoServer 可能返回 <ows:ExceptionText>、<wfs:ExceptionText> 或者其他前缀，用 * 就不用关心前缀了。
    'ExceptionText'：要找的标签名。
    [0]：取找到的第一个结果（通常只有一个）。
    ?.textContent：?. 是可选链操作符，意思是"如果有这个元素，就取它的文本内容；如果没有，就返回 undefined，别报错"。
*/
const parseWfsException = (text: string) => {
    const xml = new DOMParser().parseFromString(text, 'text/xml')//把 text（GeoServer 返回的 XML 文本）解析成一个可以用 JS 操作的 XML 文档对象
    const exceptionText = xml.getElementsByTagNameNS('*', 'ExceptionText')[0]?.textContent
        || xml.getElementsByTagName('ows:ExceptionText')[0]?.textContent

    return exceptionText?.trim()
}

const clearSelectedRoad = () => {
    selectObject.value = undefined
    selectId.value = undefined
    selectName.value = undefined
}

const reloadRoadMVT = async () => {
    if (roadMVT) {
        viewer.scene.primitives.remove(roadMVT)
        roadMVT = undefined
    }
    await loadRoadMVT()
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

-----删除部分-----
4.最好在创建的时候用QGIS设置主键，在geoserver中左侧菜单选择图层，打开对应的图层，在安全选项卡中，授予权限
*/
</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>

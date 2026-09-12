<template>
    <div ref="popupRef" class="popup-box" v-show="selectId">
        <div class="popup-title">道路信息</div>
        <div class="popup-content">

            <div>
                <label>Id：</label>
                <label>{{ selectId }}</label>
            </div>
            <div>
                <label>名称：</label>
                <label>{{ selectName }}</label>
            </div>
            <div>
                <label>类型：</label>
                <label>{{ selectFclass }}</label>
            </div>
            <div>
                <el-button @click="deleteSelectRoad" type="danger">删除</el-button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import * as Cesium from 'cesium'
import { deleteRoad } from '@/api/postgis'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useCesiumStore } from '@/stores/cesium'

let handler: Cesium.ScreenSpaceEventHandler
let cesiumStore = useCesiumStore()

const selectObject = ref()
const selectId = ref<string | undefined>()
const selectFclass = ref<string | undefined>()
const selectName = ref<string | undefined>()
const selectPosition = ref<Cesium.Cartesian3 | undefined>()
const fclassType = ref<string | undefined>()

let road: Cesium.MVTDataProvider | undefined

const popupRef = ref<HTMLDivElement | null>(null)
let updatePopupListener: (() => void) | undefined
let popupHost: HTMLElement | null = null

const addRoad = async (viewer: Cesium.Viewer) => {
    handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)
    cesiumStore.isTerrain = false
    //viewer.scene.globe.terrainProvider = new Cesium.EllipsoidTerrainProvider()
    updatePopupListener = viewer.scene.preRender.addEventListener(() => updatePopup(viewer))

    //设置父容器是viewer
    popupHost = viewer.container as HTMLElement
    if (popupRef.value && popupRef.value.parentElement !== popupHost) {
        popupHost.appendChild(popupRef.value)
    }

    road = await Cesium.MVTDataProvider.fromUrl(
        'http://localhost:8083/geoserver/gwc/service/tms/1.0.0/JINAN:jinan_road@EPSG%3A900913@pbf/{z}/{x}/{y}.pbf?flipY=true',
        {
            minZoom: 10,
            maxZoom: 14,
            extent: Cesium.Rectangle.fromDegrees(116.2, 36.0, 117.8, 37.6),
        },
    )

    if (road) {
        viewer.scene.primitives.add(road)
        road.tileset!.style = new Cesium.Cesium3DTileStyle({
            color: "color('cyan', 1.0)",
            lineWidth: 2.5,
        })
    }

    handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        const pickObject = viewer.scene.pick(e.position)
        const pickPosition = viewer.scene.pickPosition(e.position)
        if (pickObject) {
            selectObject.value = pickObject
            selectId.value = pickObject.getProperty('osm_id')
            selectFclass.value = pickObject.getProperty('fclass')
            selectName.value = pickObject.getProperty('name')
            selectPosition.value = pickPosition
        } else {
            selectObject.value = undefined
            selectId.value = undefined
            selectFclass.value = undefined
            selectName.value = undefined
            selectPosition.value = undefined
        }
        updateStyle()
        updatePopup(viewer)
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

const removeRoad = (viewer: Cesium.Viewer) => {
    viewer.scene.primitives.remove(road)
    if (handler)
        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

const updateStyle = () => {
    if (!road) return
    road.tileset!.style = new Cesium.Cesium3DTileStyle({
        color: {
            conditions: [
                ["${feature['osm_id']}==='" + selectId.value + "'", "color('red')"],
                ["${feature['fclass']}==='" + fclassType.value + "'", "color('yellow')"],
                ["true", "color('cyan')"],
            ],
        },
        lineWidth: 2,
    })
}

const reloadRoad = async (viewer: Cesium.Viewer) => {
    if (road) {
        viewer.scene.primitives.remove(road)
        road = undefined
    }
    await addRoad(viewer)
}


const updatePopup = (viewer: Cesium.Viewer) => {
    if (!viewer.scene || !popupRef.value || !selectPosition.value) return

    const windowCoord = Cesium.SceneTransforms.worldToWindowCoordinates(
        viewer.scene,
        selectPosition.value,
    )

    if (!windowCoord) return

    const popup = popupRef.value
    popup.style.left = `${windowCoord.x}px`
    popup.style.top = `${windowCoord.y}px`
}

const emit = defineEmits<{
    (e: 'road-deleted'): void
}>()

const deleteSelectRoad = async () => {
    if (!selectId.value) return
    try {
        await ElMessageBox.confirm(`确定删除道路《${selectId.value}》吗？`, '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        })

        await deleteRoad(selectId.value)

        // 删除成功，刷新列表
        ElMessage.success('删除成功')
        emit('road-deleted')
        selectObject.value = undefined
        selectId.value = undefined
        selectFclass.value = undefined
        selectName.value = undefined
        selectPosition.value = undefined

    } catch (error: any) {
        if (error !== 'cancel') {
            ElMessage.error('删除失败')
        }
    }
}

onBeforeUnmount(() => {
    if (updatePopupListener) {
        updatePopupListener()
        updatePopupListener = undefined
    }
    if (popupRef.value && popupHost && popupRef.value.parentElement === popupHost) {
        popupHost.removeChild(popupRef.value)
    }
    if (handler) {
        handler.destroy()
    }
})

defineExpose({ addRoad, removeRoad, reloadRoad })
</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100%;
    position: relative;
}

.popup-box {
    position: absolute;
    left: 0;
    top: 0;
    transform: translate(-50%, -100%);
    min-width: 160px;
    padding: 8px 10px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.92);
    color: #1f1f1f;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
    /*pointer-events: none;*/
    opacity: 1;
    z-index: 20;
}

.popup-title {
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 4px;
}

.popup-content {
    font-size: 12px;
    line-height: 1.5;
}
</style>

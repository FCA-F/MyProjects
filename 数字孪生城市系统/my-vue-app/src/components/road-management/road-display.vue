<template>
    <div ref="popupRef" v-show="selectId" class="road-popup">
        <div class="popup-title">道路信息</div>
        <div class="popup-content">
            <div><span class="popup-label">ID</span><span>{{ selectId }}</span></div>
            <div><span class="popup-label">名称</span><span>{{ selectName || '-' }}</span></div>
            <div><span class="popup-label">类型</span><span>{{ selectFclass || '-' }}</span></div>
            <el-button type="danger" size="small" @click="deleteSelectedRoad">删除道路</el-button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import * as Cesium from 'cesium'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deleteRoad } from '@/api/postgis'

const props = defineProps<{
    viewer: Cesium.Viewer
}>()

const emit = defineEmits<{
    (event: 'road-deleted'): void
}>()

const popupRef = ref<HTMLDivElement | null>(null)
const selectId = ref<string | undefined>()
const selectFclass = ref<string | undefined>()
const selectName = ref<string | undefined>()
const selectPosition = ref<Cesium.Cartesian3 | undefined>()
const selectedFclass = ref<string | undefined>()

let handler: Cesium.ScreenSpaceEventHandler | undefined
let road: Cesium.MVTDataProvider | undefined
let popupHost: HTMLElement | null = null
let updatePopupListener: (() => void) | undefined
let roadLoading: Promise<void> | undefined
let activeViewer: Cesium.Viewer | undefined
let loadGeneration = 0
let isDisposed = false

const roadUrl =
    'http://localhost:8083/geoserver/gwc/service/tms/1.0.0/JINAN:jinan_road@EPSG%3A900913@pbf/{z}/{x}/{y}.pbf?flipY=true'

const isViewerUsable = (viewer: Cesium.Viewer | undefined): viewer is Cesium.Viewer => {
    if (!viewer) {
        return false
    }

    try {
        return !viewer.isDestroyed()
    } catch {
        return false
    }
}

const removePopupListener = () => {
    if (!updatePopupListener) {
        return
    }

    try {
        updatePopupListener()
    } catch {
        // Viewer may already have released its event collection.
    } finally {
        updatePopupListener = undefined
    }
}

const destroyProvider = (provider: Cesium.MVTDataProvider | undefined) => {
    if (!provider) {
        return
    }

    try {
        const destroy = (provider as Cesium.MVTDataProvider & { destroy?: () => void }).destroy
        destroy?.call(provider)
    } catch {
        // The viewer can destroy the provider together with its primitive collection.
    }
}

const clearSelection = () => {
    selectId.value = undefined
    selectFclass.value = undefined
    selectName.value = undefined
    selectPosition.value = undefined
}

const addRoad = async () => {
    if (isDisposed) {
        return
    }

    if (road || roadLoading) {
        return roadLoading
    }

    const viewer = props.viewer
    if (!isViewerUsable(viewer)) {
        return
    }

    activeViewer = viewer
    handler ??= new Cesium.ScreenSpaceEventHandler(viewer.canvas)

    popupHost = viewer.container as HTMLElement
    if (popupRef.value && popupRef.value.parentElement !== popupHost) {
        popupHost.appendChild(popupRef.value)
    }

    updatePopupListener ??= viewer.scene.preRender.addEventListener(() => updatePopup(viewer))

    const currentGeneration = ++loadGeneration
    roadLoading = (async () => {
        let loadedRoad: Cesium.MVTDataProvider | undefined
        let isAddedToScene = false

        try {
            loadedRoad = await Cesium.MVTDataProvider.fromUrl(roadUrl, {
                minZoom: 10,
                maxZoom: 14,
                extent: Cesium.Rectangle.fromDegrees(116.2, 36.0, 117.8, 37.6),
            })

            if (
                isDisposed ||
                currentGeneration !== loadGeneration ||
                !isViewerUsable(viewer)
            ) {
                destroyProvider(loadedRoad)
                return
            }

            road = loadedRoad
            viewer.scene.primitives.add(road)
            isAddedToScene = true
            applyRoadStyle()
            if (handler && !handler.isDestroyed()) {
                handler.setInputAction(selectRoad, Cesium.ScreenSpaceEventType.LEFT_CLICK)
            }
        } catch (error) {
            if (!isDisposed && currentGeneration === loadGeneration) {
                console.error('路网图层加载失败', error)
                ElMessage.error('路网图层加载失败，请检查地图服务')
            }

            if (!isAddedToScene) {
                destroyProvider(loadedRoad)
                road = undefined
            }
        } finally {
            if (currentGeneration === loadGeneration) {
                roadLoading = undefined
            }
        }
    })()

    return roadLoading
}

const removeRoad = () => {
    loadGeneration += 1
    roadLoading = undefined
    removePopupListener()

    if (handler && !handler.isDestroyed()) {
        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
    }

    const viewer = activeViewer ?? props.viewer

    if (road) {
        if (isViewerUsable(viewer)) {
            try {
                viewer.scene.primitives.remove(road)
            } catch {
                destroyProvider(road)
            }
        } else {
            destroyProvider(road)
        }

        road = undefined
    }

    clearSelection()
}

const reloadRoad = async () => {
    if (isDisposed) {
        return
    }

    removeRoad()
    await addRoad()
}

const selectRoad = (event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
    const viewer = activeViewer ?? props.viewer
    if (isDisposed || !isViewerUsable(viewer)) {
        return
    }

    const pickedObject = viewer.scene.pick(event.position) as Cesium.Cesium3DTileFeature | undefined
    const pickedPosition = viewer.scene.pickPosition(event.position)

    if (!pickedObject || typeof pickedObject.getProperty !== 'function') {
        clearSelection()
        applyRoadStyle()
        return
    }

    selectId.value = readFeatureProperty(pickedObject, 'osm_id')
    selectFclass.value = readFeatureProperty(pickedObject, 'fclass')
    selectName.value = readFeatureProperty(pickedObject, 'name')
    selectPosition.value = pickedPosition
    applyRoadStyle()
    updatePopup(viewer)
}

const readFeatureProperty = (feature: Cesium.Cesium3DTileFeature, name: string) => {
    const value = feature.getProperty(name)
    return value === undefined || value === null ? undefined : String(value)
}

const escapeStyleString = (value: string) => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

const applyRoadStyle = () => {
    if (!road?.tileset) {
        return
    }

    const conditions: [string, string][] = []
    const selectedId = selectId.value ? escapeStyleString(selectId.value) : undefined
    const selectedClass = selectedFclass.value
        ? escapeStyleString(selectedFclass.value)
        : undefined

    if (selectedId) {
        conditions.push([`\${feature['osm_id']} === '${selectedId}'`, "color('red')"])
    }

    if (selectedClass) {
        conditions.push([
            `\${feature['fclass']} === '${selectedClass}'`,
            "color('yellow')",
        ])
    }

    conditions.push(["true", "color('cyan')"])

    road.tileset.style = new Cesium.Cesium3DTileStyle({
        color: { conditions },
        lineWidth: 2.5,
    })
}

const setFclassFilter = (fclass?: string | null) => {
    selectedFclass.value = fclass || undefined
    applyRoadStyle()
}

const updatePopup = (viewer: Cesium.Viewer) => {
    if (
        !popupRef.value ||
        !selectPosition.value ||
        !isViewerUsable(viewer) ||
        !viewer.scene
    ) {
        return
    }

    const windowCoordinate = Cesium.SceneTransforms.worldToWindowCoordinates(
        viewer.scene,
        selectPosition.value,
    )

    if (!windowCoordinate) {
        return
    }

    popupRef.value.style.left = `${windowCoordinate.x}px`
    popupRef.value.style.top = `${windowCoordinate.y}px`
}

const deleteSelectedRoad = async () => {
    if (!selectId.value) {
        return
    }

    try {
        await ElMessageBox.confirm(`确定删除道路《${selectId.value}》吗？`, '删除道路', {
            confirmButtonText: '确定删除',
            cancelButtonText: '取消',
            type: 'warning',
        })

        await deleteRoad(selectId.value)
        ElMessage.success('删除成功')
        clearSelection()
        if (!isDisposed) {
            emit('road-deleted')
        }
    } catch (error: any) {
        if (error !== 'cancel' && error !== 'close') {
            ElMessage.error('删除失败')
        }
    }
}

const dispose = () => {
    if (isDisposed) {
        return
    }

    isDisposed = true
    removeRoad()

    if (popupRef.value && popupHost && popupRef.value.parentElement === popupHost) {
        popupHost.removeChild(popupRef.value)
    }

    if (handler && !handler.isDestroyed()) {
        handler.destroy()
    }

    handler = undefined
    activeViewer = undefined
}

onBeforeUnmount(dispose)

defineExpose({
    addRoad,
    removeRoad,
    reloadRoad,
    setFclassFilter,
    dispose,
})
</script>

<style scoped>
.road-popup {
    position: absolute;
    z-index: 20;
    min-width: 194px;
    padding: 12px 13px 13px;
    transform: translate(-50%, calc(-100% - 12px));
    border: 1px solid rgba(126, 221, 224, 0.52);
    border-radius: 8px;
    background: rgba(7, 29, 49, 0.9);
    box-shadow:
        0 12px 30px rgba(3, 22, 39, 0.34),
        0 0 0 1px rgba(255, 255, 255, 0.08) inset;
    backdrop-filter: blur(10px);
    color: #e6f5fb;
    font-size: 12px;
}

.road-popup::before {
    position: absolute;
    top: 0;
    right: 18px;
    left: 18px;
    height: 2px;
    background: #45c4b0;
    box-shadow: 0 0 10px rgba(69, 196, 176, 0.8);
    content: '';
}

.road-popup::after {
    position: absolute;
    bottom: -7px;
    left: 50%;
    width: 12px;
    height: 12px;
    border-right: 1px solid rgba(126, 221, 224, 0.52);
    border-bottom: 1px solid rgba(126, 221, 224, 0.52);
    background: rgba(7, 29, 49, 0.9);
    transform: translateX(-50%) rotate(45deg);
    content: '';
}

.popup-title {
    position: relative;
    z-index: 1;
    margin-bottom: 9px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(157, 210, 220, 0.2);
    color: #f1fbff;
    font-size: 14px;
    font-weight: 700;
}

.popup-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
    line-height: 1.45;
}

.popup-content>div {
    display: flex;
    gap: 8px;
}

.popup-label {
    width: 34px;
    flex: 0 0 34px;
    color: #91b1c4;
}

.popup-content .el-button {
    align-self: flex-end;
    margin-top: 4px;
    border-color: rgba(245, 126, 126, 0.72);
    background: rgba(224, 100, 100, 0.92);
    box-shadow: 0 4px 10px rgba(181, 62, 62, 0.22);
}

.popup-content .el-button:hover {
    border-color: #ef8b8b;
    background: #e36f6f;
}
</style>

<template>
    <div class="road-panel">
        <RoadDisplay ref="roadDisplayRef" :viewer="viewer" @road-deleted="handleRoadDisplayDelete" />

        <div class="road-panel-header">
            <div class="panel-heading">
                <span class="heading-mark">
                    <el-icon>
                        <Guide />
                    </el-icon>
                </span>
                <div>
                    <strong>道路数据</strong>
                    <span>路网要素管理与地图联动</span>
                </div>
            </div>

            <div class="road-actions">
                <div class="road-filter">
                    <span>道路分类</span>
                    <el-select
                        v-model="selectedFclass"
                        class="fclass-select"
                        size="small"
                        clearable
                        placeholder="全部类型"
                        @change="handleFclassChange"
                    >
                        <el-option
                            v-for="item in fclassOptions"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value"
                        />
                    </el-select>
                </div>

                <div class="road-switch">
                    <span>显示全部道路</span>
                    <el-switch v-model="isShowRoad" @change="switchRoadVisibility" />
                </div>
                <el-button v-if="isAdmin" type="primary" size="small" @click="openPost">
                    <el-icon>
                        <Plus />
                    </el-icon>
                    新增道路
                </el-button>
                <el-button size="small" @click="loadRoadPage">
                    <el-icon>
                        <Refresh />
                    </el-icon>
                    刷新
                </el-button>
            </div>
        </div>

        <div class="road-table-wrap">
            <el-table v-loading="isLoading" :data="roadList" border stripe height="100%" table-layout="fixed"
                empty-text="暂无道路数据">
                <el-table-column prop="osmId" label="OSM ID" min-width="120" />
                <el-table-column prop="code" label="代码" min-width="80" />
                <el-table-column prop="fclass" label="类型" min-width="110" show-overflow-tooltip />
                <el-table-column prop="name" label="名称" min-width="140" show-overflow-tooltip />
                <el-table-column prop="ref" label="参考编号" min-width="110" show-overflow-tooltip />
                <el-table-column prop="oneway" label="单行" min-width="80">
                    <template #default="{ row }">
                        {{ row.oneway || '-' }}
                    </template>
                </el-table-column>
                <el-table-column prop="maxspeed" label="限速" min-width="95">
                    <template #default="{ row }">
                        {{ row.maxspeed ?? '-' }}<span v-if="row.maxspeed !== null"> km/h</span>
                    </template>
                </el-table-column>
                <el-table-column prop="layer" label="图层" min-width="75" />
                <el-table-column prop="bridge" label="桥梁" min-width="75">
                    <template #default="{ row }">
                        {{ row.bridge || '-' }}
                    </template>
                </el-table-column>
                <el-table-column prop="tunnel" label="隧道" min-width="75">
                    <template #default="{ row }">
                        {{ row.tunnel || '-' }}
                    </template>
                </el-table-column>
                <el-table-column v-if="isAdmin" label="操作" width="150" fixed="right">
                    <template #default="{ row }">
                        <el-button type="primary" link @click="openPut(row)">
                            编辑
                        </el-button>
                        <el-button type="danger" link @click="handleDelete(row.osmId)">
                            删除
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
        </div>

        <div class="road-panel-footer">
            <el-pagination v-model:current-page="pageNum" v-model:page-size="pageSize" :page-sizes="[5, 10, 20, 50]"
                :total="total" layout="total, sizes, prev, pager, next, jumper" @current-change="loadRoadPage"
                @size-change="handlePageSizeChange" />

            <div class="search-group">
                <el-input v-model="keyword" clearable placeholder="搜索 OSM ID、名称或类型" @keyup.enter="searchRoad" />
                <el-button type="primary" @click="searchRoad">
                    <el-icon>
                        <Search />
                    </el-icon>
                    搜索
                </el-button>
                <el-button @click="resetSearch">重置</el-button>
            </div>
        </div>

        <el-drawer v-model="isPost" class="road-drawer" title="新增道路" direction="rtl" size="430px"
            :modal="false" :modal-penetrable="true" :lock-scroll="false"
            append-to-body @closed="clearDrawLine">
            <el-form ref="postFormRef" :model="postForm" :rules="postRules" label-width="82px">
                <el-form-item label="OSM ID" prop="osmId">
                    <el-input v-model="postForm.osmId" />
                </el-form-item>
                <el-form-item label="代码" prop="code">
                    <el-input v-model.number="postForm.code" />
                </el-form-item>
                <el-form-item label="类型" prop="fclass">
                    <el-input v-model="postForm.fclass" />
                </el-form-item>
                <el-form-item label="名称" prop="name">
                    <el-input v-model="postForm.name" />
                </el-form-item>
                <el-form-item label="参考编号" prop="ref">
                    <el-input v-model="postForm.ref" />
                </el-form-item>
                <el-form-item label="单行" prop="oneway">
                    <el-input v-model="postForm.oneway" />
                </el-form-item>
                <el-form-item label="最大速度" prop="maxspeed">
                    <el-input v-model.number="postForm.maxspeed" />
                </el-form-item>
                <el-form-item label="图层" prop="layer">
                    <el-input v-model.number="postForm.layer" />
                </el-form-item>
                <el-form-item label="桥梁" prop="bridge">
                    <el-input v-model="postForm.bridge" />
                </el-form-item>
                <el-form-item label="隧道" prop="tunnel">
                    <el-input v-model="postForm.tunnel" />
                </el-form-item>
                <el-form-item label="几何" prop="coordinates">
                    <div class="geometry-box">
                        <el-tag v-if="hasPostGeometry" type="success">
                            已绘制 {{ postForm.coordinates?.length }} 个点
                        </el-tag>
                        <el-tag v-else type="warning">未绘制道路</el-tag>

                        <div v-if="hasPostGeometry" class="geometry-list">
                            <div v-for="(point, index) in postForm.coordinates" :key="index">
                                {{ index + 1 }}. {{ point[0].toFixed(6) }}, {{ point[1].toFixed(6) }}
                            </div>
                        </div>

                        <div class="geometry-actions">
                            <el-button type="primary" plain @click="startDrawLine">
                                <el-icon>
                                    <EditPen />
                                </el-icon>
                                {{ hasPostGeometry ? '重新绘制' : '开始绘制线' }}
                            </el-button>
                            <el-button v-if="hasPostGeometry" text type="danger" @click="clearDrawLine">
                                清除线
                            </el-button>
                        </div>
                    </div>
                </el-form-item>
            </el-form>

            <template #footer>
                <div class="drawer-footer">
                    <el-button @click="isPost = false">取消</el-button>
                    <el-button type="primary" @click="submitPostForm">保存道路</el-button>
                </div>
            </template>
        </el-drawer>

        <el-dialog v-model="isPut" class="road-dialog" title="编辑道路" width="520px" destroy-on-close>
            <el-form ref="putFormRef" :model="putForm" :rules="putRules" label-width="82px">
                <el-form-item label="OSM ID" prop="osmId">
                    <el-input v-model="putForm.osmId" />
                </el-form-item>
                <el-form-item label="代码" prop="code">
                    <el-input v-model.number="putForm.code" />
                </el-form-item>
                <el-form-item label="类型" prop="fclass">
                    <el-input v-model="putForm.fclass" />
                </el-form-item>
                <el-form-item label="名称" prop="name">
                    <el-input v-model="putForm.name" />
                </el-form-item>
                <el-form-item label="参考编号" prop="ref">
                    <el-input v-model="putForm.ref" />
                </el-form-item>
                <el-form-item label="单行" prop="oneway">
                    <el-input v-model="putForm.oneway" />
                </el-form-item>
                <el-form-item label="限速" prop="maxspeed">
                    <el-input v-model.number="putForm.maxspeed" />
                </el-form-item>
                <el-form-item label="图层" prop="layer">
                    <el-input v-model.number="putForm.layer" />
                </el-form-item>
                <el-form-item label="桥梁" prop="bridge">
                    <el-input v-model="putForm.bridge" />
                </el-form-item>
                <el-form-item label="隧道" prop="tunnel">
                    <el-input v-model="putForm.tunnel" />
                </el-form-item>
            </el-form>

            <template #footer>
                <el-button @click="isPut = false">取消</el-button>
                <el-button type="primary" @click="submitPutForm">保存修改</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import * as Cesium from 'cesium'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
    EditPen,
    Guide,
    Plus,
    Refresh,
    Search,
} from '@element-plus/icons-vue'
import { deleteRoad, getRoadPage, postRoad, putRoad } from '@/api/postgis'
import type { PostRoadDTO, Road } from '@/api/postgis'
import { useStore } from '@/stores/store'
import RoadDisplay from './road-display.vue'

const props = defineProps<{
    viewer: Cesium.Viewer
}>()

const store = useStore()
const isAdmin = computed(() => store.user?.role === 'admin')
const roadDisplayRef = ref<InstanceType<typeof RoadDisplay> | null>(null)
let isDisposed = false

const roadList = ref<Road[]>([])
const isLoading = ref(false)
const isShowRoad = ref(true)
const selectedFclass = ref<string | undefined>()
const keyword = ref<string | undefined>()
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)

const fclassOptions = [
    { value: 'residential', label: '居住道路 · residential' },
    { value: 'secondary', label: '次干道 · secondary' },
    { value: 'tertiary', label: '支路 · tertiary' },
    { value: 'service', label: '服务道路 · service' },
    { value: 'motorway', label: '高速公路 · motorway' },
]

const isPost = ref(false)
const isPut = ref(false)
const postFormRef = ref<FormInstance>()
const putFormRef = ref<FormInstance>()

const getActiveViewer = () => {
    try {
        return props.viewer.isDestroyed() ? undefined : props.viewer
    } catch {
        return undefined
    }
}

const postForm = reactive<PostRoadDTO>({
    osmId: null,
    code: null,
    fclass: null,
    name: null,
    ref: null,
    oneway: null,
    maxspeed: null,
    layer: null,
    bridge: null,
    tunnel: null,
    coordinates: null,
})

const putForm = reactive<Road>({
    osmId: null,
    code: null,
    fclass: null,
    name: null,
    ref: null,
    oneway: null,
    maxspeed: null,
    layer: null,
    bridge: null,
    tunnel: null,
})

const postRules: FormRules<PostRoadDTO> = {
    osmId: [{ required: true, message: '请输入 OSM ID', trigger: 'blur' }],
    code: [
        { required: true, message: '请输入道路代码', trigger: 'blur' },
        { type: 'number', message: '道路代码必须为数字', trigger: 'blur' },
    ],
    coordinates: [{ required: true, message: '请先绘制道路线', trigger: 'change' }],
}

const putRules: FormRules<Road> = {
    osmId: [{ required: true, message: '请输入 OSM ID', trigger: 'blur' }],
    code: [
        { required: true, message: '请输入道路代码', trigger: 'blur' },
        { type: 'number', message: '道路代码必须为数字', trigger: 'blur' },
    ],
    name: [{ max: 100, message: '道路名称不能超过 100 个字符', trigger: 'blur' }],
    maxspeed: [
        {
            validator: (_rule, value, callback) => {
                if (value === null || value === '') {
                    callback()
                    return
                }

                const speed = Number(value)
                if (Number.isNaN(speed) || speed < 0 || speed > 300) {
                    callback(new Error('限速范围应在 0-300 之间'))
                    return
                }

                callback()
            },
            trigger: 'blur',
        },
    ],
}

const hasPostGeometry = computed(() => (postForm.coordinates?.length ?? 0) >= 2)

const loadRoadPage = async () => {
    if (isDisposed || isLoading.value) {
        return
    }

    isLoading.value = true
    try {
        const response = await getRoadPage(
            pageNum.value,
            pageSize.value,
            keyword.value || undefined,
        )
        if (isDisposed) {
            return
        }

        roadList.value = response.data.records
        total.value = response.data.total
    } catch (error) {
        if (!isDisposed) {
            console.error('道路列表加载失败', error)
            ElMessage.error('道路列表加载失败')
        }
    } finally {
        isLoading.value = false
    }
}

const searchRoad = () => {
    pageNum.value = 1
    void loadRoadPage()
}

const resetSearch = () => {
    keyword.value = undefined
    pageNum.value = 1
    void loadRoadPage()
}

const handlePageSizeChange = () => {
    pageNum.value = 1
    void loadRoadPage()
}

const switchRoadVisibility = async (visible: boolean | string | number) => {
    if (isDisposed) {
        return
    }

    if (visible) {
        await roadDisplayRef.value?.addRoad()
    } else {
        roadDisplayRef.value?.removeRoad()
    }
}

const handleFclassChange = (value: string | undefined) => {
    roadDisplayRef.value?.setFclassFilter(value)
}

const resetPostForm = () => {
    Object.assign(postForm, {
        osmId: null,
        code: null,
        fclass: null,
        name: null,
        ref: null,
        oneway: null,
        maxspeed: null,
        layer: null,
        bridge: null,
        tunnel: null,
        coordinates: null,
    })
    postFormRef.value?.clearValidate()
}

const openPost = () => {
    resetPostForm()
    isPost.value = true
}

const submitPostForm = async () => {
    if (!postFormRef.value) {
        return
    }

    try {
        await postFormRef.value.validate()
        await postRoad(postForm)
        ElMessage.success('道路新增成功')
        isPost.value = false
        clearDrawLine()
        await loadRoadPage()
        if (isShowRoad.value) {
            await roadDisplayRef.value?.reloadRoad()
        }
    } catch (error) {
        if (error !== false) {
            console.error('道路新增失败', error)
            ElMessage.error('道路新增失败')
        }
    }
}

let drawHandler: Cesium.ScreenSpaceEventHandler | undefined
let drawEntity: Cesium.Entity | undefined
let dynamicEntity: Cesium.Entity | undefined

const pickMapPosition = (windowPosition: Cesium.Cartesian2) => {
    const viewer = getActiveViewer()
    if (!viewer) {
        return undefined
    }

    const pickedPosition = viewer.scene.pickPosition(windowPosition)
    if (Cesium.defined(pickedPosition)) {
        return pickedPosition
    }

    const ray = viewer.camera.getPickRay(windowPosition)
    if (!ray) {
        return undefined
    }

    return viewer.scene.globe.pick(ray, viewer.scene)
}

const addDrawPolyline = (
    positions: Cesium.Cartesian3[] | Cesium.CallbackProperty,
    color: Cesium.Color,
) => {
    const viewer = getActiveViewer()
    if (!viewer) {
        return undefined
    }

    return viewer.entities.add({
        polyline: {
            positions,
            material: color,
            depthFailMaterial: color,
            width: 4,
        },
    })
}

const toRoadCoordinates = (positions: Cesium.Cartesian3[]) => {
    return positions.map((position) => {
        const cartographic = Cesium.Cartographic.fromCartesian(position)
        return [
            Cesium.Math.toDegrees(cartographic.longitude),
            Cesium.Math.toDegrees(cartographic.latitude),
        ] as [number, number]
    })
}

const stopDraw = () => {
    if (drawHandler && !drawHandler.isDestroyed()) {
        drawHandler.destroy()
    }
    drawHandler = undefined

    const viewer = getActiveViewer()
    if (dynamicEntity && viewer) {
        viewer.entities.remove(dynamicEntity)
        dynamicEntity = undefined
    }

    dynamicEntity = undefined
}

const startDrawLine = () => {
    const viewer = getActiveViewer()
    if (isDisposed || !viewer) {
        return
    }

    clearDrawLine()

    const fixedPositions: Cesium.Cartesian3[] = []
    let previewPosition: Cesium.Cartesian3 | undefined

    drawHandler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)
    const dynamicPositions = new Cesium.CallbackProperty(() => {
        return previewPosition
            ? [...fixedPositions, previewPosition]
            : fixedPositions
    }, false)

    drawHandler.setInputAction(
        (event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
            const position = pickMapPosition(event.position)
            if (!position) {
                return
            }

            fixedPositions.push(position)
            previewPosition = undefined

            if (!dynamicEntity) {
                dynamicEntity = addDrawPolyline(dynamicPositions, Cesium.Color.CYAN)
            }
        },
        Cesium.ScreenSpaceEventType.LEFT_CLICK,
    )

    drawHandler.setInputAction(
        (event: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
            if (fixedPositions.length === 0) {
                return
            }

            previewPosition = pickMapPosition(event.endPosition)
        },
        Cesium.ScreenSpaceEventType.MOUSE_MOVE,
    )

    drawHandler.setInputAction(() => {
        if (fixedPositions.length < 2) {
            ElMessage.warning('至少绘制两个点')
            stopDraw()
            return
        }

        drawEntity = addDrawPolyline([...fixedPositions], Cesium.Color.RED)
        postForm.coordinates = toRoadCoordinates(fixedPositions)
        stopDraw()
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
}

const clearDrawLine = () => {
    stopDraw()

    const viewer = getActiveViewer()
    if (drawEntity && viewer) {
        viewer.entities.remove(drawEntity)
        drawEntity = undefined
    }

    drawEntity = undefined
    postForm.coordinates = null
}

const openPut = (row: Road) => {
    Object.assign(putForm, row)
    isPut.value = true
}

const submitPutForm = async () => {
    if (!putFormRef.value) {
        return
    }

    try {
        await putFormRef.value.validate()
        await putRoad(putForm)
        ElMessage.success('道路修改成功')
        isPut.value = false
        await loadRoadPage()
        if (isShowRoad.value) {
            await roadDisplayRef.value?.reloadRoad()
        }
    } catch (error) {
        if (error !== false) {
            console.error('道路修改失败', error)
            ElMessage.error('道路修改失败')
        }
    }
}

const handleDelete = async (osmId: string | null) => {
    if (!osmId) {
        return
    }

    try {
        await ElMessageBox.confirm(`确定删除道路《${osmId}》吗？`, '删除道路', {
            confirmButtonText: '确定删除',
            cancelButtonText: '取消',
            type: 'warning',
        })
        await deleteRoad(osmId)
        ElMessage.success('道路删除成功')
        await loadRoadPage()
        if (isShowRoad.value) {
            await roadDisplayRef.value?.reloadRoad()
        }
    } catch (error) {
        if (error !== 'cancel') {
            ElMessage.error('道路删除失败')
        }
    }
}

const handleRoadDisplayDelete = async () => {
    await loadRoadPage()
    if (isShowRoad.value) {
        await roadDisplayRef.value?.reloadRoad()
    }
}

onMounted(() => {
    loadRoadPage()
    void roadDisplayRef.value?.addRoad()
})

const dispose = () => {
    if (isDisposed) {
        return
    }

    isDisposed = true
    stopDraw()

    const viewer = getActiveViewer()
    if (drawEntity && viewer) {
        viewer.entities.remove(drawEntity)
        drawEntity = undefined
    }

    drawEntity = undefined
    roadDisplayRef.value?.dispose()
}

onBeforeUnmount(dispose)

defineExpose({
    dispose,
})
</script>

<style scoped>
.road-panel {
    --road-ink: #183b5b;
    --road-muted: #71879a;
    --road-blue: #347eea;
    --road-cyan: #45c4b0;
    display: flex;
    width: 100%;
    height: 100%;
    min-height: 0;
    flex-direction: column;
    gap: 10px;
    padding: 15px 18px 12px;
    box-sizing: border-box;
    background:
        radial-gradient(circle at 92% 0%, rgba(69, 196, 176, 0.08), transparent 28%),
        #f7fbfd;
    color: var(--road-ink);
}

.road-panel-header,
.road-panel-footer,
.road-actions,
.road-switch,
.search-group,
.panel-heading {
    display: flex;
    align-items: center;
}

.road-panel-header {
    position: relative;
    min-height: 48px;
    justify-content: space-between;
    gap: 16px;
    padding: 0 2px 10px;
    border-bottom: 1px solid #dceaf0;
}

.road-panel-header::after {
    position: absolute;
    bottom: -1px;
    left: 2px;
    width: 82px;
    height: 2px;
    background: var(--road-cyan);
    box-shadow: 0 0 9px rgba(69, 196, 176, 0.65);
    content: '';
}

.panel-heading {
    min-width: 0;
    gap: 10px;
}

.heading-mark {
    display: flex;
    width: 36px;
    height: 36px;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    border: 1px solid #c7eae3;
    border-radius: 9px;
    background: #e8f7f4;
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.9),
        0 4px 10px rgba(40, 133, 129, 0.1);
    color: #258b83;
    font-size: 18px;
    line-height: 1;
}

.heading-mark :deep(.el-icon) {
    display: inline-flex;
    width: 18px;
    height: 18px;
    align-items: center;
    justify-content: center;
    line-height: 1;
}

.heading-mark :deep(svg) {
    display: block;
    width: 18px;
    height: 18px;
}

.panel-heading strong,
.panel-heading > div > span {
    display: block;
}

.panel-heading strong {
    color: var(--road-ink);
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.2px;
}

.panel-heading div span {
    margin-top: 4px;
    color: var(--road-muted);
    font-size: 11px;
}

.road-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
}

.road-actions :deep(.el-button) {
    height: 30px;
    padding: 0 11px;
    border-radius: 5px;
    font-size: 12px;
    transition:
        border-color 0.2s ease,
        background-color 0.2s ease,
        box-shadow 0.2s ease,
        transform 0.2s ease;
}

.road-actions :deep(.el-button:hover) {
    transform: translateY(-1px);
}

.road-actions :deep(.el-button--primary) {
    border-color: var(--road-blue);
    background: var(--road-blue);
    box-shadow: 0 4px 10px rgba(52, 126, 234, 0.22);
}

.road-actions :deep(.el-button--primary:hover) {
    border-color: #286fda;
    background: #286fda;
    box-shadow: 0 6px 14px rgba(52, 126, 234, 0.3);
}

.road-actions :deep(.el-button:not(.el-button--primary)) {
    border-color: #d3e2e9;
    background: rgba(255, 255, 255, 0.72);
    color: #557188;
}

.road-actions :deep(.el-button:not(.el-button--primary):hover) {
    border-color: #a8ceda;
    background: #ffffff;
    color: #2c6c92;
}

.road-switch {
    gap: 8px;
    margin-right: 2px;
    color: #627d98;
    font-size: 12px;
    white-space: nowrap;
}

.road-filter {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #627d98;
    font-size: 12px;
    white-space: nowrap;
}

.fclass-select {
    width: 175px;
}

.road-filter :deep(.el-select__wrapper) {
    min-height: 30px;
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.86);
    box-shadow: 0 0 0 1px #d3e2e9 inset;
}

.road-filter :deep(.el-select__wrapper.is-focused) {
    box-shadow:
        0 0 0 1px var(--road-blue) inset,
        0 0 0 3px rgba(52, 126, 234, 0.12);
}

.road-switch :deep(.el-switch.is-checked .el-switch__core) {
    border-color: var(--road-blue);
    background: var(--road-blue);
}

.road-switch :deep(.el-switch__core) {
    border-color: #b8cad6;
    background: #b8cad6;
}

.road-table-wrap {
    min-height: 0;
    flex: 1 1 auto;
    overflow: hidden;
}

.road-table-wrap :deep(.el-table) {
    height: 100%;
    overflow: hidden;
    border: 1px solid #dbe8ef;
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.7);
    --el-table-border-color: #e0ebf0;
    --el-table-header-bg-color: #edf5f9;
    --el-table-row-hover-bg-color: #eaf8f8;
    --el-table-text-color: #526a7d;
    --el-table-header-text-color: #5d748b;
}

.road-table-wrap :deep(.el-table th.el-table__cell) {
    height: 42px;
    background: #edf5f9;
    color: #5d748b;
    font-size: 12px;
    font-weight: 700;
}

.road-table-wrap :deep(.el-table td.el-table__cell) {
    height: 38px;
    padding: 0;
    background: rgba(255, 255, 255, 0.62);
    color: #526a7d;
    font-size: 12px;
}

.road-table-wrap :deep(.el-table .cell) {
    padding: 0 13px;
    line-height: 36px;
}

.road-table-wrap :deep(.el-table__body tr:hover > td.el-table__cell) {
    background: #eaf8f8 !important;
    color: #244f69;
}

.road-table-wrap :deep(.el-table__body tr:hover > td.el-table__cell:first-child) {
    box-shadow: inset 2px 0 0 var(--road-cyan);
}

.road-table-wrap :deep(.el-table__fixed),
.road-table-wrap :deep(.el-table__fixed-right) {
    background: #f7fbfd;
}

.road-table-wrap :deep(.el-table__fixed-right) {
    box-shadow: -6px 0 12px rgba(21, 65, 88, 0.06);
}

.road-table-wrap :deep(.el-table__inner-wrapper::before) {
    background-color: transparent;
}

.road-table-wrap :deep(.el-scrollbar__bar.is-horizontal > div),
.road-table-wrap :deep(.el-scrollbar__bar.is-vertical > div) {
    background: rgba(52, 126, 234, 0.42);
}

.road-table-wrap :deep(.el-button.is-link) {
    font-size: 12px;
}

.road-table-wrap :deep(.el-button--primary.is-link) {
    color: var(--road-blue);
}

.road-table-wrap :deep(.el-button--danger.is-link) {
    color: #e36f6f;
}

.road-panel-footer {
    min-height: 42px;
    justify-content: space-between;
    gap: 12px;
    padding-top: 2px;
}

.road-panel-footer :deep(.el-pagination) {
    color: var(--road-muted);
    --el-pagination-hover-color: var(--road-blue);
    --el-pagination-button-bg-color: transparent;
}

.road-panel-footer :deep(.el-pagination .btn-prev),
.road-panel-footer :deep(.el-pagination .btn-next),
.road-panel-footer :deep(.el-pagination .el-pager li) {
    min-width: 28px;
    height: 28px;
    border: 1px solid #d8e6ed;
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.72);
    line-height: 26px;
}

.road-panel-footer :deep(.el-pagination .el-pager li) {
    margin: 0 2px;
}

.road-panel-footer :deep(.el-pagination .el-pager li.is-active) {
    border-color: #acd9e1;
    background: #e6f6f6;
    color: #247c82;
    font-weight: 700;
}

.road-panel-footer :deep(.el-pagination .el-pagination__total) {
    color: #637b8c;
    font-size: 12px;
}

.road-panel-footer :deep(.el-pagination .el-pagination__sizes .el-input__wrapper) {
    min-height: 28px;
    border-radius: 5px;
    box-shadow: 0 0 0 1px #d8e6ed inset;
}

.search-group {
    flex: 0 1 480px;
    justify-content: flex-end;
    gap: 8px;
}

.search-group :deep(.el-input) {
    min-width: 180px;
}

.search-group :deep(.el-input__wrapper) {
    min-height: 30px;
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 0 0 1px #d6e5ec inset;
    transition: box-shadow 0.2s ease;
}

.search-group :deep(.el-input__wrapper.is-focus) {
    box-shadow:
        0 0 0 1px var(--road-blue) inset,
        0 0 0 3px rgba(52, 126, 234, 0.12);
}

.search-group :deep(.el-button) {
    height: 30px;
    border-radius: 5px;
    font-size: 12px;
}

.search-group :deep(.el-button--primary) {
    border-color: var(--road-blue);
    background: var(--road-blue);
    box-shadow: 0 4px 10px rgba(52, 126, 234, 0.2);
}

.search-group :deep(.el-button:not(.el-button--primary)) {
    border-color: #d3e2e9;
    background: rgba(255, 255, 255, 0.8);
    color: #627d98;
}

.geometry-box {
    display: flex;
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    gap: 9px;
}

.geometry-list {
    width: 100%;
    max-height: 110px;
    overflow-y: auto;
    padding: 8px 10px;
    border: 1px dashed #afd2dc;
    border-radius: 6px;
    background: #f0f8fb;
    color: #557188;
    font-size: 11px;
    line-height: 1.65;
    font-variant-numeric: tabular-nums;
}

.geometry-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.drawer-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

:global(.road-drawer) {
    border-left: 1px solid rgba(69, 196, 176, 0.45);
    background: #f6fbfd;
    box-shadow: -12px 0 30px rgba(7, 35, 58, 0.2);
}

:global(.road-drawer .el-drawer__header) {
    margin-bottom: 0;
    padding: 18px 20px;
    background: #102a43;
    color: #f4fbff;
}

:global(.road-drawer .el-drawer__title) {
    color: #f4fbff;
    font-size: 15px;
    font-weight: 700;
}

:global(.road-drawer .el-drawer__close-btn) {
    color: #9ed0d9;
}

:global(.road-drawer .el-drawer__body) {
    padding: 20px;
}

:global(.road-drawer .el-form-item__label),
:global(.road-dialog .el-form-item__label) {
    color: #587187;
    font-size: 12px;
}

:global(.road-drawer .el-input__wrapper),
:global(.road-dialog .el-input__wrapper) {
    border-radius: 5px;
    box-shadow: 0 0 0 1px #d4e4eb inset;
}

:global(.road-drawer .el-input__wrapper.is-focus),
:global(.road-dialog .el-input__wrapper.is-focus) {
    box-shadow:
        0 0 0 1px #347eea inset,
        0 0 0 3px rgba(52, 126, 234, 0.1);
}

:global(.road-dialog .el-dialog__header) {
    margin-right: 0;
    padding: 18px 20px 14px;
    border-bottom: 1px solid #dceaf0;
    background: #f5fbfd;
}

:global(.road-dialog .el-dialog__title) {
    color: #183b5b;
    font-size: 15px;
    font-weight: 700;
}

:global(.road-dialog .el-dialog__body) {
    padding: 20px;
    background: #f9fcfd;
}

:global(.road-dialog .el-dialog__footer) {
    padding: 12px 20px 18px;
    border-top: 1px solid #dceaf0;
    background: #f5fbfd;
}

@media (max-width: 900px) {
    .road-panel {
        padding: 11px;
    }

    .road-panel-header,
    .road-panel-footer {
        align-items: flex-start;
        flex-direction: column;
    }

    .road-actions,
    .search-group {
        width: 100%;
        justify-content: flex-start;
    }

    .search-group {
        flex-basis: auto;
    }
}
</style>

<template>
    <div class="toolbar road-panel">
        <RoadDisplay ref="roadDisplayRef" @road-deleted="RoadDisplayDelete" />
        <div class="road-head">
            <div class="oneText">道路</div>
            <div class="road-actions">
                <span>显示全部道路</span>
                <el-switch v-model="isShowRoad" @change="switchShow" />
                <el-button v-if="isAdmin" type="primary" size="small" @click="openPost">新增</el-button>
                <el-button size="small" @click="pageNum = 1">刷新</el-button>
            </div>
        </div>
        <!--表格-->
        <div>
            <el-table :data="roadList" border stripe style="width: 100%; margin-top: 8px" table-layout="fixed"
                max-height="260">
                <el-table-column prop="osmId" label="OSM ID" min-width="100" />
                <el-table-column prop="code" label="代码" min-width="80" />
                <el-table-column prop="fclass" label="类型" min-width="100" />
                <el-table-column prop="name" label="名称" min-width="120" />
                <el-table-column prop="ref" label="参考编号" min-width="100" />
                <el-table-column prop="oneway" label="单行" min-width="80">
                    <template #default="{ row }">
                        {{ row.oneway || '-' }}
                    </template>
                </el-table-column>
                <el-table-column prop="maxspeed" label="限速" min-width="80">
                    <template #default="{ row }">
                        {{ row.maxspeed ? row.maxspeed + ' km/h' : '-' }}
                    </template>
                </el-table-column>
                <el-table-column prop="layer" label="图层" min-width="80" />
                <el-table-column prop="bridge" label="桥梁" min-width="80" />
                <el-table-column prop="tunnel" label="隧道" min-width="80" />
                <el-table-column v-if="isAdmin" label="操作" width="160">
                    <template #default="{ row }">
                        <el-button type="primary" link @click="openPut(row)">编辑</el-button>
                        <el-button type="danger" link @click="handleDelete(row.osmId)">删除</el-button>
                    </template>
                </el-table-column>
            </el-table>
            <!--查询-->
            <div class="table-tools">
                <!-- 分页单独一块 -->
                <el-pagination v-model:current-page="pageNum" v-model:page-size="pageSize" :page-sizes="[5, 10, 20, 50]"
                    :total="total" layout="total, sizes, prev, pager, next, jumper" @current-change="loadRoadPage()"
                    @size-change="pageNum = 1; loadRoadPage()" />

                <!-- 查询条件单独一块 -->
                <div class="search-group">
                    <el-input v-model="keyword" placeholder="搜索OSM ID、名称、类型" clearable style="width: 280px" />

                    <el-button type="primary" @click="pageNum = 1; loadRoadPage()">搜索</el-button>
                    <el-button @click="resetSelect">重置</el-button>
                </div>
            </div>
        </div>
        <!--插入-->
        <el-drawer v-model="isPost" direction="rtl" :modal="false" :modal-penetrable="true" :lock-scroll="false"
            append-to-body>
            <el-form ref="postFormRef" :rules="postRules" :model="postForm" label-width="80px">

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

                <el-form-item label="几何">
                    <div class="geom-box">
                        <el-tag v-if="(postForm.coordinates?.length ?? 0) >= 2" type="success">
                            已绘制 {{ postForm.coordinates?.length }} 个点
                        </el-tag>
                        <el-tag v-else type="warning">未绘制</el-tag>

                        <div v-if="(postForm.coordinates?.length ?? 0) >= 2" class="geom-list">
                            <div v-for="(p, i) in postForm.coordinates" :key="i">
                                {{ i + 1 }}. {{ p[0] }}, {{ p[1] }}
                            </div>
                        </div>

                        <el-button type="primary" plain @click="startDrawLine">
                            {{ (postForm.coordinates?.length ?? 0) >= 2 ? '重新绘制' : '开始绘制线' }}
                        </el-button>
                        <el-button v-if="(postForm.coordinates?.length ?? 0) >= 2" text type="danger"
                            @click="clearDrawLine">清除线</el-button>
                    </div>
                </el-form-item>

            </el-form>

            <div class="drawer-footer">
                <el-button @click="isPost = false; clearDrawLine()">取消</el-button>
                <el-button type="primary" @click="submitPostForm">保存</el-button>
            </div>
        </el-drawer>
        <!--更新-->
        <el-dialog v-model="isPut" title="编辑道路" width="520px" destroy-on-close>
            <el-form ref="putFormRef" :rules="putRules" :model="putForm" label-width="80px">

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
                <el-button type="primary" @click="submitPutForm">保存</el-button>
            </template>
        </el-dialog>
    </div>
</template>
<script setup lang="ts">
import '@/components/LeftToolbar/style.css'
import { onMounted, ref, reactive, watch, onBeforeUnmount } from 'vue'
import * as Cesium from 'cesium'
import { useCesiumStore } from '@/stores/cesium'
import { ElMessageBox, ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { getRoadPage, deleteRoad, putRoad, postRoad } from '@/api/postgis'
import type { Road, PostRoadDTO } from '@/api/postgis'
import RoadDisplay from './RoadDisplay.vue'
import { useStore } from '@/stores/store.ts'
const roadDisplayRef = ref<InstanceType<typeof RoadDisplay>>()


let viewer: Cesium.Viewer

const roadList = ref<Road[]>([])

const store = useStore()
const isAdmin = store.user?.role === 'admin'
const isShowRoad = ref(true)//道路显隐
const isPost = ref(false)//插入
const isPut = ref(false)//编辑


onMounted(() => {
    let cesiumStore = useCesiumStore()
    viewer = cesiumStore.viewer as Cesium.Viewer
    loadRoadPage()
    roadDisplayRef.value?.addRoad(viewer)
})
//道路显隐
const switchShow = () => {
    if (isShowRoad.value) {
        roadDisplayRef.value?.addRoad(viewer)
    }
    else {
        roadDisplayRef.value?.removeRoad(viewer)
    }
}

//查询
const keyword = ref<String | undefined>()//查询关键词
const fclass = ref<String | undefined>()//查询分类
const pageNum = ref(1)//页码
const pageSize = ref(10)//每页条数
const total = ref(0)//总数
watch(pageNum, async () => {
    await loadRoadPage()
})
watch(pageSize, async () => {
    pageNum.value = 1
    await loadRoadPage()
})

const resetSelect = () => {
    pageNum.value = 1
    keyword.value = undefined
    fclass.value = undefined
}

const loadRoadPage = async () => {
    try {
        const params = {
            pageNum: pageNum.value,
            pageSize: pageSize.value,
            keyword: keyword.value || undefined,
            fclass: fclass.value || undefined
        }
        const res = await getRoadPage(params.pageNum, params.pageSize, params.keyword, params.fclass)
        roadList.value = res.data.records
        total.value = res.data.total
    } catch (error) {
        console.error(error)
    }
}
//插入
const postFormRef = ref<FormInstance>();//绑定表格
const postRules: FormRules<PostRoadDTO> = {//表格验证规则
    osmId: [{ required: true, message: '请输入Id', trigger: 'change' }],//required: true这个字段是必填的;message校验不通过时弹的提示文字;trigger什么时候触发校验
    code: [{ required: true, message: '请输入Id', trigger: 'change' }],
    coordinates: [{ required: true, message: '请绘制道路', trigger: 'change' }]
}
const postForm = reactive<PostRoadDTO>({//插入/修改框架
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
    coordinates: null
})

const openPost = () => {
    postForm.osmId = null
    postForm.code = null
    postForm.fclass = null
    postForm.name = null
    postForm.ref = null
    postForm.oneway = null
    postForm.maxspeed = null
    postForm.layer = null
    postForm.bridge = null
    postForm.tunnel = null
    postForm.coordinates = null
    isPost.value = true
}

const submitPostForm = async () => {
    if (!postFormRef.value) return

    try {
        await postFormRef.value.validate()
    } catch {
        return
    }

    try {
        await postRoad(postForm)
        ElMessage.success('新增成功')
        isPost.value = false
        clearDrawLine()
        await loadRoadPage()
        await roadDisplayRef.value?.reloadRoad(viewer)
    } catch {
        ElMessage.error('操作失败')
    }
}

let drawEntity: Cesium.Entity | undefined
const startDrawLine = () => {
    clearDrawLine()

    let handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)

    let isMouse = false
    let activePositions: Cesium.Cartesian3[] = []
    let dynamicEntity: Cesium.Entity | undefined;
    let dynamicPositions: Cesium.CallbackProperty | undefined;

    handler.setInputAction((event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        let pickPosition = viewer.scene.pickPosition(event.position);
        if (!Cesium.defined(pickPosition))
            return;
        if (activePositions.length == 0) {
            isMouse = true;
            activePositions.push(pickPosition);
            dynamicPositions = new Cesium.CallbackProperty(() => {
                return activePositions;
            }, false)
            dynamicEntity = addPolyline(dynamicPositions)
        }
        else {
            activePositions.push(pickPosition)
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    //鼠标移动事件
    handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
        if (!isMouse)
            return;
        let pickPosition = viewer.scene.pickPosition(e.endPosition)
        if (Cesium.defined(pickPosition)) {
            if (activePositions.length > 1)
                activePositions.pop();
            activePositions.push(pickPosition);
        }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    //鼠标右击事件
    handler.setInputAction(() => {
        isMouse = false;
        activePositions.pop();
        if (activePositions.length > 1)
            drawEntity = addPolyline(activePositions)
        postForm.coordinates = activePositions.map((cartesian: Cesium.Cartesian3) => {
            let cartographic = Cesium.Cartographic.fromCartesian(cartesian)
            let lng = Cesium.Math.toDegrees(cartographic.longitude)
            let lat = Cesium.Math.toDegrees(cartographic.latitude)
            return [lng, lat] as [number, number]
        })
        stopDraw()
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)

    const addPolyline = (positions: Cesium.Cartesian3[] | Cesium.CallbackProperty) => {
        return viewer.entities.add({
            polyline: {
                positions: positions,
                material: Cesium.Color.RED,
                width: 4,
                depthFailMaterial: Cesium.Color.RED
            }
        })
    }

    const stopDraw = () => {
        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
        handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE)
        handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK)
        viewer.entities.remove(dynamicEntity!)
        activePositions = []
        dynamicEntity = undefined
        dynamicPositions = undefined
    }
}

const clearDrawLine = () => {
    postForm.coordinates = null
    if (drawEntity) {
        viewer.entities.remove(drawEntity)
        drawEntity = undefined
    }
}

//编辑
const putFormRef = ref<FormInstance>();//绑定表格
const putRules: FormRules<Road> = {
    osmId: [
        { required: true, message: '请输入Id', trigger: 'change' }
    ],
    code: [
        { required: true, message: '请输入code', trigger: 'change' },
        { type: 'number', message: '代码必须为数字值', trigger: 'change' }
    ],
    name: [
        { max: 100, message: '道路名称不能超过100个字符', trigger: 'blur' }
    ],
    maxspeed: [
        {
            validator: (_, value, callback) => {
                const n = Number(value)
                if (Number.isNaN(n)) return callback(new Error('限速必须为数字'))
                if (n < 0 || n > 300) return callback(new Error('限速范围应在0-300之间'))
                callback()
            },
            trigger: 'change'
        }
    ],
    layer: [
        { type: 'number', message: '图层必须为数字', trigger: 'change' }
    ],
}
const putForm = reactive<Road>({//插入/修改框架
    osmId: null,
    code: null,
    fclass: null,
    name: null,
    ref: null,
    oneway: null,
    maxspeed: null,
    layer: null,
    bridge: null,
    tunnel: null
})

const openPut = (row: Road) => {
    isPut.value = true
    putForm.osmId = row.osmId
    putForm.code = row.code
    putForm.fclass = row.fclass
    putForm.name = row.name
    putForm.ref = row.ref
    putForm.oneway = row.oneway
    putForm.maxspeed = row.maxspeed
    putForm.layer = row.layer
    putForm.bridge = row.bridge
    putForm.tunnel = row.tunnel
    isPut.value = true
}

const submitPutForm = async () => {
    if (!putFormRef.value) return
    try {
        await putFormRef.value.validate()
    }
    catch {
        return
    }

    try {
        await putRoad(putForm) // 编辑
        ElMessage.success(isPut.value ? '修改成功' : '新增成功')
        isPut.value = false
        await loadRoadPage()
        await roadDisplayRef.value?.reloadRoad(viewer)
    } catch {
        ElMessage.error('操作失败')
    }
}


//删除
const handleDelete = async (osmId: string) => {
    try {
        await ElMessageBox.confirm(`确定删除道路《${osmId}》吗？`, '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        })

        await deleteRoad(osmId)

        // 删除成功，刷新列表
        ElMessage.success('删除成功')
        await loadRoadPage()

    } catch (error: any) {
        if (error !== 'cancel') {
            ElMessage.error('删除失败')
        }
    }
    if (isShowRoad.value) {
        await roadDisplayRef.value?.reloadRoad(viewer)
    }
}

const RoadDisplayDelete = async () => {
    await loadRoadPage()
    if (isShowRoad.value) {
        await roadDisplayRef.value?.reloadRoad(viewer)
    }
}

onBeforeUnmount(() => {
    roadDisplayRef.value?.removeRoad(viewer)
})

</script>
<style scoped>
.table-tools {
    display: flex;
    align-items: center;
    justify-content: space-between;
    /* 左右分布：分页在左，搜索组在右 */
    gap: 16px;
    margin-top: 8px;
}

.search-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.road-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
}

.road-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.geom-box {
    display: flex;
    align-items: center;
    gap: 12px;
    /* 子元素之间的间距，随便调 */
    flex-wrap: wrap;
    /* 空间不够时自动换行 */
}

.drawer-footer {
    flex-shrink: 0;
    padding: 16px 20px;
    text-align: right;
    border-top: 1px solid #ebeef5;
    background-color: #fff;
    padding-bottom: 50px;
}
</style>
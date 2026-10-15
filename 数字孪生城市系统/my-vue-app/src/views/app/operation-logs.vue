<template>
    <section class="logs-page">
        <div class="page-heading">
            <div>
                <p class="eyebrow">ADMINISTRATION</p>
                <h1>日志管理</h1>
                <p class="subtitle">
                    查看系统操作记录、请求状态和接口耗时。
                </p>
            </div>

            <el-button :icon="Refresh" :loading="loading" @click="loadLogs">
                刷新
            </el-button>
        </div>

        <div class="filters">
            <el-input v-model="filters.username" clearable placeholder="用户名" @keyup.enter="handleSearch" />

            <el-input v-model="filters.operation" clearable placeholder="操作名称" @keyup.enter="handleSearch" />

            <el-select v-model="filters.success" clearable placeholder="全部结果">
                <el-option label="成功" :value="1" />
                <el-option label="失败" :value="0" />
            </el-select>

            <el-button type="primary" :icon="Search" @click="handleSearch">
                查询
            </el-button>

            <el-button :icon="RefreshLeft" @click="handleReset">
                重置
            </el-button>
        </div>

        <!-- 表格区域独立滚动 -->
        <div class="logs-table-shell">
            <el-table v-loading="loading" :data="logs" class="logs-table" height="100%" border stripe>
                <el-table-column prop="id" label="ID" width="70" />

                <el-table-column prop="username" label="用户" width="120" />

                <el-table-column prop="role" label="角色" width="90" />

                <el-table-column prop="operation" label="操作" width="130" />

                <el-table-column label="请求" min-width="260">
                    <template #default="{ row }">
                        <div class="request-cell">
                            <el-tag size="small" effect="plain">
                                {{ row.requestMethod || '-' }}
                            </el-tag>

                            <span>
                                {{ row.requestUri || '-' }}
                            </span>
                        </div>
                    </template>
                </el-table-column>

                <el-table-column label="结果" width="85">
                    <template #default="{ row }">
                        <el-tag v-if="row.success === 1" type="success">
                            成功
                        </el-tag>

                        <el-tag v-else type="danger">
                            失败
                        </el-tag>
                    </template>
                </el-table-column>

                <el-table-column prop="statusCode" label="状态码" width="90" />

                <el-table-column label="耗时" width="100">
                    <template #default="{ row }">
                        {{ row.costTime ?? '-' }} ms
                    </template>
                </el-table-column>

                <el-table-column prop="ip" label="IP" width="140" />

                <el-table-column prop="createTime" label="操作时间" width="190" />

                <el-table-column prop="errorMessage" label="错误信息" min-width="180" show-overflow-tooltip />
            </el-table>
        </div>

        <!-- 分页固定在表格下方 -->
        <div class="pagination-row">
            <el-pagination v-model:current-page="page" v-model:page-size="size" :page-sizes="[10, 20, 50]"
                :total="total" layout="total, sizes, prev, pager, next, jumper" @current-change="loadLogs"
                @size-change="handleSizeChange" />
        </div>
    </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
    Refresh,
    RefreshLeft,
    Search,
} from '@element-plus/icons-vue'
import {
    getOperationLogPage,
    type OperationLog,
} from '@/api/operation-log'

const logs = ref<OperationLog[]>([])
const loading = ref(false)

const page = ref(1)
const size = ref(20)
const total = ref(0)

const filters = reactive<{
    username: string
    operation: string
    success: number | undefined
}>({
    username: '',
    operation: '',
    success: undefined,
})

const loadLogs = async () => {
    loading.value = true

    try {
        const response = await getOperationLogPage({
            page: page.value,
            size: size.value,
            username: filters.username || undefined,
            operation: filters.operation || undefined,
            success: filters.success,
        })

        if (response.data.code !== 200) {
            ElMessage.error(
                response.data.message || '日志加载失败',
            )
            return
        }

        logs.value = response.data.data.records || []
        total.value = response.data.data.total || 0
    } catch (error: any) {
        ElMessage.error(
            error.response?.data?.message ||
            '日志加载失败，请稍后重试',
        )
    } finally {
        loading.value = false
    }
}

const handleSearch = async () => {
    page.value = 1
    await loadLogs()
}

const handleReset = async () => {
    filters.username = ''
    filters.operation = ''
    filters.success = undefined

    page.value = 1

    await loadLogs()
}

const handleSizeChange = async () => {
    page.value = 1
    await loadLogs()
}

onMounted(() => {
    loadLogs()
})
</script>

<style scoped>
.logs-page {
    display: flex;
    width: 100%;
    height: 100%;
    min-height: 0;
    flex-direction: column;
    padding: 30px 34px 24px;
    overflow: hidden;
    background: #f4f7f9;
    box-sizing: border-box;
}

.page-heading {
    display: flex;
    flex: 0 0 auto;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 24px;
}

.eyebrow {
    margin: 0 0 8px;
    color: #45a89c;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.5px;
}

h1 {
    margin: 0;
    color: #17324a;
    font-size: 28px;
    line-height: 1.2;
}

.subtitle {
    margin: 8px 0 0;
    color: #718496;
    font-size: 14px;
}

.filters {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 12px;
    margin-bottom: 18px;
}

.filters :deep(.el-input) {
    width: 180px;
}

.filters :deep(.el-select) {
    width: 140px;
}

.logs-table-shell {
    min-height: 240px;
    flex: 1 1 auto;
    overflow: hidden;
    background: #ffffff;
}

.logs-table {
    width: 100%;
    height: 100%;
}

.logs-table :deep(.cell) {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.request-cell {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
}

.request-cell span {
    min-width: 0;
    overflow: hidden;
    color: #536a7c;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.pagination-row {
    display: flex;
    flex: 0 0 auto;
    justify-content: flex-end;
    padding-top: 18px;
}

@media (max-width: 900px) {
    .logs-page {
        padding: 22px 16px 20px;
    }

    .page-heading,
    .filters {
        align-items: stretch;
        flex-direction: column;
    }

    .filters :deep(.el-input),
    .filters :deep(.el-select) {
        width: 100%;
    }

    .pagination-row {
        justify-content: center;
        overflow-x: auto;
    }
}
</style>
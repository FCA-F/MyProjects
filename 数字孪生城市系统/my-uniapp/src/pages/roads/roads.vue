<template>
    <view class="page">
        <view class="header">
            <view class="header-copy">
                <text class="eyebrow">道路管理</text>
                <text class="title">道路数据</text>
                <text class="subtitle">道路信息查询与维护</text>
            </view>
        </view>

        <view class="toolbar">
            <view class="search-row">
                <input v-model="keyword" class="search-input" placeholder="搜索道路编号、名称或类型"
                    placeholder-class="input-placeholder" confirm-type="search" @confirm="searchRoads" />
                <button class="search-button" hover-class="search-button--pressed" @tap="searchRoads">
                    搜索
                </button>
            </view>
            <view class="toolbar-row">
                <text class="result-count">{{ total }} 条道路</text>
                <button class="refresh-button" hover-class="refresh-button--pressed" @tap="loadRoads">
                    ↻ 刷新
                </button>
            </view>
        </view>

        <view v-if="errorMessage" class="error-banner">
            <text>{{ errorMessage }}</text>
            <text class="error-retry" @tap="loadRoads">重试</text>
        </view>

        <scroll-view v-if="roads.length > 0" class="table-scroll" scroll-x enhanced>
            <view class="road-table">
                <view class="table-row table-head">
                    <text class="cell cell-id">道路编号</text>
                    <text class="cell cell-name">名称</text>
                    <text class="cell cell-type">类型</text>
                    <text class="cell cell-code">代码</text>
                    <text class="cell cell-speed">限速</text>
                    <text class="cell cell-oneway">单行</text>
                    <text class="cell cell-layer">图层</text>
                    <text class="cell cell-flag">桥梁</text>
                    <text class="cell cell-flag">隧道</text>
                    <text v-if="isAdmin" class="cell cell-action">操作</text>
                </view>
                <view v-for="(road, index) in roads" :key="road.osmId || road.name || `road-${index}`"
                    class="table-row">
                    <text class="cell cell-id">{{ road.osmId || '-' }}</text>
                    <text class="cell cell-name">{{ road.name || '-' }}</text>
                    <text class="cell cell-type">{{ road.fclass || '-' }}</text>
                    <text class="cell cell-code">{{ road.code ?? '-' }}</text>
                    <text class="cell cell-speed">
                        {{ road.maxspeed === null ? '-' : `${road.maxspeed} km/h` }}
                    </text>
                    <text class="cell cell-oneway">{{ road.oneway || '-' }}</text>
                    <text class="cell cell-layer">{{ road.layer ?? '-' }}</text>
                    <text class="cell cell-flag">{{ road.bridge || '-' }}</text>
                    <text class="cell cell-flag">{{ road.tunnel || '-' }}</text>
                    <view v-if="isAdmin" class="cell cell-action action-cell">
                        <text class="edit-link" @tap="openEdit(road)">编辑</text>
                        <text class="delete-link" @tap="confirmDelete(road)">删除</text>
                    </view>
                </view>
            </view>
        </scroll-view>

        <view v-else-if="isLoading" class="state-card">
            <text class="state-icon">⌁</text>
            <text class="state-title">正在加载道路数据</text>
            <text class="state-copy">请稍候</text>
        </view>

        <view v-else class="state-card">
            <text class="state-icon">∅</text>
            <text class="state-title">没有找到道路</text>
            <text class="state-copy">换一个关键词，或点击刷新重新查询。</text>
        </view>

        <view class="pagination">
            <button class="page-button" :disabled="pageNum <= 1 || isLoading" hover-class="page-button--pressed"
                @tap="goPrevious">
                上一页
            </button>
            <text class="page-info">{{ pageNum }} / {{ totalPages }}</text>
            <button class="page-button" :disabled="pageNum >= totalPages || isLoading"
                hover-class="page-button--pressed" @tap="goNext">
                下一页
            </button>
        </view>
        <view class="page-jump">
            <text class="jump-label">跳至</text>
            <input
                v-model="pageInput"
                class="jump-input"
                type="number"
                confirm-type="go"
                :disabled="isLoading"
                @confirm="jumpToPage"
            />
            <text class="jump-label">页</text>
            <button
                class="jump-button"
                :disabled="isLoading"
                hover-class="jump-button--pressed"
                @tap="jumpToPage"
            >
                跳转
            </button>
        </view>

        <view v-if="showEdit" class="modal-mask" @tap="closeEdit">
            <view class="edit-modal" @tap.stop>
                <view class="modal-heading">
                    <view>
                        <text class="modal-kicker">道路信息</text>
                        <text class="modal-title">编辑道路属性</text>
                    </view>
                    <text class="modal-close" @tap="closeEdit">×</text>
                </view>

                <scroll-view class="form-scroll" scroll-y>
                    <view class="readonly-field">
                        <text class="field-label">道路编号</text>
                        <text class="readonly-value">{{ editForm.osmId || '-' }}</text>
                    </view>
                    <view class="form-grid">
                        <view class="field">
                            <text class="field-label">代码</text>
                            <input v-model="editForm.code" class="field-input" type="number" />
                        </view>
                        <view class="field">
                            <text class="field-label">限速</text>
                            <input v-model="editForm.maxspeed" class="field-input" type="number" />
                        </view>
                        <view class="field field-full">
                            <text class="field-label">道路名称</text>
                            <input v-model="editForm.name" class="field-input" />
                        </view>
                        <view class="field">
                            <text class="field-label">道路类型</text>
                            <input v-model="editForm.fclass" class="field-input" />
                        </view>
                        <view class="field">
                            <text class="field-label">参考编号</text>
                            <input v-model="editForm.ref" class="field-input" />
                        </view>
                        <view class="field">
                            <text class="field-label">单行</text>
                            <input v-model="editForm.oneway" class="field-input" />
                        </view>
                        <view class="field">
                            <text class="field-label">图层</text>
                            <input v-model="editForm.layer" class="field-input" type="number" />
                        </view>
                        <view class="field">
                            <text class="field-label">桥梁</text>
                            <input v-model="editForm.bridge" class="field-input" />
                        </view>
                        <view class="field">
                            <text class="field-label">隧道</text>
                            <input v-model="editForm.tunnel" class="field-input" />
                        </view>
                    </view>
                </scroll-view>

                <view class="modal-actions">
                    <button class="cancel-button" @tap="closeEdit">取消</button>
                    <button class="save-button" :disabled="isSaving" hover-class="save-button--pressed" @tap="saveEdit">
                        {{ isSaving ? '保存中...' : '保存修改' }}
                    </button>
                </view>
            </view>
        </view>
    </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getStoredUser } from '@/api/auth'
import { deleteRoad, getRoadPage, updateRoad } from '@/api/roads'
import type { Road } from '@/api/roads'

interface EditForm {
    osmId: string
    code: string
    fclass: string
    name: string
    ref: string
    oneway: string
    maxspeed: string
    layer: string
    bridge: string
    tunnel: string
}

const user = ref(getStoredUser())
const roads = ref<Road[]>([])
const keyword = ref('')
const pageNum = ref(1)
const pageInput = ref('1')
const pageSize = 10
const total = ref(0)
const isLoading = ref(false)
const errorMessage = ref('')
const showEdit = ref(false)
const isSaving = ref(false)
const editForm = reactive<EditForm>({
    osmId: '',
    code: '',
    fclass: '',
    name: '',
    ref: '',
    oneway: '',
    maxspeed: '',
    layer: '',
    bridge: '',
    tunnel: '',
})

const isAdmin = computed(() => user.value?.role === 'admin')
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

function toStringValue(value: string | number | null) {
    return value === null || value === undefined ? '' : String(value)
}

function toNullableNumber(value: string) {//字符串到非空数字
    if (!value.trim()) {
        return null
    }
    const number = Number(value)
    return Number.isFinite(number) ? number : null
}

function fillEditForm(road: Road) {
    editForm.osmId = toStringValue(road.osmId)
    editForm.code = toStringValue(road.code)
    editForm.fclass = toStringValue(road.fclass)
    editForm.name = toStringValue(road.name)
    editForm.ref = toStringValue(road.ref)
    editForm.oneway = toStringValue(road.oneway)
    editForm.maxspeed = toStringValue(road.maxspeed)
    editForm.layer = toStringValue(road.layer)
    editForm.bridge = toStringValue(road.bridge)
    editForm.tunnel = toStringValue(road.tunnel)
}

function ensureSession() {
    user.value = getStoredUser()
    if (!user.value) {
        uni.reLaunch({
            url: '/pages/login/login',
        })
    }
}

function loadRoads() {
    if (isLoading.value) {
        return
    }

    isLoading.value = true
    errorMessage.value = ''
    getRoadPage(pageNum.value, pageSize, keyword.value)
        .then((result) => {
            roads.value = result.records || []
            total.value = result.total || 0
            pageInput.value = String(pageNum.value)
        })
        .catch((error: Error) => {
            errorMessage.value = error.message || '道路列表加载失败'
        })
        .finally(() => {
            isLoading.value = false
        })
}

function searchRoads() {
    pageNum.value = 1
    pageInput.value = '1'
    loadRoads()
}

function goPrevious() {
    if (pageNum.value <= 1) {
        return
    }
    pageNum.value -= 1
    pageInput.value = String(pageNum.value)
    loadRoads()
}

function goNext() {
    if (pageNum.value >= totalPages.value) {
        return
    }
    pageNum.value += 1
    pageInput.value = String(pageNum.value)
    loadRoads()
}

function jumpToPage() {
    if (isLoading.value) {
        return
    }

    const target = Number(pageInput.value)
    if (!Number.isInteger(target) || target < 1 || target > totalPages.value) {
        uni.showToast({
            title: `页码范围 1-${totalPages.value}`,
            icon: 'none',
        })
        pageInput.value = String(pageNum.value)
        return
    }

    if (target === pageNum.value) {
        pageInput.value = String(pageNum.value)
        return
    }

    pageNum.value = target
    loadRoads()
}

function openEdit(road: Road) {
    fillEditForm(road)
    showEdit.value = true
}

function closeEdit() {
    if (!isSaving.value) {
        showEdit.value = false
    }
}

function saveEdit() {
    if (!editForm.osmId || isSaving.value) {
        return
    }

    const speed = toNullableNumber(editForm.maxspeed)
    if (speed !== null && (speed < 0 || speed > 300)) {
        uni.showToast({
            title: '限速需在 0-300 之间',
            icon: 'none',
        })
        return
    }

    isSaving.value = true
    updateRoad({
        osmId: editForm.osmId,
        code: toNullableNumber(editForm.code),
        fclass: editForm.fclass || null,
        name: editForm.name || null,
        ref: editForm.ref || null,
        oneway: editForm.oneway || null,
        maxspeed: speed,
        layer: toNullableNumber(editForm.layer),
        bridge: editForm.bridge || null,
        tunnel: editForm.tunnel || null,
    })
        .then(() => {
            uni.showToast({
                title: '道路修改成功',
                icon: 'success',
            })
            showEdit.value = false
            loadRoads()
        })
        .catch((error: Error) => {
            uni.showToast({
                title: error.message || '道路修改失败',
                icon: 'none',
            })
        })
        .finally(() => {
            isSaving.value = false
        })
}

function confirmDelete(road: Road) {
    const osmId = road.osmId
    if (!osmId) {
        return
    }

    uni.showModal({
        title: '删除道路',
        content: `确定删除道路 ${osmId} 吗？`,
        confirmColor: '#c9684e',
        success: (result) => {
            if (!result.confirm) {
                return
            }

            deleteRoad(osmId)
                .then(() => {
                    uni.showToast({
                        title: '道路已删除',
                        icon: 'success',
                    })
                    if (roads.value.length === 1 && pageNum.value > 1) {
                        pageNum.value -= 1
                    }
                    loadRoads()
                })
                .catch((error: Error) => {
                    uni.showToast({
                        title: error.message || '删除失败',
                        icon: 'none',
                    })
                })
        },
    })
}

onLoad(() => {
    ensureSession()
})

onShow(() => {
    ensureSession()
    if (user.value) {
        loadRoads()
    }
})
</script>

<style>
page {
    background: #f4f8fb;
}

.page {
    min-height: 100vh;
    background: #f4f8fb;
    color: #1f2933;
}

.header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 62rpx 34rpx 34rpx;
    background: #143553;
    color: #ffffff;
}

.eyebrow,
.modal-kicker {
    display: block;
    color: #8fd3c7;
    font-size: 19rpx;
    font-weight: 700;
    letter-spacing: 2rpx;
}

.title {
    display: block;
    margin-top: 12rpx;
    font-size: 48rpx;
    font-weight: 700;
}

.subtitle {
    display: block;
    max-width: 530rpx;
    margin-top: 12rpx;
    color: #c7d8e4;
    font-size: 23rpx;
}

.toolbar {
    padding: 24rpx 28rpx 20rpx;
    background: #ffffff;
    box-shadow: 0 8rpx 20rpx rgba(28, 61, 90, 0.05);
}

.search-row {
    display: flex;
    align-items: center;
}

.search-input {
    flex: 1;
    height: 76rpx;
    box-sizing: border-box;
    padding: 0 22rpx;
    border: 2rpx solid #dce6ec;
    border-radius: 8rpx;
    background: #f8fafb;
    color: #263746;
    font-size: 25rpx;
}

.input-placeholder {
    color: #aab6bf;
}

.search-button {
    width: 128rpx;
    height: 76rpx;
    margin-left: 14rpx;
    padding: 0;
    border-radius: 8rpx;
    background: #347eea;
    color: #ffffff;
    font-size: 25rpx;
    line-height: 76rpx;
}

.search-button--pressed {
    background: #286fda;
}

.search-button::after,
.refresh-button::after,
.page-button::after,
.jump-button::after,
.cancel-button::after,
.save-button::after {
    border: 0;
}

.toolbar-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 18rpx;
}

.result-count {
    color: #718292;
    font-size: 23rpx;
}

.refresh-button {
    height: 48rpx;
    margin: 0;
    padding: 0 16rpx;
    border: 2rpx solid #d7e3e9;
    border-radius: 24rpx;
    background: transparent;
    color: #5d7285;
    font-size: 21rpx;
    line-height: 44rpx;
}

.refresh-button--pressed {
    background: #e9eef1;
}

.error-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 20rpx 28rpx 0;
    padding: 18rpx 20rpx;
    border: 2rpx solid #f0d3ca;
    border-radius: 8rpx;
    background: #fff8f5;
    color: #bf614a;
    font-size: 22rpx;
}

.error-retry {
    margin-left: 16rpx;
    color: #347eea;
    font-weight: 700;
}

.table-scroll {
    width: 100%;
    margin-top: 20rpx;
}

.road-table {
    min-width: 1660rpx;
    padding: 0 28rpx;
}

.table-row {
    display: flex;
    align-items: center;
    min-height: 94rpx;
    border-bottom: 2rpx solid #e7eef2;
    background: #ffffff;
}

.table-row:first-child {
    border-radius: 10rpx 10rpx 0 0;
}

.table-row:not(.table-head):active {
    background: #f3f8fa;
}

.table-head {
    min-height: 76rpx;
    border-bottom: 0;
    background: #e8f1f6;
    color: #5d748b;
    font-size: 22rpx;
    font-weight: 700;
}

.cell {
    display: block;
    box-sizing: border-box;
    padding: 0 18rpx;
    overflow: hidden;
    color: #526a7d;
    font-size: 23rpx;
    line-height: 1.4;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cell-id {
    width: 220rpx;
}

.cell-name {
    width: 260rpx;
}

.cell-type {
    width: 230rpx;
}

.cell-code {
    width: 150rpx;
}

.cell-speed {
    width: 190rpx;
}

.cell-oneway,
.cell-layer {
    width: 140rpx;
}

.cell-flag {
    width: 130rpx;
}

.cell-action {
    width: 210rpx;
}

.action-cell {
    display: flex;
    align-items: center;
    gap: 20rpx;
}

.edit-link,
.delete-link {
    font-size: 23rpx;
    font-weight: 700;
}

.edit-link {
    color: #347eea;
}

.delete-link {
    color: #c9684e;
}

.state-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 420rpx;
    margin: 20rpx 28rpx 0;
    border-radius: 10rpx;
    background: #ffffff;
}

.state-icon {
    color: #aac0cc;
    font-size: 70rpx;
}

.state-title {
    margin-top: 20rpx;
    color: #526575;
    font-size: 28rpx;
    font-weight: 700;
}

.state-copy {
    margin-top: 10rpx;
    color: #9aa7b0;
    font-size: 22rpx;
}

.pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24rpx 28rpx 0;
}

.page-button {
    width: 164rpx;
    height: 64rpx;
    margin: 0;
    padding: 0;
    border: 2rpx solid #d6e2e8;
    border-radius: 8rpx;
    background: #ffffff;
    color: #526a7d;
    font-size: 23rpx;
    line-height: 60rpx;
}

.page-button--pressed {
    background: #e9eef1;
}

.page-button[disabled] {
    color: #bdc8cf;
    background: #edf2f4;
}

.page-info {
    min-width: 130rpx;
    color: #5d7285;
    font-size: 24rpx;
    text-align: center;
}

.page-jump {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18rpx 28rpx 0;
}

.jump-label {
    color: #5d7285;
    font-size: 23rpx;
}

.jump-input {
    width: 124rpx;
    height: 60rpx;
    box-sizing: border-box;
    margin: 0 12rpx;
    padding: 0 12rpx;
    border: 2rpx solid #d6e2e8;
    border-radius: 8rpx;
    background: #ffffff;
    color: #263746;
    font-size: 24rpx;
    text-align: center;
}

.jump-button {
    width: 120rpx;
    height: 60rpx;
    margin: 0 0 0 16rpx;
    padding: 0;
    border-radius: 8rpx;
    background: #347eea;
    color: #ffffff;
    font-size: 23rpx;
    line-height: 60rpx;
}

.jump-button--pressed {
    background: #286fda;
}

.jump-button[disabled] {
    background: #9dbce7;
    color: #ffffff;
}

.modal-mask {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 20;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgba(13, 34, 51, 0.58);
}

.edit-modal {
    width: 100%;
    max-height: 88vh;
    box-sizing: border-box;
    border-radius: 18rpx 18rpx 0 0;
    background: #f7fbfd;
}

.modal-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 30rpx 30rpx 22rpx;
    background: #143553;
    color: #ffffff;
}

.modal-kicker {
    font-size: 18rpx;
}

.modal-title {
    display: block;
    margin-top: 10rpx;
    font-size: 34rpx;
    font-weight: 700;
}

.modal-close {
    padding: 0 4rpx;
    color: #b5cbd8;
    font-size: 46rpx;
    line-height: 1;
}

.form-scroll {
    max-height: 58vh;
    padding: 24rpx 30rpx;
    box-sizing: border-box;
}

.readonly-field {
    padding: 18rpx 20rpx;
    border-radius: 8rpx;
    background: #e9f0f4;
}

.readonly-value {
    display: block;
    margin-top: 8rpx;
    color: #718292;
    font-family: monospace;
    font-size: 25rpx;
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20rpx 18rpx;
    margin-top: 20rpx;
}

.field {
    min-width: 0;
}

.field-full {
    grid-column: 1 / 3;
}

.field-label {
    display: block;
    margin-bottom: 9rpx;
    color: #5d7285;
    font-size: 22rpx;
}

.field-input {
    width: 100%;
    height: 68rpx;
    box-sizing: border-box;
    padding: 0 16rpx;
    border: 2rpx solid #d6e3e9;
    border-radius: 7rpx;
    background: #ffffff;
    color: #263746;
    font-size: 24rpx;
}

.modal-actions {
    display: flex;
    gap: 16rpx;
    padding: 18rpx 30rpx 34rpx;
    border-top: 2rpx solid #dfeaf0;
    background: #f7fbfd;
}

.cancel-button,
.save-button {
    flex: 1;
    height: 78rpx;
    margin: 0;
    padding: 0;
    border-radius: 8rpx;
    font-size: 25rpx;
    line-height: 78rpx;
}

.cancel-button {
    border: 2rpx solid #d5e0e6;
    background: #ffffff;
    color: #5d7285;
}

.save-button {
    background: #347eea;
    color: #ffffff;
}

.save-button--pressed {
    background: #286fda;
}

.save-button[disabled] {
    background: #9dbce7;
}
</style>

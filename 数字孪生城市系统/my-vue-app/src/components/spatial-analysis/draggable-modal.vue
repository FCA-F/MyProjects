<template>
    <el-button
        v-if="isPanelSwitch"
        class="panel-switch"
        :title="isShow ? '收起工具面板' : '展开工具面板'"
        :aria-label="isShow ? '收起工具面板' : '展开工具面板'"
        @click="isShow = !isShow"
    >
        <el-icon>
            <Fold v-if="isShow" />
            <Expand v-else />
        </el-icon>
    </el-button>

    <div
        v-if="isShow"
        ref="modal"
        class="modal"
        :class="{ 'is-moving': isMoving }"
        :style="{ left: `${modal_x}px`, top: `${modal_y}px` }"
        role="dialog"
        :aria-label="title"
    >
        <div class="modal-header" @mousedown="startMove">
            <span class="title">{{ title }}</span>

            <el-button
                v-if="isCloseButton"
                class="close-modal-btn"
                circle
                aria-label="关闭工具面板"
                @mousedown.stop
                @click.stop="isShow = false"
            >
                <el-icon>
                    <Close />
                </el-icon>
            </el-button>
        </div>

        <div class="modal-body">
            <slot></slot>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { Close, Expand, Fold } from '@element-plus/icons-vue'

const props = withDefaults(
    defineProps<{
        title?: string
        isMove?: boolean
        isInitialPanelSwitch?: boolean
        initialLeft?: number
        initialTop?: number
    }>(),
    {
        isMove: true,
        isInitialPanelSwitch: true,
        initialLeft: 45,
        initialTop: 45,
    },
)

const title = props.title || '工具面板'
const isMove = props.isMove
const isInitialPanelSwitch = props.isInitialPanelSwitch

const modal = ref<HTMLElement | null>(null)
const isShow = ref(true)
const isPanelSwitch = ref(isInitialPanelSwitch)
const isCloseButton = ref(!isInitialPanelSwitch)
const isMoving = ref(false)

const modal_x = ref(props.initialLeft)
const modal_y = ref(props.initialTop)

let offsetX = 0
let offsetY = 0

const startMove = (event: MouseEvent) => {
    if (!isMove || !modal.value) {
        return
    }

    event.preventDefault()
    offsetX = event.clientX - modal.value.offsetLeft
    offsetY = event.clientY - modal.value.offsetTop
    isMoving.value = true

    document.addEventListener('mousemove', beMoving)
    document.addEventListener('mouseup', stopMove)
}

const beMoving = (event: MouseEvent) => {
    if (!isMoving.value) {
        return
    }

    modal_x.value = event.clientX - offsetX
    modal_y.value = event.clientY - offsetY
}

const stopMove = () => {
    document.removeEventListener('mousemove', beMoving)
    document.removeEventListener('mouseup', stopMove)
    isMoving.value = false
}

onBeforeUnmount(stopMove)
</script>

<style scoped>
.modal {
    position: absolute;
    z-index: 10;
    min-width: 360px;
    max-width: calc(100% - 24px);
    overflow: hidden;
    border: 1px solid rgba(210, 224, 233, 0.95);
    border-radius: 10px;
    background: #ffffff;
    box-shadow: 0 16px 36px rgba(16, 42, 67, 0.18), 0 3px 10px rgba(16, 42, 67, 0.08);
    color: #334e68;
    transition: box-shadow 0.2s ease;
}

.modal.is-moving {
    cursor: grabbing;
    user-select: none;
    box-shadow: 0 20px 42px rgba(16, 42, 67, 0.24), 0 5px 14px rgba(16, 42, 67, 0.1);
}

.modal-header {
    position: relative;
    display: flex;
    min-width: 100%;
    height: 50px;
    align-items: center;
    justify-content: center;
    padding: 0 48px 0 18px;
    background: #4b83d8;
    color: #ffffff;
    cursor: grab;
}

.modal-header::before {
    width: 6px;
    height: 6px;
    margin-right: 8px;
    border-radius: 50%;
    background: #b9f34a;
    content: '';
}

.modal-header:active {
    cursor: grabbing;
}

.title {
    overflow: hidden;
    color: #ffffff;
    font-size: 16px;
    font-weight: 700;
    line-height: 1;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.close-modal-btn {
    position: absolute;
    top: 9px;
    right: 10px;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, 0.55);
    background: rgba(255, 255, 255, 0.14);
    color: #ffffff;
}

.close-modal-btn:hover,
.close-modal-btn:focus-visible {
    border-color: rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.24);
    color: #ffffff;
}

.modal-body {
    display: flex;
    max-height: calc(100vh - 130px);
    flex-direction: column;
    gap: 12px;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 16px;
    background: #ffffff;
}

.panel-switch {
    position: absolute;
    z-index: 11;
    top: 12px;
    left: 12px;
    display: grid;
    width: 34px;
    height: 34px;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, 0.55);
    border-radius: 8px;
    background: #2f6fb5;
    box-shadow: 0 5px 14px rgba(16, 42, 67, 0.2);
    color: #ffffff;
    transition: background-color 0.2s ease, transform 0.2s ease;
}

.panel-switch:hover,
.panel-switch:focus-visible {
    border-color: rgba(255, 255, 255, 0.9);
    background: #245f9f;
    color: #ffffff;
    transform: translateY(-1px);
}

.panel-switch .el-icon {
    font-size: 17px;
}
</style>

<template>
    <div ref="modal" class="modal" :style="{ left: modal_x + 'px', top: modal_y + 'px' }" @mousedown="startMove">

        <div class="modal-header">
            <span class="title">{{ title }}</span>
            <el-button @click="isShow = !isShow" class="close-modal-btn"><span>▣</span>
            </el-button>
        </div>

        <div class="modal-body" v-if="isShow">
            <slot></slot>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
    defineProps<{
        title?: string,
        isMove?: boolean,
        isInitialPanelSwitch?: boolean,
        initialLeft?: number,
        initialTop?: number
    }>(), {
    isMove: true,
    isInitialPanelSwitch: true,
    initialTop: 100,
    initialLeft: 400,
}
)

const title = props.title//标题
const isMove = props.isMove//框是否可移动
const initialLeft = props.initialLeft//初始左位置
const initialTop = props.initialTop//初始上位置

const modal = ref();
const isShow = ref(true)//弹窗是否显示

const modal_x = ref(initialLeft)
const modal_y = ref(initialTop)

let offsetX: number, offsetY: number;

const startMove = (e: MouseEvent) => {
    if (!isMove) return
    offsetX = e.clientX - modal.value.offsetLeft;
    offsetY = e.clientY - modal.value.offsetTop;
    document.addEventListener('mousemove', beMoving);
    document.addEventListener('mouseup', stopMove)
}

const beMoving = (e: MouseEvent) => {
    modal_x.value = e.clientX - offsetX;
    modal_y.value = e.clientY - offsetY;
}

const stopMove = () => {
    document.removeEventListener('mousemove', beMoving);
}
</script>

<style scoped>
.modal {
    position: absolute;
    background-color: #ffffff;
    border-radius: 12px;
    z-index: 1;
    overflow: hidden;
}

/* 关闭按钮 */
.close-modal-btn {
    display: flex;
    position: absolute;
    top: 10px;
    right: 10px;
    font-weight: 400;
    /* 超粗 */
    color: #fff;
    line-height: 1;
    width: 20px;
    height: 30px;
    color: #fff;
    background: #1E88E5;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    font-size: 20px;
    align-items: center;
    justify-content: center;
    z-index: 2;

}

/* 弹窗标题 */
.modal-header {
    height: 50px;
    background-color: #1E88E5;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
}



.title {
    font-size: 18px;
    font-weight: bold;
    color: #fff;
    min-width: 200px;
}


/* 内容区域 */
.modal-body {
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px
}

.panel-switch {
    display: flex;
    position: absolute;
    top: 10px;
    left: 10px;
    width: 20px;
    height: 30px;
    color: #fff;
    background: #1E88E5;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    font-size: 20px;
    align-items: center;
    justify-content: center;
    z-index: 2;
}
</style>
<template>
    <el-button class="show-btn" @click="isShow = !isShow" type="primary">{{ isShow ? '关闭道路信息' : '显示道路信息' }}</el-button>
    <div class="bottom-toolbar" v-if="isShow">
        <Road></Road>
    </div>

</template>
<script setup lang="ts">
import { ref } from 'vue'
import Road from '@/components/BottomToolbar/road/RoadForm.vue';
const isShow = ref(false)


</script>
<style scoped>
.bottom-toolbar {
    position: absolute;
    top: 550px;
    left: 10px;
    width: 1650px;
    background-color: #ffffff;
    padding: 16px;
    /* 加大内边距，内部组件不贴边 */
    display: flex;
    flex-direction: column;
    color: black;
    gap: 18px;
    /* 模块间距微调，更舒展 */
    border-radius: 8px;
    /* 圆角边角，告别直角生硬 */
    border: 1px solid #E4E7ED;
    /* 浅灰细边框，低调精致 */
}

.show-btn {
    position: absolute;
    top: 500px;
    left: 10px;
    width: 120px;
    height: 40px;
}
</style>
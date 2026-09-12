<template>
    <DraggableModal title="日照分析">
        <div class="row">
            <label class="label">日期</label>
            <el-date-picker v-model="date" class="input" />
        </div>
        <div class="row">
            <label class="label">开始时间</label>
            <el-input v-model.number="startHour" class="input" />
        </div>
        <div class="row">
            <label class="label">结束时间</label>
            <el-input v-model.number="stopHour" class="input" />
        </div>
        <div class="row">
            <label class="label">日照速度</label>
            <el-input v-model.number="speed" class="input" />
        </div>
        <div class="row">
            <el-button @click="sunlightAnalysis" :color="startOrStop ? 'red' : 'green'" class="button">{{ startOrStopText
                }}</el-button>
        </div>
    </DraggableModal>

</template>
<script setup lang="ts">
import * as Cesium from 'cesium'
import { ref, onMounted, onUnmounted } from 'vue'
import { useCesiumStore } from '@/stores/cesium.ts'
import DraggableModal from '@/components/TopToolbar/draggable-modal.vue'
import '@/components/TopToolbar/draggable-modal.css'

let viewer: Cesium.Viewer;
onMounted(() => {
    const cesiumStore = useCesiumStore();
    viewer = cesiumStore.viewer as Cesium.Viewer;
})

const date = ref("2025-6-10");
const startHour = ref(0);
const stopHour = ref(24);
const speed = ref(1600);
const startOrStop = ref(false);
const startOrStopText = ref("开始")

const sunlightAnalysis = () => {
    if (!startOrStop.value) {
        startOrStop.value = true;
        startOrStopText.value = "结束";

        viewer.shadows = true;
        if (date.value == '') {
            alert('请输入日期！')
            return;
        }
        let startTime = new Date(new Date(date.value).setHours(Number(startHour.value)));
        let stopTime = new Date(new Date(date.value).setHours(Number(stopHour.value)));

        viewer.clock.startTime = Cesium.JulianDate.fromDate(startTime);//开始时间
        viewer.clock.stopTime = Cesium.JulianDate.fromDate(stopTime);//结束时间
        viewer.clock.currentTime = Cesium.JulianDate.fromDate(startTime);//当前时间
        viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;//范围形式->循环
        viewer.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER;//时间速度形式->倍率
        viewer.clock.multiplier = speed.value;//时间速度

        viewer.shadows = true;//阴影
        viewer.scene.globe.enableLighting = true;//光照
        viewer.clock.shouldAnimate = true;//时间运行
    }
    else {
        startOrStop.value = false;
        startOrStopText.value = "开始";

        viewer.shadows = false;
        viewer.scene.globe.enableLighting = false;
        viewer.clock.shouldAnimate = false;
    }
}


onUnmounted(() => {
    viewer.scene.globe.enableLighting = false;
    viewer.shadows = false;
    viewer.clock.shouldAnimate = false;

})
</script>

<template>
    <div class="toolbar">
        <label class="oneText">日照分析</label>
        <div class="row">
            <label class="twoText">日期</label>
            <input v-model="date" class="input">
        </div>
        <div class="row">
            <label class="twoText">开始时间</label>
            <input v-model.number="startHour" class="input">
        </div>
        <div class="row">
            <label class="twoText">结束时间</label>
            <input v-model.number="stopHour" class="input">
        </div>
        <div class="row">
            <label class="twoText">日照速度</label>
            <input v-model.number="speed" class="input">
        </div>
        <button @click="sunlightAnalysis" :class="['startOrStopBtn',startOrStop?'red':'']">{{ startOrStopText }}</button>
    </div>
</template>
<script setup>
import * as Cesium from 'cesium'
import {ref} from 'vue'

const props=defineProps({viewer:{type:Object,required:true}});

const viewer=props.viewer;

const date=ref("2025-6-10");
const startHour=ref(0);
const stopHour=ref(24);
const speed=ref(1600);
const startOrStop=ref(false);
const startOrStopText=ref("开始")

const sunlightAnalysis=()=>
{
    if(!startOrStop.value)
    {
        startOrStop.value=true;
        startOrStopText.value="结束";
        
        viewer.shadows=true;
        if(date.value=='')
        {
            alert('请输入日期！')
            return;
        }
        let startTime=new Date(new Date(date.value).setHours(Number(startHour.value)));
        let stopTime=new Date(new Date(date.value).setHours(Number(stopHour.value)));

        viewer.clock.startTime=Cesium.JulianDate.fromDate(startTime);//开始时间
        viewer.clock.stopTime=Cesium.JulianDate.fromDate(stopTime);//结束时间
        viewer.clock.currentTime=Cesium.JulianDate.fromDate(startTime);//当前时间
        viewer.clock.clockRange=Cesium.ClockRange.LOOP_STOP;//范围形式->循环
        viewer.clock.clockStep=Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER;//时间速度形式->倍率
        viewer.clock.multiplier=speed.value;//时间速度

        viewer.shadows=true;//阴影
        viewer.scene.globe.enableLighting=true;//光照
        viewer.clock.shouldAnimate=true;//时间运行
    }
    else
    {
        startOrStop.value=false;
        startOrStopText.value="开始";

        viewer.shadows=false;
        viewer.scene.globe.enableLighting=false;
        viewer.clock.shouldAnimate=false;
    }
}
</script>
<style scoped>

</style>
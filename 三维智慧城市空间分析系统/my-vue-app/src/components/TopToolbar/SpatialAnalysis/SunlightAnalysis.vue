<template>
    <div v-if="isShow"
        ref="modal"
        @mousedown="startMove"
        :style="{left:modal_x+'px',top:modal_y+'px'}"
        class="modal"
    >
        <!-- 标题栏 -->
        <div class="modal-header">
            <span class="title">日照分析</span>
            <el-button @click="closeModal" circle class="close-modal-btn" color="red" icon="closeBold"></el-button>
        </div>

        <!-- 表单内容区 -->
        <div class="modal-body">
            <div class="row">
                <label class="label">日期</label>
                <el-date-picker v-model="date" class="input"/>
            </div>
            <div class="row">
                <label class="label">开始时间</label>
                <el-input v-model.number="startHour" class="input"/>
            </div>
            <div class="row">
                <label class="label">结束时间</label>
                <el-input v-model.number="stopHour" class="input"/>
            </div>
            <div class="row">
                <label class="label">日照速度</label>
                <el-input v-model.number="speed" class="input"/>
            </div>
            <div class="row">
                <el-button @click="sunlightAnalysis" :color="startOrStop?'red':'green'" class="button">{{ startOrStopText }}</el-button>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import * as Cesium from 'cesium'
import {ref,onMounted,onUnmounted} from 'vue'
import {useCesiumStore} from '../../../stores/cesium.ts'

let viewer:Cesium.Viewer;
onMounted(()=>{
    const cesiumStore=useCesiumStore();
    viewer=cesiumStore.viewer as Cesium.Viewer;
})

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

//鼠标移动
const modal=ref();
const isShow=ref(true);
const modal_x=ref(200);
const modal_y=ref(200);

let offsetX:number,offsetY:number;

const startMove=(e:MouseEvent)=>{
    offsetX=e.clientX-modal.value.offsetLeft;
    offsetY=e.clientY-modal.value.offsetTop;
    document.addEventListener('mousemove',beMoving);
    document.addEventListener('mouseup',stopMove)
}

const beMoving=(e:MouseEvent)=>{
    modal_x.value=e.clientX-offsetX;
    modal_y.value=e.clientY-offsetY;
}

const stopMove=()=>{
    document.removeEventListener('mousemove',beMoving);
}

const closeModal=()=>{
    isShow.value=false;
    viewer.scene.globe.enableLighting=false;
    viewer.shadows=false;
    viewer.clock.shouldAnimate=false;
    document.removeEventListener('mousemove',beMoving);
    document.removeEventListener('mouseup',stopMove);
}

onUnmounted(()=>{
    viewer.scene.globe.enableLighting=false;
    viewer.shadows=false;
    viewer.clock.shouldAnimate=false;
    document.removeEventListener('mousemove',beMoving);
    document.removeEventListener('mouseup',stopMove);
})
</script>
<style scoped>
.modal{position:absolute;width:400px;height:350px;background-color:#ffffff;
        border-radius:12px;z-index:1;overflow:hidden;
}
/* 弹窗标题栏 */
.modal-header {height:50px;background-color:#1E88E5;display:flex;align-items:center;justify-content:center;position:relative;}
.title {font-size:18px;font-weight:bold;color:#fff;}
/* 关闭按钮 */
.close-modal-btn{position:absolute;top:10px;right:15px;}
/* 内容区域 */
.modal-body{padding:30px 25px;display:flex;flex-direction:column;gap:20px}
/* 表单项行 */
.row{display:flex;align-items:center;gap:15px;justify-content:center}
/*标签*/
.label{width:80px;font-size:15px;font-weight:500;color:#333;text-align:left;}
/*输入*/
.input{width:300px;height:32px}
/*日期*/
:deep(.el-date-editor){width: 300px!important;height:32px!important;}
/*按钮*/
.button{width:100px;height:30px}
</style>
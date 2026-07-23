<template>
    <div class="top-toolbar">
        <el-menu
            :default-active="activeIndex"
            class="el-menu-demo"
            mode="horizontal"
            :ellipsis="false"
            @select="handleSelect"
        >
            <el-menu-item index="0">
                <div class="title">三维智慧城市空间分析系统</div>
            </el-menu-item>

            <el-sub-menu index="SpatialAnalysis">
                <template #title>空间分析</template>
                <el-menu-item index="SunlightAnalysis">日照分析</el-menu-item>
                <el-sub-menu index="InundationAnalysis">
                    <template #title>淹没分析</template>
                    <el-menu-item index="InundationAnalysis1">淹没演示</el-menu-item>
                    <el-menu-item index="InundationAnalysis2">淹没水深分析</el-menu-item>
                    <el-menu-item index="InundationAnalysis3">同高度淹没水深分析</el-menu-item>
                </el-sub-menu>
                <el-menu-item index="VisibilityAnalysis">通视分析</el-menu-item>
                <el-menu-item index="BufferAnalysis">缓冲区分析</el-menu-item>
                <el-menu-item index="Mask">遮罩</el-menu-item>
            </el-sub-menu>

            <el-sub-menu index="Measurement">
                <template #title>测量</template>
                <el-menu-item index="CoordinateMeasurement">坐标</el-menu-item>
                <el-menu-item index="DistanceMeasurement">距离</el-menu-item>
                <el-menu-item index="AreaMeasurement">面积</el-menu-item>
            </el-sub-menu>

            <el-menu-item index="CarMovement">
                <template #title>汽车移动</template>
            </el-menu-item>

            <el-menu-item index="AddModel">
                <template #title>添加模型</template>
            </el-menu-item>

            <el-menu-item index="User">
                <el-avatar :size="50" class="avatar">{{ store.userName }}</el-avatar>
            </el-menu-item>

        </el-menu>
    </div>
    <SpatialAnalysis v-if="oneMenu=='SpatialAnalysis'" :twoMenu="twoMenu" :threeMenu="threeMenu"/>
    <Measurement v-else-if="oneMenu=='Measurement'" :twoMenu="twoMenu"/>
    <CarMovement v-else-if="oneMenu=='CarMovement'"/>
    <AddModel v-else-if="oneMenu=='AddModel'"/>
</template>
 
<script setup lang="ts">
import {ref} from 'vue'
import {useStore} from '../stores/store.ts'

import SpatialAnalysis from './TopToolbar/SpatialAnalysis.vue'
import Measurement from './TopToolbar/Measurement.vue'
import CarMovement from './TopToolbar/CarMovement.vue'
import AddModel from './TopToolbar/AddModel.vue'

const activeIndex=ref('')
const oneMenu=ref('')
const twoMenu=ref('')
const threeMenu=ref('')
const store=useStore();

const handleSelect=(key:string,keyPath:string[])=>{
  console.log(key,keyPath)
  oneMenu.value=keyPath[0];
  if(keyPath.length>=2)
  twoMenu.value=keyPath[1];
  if(keyPath.length>=3)
  threeMenu.value=keyPath[2]
}
</script>

<style scoped>
    .top-toolbar{
        position: absolute;top:0;left:0;right:0;z-index:1;
    }
    .title{
        font-size:24px;
        font-weight:1000;
        color:#1E88E5;
        letter-spacing:0.5px;
        margin-right: 60px;
    }
    .el-menu--horizontal>.el-menu-item:nth-child(5){
        margin-right: auto;
    }
</style>

<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />

        <DraggableModal title="风场">
            <div class="row">
                <el-button class="draw-button" :color="isShow ? 'red' : 'green'" @click="switchWind"> {{ isShow ? '关闭' :
                    '开启' }}</el-button>
            </div>
            <div class="row">
                <span class="label">密度</span>
                <el-input v-model.number="wind_density" class="input" />
            </div>
            <div class="row">
                <span class="label">速度</span>
                <el-input v-model.number="wind_speed" class="input" />
            </div>
        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import { WindLayer, type WindData } from 'cesium-wind-layer'
import { onBeforeUnmount, ref } from 'vue'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import { initCesiumBase } from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

let viewer: Cesium.Viewer
let windLayer: WindLayer | undefined // 风场图层
let windData: any

const isShow = ref(false)            // 风场是否开启
const wind_density = ref(300)
const wind_speed = ref(1)

//风场颜色
const windColors = [
    'rgba(170, 255, 120, 1)',
    'rgba(110, 255, 150, 1)',
    'rgba(50, 245, 210, 1)',
    'rgba(35, 210, 255, 1)',
    'rgba(70, 160, 255, 1)',
    'rgba(190, 130, 255, 1)',
    'rgba(255, 220, 80, 1)',
    'rgba(255, 145, 55, 1)'
]

//风场参数设置
let windParams = {
    particlesTextureSize: wind_density.value,//纹理图尺寸，控制粒子浓度
    particleHeight: 1000,//粒子高度
    dropRate: 0.001,//粒子消失速度
    dropRateBump: 0.001,
    speedFactor: wind_speed.value,//速度
    lineWidth: { min: 5, max: 7 },//线宽
    lineLength: { min: 600, max: 800 },//线长
    flipY: false,//翻转Y轴
    useViewerBounds: true,         // 只算视野内粒子
    dynamic: true,                 // 每帧更新粒子位置
    domain: { min: 0, max: 30 },//风速最小最大值，归一化判断着色
    colors: windColors//着色规则
}

const onMapReady = async (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer

    await initCesiumBase(viewer, {
        destination: { lng: 114.40740, lat: 30.50721, height: 5000000 },
        terrain: true,                    // 开启地形
        shouldAnimate: true               // 启用动画循环，风场粒子每帧重绘依赖这个
    })
}

const switchWind = async () => {
    if (isShow.value) {
        isShow.value = false
        removeWindLayer()
    }
    else {
        isShow.value = true
        await loadWindLayer()
    }
}

const loadWindLayer = async () => {
    removeWindLayer()
    windData = await (await fetch(`/data/wind/wind-global.json`)).json()//抓取文件并拆包,得到原始数据
    windData = normalizeMarsWindData(windData)//将原始数据转换成标准cesium-wind-layer接受的数据
    windLayer = new WindLayer(viewer, windData, windParams)
}

//数据格式适配，把Mars3D 风格数据翻译成 cesium-wind-layer 插件能直接吃的 WindData 格式。
//u东西方向风速，v南北方向风速
const normalizeMarsWindData = (rawData: any): WindData => {
    const u = cleanWindComponent(rawData.udata)//清洗u分量
    const v = cleanWindComponent(rawData.vdata)//清洗v分量

    return {//标准cesium-wind-layer接收格式
        u: { array: u.array, min: u.min, max: u.max },
        v: { array: v.array, min: v.min, max: v.max },
        width: rawData.cols,
        height: rawData.rows,
        bounds: {
            west: rawData.xmin,
            south: rawData.ymin,
            east: rawData.xmax,
            north: rawData.ymax
        }
    }
}

//清洗单个风场分量（U 或 V），去掉变态异常数值
const cleanWindComponent = (data: Array<number | null>) => {
    const array = new Float32Array(data.length)//存储数组，转成 Float32Array（GPU 纹理需要，性能优于普通数组）
    let min = Number.POSITIVE_INFINITY//最小值
    let max = Number.NEGATIVE_INFINITY//最大值
    //把变态数变成0
    data.forEach((item, index) => {//data（u或v分量）是一维数组
        const value = typeof item === 'number' && Number.isFinite(item) ? item : 0//isFinite判断一个值是不是"有限的数字"
        array[index] = value
        //如果是正常数，更新最大最小值
        if (typeof item === 'number' && Number.isFinite(item)) {
            min = Math.min(min, value)
            max = Math.max(max, value)
        }
    })
    //兜底
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
        min = 0
        max = 0
    }

    return { array, min, max }
}
//移除风场
const removeWindLayer = () => {
    if (windLayer) {
        windLayer.remove()
        windLayer.destroy()
    }
    windLayer = undefined
}

watch([wind_density, wind_speed], () => {
    //输入限制
    if (wind_density.value > 900) wind_density.value = 900
    if (wind_density.value < 0) wind_density.value = 0
    if (wind_speed.value > 100) wind_speed.value = 100
    if (wind_speed.value < 0) wind_speed.value = 0

    if (isShow.value) {
        windParams = {//更新风参数
            particlesTextureSize: wind_density.value,//纹理图尺寸，控制粒子浓度
            particleHeight: 1000,//粒子高度
            dropRate: 0.001,//粒子消失速度
            dropRateBump: 0.001,
            speedFactor: wind_speed.value,//速度
            lineWidth: { min: 5, max: 10 },//线宽
            lineLength: { min: 600, max: 800 },//线长
            flipY: false,//翻转Y轴
            useViewerBounds: true,         // 只算视野内粒子
            dynamic: true,                 // 每帧更新粒子位置
            domain: { min: 0, max: 30 },//风速最小最大值，归一化判断着色
            colors: windColors//着色规则
        }
        loadWindLayer()
    }
})

onBeforeUnmount(() => {
    removeWindLayer()
})
</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
<!--

安装插件
npm install cesium-wind-layer
准备风场数据
局部数据可以直接下载 Mars3D 的 JSON：
https://data.mars3d.cn/file/apidemo/wind-singapore.json
https://data.mars3d.cn/file/apidemo/wind-hongkong.json
全球数据下载这个：
https://data.mars3d.cn/file/apidemo/wind.nc
放到项目目录
例如：
public/data/wind/wind-singapore.json
public/data/wind/wind-hongkong.json
public/data/wind/wind.nc
转换全球 .nc
.nc 不能直接给 cesium-wind-layer 用，要用 NetCDF 解析器读出：
lon
lat
U
V
然后生成 JSON：
{
  xmin: -180,
  xmax: 180,
  ymin: -90,
  ymax: 90,
  rows: 361,
  cols: 720,
  udata: [...],
  vdata: [...]
}
注意：Mars3D 这个 wind.nc 的经度是 0 ~ 359.5，要把每一行数据旋转半圈，变成 -180 ~ 180。
转成 cesium-wind-layer 格式
Mars3D JSON 格式是：
{
  xmin,
  ymin,
  xmax,
  ymax,
  cols,
  rows,
  udata,
  vdata
}
cesium-wind-layer 要的是：
{
  u: { array: Float32Array },
  v: { array: Float32Array },
  width,
  height,
  bounds: { west, south, east, north }
}
所以页面里要转换：
const windData = {
  u: { array: new Float32Array(raw.udata) },
  v: { array: new Float32Array(raw.vdata) },
  width: raw.cols,
  height: raw.rows,
  bounds: {
    west: raw.xmin,
    south: raw.ymin,
    east: raw.xmax,
    north: raw.ymax
  }
}
创建风场图层
import { WindLayer } from 'cesium-wind-layer'

const windLayer = new WindLayer(viewer, windData, {
  particlesTextureSize: 700,
  particleHeight: 1000,
  speedFactor: 1.15,
  dropRate: 0.001,
  dropRateBump: 0.001,
  lineWidth: { min: 10, max: 16 },
  lineLength: { min: 120, max: 360 },
  flipY: false,
  useViewerBounds: true,
  dynamic: true,
  domain: { min: 0, max: 30 },
  colors: [
    'rgba(170, 255, 120, 1)',
    'rgba(50, 245, 210, 1)',
    'rgba(35, 210, 255, 1)',
    'rgba(255, 220, 80, 1)'
  ]
})
这个构造函数内部会自动 add()，不用再手动 windLayer.add()。
销毁时清理
windLayer.remove()
windLayer.destroy()
核心逻辑就是：
下载 U/V 风场数据
-> 转成 Cesium WindLayer 需要的格网格式
-> new WindLayer(viewer, windData, options)
-> 页面卸载时 remove/destroy
我们现在项目里实际用的是：
插件：cesium-wind-layer
数据目录：public/data/wind
页面：src/views/cesium-function/default/text.vue
全球数据：wind.nc -> wind-global.json 转换后的结果


-->
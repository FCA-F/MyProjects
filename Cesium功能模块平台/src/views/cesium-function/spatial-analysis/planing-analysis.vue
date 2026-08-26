<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
        <DraggableModal title="刨面分析">
            <div class="row">
                <el-button class="draw-button" @click="switchDraw" :color="isDraw ? 'red' : 'greenyellow'">绘制</el-button>
            </div>
            <div class="row">
                <el-button class="draw-button" @click="runAnalysis" color="#1E88E5">分析</el-button>
            </div>
        </DraggableModal>
        <DraggableModal title="刨面图" v-if="isShowChart" :initialLeft="10" :initialTop="460"
            :isInitialPanelSwitch="false">
            <div ref="chartRef" class="echart"></div>
        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import * as echarts from 'echarts'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import { initCesiumBase } from '@/utils/cesium'
import { ElMessage } from 'element-plus'
import '@/components/Common/draggable-modal.css'

let viewer: Cesium.Viewer
let handler: Cesium.ScreenSpaceEventHandler

const isDraw = ref<boolean>()
//Echarts
const isShowChart = ref<boolean>(false)
const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts

let sampledPointsNumber = 2500//采样点数

let startCartesian: Cesium.Cartesian3 | undefined
let endCartesian: Cesium.Cartesian3 | undefined
let startPoint: Cesium.Entity | undefined
let endPoint: Cesium.Entity | undefined
let polyline: Cesium.Entity | undefined

let sampledCartographics: Cesium.Cartographic[] = []
let sampledDatas: number[][] = []

const onMapReady = (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer
    handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);

    initCesiumBase(viewer, {
        destination: { lng: 114.200232, lat: 31.278762, height: 2000 },
        orientation: { heading: 140, pitch: -30, roll: 0 },
        terrain: true,
        depthTestAgainstTerrain: true,
    })
}

const switchDraw = () => {
    if (isDraw.value) {
        isDraw.value = false
        closeDraw()
    }
    else {
        isDraw.value = true
        startDraw()
    }
}

const startDraw = () => {

    //采集数据清空
    clearData()

    handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        let pickPosition = viewer.scene.pickPosition(e.position)
        if (!pickPosition) return
        if (!startCartesian) {
            startCartesian = pickPosition
            startPoint = addStartPoint(startCartesian)
            return
        }
        if (!endCartesian) {
            endCartesian = pickPosition
            endPoint = addEndPoint(endCartesian)
            polyline = addPolyline(startCartesian, endCartesian)
            closeDraw()
            return
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

const closeDraw = () => {
    isDraw.value = false
    handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

const clearData = () => {
    startCartesian = endCartesian = undefined
    startPoint = endPoint = undefined
    sampledCartographics = []
    sampledDatas = []
    isShowChart.value = false
    viewer.entities.removeAll()
}

const addStartPoint = (position: Cesium.Cartesian3) => {
    return viewer.entities.add({
        position: position,
        point: {
            color: Cesium.Color.YELLOW,
            pixelSize: 10,
            disableDepthTestDistance: 100000
        }
    })
}

const addEndPoint = (position: Cesium.Cartesian3) => {
    return viewer.entities.add({
        position: position,
        point: {
            color: Cesium.Color.ORANGE,
            pixelSize: 10,
            disableDepthTestDistance: 100000
        }
    })
}

const addPolyline = (startPosition: Cesium.Cartesian3, endPosition: Cesium.Cartesian3) => {
    return viewer.entities.add({
        polyline: {
            positions: [startPosition, endPosition],
            material: Cesium.Color.RED,
            width: 5,
            clampToGround: true
        }
    })
}

const runAnalysis = async () => {
    if (!startCartesian) {
        ElMessage.warning("未绘制起始点")
        return
    }
    if (!endCartesian) {
        ElMessage.warning("未绘制终点")
        return
    }
    await getSamples()
    await drawChart()
}

const getSamples = async () => {
    if (!startCartesian || !endCartesian)
        return
    let cartesian = new Cesium.Cartesian3
    for (let i = 0; i <= sampledPointsNumber; i++) {
        let t = i / sampledPointsNumber;
        Cesium.Cartesian3.lerp(startCartesian, endCartesian, t, cartesian)
        sampledCartographics.push(Cesium.Cartographic.fromCartesian(cartesian))
    }
    sampledCartographics = await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, sampledCartographics)
    let totalDistance = Cesium.Cartesian3.distance(startCartesian, endCartesian)
    sampledDatas = sampledCartographics.map((cartographic, index) => {
        let height = cartographic.height
        let distance = (index / sampledPointsNumber) * totalDistance
        let lng = Cesium.Math.toDegrees(cartographic.longitude)
        let lat = Cesium.Math.toDegrees(cartographic.latitude)
        return [distance, height, lng, lat]
    })
}

const drawChart = async () => {
    if (sampledDatas.length == 0) //没有采样数据，直接return
        return

    isShowChart.value = true
    await nextTick()
    chart = echarts.init(chartRef.value)

    chart.setOption({
        series: [{
            type: 'line',
            data: sampledDatas,
            smooth: false,
            //点
            showSymbol: true,//显示小圆点，这样tooltip的item才能生效
            symbolSize: 10,//鼠标触发范围
            itemStyle: {//普通小圆点透明
                opacity: 0
            },
            emphasis: {//高光小圆点不透明
                itemStyle: {
                    opacity: 1
                }
            },
            //线
            lineStyle: {
                width: 3
            },
            areaStyle: {//线条下方填充
                color: 'rgba(30,136,229,0.18)',
            },
            //最高最低点
            markPoint: {
                label: {
                    formatter: (params: any) => {
                        return `${params.name}\n${Number(params.value).toFixed(2)}米`
                    }
                },
                data: [
                    { type: 'max', name: '最高点' },
                    { type: 'min', name: '最低点' }
                ]
            },
            //平均线
            markLine: {
                label: {
                    formatter: (params: any) => {
                        return `${params.name}:${Number(params.value.toFixed(2))}米`
                    }
                },
                data: [
                    { type: 'average', name: '平均高程' }
                ],
                lineStyle: {
                    color: '#f56c6c',
                    type: 'dashed',        // 虚线，区分剖面实线
                    width: 2
                },
            }
        }],
        xAxis: {
            type: 'value',
            name: '距离(米)',
            min: 0,
            max: sampledDatas[sampledDatas.length - 1][0],//x轴最大距离
            axisLabel: {
                formatter: (value: number) => {
                    return value.toFixed(0)
                }
            }
        },
        yAxis: {
            type: 'value',
            name: '高程(米)'
        },
        tooltip: {//信息
            trigger: 'item',//触发方式：（精确点到线上）
            formatter: (params: any) => {
                const data = params.data//第一条线（echarts支持多条线）
                return `
                    高程:${data[1].toFixed(2)}米<br/>
                    距离:${data[0].toFixed(2)}米<br/>
                    经度:${data[2].toFixed(6)}<br/>
                    纬度:${data[3].toFixed(6)}
                `
            }
        },
        grid: {//位置
            left: 5,
            right: 120,
            top: 45,
            bottom: 15,
            containLabel: true//把坐标轴文字也算进边距里
        }
    })

}

</script>
<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}

.echart {
    width: 1460px;
    height: 310px
}
</style>
<template>
    <section class="home-page">
        <div class="home-shell">
            <header class="command-header">
                <div class="command-copy">
                    <div class="command-kicker">
                        <span class="live-dot"></span>
                        <span>URBAN INTELLIGENCE PLATFORM</span>
                        <i></i>
                        <span>LIVE COMMAND CENTER</span>
                    </div>
                    <h1>城市运行<span>驾驶舱</span></h1>
                    <p>把空间、路网、三维场景与 AI 连接成一张可操作的城市底图。</p>
                </div>

                <div class="command-meta">
                    <div class="system-clock">
                        <span>LOCAL SYSTEM TIME</span>
                        <strong>{{ currentTime }}</strong>
                        <small>{{ currentDate }} · 平台服务在线</small>
                    </div>
                    <el-button class="primary-action" type="primary" @click="openRoute('/app/spatial-analysis')">
                        <el-icon>
                            <MapLocation />
                        </el-icon>
                        进入空间分析
                    </el-button>
                </div>
            </header>

            <section class="metric-grid" aria-label="平台运行指标">
                <article v-for="metric in metrics" :key="metric.label" class="metric-card">
                    <div class="metric-icon" :class="`tone-${metric.tone}`">
                        <el-icon>
                            <component :is="metric.icon" />
                        </el-icon>
                    </div>
                    <div class="metric-content">
                        <span>{{ metric.label }}</span>
                        <strong>{{ metric.value }}<small>{{ metric.unit }}</small></strong>
                        <p>{{ metric.caption }}</p>
                    </div>
                    <span class="metric-state" :class="`state-${metric.stateTone}`">
                        <i></i>
                        {{ metric.state }}
                    </span>
                </article>
            </section>

            <div class="workspace-grid">
                <section class="dashboard-panel pulse-panel">
                    <div class="panel-head">
                        <div>
                            <span class="panel-kicker">PLATFORM TELEMETRY</span>
                            <h2>运行态势</h2>
                        </div>
                        <div class="panel-head-status">
                            <span class="status-ring"></span>
                            <span>最近 7 个时段</span>
                        </div>
                    </div>

                    <div class="pulse-content">
                        <div ref="chartRef" class="pulse-chart" aria-label="平台运行指数趋势图"></div>

                        <div class="pulse-summary">
                            <div class="score-block">
                                <span>综合运行指数</span>
                                <strong>92.8</strong>
                                <small><b>+4.2%</b> 较上个周期</small>
                            </div>

                            <div class="service-list">
                                <div v-for="service in services" :key="service.name" class="service-row">
                                    <span class="service-name">
                                        <i :class="`service-dot ${service.tone}`"></i>
                                        {{ service.name }}
                                    </span>
                                    <span class="service-value">{{ service.value }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="pulse-footer">
                        <span><i></i> 前端工作台已就绪</span>
                        <span>地图 / 数据 / 智能服务</span>
                    </div>
                </section>

                <section class="dashboard-panel capability-panel">
                    <div class="panel-head">
                        <div>
                            <span class="panel-kicker">CORE CAPABILITIES</span>
                            <h2>能力矩阵</h2>
                        </div>
                        <span class="module-count">4 / 5 在线</span>
                    </div>

                    <div class="module-list">
                        <button
                            v-for="module in modules"
                            :key="module.name"
                            class="module-item"
                            :class="{ 'is-pending': !module.available }"
                            type="button"
                            :aria-disabled="!module.available"
                            @click="openModule(module)"
                        >
                            <span class="module-icon" :class="`tone-${module.tone}`">
                                <el-icon>
                                    <component :is="module.icon" />
                                </el-icon>
                            </span>
                            <span class="module-copy">
                                <strong>{{ module.name }}</strong>
                                <small>{{ module.description }}</small>
                            </span>
                            <span class="module-status" :class="{ pending: !module.available }">
                                {{ module.status }}
                            </span>
                            <el-icon class="module-arrow">
                                <ArrowRight />
                            </el-icon>
                        </button>
                    </div>
                </section>
            </div>

            <div class="lower-grid">
                <section class="dashboard-panel event-panel">
                    <div class="panel-head">
                        <div>
                            <span class="panel-kicker">SYSTEM EVENT STREAM</span>
                            <h2>运行事件流</h2>
                        </div>
                        <span class="event-live"><i></i> LIVE</span>
                    </div>

                    <div class="event-list">
                        <div v-for="event in events" :key="event.title" class="event-row">
                            <span class="event-time">{{ event.time }}</span>
                            <span class="event-line">
                                <i :class="`event-marker ${event.tone}`"></i>
                            </span>
                            <span class="event-content">
                                <strong>{{ event.title }}</strong>
                                <small>{{ event.description }}</small>
                            </span>
                            <el-icon class="event-arrow">
                                <ArrowRight />
                            </el-icon>
                        </div>
                    </div>
                </section>

                <section class="dashboard-panel analysis-panel">
                    <div class="panel-head">
                        <div>
                            <span class="panel-kicker">SPATIAL TOOLKIT</span>
                            <h2>空间分析工具集</h2>
                        </div>
                        <el-button text type="primary" @click="openRoute('/app/spatial-analysis')">
                            查看工具
                            <el-icon>
                                <ArrowRight />
                            </el-icon>
                        </el-button>
                    </div>

                    <div class="tool-cloud">
                        <button
                            v-for="tool in analysisTools"
                            :key="tool"
                            class="tool-chip"
                            type="button"
                            @click="openRoute('/app/spatial-analysis')"
                        >
                            <span></span>
                            {{ tool }}
                        </button>
                    </div>

                    <div class="analysis-note">
                        <span class="note-icon">
                            <el-icon>
                                <DataAnalysis />
                            </el-icon>
                        </span>
                        <span>
                            <strong>从地图开始一次研判</strong>
                            <small>选择工具后，可在三维场景中直接绘制分析范围。</small>
                        </span>
                    </div>
                </section>

                <section class="dashboard-panel ai-panel">
                    <div class="panel-head">
                        <div>
                            <span class="panel-kicker">INTELLIGENT INSIGHT</span>
                            <h2>AI 助手</h2>
                        </div>
                        <span class="ai-state"><i></i> DeepSeek</span>
                    </div>

                    <div class="ai-preview">
                        <div class="ai-orbit">
                            <span class="orbit-core">
                                <el-icon>
                                    <ChatDotRound />
                                </el-icon>
                            </span>
                            <i class="orbit-line orbit-line-one"></i>
                            <i class="orbit-line orbit-line-two"></i>
                        </div>
                        <p>把问题交给城市数据，让地图和答案一起出现。</p>
                    </div>

                    <el-button class="ai-action" type="primary" @click="openRoute('/app/ai-assistant')">
                        开始与 AI 对话
                        <el-icon>
                            <ArrowRight />
                        </el-icon>
                    </el-button>
                </section>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import {
    ArrowRight,
    ChatDotRound,
    DataAnalysis,
    Guide,
    MapLocation,
    Position,
    VideoCamera,
} from '@element-plus/icons-vue'

type DashboardModule = {
    name: string
    description: string
    status: string
    route?: string
    available: boolean
    tone: string
    icon: typeof MapLocation
}

const router = useRouter()
const chartRef = ref<HTMLElement | null>(null)
const currentTime = ref('')
const currentDate = ref('')

let chart: echarts.ECharts | undefined
let clockTimer: number | undefined

const metrics = [
    {
        label: '空间分析工具',
        value: '10',
        unit: ' 项',
        caption: '地图内置分析能力',
        state: 'READY',
        stateTone: 'teal',
        tone: 'teal',
        icon: DataAnalysis,
    },
    {
        label: '路网数据图层',
        value: '01',
        unit: ' 组',
        caption: 'MVT 矢量瓦片已连接',
        state: 'ONLINE',
        stateTone: 'blue',
        tone: 'blue',
        icon: Guide,
    },
    {
        label: '三维城市场景',
        value: '01',
        unit: ' 套',
        caption: '城市漫游场景已就绪',
        state: 'READY',
        stateTone: 'orange',
        tone: 'orange',
        icon: VideoCamera,
    },
    {
        label: 'AI 智能服务',
        value: 'ON',
        unit: '',
        caption: 'DeepSeek 对话服务',
        state: 'CONNECTED',
        stateTone: 'purple',
        tone: 'purple',
        icon: ChatDotRound,
    },
]

const services = [
    { name: '地图渲染服务', value: '100%', tone: 'teal' },
    { name: '空间分析引擎', value: 'READY', tone: 'blue' },
    { name: '路网数据服务', value: 'ONLINE', tone: 'orange' },
    { name: 'AI 对话服务', value: 'CONNECTED', tone: 'purple' },
]

const modules: DashboardModule[] = [
    {
        name: '空间分析',
        description: '淹没、可视域、热力图等工具',
        status: 'OPEN',
        route: '/app/spatial-analysis',
        available: true,
        tone: 'teal',
        icon: MapLocation,
    },
    {
        name: '路网管理',
        description: '道路数据、分类与属性联动',
        status: 'OPEN',
        route: '/app/road-management',
        available: true,
        tone: 'blue',
        icon: Guide,
    },
    {
        name: '城市漫游',
        description: '进入三维场景自由探索',
        status: 'OPEN',
        route: '/app/city-roaming',
        available: true,
        tone: 'orange',
        icon: VideoCamera,
    },
    {
        name: 'AI 助手',
        description: '用自然语言查询与研判',
        status: 'OPEN',
        route: '/app/ai-assistant',
        available: true,
        tone: 'purple',
        icon: ChatDotRound,
    },
    {
        name: '无人机飞行',
        description: '飞行任务与巡检能力接入中',
        status: 'SOON',
        available: false,
        tone: 'slate',
        icon: Position,
    },
]

const events = [
    {
        time: 'NOW',
        title: 'AI 助手已接入',
        description: 'DeepSeek 对话服务可用，等待新的城市问题。',
        tone: 'purple',
    },
    {
        time: '08:42',
        title: '空间分析工具集加载完成',
        description: '10 项地图分析工具已准备就绪。',
        tone: 'teal',
    },
    {
        time: '08:36',
        title: '路网 MVT 图层已连接',
        description: '道路分类高亮与属性拾取功能在线。',
        tone: 'blue',
    },
    {
        time: '08:18',
        title: '三维城市漫游场景已就绪',
        description: '可使用 WASD、鼠标和滚轮进入场景漫游。',
        tone: 'orange',
    },
]

const analysisTools = [
    '淹没分析',
    '可视域',
    '通视分析',
    '缓冲区',
    '坡度',
    '坡向',
    '天际线',
    '热力图',
    '风场',
    '建筑分类',
]

const updateClock = () => {
    const now = new Date()
    currentTime.value = now.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    })
    currentDate.value = now.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).replace(/\//g, '.')
}

const openRoute = (route: string) => {
    void router.push(route)
}

const openModule = (module: DashboardModule) => {
    if (!module.available || !module.route) {
        ElMessage.info('无人机飞行模块正在接入中')
        return
    }

    openRoute(module.route)
}

const renderChart = () => {
    if (!chartRef.value) {
        return
    }

    chart?.dispose()
    chart = echarts.init(chartRef.value)
    chart.setOption({
        animationDuration: 700,
        grid: {
            top: 18,
            right: 12,
            bottom: 24,
            left: 8,
            containLabel: true,
        },
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#102a43',
            borderWidth: 0,
            textStyle: {
                color: '#f2fbff',
                fontSize: 11,
            },
            axisPointer: {
                lineStyle: {
                    color: '#78d8d1',
                    opacity: 0.45,
                },
            },
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'],
            axisLine: {
                lineStyle: {
                    color: '#dce8ee',
                },
            },
            axisTick: {
                show: false,
            },
            axisLabel: {
                color: '#8aa0b1',
                fontSize: 10,
                margin: 10,
            },
        },
        yAxis: {
            type: 'value',
            min: 70,
            max: 100,
            splitNumber: 3,
            axisLabel: {
                color: '#8aa0b1',
                fontSize: 10,
            },
            splitLine: {
                lineStyle: {
                    color: '#edf3f6',
                    type: 'dashed',
                },
            },
            axisLine: {
                show: false,
            },
            axisTick: {
                show: false,
            },
        },
        series: [
            {
                type: 'line',
                smooth: true,
                symbol: 'circle',
                symbolSize: 7,
                data: [81, 84, 83, 87, 86, 90, 92.8],
                lineStyle: {
                    width: 2.5,
                    color: '#45c4b0',
                },
                itemStyle: {
                    color: '#45c4b0',
                    borderColor: '#ffffff',
                    borderWidth: 2,
                },
                areaStyle: {
                    color: 'rgba(69, 196, 176, 0.12)',
                },
            },
        ],
    })
}

const resizeChart = () => {
    chart?.resize()
}

onMounted(async () => {
    updateClock()
    clockTimer = window.setInterval(updateClock, 1000)
    await nextTick()
    renderChart()
    window.addEventListener('resize', resizeChart)
})

onBeforeUnmount(() => {
    if (clockTimer) {
        window.clearInterval(clockTimer)
    }

    window.removeEventListener('resize', resizeChart)
    chart?.dispose()
    chart = undefined
})
</script>

<style scoped>
.home-page {
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: auto;
    box-sizing: border-box;
    background: #edf3f6;
    color: #183b5b;
}

.home-shell {
    width: min(100%, 1540px);
    margin: 0 auto;
    padding: 28px 34px 38px;
    box-sizing: border-box;
}

.command-header {
    position: relative;
    display: flex;
    min-height: 154px;
    align-items: center;
    justify-content: space-between;
    gap: 28px;
    overflow: hidden;
    padding: 28px 32px;
    border: 1px solid #173e59;
    border-radius: 10px;
    background: #0b2137;
    box-shadow:
        0 16px 30px rgba(7, 35, 58, 0.18),
        inset 0 1px 0 rgba(255, 255, 255, 0.08);
    box-sizing: border-box;
}

.command-header::before {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 4px;
    background: #45c4b0;
    box-shadow: 0 0 16px rgba(69, 196, 176, 0.78);
    content: '';
}

.command-header::after {
    position: absolute;
    top: 22px;
    right: 32%;
    width: 86px;
    height: 86px;
    border: 1px solid rgba(126, 221, 224, 0.17);
    border-radius: 50%;
    box-shadow:
        0 0 0 12px rgba(126, 221, 224, 0.04),
        0 0 0 24px rgba(126, 221, 224, 0.03);
    content: '';
    pointer-events: none;
}

.command-copy,
.command-meta {
    position: relative;
    z-index: 1;
}

.command-kicker,
.panel-kicker {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #72d6cc;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.2px;
}

.command-kicker i {
    width: 22px;
    height: 1px;
    background: rgba(126, 221, 224, 0.46);
}

.live-dot,
.status-ring,
.event-live i,
.ai-state i,
.metric-state i,
.pulse-footer i {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #72dfca;
    box-shadow: 0 0 9px rgba(114, 223, 202, 0.9);
}

.command-copy h1 {
    margin: 12px 0 8px;
    color: #f3fbff;
    font-size: clamp(30px, 3.2vw, 46px);
    font-weight: 700;
    letter-spacing: 0;
    line-height: 1.05;
}

.command-copy h1 span {
    color: #7be1d4;
}

.command-copy p {
    max-width: 550px;
    margin: 0;
    color: #9db8c7;
    font-size: 14px;
    line-height: 1.6;
}

.command-meta {
    display: flex;
    align-items: center;
    gap: 22px;
}

.system-clock {
    min-width: 158px;
    padding-left: 18px;
    border-left: 1px solid rgba(157, 210, 220, 0.22);
}

.system-clock span,
.system-clock strong,
.system-clock small {
    display: block;
}

.system-clock span {
    color: #7899ad;
    font-size: 9px;
    letter-spacing: 1px;
}

.system-clock strong {
    margin: 5px 0 3px;
    color: #f4fdff;
    font-size: 25px;
    font-variant-numeric: tabular-nums;
    letter-spacing: 1px;
}

.system-clock small {
    color: #81b1bd;
    font-size: 10px;
}

.primary-action {
    height: 38px;
    border-color: #45c4b0;
    border-radius: 5px;
    background: #45c4b0;
    box-shadow: 0 7px 18px rgba(69, 196, 176, 0.2);
}

.primary-action:hover {
    border-color: #62d7c8;
    background: #62d7c8;
}

.metric-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-top: 14px;
}

.metric-card {
    position: relative;
    display: flex;
    min-width: 0;
    min-height: 112px;
    align-items: center;
    gap: 12px;
    padding: 18px;
    border: 1px solid #dbe7ed;
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 8px 22px rgba(16, 42, 67, 0.05);
    box-sizing: border-box;
}

.metric-icon,
.module-icon,
.note-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
}

.metric-icon {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    font-size: 20px;
}

.tone-teal {
    background: #e2f6f1;
    color: #168a78;
}

.tone-blue {
    background: #e5f0fb;
    color: #347eea;
}

.tone-orange {
    background: #fff0dc;
    color: #d98324;
}

.tone-purple {
    background: #eee8fa;
    color: #7455a8;
}

.tone-slate {
    background: #edf1f4;
    color: #6b8191;
}

.metric-content {
    min-width: 0;
}

.metric-content > span,
.metric-content > strong,
.metric-content > p {
    display: block;
}

.metric-content > span {
    overflow: hidden;
    color: #6b8191;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.metric-content > strong {
    margin-top: 3px;
    color: #183b5b;
    font-size: 24px;
    line-height: 1.05;
}

.metric-content > strong small {
    margin-left: 2px;
    color: #7990a0;
    font-size: 11px;
    font-weight: 500;
}

.metric-content > p {
    margin: 5px 0 0;
    overflow: hidden;
    color: #9aaebb;
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.metric-state {
    position: absolute;
    top: 15px;
    right: 15px;
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.4px;
}

.state-teal {
    color: #2d9d8d;
}

.state-blue {
    color: #4b8ace;
}

.state-orange {
    color: #cc8a3d;
}

.state-purple {
    color: #8066aa;
}

.state-blue i {
    background: #5e9ee7;
    box-shadow: 0 0 8px rgba(94, 158, 231, 0.8);
}

.state-orange i {
    background: #e3a34d;
    box-shadow: 0 0 8px rgba(227, 163, 77, 0.8);
}

.state-purple i {
    background: #9c7fd1;
    box-shadow: 0 0 8px rgba(156, 127, 209, 0.8);
}

.workspace-grid,
.lower-grid {
    display: grid;
    gap: 14px;
    margin-top: 14px;
}

.workspace-grid {
    grid-template-columns: minmax(0, 1.28fr) minmax(360px, 0.72fr);
}

.lower-grid {
    grid-template-columns: minmax(0, 1.08fr) minmax(0, 1.1fr) minmax(280px, 0.72fr);
}

.dashboard-panel {
    min-width: 0;
    overflow: hidden;
    padding: 20px;
    border: 1px solid #dbe7ed;
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 8px 22px rgba(16, 42, 67, 0.05);
    box-sizing: border-box;
}

.panel-head {
    display: flex;
    min-height: 34px;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
}

.panel-kicker {
    color: #74a2af;
    font-size: 9px;
    letter-spacing: 1px;
}

.panel-head h2 {
    margin: 4px 0 0;
    color: #183b5b;
    font-size: 17px;
    line-height: 1.2;
}

.panel-head-status,
.module-count,
.event-live,
.ai-state {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #7d95a4;
    font-size: 10px;
    white-space: nowrap;
}

.status-ring {
    width: 7px;
    height: 7px;
}

.module-count {
    padding: 5px 8px;
    border: 1px solid #d5e8e8;
    border-radius: 4px;
    background: #f2fbfa;
    color: #3a9589;
    font-weight: 700;
}

.pulse-content {
    display: grid;
    min-height: 222px;
    grid-template-columns: minmax(0, 1fr) 188px;
    gap: 14px;
    margin-top: 12px;
}

.pulse-chart {
    width: 100%;
    height: 222px;
    min-width: 0;
}

.pulse-summary {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 13px 0 13px 16px;
    border-left: 1px solid #e7eff2;
}

.score-block span,
.score-block strong,
.score-block small {
    display: block;
}

.score-block span {
    color: #7d95a4;
    font-size: 11px;
}

.score-block strong {
    margin: 7px 0 4px;
    color: #183b5b;
    font-size: 35px;
    line-height: 1;
}

.score-block small {
    color: #8ea2ae;
    font-size: 10px;
}

.score-block b {
    color: #299b89;
}

.service-list {
    display: flex;
    flex-direction: column;
    gap: 11px;
}

.service-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    color: #647f90;
    font-size: 10px;
}

.service-name {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 6px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.service-dot {
    width: 6px;
    height: 6px;
    flex: 0 0 auto;
    border-radius: 50%;
}

.service-dot.teal {
    background: #45c4b0;
}

.service-dot.blue {
    background: #5e9ee7;
}

.service-dot.orange {
    background: #e3a34d;
}

.service-dot.purple {
    background: #9c7fd1;
}

.service-value {
    color: #365b70;
    font-size: 10px;
    font-weight: 700;
}

.pulse-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-top: 12px;
    border-top: 1px solid #edf2f4;
    color: #8aa0ad;
    font-size: 10px;
}

.pulse-footer span:first-child {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #4d887d;
}

.module-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 11px;
}

.module-item {
    display: flex;
    width: 100%;
    min-height: 54px;
    align-items: center;
    gap: 10px;
    padding: 8px 9px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: #f7fafb;
    color: inherit;
    cursor: pointer;
    text-align: left;
    transition:
        border-color 0.2s ease,
        background-color 0.2s ease,
        transform 0.2s ease;
}

.module-item:hover {
    border-color: #acd9d4;
    background: #f0f9f7;
    transform: translateX(2px);
}

.module-item.is-pending {
    cursor: pointer;
    opacity: 0.72;
}

.module-item.is-pending:hover {
    border-color: #d8e0e5;
    background: #f7fafb;
    transform: none;
}

.module-icon {
    width: 31px;
    height: 31px;
    border-radius: 6px;
    font-size: 16px;
}

.module-copy {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    gap: 3px;
}

.module-copy strong {
    color: #35566b;
    font-size: 12px;
}

.module-copy small {
    overflow: hidden;
    color: #8ba0ad;
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.module-status {
    color: #329887;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.5px;
}

.module-status.pending {
    color: #a48a62;
}

.module-arrow {
    color: #a1b5c0;
    font-size: 14px;
}

.event-panel,
.analysis-panel,
.ai-panel {
    min-height: 250px;
}

.event-live {
    color: #4c9e98;
    font-weight: 700;
    letter-spacing: 0.5px;
}

.event-list {
    margin-top: 14px;
}

.event-row {
    display: grid;
    grid-template-columns: 38px 14px minmax(0, 1fr) 14px;
    min-height: 46px;
    align-items: center;
    gap: 8px;
}

.event-time {
    color: #8da2ae;
    font-size: 9px;
    font-variant-numeric: tabular-nums;
    text-align: right;
}

.event-line {
    position: relative;
    display: flex;
    height: 100%;
    align-items: center;
    justify-content: center;
}

.event-line::before {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 1px;
    background: #dce8ed;
    content: '';
}

.event-row:first-child .event-line::before {
    top: 50%;
}

.event-row:last-child .event-line::before {
    bottom: 50%;
}

.event-marker {
    position: relative;
    z-index: 1;
    width: 7px;
    height: 7px;
    border: 3px solid #ffffff;
    border-radius: 50%;
    box-shadow: 0 0 0 1px currentColor;
}

.event-marker.teal {
    background: #45c4b0;
    color: #45c4b0;
}

.event-marker.blue {
    background: #5e9ee7;
    color: #5e9ee7;
}

.event-marker.orange {
    background: #e3a34d;
    color: #e3a34d;
}

.event-marker.purple {
    background: #9c7fd1;
    color: #9c7fd1;
}

.event-content {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 3px;
}

.event-content strong {
    overflow: hidden;
    color: #35566b;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.event-content small {
    overflow: hidden;
    color: #8ba0ad;
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.event-arrow {
    color: #a8b9c2;
    font-size: 13px;
}

.analysis-panel :deep(.el-button) {
    height: 26px;
    padding: 0;
    color: #347eea;
    font-size: 11px;
}

.tool-cloud {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 18px;
}

.tool-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 27px;
    padding: 0 9px;
    border: 1px solid #d8e9ea;
    border-radius: 4px;
    background: #f5fbfa;
    color: #4d7d80;
    cursor: pointer;
    font-size: 10px;
    transition:
        border-color 0.2s ease,
        background-color 0.2s ease,
        color 0.2s ease;
}

.tool-chip span {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #45c4b0;
}

.tool-chip:hover {
    border-color: #7dcfc3;
    background: #e8f8f5;
    color: #277f75;
}

.analysis-note {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-top: 20px;
    padding-top: 13px;
    border-top: 1px solid #edf2f4;
}

.note-icon {
    width: 30px;
    height: 30px;
    border-radius: 6px;
    background: #e6f0fb;
    color: #347eea;
    font-size: 15px;
}

.analysis-note > span:last-child {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 3px;
}

.analysis-note strong {
    color: #35566b;
    font-size: 11px;
}

.analysis-note small {
    overflow: hidden;
    color: #8ba0ad;
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ai-state {
    color: #8066aa;
    font-weight: 700;
}

.ai-state i {
    background: #9c7fd1;
    box-shadow: 0 0 8px rgba(156, 127, 209, 0.8);
}

.ai-preview {
    display: flex;
    min-height: 137px;
    align-items: center;
    justify-content: center;
    gap: 14px;
    margin-top: 9px;
    padding: 12px 8px;
    border: 1px solid #e4dff1;
    border-radius: 6px;
    background: #faf9fd;
}

.ai-orbit {
    position: relative;
    width: 74px;
    height: 74px;
    flex: 0 0 auto;
}

.orbit-core {
    position: absolute;
    top: 21px;
    left: 21px;
    display: flex;
    width: 32px;
    height: 32px;
    align-items: center;
    justify-content: center;
    border: 1px solid #b9a9d9;
    border-radius: 50%;
    background: #eee8fa;
    box-shadow: 0 0 0 6px rgba(156, 127, 209, 0.08);
    color: #7455a8;
    font-size: 17px;
}

.orbit-line {
    position: absolute;
    top: 8px;
    left: 8px;
    width: 58px;
    height: 58px;
    border: 1px solid #d9cfee;
    border-radius: 50%;
    transform: rotate(32deg);
}

.orbit-line-two {
    transform: rotate(-52deg) scaleY(0.52);
}

.ai-preview p {
    max-width: 150px;
    margin: 0;
    color: #6d6580;
    font-size: 11px;
    line-height: 1.6;
}

.ai-action {
    width: 100%;
    height: 31px;
    margin-top: 10px;
    justify-content: center;
    border-color: #8066aa;
    background: #8066aa;
    box-shadow: 0 5px 12px rgba(116, 85, 168, 0.18);
}

.ai-action:hover {
    border-color: #9278bd;
    background: #9278bd;
}

.ai-action :deep(.el-icon) {
    margin-left: 6px;
}

@media (max-width: 1250px) {
    .lower-grid {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }

    .ai-panel {
        grid-column: span 2;
    }
}

@media (max-width: 1050px) {
    .command-header {
        align-items: flex-start;
        flex-direction: column;
    }

    .command-meta {
        width: 100%;
        justify-content: space-between;
    }

    .workspace-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 760px) {
    .home-shell {
        padding: 18px 14px 28px;
    }

    .command-header {
        padding: 22px 20px;
    }

    .command-header::after {
        right: 8%;
    }

    .command-kicker {
        flex-wrap: wrap;
        line-height: 1.6;
    }

    .command-kicker i {
        display: none;
    }

    .command-meta {
        align-items: flex-start;
        flex-direction: column;
        gap: 15px;
    }

    .system-clock {
        padding-left: 0;
        border-left: 0;
    }

    .primary-action {
        width: 100%;
    }

    .metric-grid,
    .lower-grid {
        grid-template-columns: 1fr;
    }

    .ai-panel {
        grid-column: auto;
    }

    .pulse-content {
        grid-template-columns: 1fr;
    }

    .pulse-summary {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
        padding: 0;
        border-top: 1px solid #e7eff2;
        border-left: 0;
        padding-top: 13px;
    }

    .service-list {
        gap: 8px;
    }

    .pulse-footer {
        margin-top: 14px;
    }
}

@media (max-width: 480px) {
    .dashboard-panel {
        padding: 16px;
    }

    .metric-card {
        padding: 15px;
    }

    .metric-state {
        top: 12px;
        right: 12px;
    }

    .pulse-summary {
        grid-template-columns: 1fr;
    }

    .service-list {
        display: grid;
        grid-template-columns: 1fr 1fr;
    }

    .event-row {
        grid-template-columns: 34px 12px minmax(0, 1fr);
        gap: 6px;
    }

    .event-arrow {
        display: none;
    }
}
</style>

<template>
    <div class="analysis-page">
        <aside class="analysis-sidebar" :class="{ 'is-collapsed': isSidebarCollapsed }">
            <div class="sidebar-heading">
                <div v-if="!isSidebarCollapsed">
                    <p class="eyebrow">SPATIAL TOOLS</p>
                    <h1>空间分析</h1>
                </div>

                <el-tooltip :content="isSidebarCollapsed ? '展开工具栏' : '收起工具栏'" placement="right">
                    <el-button class="collapse-button" text circle :aria-label="isSidebarCollapsed ? '展开工具栏' : '收起工具栏'"
                        @click="isSidebarCollapsed = !isSidebarCollapsed">
                        <el-icon>
                            <Expand v-if="isSidebarCollapsed" />
                            <Fold v-else />
                        </el-icon>
                    </el-button>
                </el-tooltip>
            </div>

            <div class="sidebar-divider"></div>

            <nav class="tool-list" aria-label="空间分析工具">
                <el-tooltip v-for="tool in analysisTools" :key="tool.id" :content="isSidebarCollapsed ? tool.label : ''"
                    placement="right" :disabled="!isSidebarCollapsed">
                    <button class="tool-item" :class="{ 'is-active': activeToolId === tool.id }" type="button"
                        @click="selectTool(tool.id)">
                        <span class="tool-icon" :class="`tool-icon-${tool.tone}`">
                            <el-icon>
                                <component :is="tool.icon" />
                            </el-icon>
                        </span>

                        <span v-if="!isSidebarCollapsed" class="tool-content">
                            <strong>{{ tool.label }}</strong>
                            <small>{{ tool.description }}</small>
                        </span>

                        <el-icon v-if="!isSidebarCollapsed" class="tool-arrow">
                            <ArrowRight />
                        </el-icon>
                    </button>
                </el-tooltip>
            </nav>

            <div v-if="!isSidebarCollapsed" class="sidebar-note">
                <el-icon>
                    <DataAnalysis />
                </el-icon>
                <span>选择工具后，在地图上开始绘制分析范围。</span>
            </div>
        </aside>

        <section class="map-panel">
            <CesiumMap @ready="onMapReady" />

            <div class="map-status">
                <span class="status-dot"></span>
                <span>地图已加载</span>
                <i></i>
                <span>当前工具：{{ currentTool?.label || '未选择' }}</span>
            </div>

            <component v-if="currentToolComponent && viewer && osmBuildings" :is="currentToolComponent" :viewer="viewer"
                :osmBuildings="osmBuildings" />
        </section>
    </div>
</template>

<script setup lang="ts">
import { computed, markRaw, ref, shallowRef } from 'vue'
import * as Cesium from 'cesium'
import {
    Aim,
    ArrowRight,
    Compass,
    Connection,
    Crop,
    DataAnalysis,
    Expand,
    Fold,
    Grid,
    OfficeBuilding,
    View,
    WarningFilled,
} from '@element-plus/icons-vue'
import CesiumMap from '@/components/cesium/cesium-viewer.vue'
import InundationAnalysis from '@/components/spatial-analysis/tools/inundation-analysis.vue'
import ViewshedModelAnalysis from '@/components/spatial-analysis/tools/viewshed-model-analysis.vue'
import VisibilityAnalysis from '@/components/spatial-analysis/tools/visibility-analysis.vue'
import BufferAnalysis from '@/components/spatial-analysis/tools/buffer-analysis.vue'
import AspectAnalysis from '@/components/spatial-analysis/tools/aspect-analysis.vue'
import ElevationDrawingSkyline from '@/components/spatial-analysis/tools/elevation-drawing-skyline.vue'
import Heatmap from '@/components/spatial-analysis/tools/heatmap.vue'
import SlopeAnalysis from '@/components/spatial-analysis/tools/slope-analysis.vue'
import WindFarm from '@/components/spatial-analysis/tools/wind-farm.vue'
import BuildingStyleAnalysis from '@/components/spatial-analysis/tools/building-style-analysis.vue'

import { initCesiumBase } from '@/utils/cesium'

const analysisTools = [
    {
        id: 'inundation',
        label: '淹没分析',
        description: '模拟区域积水范围与深度',
        icon: WarningFilled,
        tone: 'orange',
        component: markRaw(InundationAnalysis),
    },
    {
        id: 'viewshed',
        label: '可视域分析',
        description: '分析观察点可见范围',
        icon: View,
        tone: 'blue',
        component: markRaw(ViewshedModelAnalysis),
    },
    {
        id: 'visibility',
        label: '通视分析',
        description: '判断两点之间是否通视',
        icon: Aim,
        tone: 'teal',
        component: markRaw(VisibilityAnalysis),
    },
    {
        id: 'buffer',
        label: '缓冲区分析',
        description: '生成要素周边影响范围',
        icon: Crop,
        tone: 'purple',
        component: markRaw(BufferAnalysis),
    },
    {
        id: 'slope',
        label: '坡度分析',
        description: '计算地形坡度分布',
        icon: DataAnalysis,
        tone: 'slate',
        component: markRaw(SlopeAnalysis),
    },
    {
        id: 'aspect',
        label: '坡向分析',
        description: '分析地形坡向分布',
        icon: Compass,                    // ← 改用罗盘图标，和热力图区分
        tone: 'slate',
        component: markRaw(AspectAnalysis),
    },
    {
        id: 'skyline',
        label: '天际线分析',
        description: '提取高程绘制天际线',
        icon: View,
        tone: 'blue',
        component: markRaw(ElevationDrawingSkyline),
    },
    {
        id: 'heatmap',
        label: '热力图',
        description: '展示空间数据密度分布',
        icon: Grid,
        tone: 'red',
        component: markRaw(Heatmap),
    },
    {
        id: 'windfarm',
        label: '风场分析',
        description: '模拟展示风场流向数据',
        icon: Connection,
        tone: 'green',
        component: markRaw(WindFarm),
    },
    {
        id: 'height-limit',
        label: '建筑分类分析',
        description: '按类型、距离、属性对建筑进行条件着色',
        icon: OfficeBuilding,
        tone: 'purple',
        component: markRaw(BuildingStyleAnalysis),
    },
] as const

type ToolId = (typeof analysisTools)[number]['id']

const activeToolId = ref<ToolId | null>(null)
const isSidebarCollapsed = ref(false)
const viewer = shallowRef<Cesium.Viewer | null>(null)
const osmBuildings = shallowRef<Cesium.Cesium3DTileset | undefined>(undefined)

const currentTool = computed(() => {
    return analysisTools.find((tool) => tool.id === activeToolId.value)
})

const currentToolComponent = computed(() => {
    const tool = currentTool.value
    return tool && 'component' in tool ? tool.component : null
})

const selectTool = (toolId: ToolId) => {
    activeToolId.value = toolId
}

const onMapReady = async (cesiumViewer: Cesium.Viewer) => {
    viewer.value = cesiumViewer

    const initResult = await initCesiumBase(cesiumViewer, {
        destination: { lng: 117.1336, lat: 36.6772, height: 5000 },
        terrain: true,
        osm: true,
        depthTestAgainstTerrain: true,
        requestVertexNormals: true
    })

    osmBuildings.value = initResult?.osmBuildings
    if (osmBuildings.value) {
        osmBuildings.value.showOutline = false
    }
}
</script>

<style scoped>
.analysis-page {
    display: flex;
    width: 100%;
    height: 100%;
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    background: #dce6eb;
}

.analysis-sidebar {
    position: relative;
    z-index: 2;
    display: flex;
    width: 252px;
    min-width: 252px;
    height: 100%;
    flex-direction: column;
    padding: 24px 14px 16px;
    border-right: 1px solid #d9e5eb;
    background: #ffffff;
    box-sizing: border-box;
    transition: width 0.2s ease, min-width 0.2s ease;
}

.analysis-sidebar.is-collapsed {
    width: 76px;
    min-width: 76px;
    padding-right: 12px;
    padding-left: 12px;
}

.sidebar-heading {
    display: flex;
    min-height: 48px;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
}

.sidebar-heading h1 {
    margin: 0;
    color: #102a43;
    font-size: 22px;
    line-height: 1.2;
}

.eyebrow {
    margin: 0 0 7px;
    color: #4c9e98;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0;
}

.collapse-button {
    flex: 0 0 auto;
    width: 34px;
    height: 34px;
    margin-top: 1px;
    color: #627d98;
}

.collapse-button:hover {
    color: #168aad;
    background: #eef7fa;
}

.sidebar-divider {
    height: 1px;
    margin: 20px 4px 14px;
    background: #edf2f5;
}

.tool-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
}

.tool-item {
    display: flex;
    width: 100%;
    min-height: 62px;
    align-items: center;
    gap: 11px;
    padding: 10px 9px;
    border: 1px solid transparent;
    border-radius: 7px;
    background: transparent;
    color: #334e68;
    cursor: pointer;
    text-align: left;
    transition: background-color 0.2s ease, border-color 0.2s ease;
}

.is-collapsed .tool-item {
    justify-content: center;
    min-height: 52px;
    padding: 8px;
}

.tool-item:hover {
    border-color: #d5e9ed;
    background: #f5fafb;
}

.tool-item.is-active {
    border-color: #b9e4da;
    background: #effaf7;
    color: #126e65;
}

.tool-icon {
    display: grid;
    width: 36px;
    height: 36px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 9px;
    font-size: 18px;
}

.tool-icon-orange {
    background: #fff0da;
    color: #d98324;
}

.tool-icon-blue {
    background: #dceefa;
    color: #168aad;
}

.tool-icon-teal {
    background: #d9f3ed;
    color: #168a78;
}

.tool-icon-yellow {
    background: #fff7cc;
    color: #a67c00;
}

.tool-icon-purple {
    background: #e9e2f8;
    color: #7455a8;
}

.tool-icon-slate {
    background: #e8edf2;
    color: #52697e;
}

.tool-icon-green {
    background: #e0f2e5;
    color: #3a8b56;
}

.tool-icon-red {
    background: #fde2e1;
    color: #d8392b;
}

.tool-content {
    min-width: 0;
    flex: 1;
}

.tool-content strong,
.tool-content small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.tool-content strong {
    color: inherit;
    font-size: 13px;
    font-weight: 600;
}

.tool-content small {
    margin-top: 4px;
    color: #829ab1;
    font-size: 11px;
}

.tool-arrow {
    flex: 0 0 auto;
    color: #9fb3c8;
    font-size: 14px;
}

.sidebar-note {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin: auto 4px 0;
    padding: 12px 10px;
    border: 1px solid #e2ebf0;
    border-radius: 6px;
    background: #f8fbfc;
    color: #829ab1;
    font-size: 11px;
    line-height: 1.55;
}

.sidebar-note .el-icon {
    flex: 0 0 auto;
    margin-top: 2px;
    color: #4c9e98;
}

.map-panel {
    position: relative;
    display: flex;
    width: 0;
    height: 100%;
    min-width: 0;
    min-height: 0;
    flex: 1 1 auto;
    flex-direction: column;
    overflow: hidden;
}

.map-panel :deep(.map) {
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
}

.map-status {
    position: absolute;
    top: 16px;
    right: 18px;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 8px 12px;
    border: 1px solid rgba(255, 255, 255, 0.75);
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 4px 14px rgba(16, 42, 67, 0.12);
    color: #627d98;
    font-size: 12px;
    pointer-events: none;
}

.map-status i {
    width: 1px;
    height: 14px;
    margin: 0 3px;
    background: #d9e2ec;
}

.status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #42b883;
}

@media (max-width: 720px) {
    .analysis-sidebar {
        width: 76px;
        min-width: 76px;
        padding-right: 12px;
        padding-left: 12px;
    }

    .analysis-sidebar:not(.is-collapsed) {
        width: 220px;
        min-width: 220px;
    }

    .analysis-sidebar:not(.is-collapsed) .sidebar-heading>div {
        display: block;
    }

    .analysis-sidebar:not(.is-collapsed) .tool-content,
    .analysis-sidebar:not(.is-collapsed) .tool-arrow,
    .analysis-sidebar:not(.is-collapsed) .sidebar-note {
        display: block;
    }

    .map-status {
        right: 10px;
        left: 10px;
        justify-content: center;
        overflow: hidden;
        white-space: nowrap;
    }
}
</style>

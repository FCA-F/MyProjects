<template>
    <div class="home-page">
        <section class="hero-section">
            <img v-if="heroImage" class="hero-image" :src="heroImage" alt="三维地理场景" />
            <div class="hero-mask"></div>

            <div class="hero-content">
                <div class="brand-row">
                    <img class="brand-logo" :src="logo" alt="" />
                    <div>
                        <div class="brand-name"></div>
                        <div class="brand-subtitle">地理信息系统应用平台</div>
                    </div>
                </div>

                <h1>三维地理空间综合管理平台</h1>
                <p class="hero-desc">
                    面向三维场景浏览、空间分析、测量标注和系统运维的一体化 WebGIS 工作台。
                </p>

                <div class="hero-actions">
                    <el-button v-for="action in heroActions" :key="action.label"
                        :type="action.primary ? 'primary' : 'default'" size="large"
                        @click="openPage(action.path, action.label)">
                        <el-icon>
                            <component :is="iconMap[action.icon]" />
                        </el-icon>
                        <span>{{ action.label }}</span>
                    </el-button>
                </div>

                <div class="metric-list">
                    <div v-for="metric in metrics" :key="metric.label" class="metric-item">
                        <div class="metric-value">{{ metric.value }}</div>
                        <div class="metric-label">{{ metric.label }}</div>
                    </div>
                </div>
            </div>
        </section>

        <main class="home-main">
            <section class="content-section">
                <div class="section-head">
                    <div>
                        <h2>平台能力</h2>
                        <p>围绕三维地图、分析计算、业务管理和运行监控组织常用能力。</p>
                    </div>
                </div>

                <div class="capability-grid">
                    <article v-for="item in capabilities" :key="item.title" class="capability-card">
                        <div class="capability-icon" :class="item.theme">
                            <el-icon>
                                <component :is="iconMap[item.icon]" />
                            </el-icon>
                        </div>
                        <h3>{{ item.title }}</h3>
                        <p>{{ item.description }}</p>
                    </article>
                </div>
            </section>

            <section class="content-section">
                <div class="section-head">
                    <div>
                        <h2>常用入口</h2>
                        <p>将主要业务入口集中在首页，方便演示、调试和日常使用。</p>
                    </div>
                </div>

                <div class="module-grid">
                    <article v-for="entry in quickEntries" :key="entry.title" class="module-card" tabindex="0"
                        @click="openPage(entry.path, entry.title)">
                        <div class="module-icon">
                            <el-icon>
                                <component :is="iconMap[entry.icon]" />
                            </el-icon>
                        </div>
                        <div class="module-info">
                            <h3>{{ entry.title }}</h3>
                            <p>{{ entry.description }}</p>
                        </div>
                        <el-icon class="module-arrow">
                            <ArrowRight />
                        </el-icon>
                    </article>
                </div>
            </section>

            <section class="content-section">
                <div class="section-head">
                    <div>
                        <h2>Cesium 功能</h2>
                        <p>三维地球功能从配置文件读取，后续新增功能只需要补充卡片数据和图片。</p>
                    </div>
                    <el-button text type="primary"
                        @click="openPage('/cesium-function/default/default-imagery', 'Cesium 功能')">
                        进入三维场景
                        <el-icon>
                            <ArrowRight />
                        </el-icon>
                    </el-button>
                </div>

                <div class="feature-grid">
                    <article v-for="item in featuredCesiumItems" :key="item.name" class="feature-card" tabindex="0"
                        @click="openPage(item.path, item.title)">
                        <div class="feature-image-wrap">
                            <img v-if="item.image" class="feature-image" :src="item.image" :alt="item.title" />
                            <div v-else class="feature-fallback">
                                <el-icon>
                                    <MapLocation />
                                </el-icon>
                            </div>
                        </div>
                        <div class="feature-meta">
                            <span>{{ item.title }}</span>
                            <el-icon>
                                <ArrowRight />
                            </el-icon>
                        </div>
                    </article>
                </div>
            </section>
        </main>
    </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import {
    Aim,
    ArrowRight,
    DataLine,
    MapLocation,
    OfficeBuilding,
    Operation,
    TrendCharts,
} from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import logo from '@/assets/logo/logo.png'
import { sections as cesiumSections } from './cesium-function/cards'

const router = useRouter()

const iconMap = {
    aim: Aim,
    arrow: ArrowRight,
    data: DataLine,
    map: MapLocation,
    office: OfficeBuilding,
    operation: Operation,
    trend: TrendCharts,
}

type IconName = keyof typeof iconMap

interface HomeAction {
    label: string
    path?: string
    icon: IconName
    primary?: boolean
}

interface CapabilityItem {
    title: string
    description: string
    icon: IconName
    theme: string
}

interface QuickEntry {
    title: string
    description: string
    path?: string
    icon: IconName
}

const featuredCesiumItems = cesiumSections.flatMap((section) => section.items)
const heroImage = featuredCesiumItems.find((item) => item.image)?.image

const heroActions: HomeAction[] = [
    { label: '进入三维场景', path: '/cesium-function/default/default-imagery', icon: 'map', primary: true },
    { label: '空间分析', path: '/cesium-function/spatial-analysis/inundation-analysis', icon: 'trend' },
    { label: '坐标测量', path: '/cesium-function/measurement/coordinate-measurement', icon: 'aim' },
]

const metrics = [
    { value: '3D', label: '三维地理场景' },
    { value: 'GIS', label: '空间分析能力' },
    { value: 'Web', label: '在线业务工作台' },
    { value: 'Ops', label: '系统管理与监控' },
]

const capabilities: CapabilityItem[] = [
    {
        title: '三维地图底座',
        description: '统一接入影像、地形和 OSM 建筑，支撑地理场景浏览与展示。',
        icon: 'map',
        theme: 'blue',
    },
    {
        title: '空间分析工具',
        description: '围绕淹没分析等专题场景组织绘制、计算和结果展示流程。',
        icon: 'trend',
        theme: 'green',
    },
    {
        title: '测量与标注',
        description: '提供坐标测量、点位标注和结果读取能力，方便快速核查位置。',
        icon: 'aim',
        theme: 'cyan',
    },
    {
        title: '系统运维管理',
        description: '结合 RuoYi 管理能力，覆盖用户权限、工具生成和运行监控。',
        icon: 'operation',
        theme: 'violet',
    },
]

const quickEntries: QuickEntry[] = [
    {
        title: 'Cesium 功能',
        description: '进入三维场景、默认影像、地形和建筑展示功能。',
        path: '/cesium-function/default/default-imagery',
        icon: 'map',
    },
    {
        title: '空间分析',
        description: '打开淹没分析工具，绘制范围并生成专题分析结果。',
        path: '/cesium-function/spatial-analysis/inundation-analysis',
        icon: 'trend',
    },
    {
        title: '测量工具',
        description: '进行坐标拾取和点位标注，辅助地图业务核查。',
        path: '/cesium-function/measurement/coordinate-measurement',
        icon: 'aim',
    },
    {
        title: '系统工具',
        description: '进入代码生成、接口文档和辅助开发工具。',
        path: '/tool/gen',
        icon: 'data',
    },
    {
        title: '系统管理',
        description: '管理用户、角色、菜单、部门和字典等基础信息。',
        path: '/system/user',
        icon: 'office',
    },
    {
        title: '系统监控',
        description: '查看服务状态、缓存、在线用户和运行日志。',
        path: '/monitor/server',
        icon: 'operation',
    },
]

function openPage(path: string | undefined, title: string) {
    if (!path) {
        ElMessage.info(`${title} 暂未接入`)
        return
    }
    router.push(path)
}
</script>

<style scoped>
.home-page {
    min-height: calc(100vh - 84px);
    color: #172033;
    background: #f4f7fb;
}

.hero-section {
    position: relative;
    min-height: 380px;
    overflow: hidden;
    background: #10213a;
}

.hero-image {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.52;
    filter: saturate(0.92) contrast(1.06);
}

.hero-mask {
    position: absolute;
    inset: 0;
    background:
        linear-gradient(90deg, rgba(8, 22, 42, 0.92) 0%, rgba(13, 34, 62, 0.74) 48%, rgba(13, 34, 62, 0.22) 100%),
        linear-gradient(180deg, rgba(8, 22, 42, 0.12), rgba(8, 22, 42, 0.68));
}

.hero-content {
    position: relative;
    z-index: 1;
    max-width: 1180px;
    padding: 42px 56px 34px;
}

.brand-row {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 26px;
}

.brand-logo {
    width: 52px;
    height: 52px;
    border-radius: 10px;
    object-fit: contain;
    background: rgba(255, 255, 255, 0.95);
    padding: 6px;
}

.brand-name {
    font-size: 24px;
    line-height: 1.2;
    font-weight: 700;
    color: #ffffff;
}

.brand-subtitle {
    margin-top: 4px;
    font-size: 14px;
    color: rgba(236, 246, 255, 0.78);
}

.hero-content h1 {
    margin: 0;
    max-width: 760px;
    font-size: 42px;
    line-height: 1.18;
    font-weight: 800;
    letter-spacing: 0;
    color: #ffffff;
}

.hero-desc {
    max-width: 660px;
    margin: 18px 0 0;
    font-size: 17px;
    line-height: 1.8;
    color: rgba(238, 247, 255, 0.84);
}

.hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 28px;
}

.hero-actions :deep(.el-button) {
    min-width: 132px;
    height: 42px;
    border-radius: 6px;
}

.metric-list {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 150px));
    gap: 12px;
    margin-top: 34px;
}

.metric-item {
    padding: 14px 16px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(6px);
}

.metric-value {
    font-size: 24px;
    font-weight: 800;
    color: #ffffff;
}

.metric-label {
    margin-top: 4px;
    font-size: 13px;
    color: rgba(238, 247, 255, 0.78);
}

.home-main {
    max-width: 1440px;
    margin: 0 auto;
    padding: 28px 28px 44px;
}

.content-section {
    margin-bottom: 32px;
}

.section-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
}

.section-head h2 {
    margin: 0;
    font-size: 22px;
    line-height: 1.3;
    font-weight: 760;
    color: #162137;
}

.section-head p {
    margin: 6px 0 0;
    font-size: 14px;
    color: #667085;
}

.capability-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
}

.capability-card,
.module-card,
.feature-card {
    border: 1px solid #e4eaf2;
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 10px 26px rgba(20, 34, 58, 0.06);
}

.capability-card {
    padding: 20px;
}

.capability-icon,
.module-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: 8px;
    font-size: 22px;
}

.capability-icon.blue {
    color: #1d6fe8;
    background: #eaf2ff;
}

.capability-icon.green {
    color: #1a7f42;
    background: #e9f8ef;
}

.capability-icon.cyan {
    color: #047481;
    background: #e6f7fb;
}

.capability-icon.violet {
    color: #7048e8;
    background: #f0ebff;
}

.capability-card h3 {
    margin: 16px 0 8px;
    font-size: 16px;
    font-weight: 700;
    color: #182235;
}

.capability-card p {
    margin: 0;
    min-height: 48px;
    font-size: 14px;
    line-height: 1.7;
    color: #667085;
}

.module-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
}

.module-card {
    display: grid;
    grid-template-columns: 46px minmax(0, 1fr) 20px;
    align-items: center;
    gap: 14px;
    min-height: 112px;
    padding: 18px;
    cursor: pointer;
    transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.module-card:hover,
.module-card:focus-visible {
    transform: translateY(-2px);
    border-color: #7fb2ff;
    box-shadow: 0 14px 28px rgba(33, 91, 168, 0.12);
    outline: none;
}

.module-icon {
    color: #1d6fe8;
    background: #eef5ff;
}

.module-info h3 {
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 700;
    color: #172033;
}

.module-info p {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: #667085;
}

.module-arrow {
    color: #9aa6b2;
}

.feature-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 16px;
}

.feature-card {
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.feature-card:hover,
.feature-card:focus-visible {
    transform: translateY(-2px);
    border-color: #7fb2ff;
    box-shadow: 0 14px 28px rgba(33, 91, 168, 0.12);
    outline: none;
}

.feature-image-wrap {
    height: 138px;
    overflow: hidden;
    background: linear-gradient(180deg, #dcecff, #b7d4f5);
}

.feature-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.24s ease;
}

.feature-card:hover .feature-image {
    transform: scale(1.04);
}

.feature-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    font-size: 34px;
    color: #1d6fe8;
}

.feature-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 12px 14px;
    font-size: 15px;
    font-weight: 700;
    color: #172033;
}

@media (max-width: 1280px) {
    .capability-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .module-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .feature-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

@media (max-width: 900px) {
    .hero-content {
        padding: 34px 24px 28px;
    }

    .hero-content h1 {
        font-size: 32px;
    }

    .metric-list {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .home-main {
        padding: 22px 16px 36px;
    }

    .section-head {
        align-items: flex-start;
        flex-direction: column;
    }

    .module-grid,
    .feature-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 640px) {
    .capability-grid {
        grid-template-columns: 1fr;
    }

    .brand-row {
        align-items: flex-start;
    }

    .hero-actions :deep(.el-button) {
        width: 100%;
    }
}
</style>

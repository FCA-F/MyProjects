<template>
    <div class="road-management-page" :class="{ 'is-panel-collapsed': !isPanelVisible }">
        <section class="road-map-panel">
            <CesiumMap @ready="onMapReady" />

            <div class="map-status">
                <span class="status-dot"></span>
                <span>{{ isMapReady ? '地图已加载' : '地图加载中' }}</span>
                <i></i>
                <span>路网图层：{{ isPanelVisible ? '已连接' : '管理面板已收起' }}</span>
            </div>
        </section>

        <section v-show="isPanelVisible" class="road-data-panel">
            <RoadPanel v-if="viewer && isMapReady" ref="roadPanelRef" :viewer="viewer" />
            <div v-else class="panel-loading">
                <el-icon class="is-loading">
                    <Loading />
                </el-icon>
                <span>正在准备路网管理...</span>
            </div>
        </section>

        <el-button class="panel-toggle" type="primary" :title="isPanelVisible ? '收起路网管理面板' : '打开路网管理面板'"
            @click="isPanelVisible = !isPanelVisible">
            <el-icon>
                <ArrowDown v-if="isPanelVisible" />
                <ArrowUp v-else />
            </el-icon>
            <span>{{ isPanelVisible ? '收起路网面板' : '打开路网面板' }}</span>
        </el-button>
    </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef } from 'vue'
import * as Cesium from 'cesium'
import { ArrowDown, ArrowUp, Loading } from '@element-plus/icons-vue'
import CesiumMap from '@/components/cesium/cesium-viewer.vue'
import RoadPanel from '@/components/road-management/road-management-panel.vue'
import { initCesiumBase } from '@/utils/cesium'

const viewer = shallowRef<Cesium.Viewer | null>(null)
const roadPanelRef = ref<InstanceType<typeof RoadPanel> | null>(null)
const isMapReady = ref(false)
const isPanelVisible = ref(true)
let isUnmounted = false

const isViewerUsable = (cesiumViewer: Cesium.Viewer | null): cesiumViewer is Cesium.Viewer => {
    if (!cesiumViewer) {
        return false
    }

    try {
        return !cesiumViewer.isDestroyed()
    } catch {
        return false
    }
}

const onMapReady = async (cesiumViewer: Cesium.Viewer) => {
    if (isUnmounted || !isViewerUsable(cesiumViewer)) {
        return
    }

    viewer.value = cesiumViewer

    try {
        //初始化
        await initCesiumBase(cesiumViewer, {
            destination: { lng: 117.0183, lat: 36.6772, height: 8000 },
            depthTestAgainstTerrain: true,
        })
        if (isUnmounted || !isViewerUsable(cesiumViewer)) {
            return
        }

        //osm
        const osmBuildings = await Cesium.Cesium3DTileset.fromUrl("http://localhost:82/jinan_OSM/tileset.json")
        if (isUnmounted || !isViewerUsable(cesiumViewer)) {
            if (!osmBuildings.isDestroyed()) {
                osmBuildings.destroy()
            }
            return
        }

        cesiumViewer.scene.primitives.add(osmBuildings)
        const customShader = new Cesium.CustomShader({
            //不考虑光照模型
            lightingModel: Cesium.LightingModel.UNLIT,
            fragmentShaderText: `
        void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {  //参数：信息结构体、材质
            //周期高度
            float periodHeight = fract(czm_frameNumber / 5000.0) ;   //czm_frameNumber:Cesium 内置全局变量，每渲染1帧自动+1​,Shader 里唯一的时间基准（没有它就没法做动画）；fract:取小数部分
            //建筑
            float groundHeight = 80.0;   // 地面高度
            float gradientRange = 70.0;   // 高亮的范围
            float relativeHeight = fsInput.attributes.positionMC.z-groundHeight;  //像点高度-地面高度=像点相对高度
            float modelGray = relativeHeight / gradientRange + sin(periodHeight*czm_twoPi) * 0.1;    //底部暗，高处明，加上sin呼吸随机
           material.diffuse = mix(vec3(0.01, 0.05, 0.2), vec3(0.2, 0.6, 1.0), modelGray);   //material.diffuse：当前像素的“底色”，浅蓝与深蓝混合
            //光圈
            float haloMovementRange = 200.0;  // 光环的移动范围(高度)
            float haloRelativeHeight = clamp(relativeHeight / haloMovementRange, 0.0, 1.0);   //当前像素在光环活动范围内的相对位置
            float periodHeight101 = abs(periodHeight - 0.5) * 2.0;   //[0,1]->[1,0,1]，上升->上升+下降
            float isHalo = step(0.01, abs(haloRelativeHeight - periodHeight101)); //像素是否是光环，距离接近就是光环
            material.diffuse += material.diffuse*(1.0-isHalo);  //如果是光环，光环加亮
        }     
        `
            /*
            坐标系说明
                positionMC: 模型自身坐标（建模时的坐标）
            positionWC: 世界坐标（地球坐标）
            positionEC: 相机坐标
            */
        });
        //将定义好的着色器作用域建筑tilesets
        osmBuildings.style = undefined
        osmBuildings.customShader = customShader;
    } catch (error) {
        if (!isUnmounted) {
            console.error('路网管理地图初始化失败', error)
        }
    } finally {
        if (!isUnmounted && isViewerUsable(cesiumViewer)) {
            isMapReady.value = true
        }
    }
}

onBeforeUnmount(() => {
    isUnmounted = true
    isMapReady.value = false
    roadPanelRef.value?.dispose()
    viewer.value = null
})
</script>

<style scoped>
.road-management-page {
    --road-navy: #102a43;
    --road-blue: #347eea;
    --road-cyan: #45c4b0;
    position: relative;
    display: flex;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    flex-direction: column;
    overflow: hidden;
    background: #dfeaf2;
}

.road-map-panel {
    position: relative;
    display: flex;
    width: 100%;
    min-width: 0;
    min-height: 300px;
    flex: 1 1 auto;
    overflow: hidden;
    background: #071d31;
}

.road-map-panel :deep(.map) {
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
}

.road-data-panel {
    position: relative;
    z-index: 3;
    display: flex;
    width: 100%;
    height: 360px;
    min-height: 260px;
    flex: 0 0 360px;
    flex-direction: column;
    overflow: hidden;
    border-top: 1px solid rgba(69, 196, 176, 0.5);
    background: rgba(247, 251, 253, 0.98);
    box-shadow:
        0 -1px 0 rgba(151, 231, 225, 0.45),
        0 -12px 30px rgba(7, 35, 58, 0.32);
}

.road-data-panel::before {
    position: absolute;
    top: 0;
    right: 12%;
    left: 12%;
    height: 2px;
    background: #45c4b0;
    box-shadow: 0 0 12px rgba(69, 196, 176, 0.85);
    content: '';
    pointer-events: none;
}

.panel-loading {
    display: flex;
    height: 100%;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #627d98;
    font-size: 13px;
}

.panel-loading .el-icon {
    color: var(--road-blue);
    font-size: 18px;
}

.map-status {
    position: absolute;
    top: 16px;
    right: 18px;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 8px 12px;
    border: 1px solid rgba(126, 221, 224, 0.45);
    border-radius: 7px;
    background: rgba(7, 29, 49, 0.78);
    box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.12),
        0 8px 22px rgba(3, 22, 39, 0.22);
    backdrop-filter: blur(10px);
    color: #e6f5fb;
    font-size: 12px;
    pointer-events: none;
}

.map-status i {
    width: 1px;
    height: 14px;
    margin: 0 3px;
    background: rgba(190, 228, 236, 0.32);
}

.status-dot {
    width: 7px;
    height: 7px;
    border: 2px solid rgba(130, 241, 219, 0.4);
    border-radius: 50%;
    background: #45c4b0;
    box-shadow: 0 0 8px rgba(69, 196, 176, 0.95);
}

.panel-toggle {
    position: absolute;
    right: 18px;
    bottom: 372px;
    z-index: 5;
    border: 1px solid rgba(142, 225, 229, 0.45);
    border-radius: 7px;
    background: rgba(52, 126, 234, 0.94);
    box-shadow:
        0 6px 18px rgba(9, 57, 109, 0.28),
        0 0 0 1px rgba(255, 255, 255, 0.1) inset;
    transition:
        background-color 0.2s ease,
        box-shadow 0.2s ease,
        transform 0.2s ease;
}

.panel-toggle:hover {
    background: #286fda;
    box-shadow:
        0 8px 22px rgba(9, 57, 109, 0.36),
        0 0 14px rgba(69, 196, 176, 0.28);
    transform: translateY(-1px);
}

.is-panel-collapsed .panel-toggle {
    bottom: 18px;
}

@media (max-width: 900px) {
    .road-data-panel {
        height: 390px;
        flex-basis: 390px;
    }

    .panel-toggle {
        right: 10px;
        bottom: 402px;
    }

    .is-panel-collapsed .panel-toggle {
        bottom: 10px;
    }

    .map-status {
        right: 10px;
        left: 10px;
        justify-content: center;
        overflow: hidden;
        white-space: nowrap;
    }
}

@media (max-width: 600px) {
    .road-map-panel {
        min-height: 240px;
    }

    .road-data-panel {
        height: 430px;
        min-height: 300px;
        flex-basis: 430px;
    }

    .panel-toggle {
        right: 8px;
        bottom: 442px;
    }

    .is-panel-collapsed .panel-toggle {
        bottom: 8px;
    }

    .panel-toggle span {
        display: none;
    }
}
</style>

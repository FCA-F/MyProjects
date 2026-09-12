<template>
    <div class="toolbar">
        <div class="oneText">建筑着色</div>
        <el-select v-model="buildingStyle" class="select" placeholder="请选择类型">
            <el-option v-for="item in options" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useCesiumStore } from '@/stores/cesium.ts'
import '@/components/LeftToolbar/style.css'

const cesiumStore = useCesiumStore();
const viewer = cesiumStore.viewer as Cesium.Viewer;
const osmBuildingTile = cesiumStore.osmBuildingTile as Cesium.Cesium3DTileset;

const buildingStyle = ref<string>();
const options = [
    { value: 'null', label: '默认' },
    { value: '按建筑高度着色', label: '按建筑高度着色' },
    { value: '交互着色', label: '交互着色' },
]

let handler: Cesium.ScreenSpaceEventHandler;

onMounted(() => {
    handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
})

watch(buildingStyle, (buildingStyle) => {
    try {
        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    }
    catch (e) { };

    switch (buildingStyle) {
        case '按建筑高度着色':
            colorByBuildingStyle(); break;
        case '交互着色':
            interactiveRendering(); break;
        default: useDefaultColor(); break;
    }
})

const useDefaultColor = () => {
    osmBuildingTile.showOutline = false
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
    osmBuildingTile.style = undefined
    osmBuildingTile.customShader = customShader;
}

//按建筑类型设置颜色
const colorByBuildingStyle = () => {
    let style = new Cesium.Cesium3DTileStyle({
        color: {
            conditions: [
                ["${feature['Elevation']}>120", "color('red')"],
                ["${feature['Elevation']}>80", "color('yellow')"],
                ["${feature['Elevation']}>40", "color('purple')"],
                ["${feature['Elevation']}>20", "color('green')"],
                ["true", "color('cyan')"]
            ]

        }
    })
    osmBuildingTile.customShader = undefined
    osmBuildingTile.style = style;
}

//交互渲染
const interactiveRendering = () => {
    handler.setInputAction((event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        let pickFeature = viewer.scene.pick(event.position);
        if (!(pickFeature instanceof Cesium.Cesium3DTileFeature))
            return;
        let pickFeatureId = pickFeature.getProperty('id');
        let style = new Cesium.Cesium3DTileStyle({
            color: {
                conditions: [
                    ["${feature['id']}===" + '"' + pickFeatureId + '"', "color('red')"]
                ]
            }
        })
        osmBuildingTile.customShader = undefined
        osmBuildingTile.style = style;
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}


onUnmounted(() => {
    if (handler)
        handler.destroy();
})

</script>
<style scoped>
.toolbar {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.oneText {
    text-align: center;
    font-size: 20px;
    font-weight: 600;
    /* 加粗 */
    color: #45a0eb;
    /* 浅蓝，和顶部系统标题同色系、略浅一点 */
    margin-bottom: 8px;
}

.select {
    width: 350px;
    height: 24px
}
</style>
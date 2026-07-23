<template>
    <div
        v-if="isShow"
        ref="modal"
        class="modal"
        :style="{ left: modal_x + 'px', top: modal_y + 'px' }"
        @mousedown="startMove"
    >
        <div class="modal-header">
            <span class="title">淹没分析</span>
            <el-button @click="closeModal" circle class="close-modal-btn" color="red" icon="closeBold"></el-button>
        </div>

        <div class="modal-body">
            <div class="row">
                <el-button
                    class="draw-button"
                    round
                    :color="isDraw ? 'red' : 'greenyellow'"
                    :disabled="isLoading"
                    @click="drawInundationRegion"
                >
                    {{ isDraw ? '结束绘制' : '绘制范围' }}
                </el-button>
            </div>

            <div class="row">
                <label class="label">水位高程</label>
                <el-input v-model.number="waterHeight" class="input" :disabled="isAnimating"/>
                <label class="label-end">米</label>
            </div>

            <div class="row">
                <label class="label">最高水位</label>
                <el-input v-model.number="maxWaterHeight" class="input" :disabled="isAnimating"/>
                <label class="label-end">米</label>
            </div>

            <div class="row">
                <label class="label">最大显示深度</label>
                <el-input v-model.number="maxDisplayDepth" class="input" :disabled="isAnimating"/>
                <label class="label-end">米</label>
            </div>

            <div class="row">
                <label class="label">上涨速度</label>
                <el-input v-model.number="step" class="input" :disabled="isAnimating"/>
                <label class="label-end">米/次</label>
            </div>

            <div class="row">
                <label class="label">刷新间隔</label>
                <el-input v-model.number="refreshInterval" class="input" :disabled="isAnimating"/>
                <label class="label-end">毫秒</label>
            </div>

            <div class="row">
                <label class="label">透明度</label>
                <el-input v-model.number="alpha" class="input" :disabled="isAnimating"/>
                <label class="label-end">0-1</label>
            </div>

            <div v-if="terrainRangeText" class="info-row">
                {{ terrainRangeText }}
            </div>

            <div class="row button-row">
                <el-button class="button" color="#1E88E5" :loading="isLoading" @click="runAnalysis">
                    开始分析
                </el-button>
                <el-button
                    class="button"
                    :color="isAnimating ? 'red' : 'green'"
                    :disabled="isLoading"
                    @click="toggleAnimation"
                >
                    {{ isAnimating ? '暂停' : '上涨' }}
                </el-button>
                <el-button class="button" color="#1E88E5" :disabled="isLoading" @click="zeroWater">
                    水位归零
                </el-button>
                <el-button class="button" color="#1E88E5" :disabled="isLoading" @click="clearAnalysis">
                    清除
                </el-button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import { ElMessage } from 'element-plus'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useCesiumStore } from '@/stores/cesium.ts'

type rectangleDegreeType = [number, number, number, number] // 矩形范围[西，南，东，北]

// 地形纹理
type TerrainTextureInfo = {
    canvas: HTMLCanvasElement // 灰度图
    minElevation: number // 最小高程
    maxElevation: number // 最大高程
}

// 贴地材质需要的 uniform
type FloodMaterialUniforms = {
    heightMap: HTMLCanvasElement // 高程灰度图
    minElevation: number // 最小高程
    maxElevation: number // 最大高程
    waterLevel: number // 当前水位
    maxDisplayDepth: number // 最大显示深度
    alpha: number // 透明度
}

const textureMaxSize = 256 // 最大像素(canvas)
const textureMinSize = 64 // 最小像素(canvas)
const resolution = 256 // RectangleGeometry 粒度控制

let viewer: Cesium.Viewer
let handler: Cesium.ScreenSpaceEventHandler
let boundaryLine: Cesium.Entity | undefined
let floodPrimitive: Cesium.GroundPrimitive | undefined
let floodMaterial: Cesium.Material | undefined
let waterTimer: number | undefined

const isDraw = ref(false)
const isLoading = ref(false)
const isAnimating = ref(false)
const waterHeight = ref(0) // 水面高度
const maxWaterHeight = ref(1000) // 最大水面高度
const maxDisplayDepth = ref(50) // 最大显示深度
const step = ref(0.05) // 增长速度
const refreshInterval = ref(10) // 更新速度
const alpha = ref(0.85) // 透明度
const rectangleDegree = ref<rectangleDegreeType>()
const minTerrainHeight = ref<number>()
const maxTerrainHeight = ref<number>()
//显示高程文本
const terrainRangeText = computed(() => {
    if (minTerrainHeight.value === undefined || maxTerrainHeight.value === undefined) {
        return ''
    }
    return `地形高程：${minTerrainHeight.value.toFixed(2)} - ${maxTerrainHeight.value.toFixed(2)} 米`
})

onMounted(() => {
    const cesiumStore = useCesiumStore()
    viewer = cesiumStore.viewer as Cesium.Viewer
    handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)
})

watch([waterHeight, maxDisplayDepth, alpha], () => {
    applyMaterialSettings()
})

watch(refreshInterval, () => {
    if (isAnimating.value) {
        startAnimationTimer()
    }
})

// 贴地淹没材质，只在片元阶段按高度图计算颜色，不修改顶点高度
const floodMaterialSource = `
    uniform sampler2D heightMap;
    uniform float minElevation;
    uniform float maxElevation;
    uniform float waterLevel;
    uniform float maxDisplayDepth;
    uniform float alpha;

    vec3 floodRamp(float t) {
        vec3 c0 = vec3(0.529, 0.808, 0.922);
        vec3 c1 = vec3(0.000, 1.000, 1.000);
        vec3 c2 = vec3(0.498, 1.000, 0.831);
        vec3 c3 = vec3(0.486, 0.988, 0.000);
        vec3 c4 = vec3(0.196, 0.804, 0.196);
        vec3 c5 = vec3(0.678, 1.000, 0.184);
        vec3 c6 = vec3(1.000, 1.000, 0.000);
        vec3 c7 = vec3(1.000, 0.843, 0.000);
        vec3 c8 = vec3(1.000, 0.647, 0.000);
        vec3 c9 = vec3(1.000, 0.271, 0.000);
        vec3 c10 = vec3(1.000, 0.078, 0.576);
        vec3 c11 = vec3(1.000, 0.000, 0.000);
        if (t < 0.09) return mix(c0, c1, t / 0.09);
        if (t < 0.18) return mix(c1, c2, (t - 0.09) / 0.09);
        if (t < 0.27) return mix(c2, c3, (t - 0.18) / 0.09);
        if (t < 0.36) return mix(c3, c4, (t - 0.27) / 0.09);
        if (t < 0.45) return mix(c4, c5, (t - 0.36) / 0.09);
        if (t < 0.54) return mix(c5, c6, (t - 0.45) / 0.09);
        if (t < 0.63) return mix(c6, c7, (t - 0.54) / 0.09);
        if (t < 0.72) return mix(c7, c8, (t - 0.63) / 0.09);
        if (t < 0.81) return mix(c8, c9, (t - 0.72) / 0.09);
        if (t < 0.90) return mix(c9, c10, (t - 0.81) / 0.09);
        return mix(c10, c11, (t - 0.90) / 0.10);
    }

    czm_material czm_getMaterial(czm_materialInput materialInput) {
        czm_material material = czm_getDefaultMaterial(materialInput);
        vec2 uv = materialInput.st;
        float normalizedHeight = clamp(texture(heightMap, uv).r, 0.0, 1.0);
        float terrainHeight = minElevation + normalizedHeight * max(maxElevation - minElevation, 1.0);
        float depth = waterLevel - terrainHeight;

        if (depth <= 0.0) {
            material.diffuse = vec3(0.0);//颜色
            material.alpha = 0.0;
            return material;
        }

        float percent = clamp(depth / max(maxDisplayDepth, 1.0), 0.0, 1.0);
        material.diffuse = floodRamp(percent);
        material.alpha = clamp(alpha, 0.0, 1.0);
        return material;
    }
`

// 绘制矩形区域
const drawInundationRegion = () => {
    if (isDraw.value) {
        stopDraw()
        return
    }

    clearDrawEntities()
    clearFloodPrimitive()

    let activePositions: Cesium.Cartesian3[] = []
    let dynamicRectangle: Cesium.Entity | undefined
    let rectangle: Cesium.Rectangle | undefined
    isDraw.value = true

    handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        const position = viewer.scene.pickPosition(e.position)
        if (!position) {
            return
        }

        if (activePositions.length === 0) {
            activePositions.push(position)
            dynamicRectangle = addRectangle(new Cesium.CallbackProperty(() => createRectangle(activePositions), false))
        } 
        else {
            activePositions.push(position)
            rectangle = createRectangle(activePositions)
            if (!rectangle) {
                ElMessage.warning('绘制范围太小') 
                return
            }

            rectangleDegree.value = rectangleCartesianToDegree(rectangle)
            drawBoundary(rectangleDegree.value)
            if (dynamicRectangle) {
                viewer.entities.remove(dynamicRectangle)
            }
            stopDraw()
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    handler.setInputAction((event: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
        if (activePositions.length === 0) {
            return
        }
        const position = viewer.scene.pickPosition(event.endPosition)
        if (!position) {
            return
        }
        if (activePositions.length > 1) {
            activePositions.pop()
        }
        activePositions.push(position)
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    handler.setInputAction(() => {
        if (dynamicRectangle) {
            viewer.entities.remove(dynamicRectangle)
        }
        stopDraw()
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
}

// 停止绘制
const stopDraw = () => {
    isDraw.value = false
    handler?.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
    handler?.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    handler?.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK)
}

// 创建矩形
const createRectangle = (positions: Cesium.Cartesian3[]) => {
    if (positions.length < 2) {
        return new Cesium.Rectangle()
    }
    const startCartographic = Cesium.Cartographic.fromCartesian(positions[0])
    const endCartographic = Cesium.Cartographic.fromCartesian(positions[1])
    const west = Math.min(startCartographic.longitude, endCartographic.longitude)
    const east = Math.max(startCartographic.longitude, endCartographic.longitude)
    const south = Math.min(startCartographic.latitude, endCartographic.latitude)
    const north = Math.max(startCartographic.latitude, endCartographic.latitude)
    if (east - west < Cesium.Math.toRadians(0.000001) || north - south < Cesium.Math.toRadians(0.000001)) {
        return undefined
    }
    return new Cesium.Rectangle(west, south, east, north)
}

// 绘制临时矩形
const addRectangle = (rectangle: Cesium.Rectangle | Cesium.CallbackProperty) => viewer.entities.add({
    rectangle: {
        coordinates: rectangle,
        material: Cesium.Color.SKYBLUE.withAlpha(0.5),
    },
})
//矩形笛卡尔->矩形经纬度
const rectangleCartesianToDegree = (rectangle: Cesium.Rectangle): rectangleDegreeType => [
    Cesium.Math.toDegrees(rectangle.west),
    Cesium.Math.toDegrees(rectangle.south),
    Cesium.Math.toDegrees(rectangle.east),
    Cesium.Math.toDegrees(rectangle.north),
]

// 绘制矩形边界
const drawBoundary = (rectangleDegree: rectangleDegreeType) => {
    if (boundaryLine) {
        viewer.entities.remove(boundaryLine)
        boundaryLine = undefined
    }
    const [west, south, east, north] = rectangleDegree
    boundaryLine = viewer.entities.add({
        polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray([
                west, south,
                east, south,
                east, north,
                west, north,
                west, south,
            ]),
            width: 3,
            clampToGround: true,
            material: Cesium.Color.CYAN.withAlpha(0.95),
        },
    })
}

// 开始分析
const runAnalysis = async () => {
    if (!rectangleDegree.value) {
        ElMessage.warning('请先绘制分析范围')
        return
    }

    clearFloodPrimitive()
    isLoading.value = true
    try {
        const terrainTexture = await createTerrainCanvasAndMinMaxHeight(rectangleDegree.value) // 创建地形高度灰度图
        minTerrainHeight.value = terrainTexture.minElevation // 最小高程
        maxTerrainHeight.value = terrainTexture.maxElevation // 最大高程

        floodMaterial = createFloodMaterial({
            heightMap: terrainTexture.canvas,
            minElevation: terrainTexture.minElevation,
            maxElevation: terrainTexture.maxElevation,
            waterLevel: waterHeight.value,
            maxDisplayDepth: maxDisplayDepth.value,
            alpha: alpha.value,
        })

        const [west, south, east, north] = rectangleDegree.value
        const geometry = new Cesium.RectangleGeometry({
            rectangle: Cesium.Rectangle.fromDegrees(west, south, east, north),
            vertexFormat: Cesium.MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat,
            granularity: getGranularity(rectangleDegree.value, resolution),//粒度
        })

        floodPrimitive = new Cesium.GroundPrimitive({
            geometryInstances: new Cesium.GeometryInstance( {geometry:geometry}),
            appearance: new Cesium.MaterialAppearance({
                material: floodMaterial,
                translucent: true,//开启透明度
                closed: false,//只渲染一面，提高性能
                materialSupport: Cesium.MaterialAppearance.MaterialSupport.TEXTURED,//传递纹理属性
            }),
            classificationType: Cesium.ClassificationType.TERRAIN,
            asynchronous: true,
        })

        viewer.scene.primitives.add(floodPrimitive)
        applyMaterialSettings()

        if (waterHeight.value <= terrainTexture.minElevation) {
            ElMessage.warning('当前水位低于范围最低高程，可能没有淹没区域')
        }
    } catch (error) {
        console.error(error)
        ElMessage.error('贴地淹没分析生成失败')
    } finally {
        isLoading.value = false
    }
}

// 创建贴地材质
const createFloodMaterial = (uniforms: FloodMaterialUniforms) => new Cesium.Material({
    fabric: {
        type: `GroundFloodDepthMaterial_${Date.now()}`,//不断生成新的id,实时更新
        uniforms: {
            heightMap: uniforms.heightMap,
            minElevation: uniforms.minElevation,
            maxElevation: uniforms.maxElevation,
            waterLevel: uniforms.waterLevel,
            maxDisplayDepth: uniforms.maxDisplayDepth,
            alpha: uniforms.alpha,
        },
        source: floodMaterialSource,
    },
})

// 创建地形高程灰度图和最小最大高度
const createTerrainCanvasAndMinMaxHeight = async (rectangleDegree: rectangleDegreeType): Promise<TerrainTextureInfo> => {
    const { canvasWidth, canvasHeight } = getTextureSize(rectangleDegree) // 求宽高像素值
    const points: Cesium.Cartographic[] = []
    const [west, south, east, north] = rectangleDegree

    // 循环计算采样点坐标(度 -> Cartographic)
    for (let y = 0; y < canvasHeight; y += 1) {
        const latitude = north - (north - south) * (y / Math.max(canvasHeight - 1, 1))
        for (let x = 0; x < canvasWidth; x += 1) {
            const longitude = west + (east - west) * (x / Math.max(canvasWidth - 1, 1))
            points.push(Cesium.Cartographic.fromDegrees(longitude, latitude))
        }
    }

    const sampledPoints =  await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, points) // 弧度(经+纬) -> 弧度(经+纬+高程)
    const heights = sampledPoints.map((point) => point.height ?? 0) // 高程集合
    const minElevation = Math.min(...heights) // 最小高程
    const maxElevation = Math.max(...heights) // 最大高程
    const heightRange = Math.max(maxElevation - minElevation, 1) // 高程差值

    const canvas = document.createElement('canvas')
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    const context = canvas.getContext('2d')
    if (!context) {
        throw new Error('Canvas context 失败')
    }

    const imageData = context.createImageData(canvasWidth, canvasHeight) // 宽*高像素数据，用于设置颜色并上色 canvas
    for (let index = 0; index < heights.length; index += 1) {
        const normalizedHeight = Cesium.Math.clamp((heights[index] - minElevation) / heightRange, 0, 1) // 归一化高程
        const encoded = Math.round(normalizedHeight * 255)
        const dataIndex = index * 4
        imageData.data[dataIndex] = encoded
        imageData.data[dataIndex + 1] = encoded
        imageData.data[dataIndex + 2] = encoded
        imageData.data[dataIndex + 3] = 255
    }
    context.putImageData(imageData, 0, 0) // canvas 上色

    return {
        canvas,
        minElevation,
        maxElevation,
    }
}

// 获取 canvas 宽高像素值
const getTextureSize = (rectangleDegree: rectangleDegreeType) => {
    const [west, south, east, north] = rectangleDegree
    const centerLatitude = (south + north) / 2 // 中心纬度
    const centerLongitude = (west + east) / 2 // 中心经度
    const widthMeters = Cesium.Cartesian3.distance(
        Cesium.Cartesian3.fromDegrees(west, centerLatitude),
        Cesium.Cartesian3.fromDegrees(east, centerLatitude),
    )
    const heightMeters = Cesium.Cartesian3.distance(
        Cesium.Cartesian3.fromDegrees(centerLongitude, south),
        Cesium.Cartesian3.fromDegrees(centerLongitude, north),
    )

    if (widthMeters >= heightMeters) {
        return {
            canvasWidth: textureMaxSize,
            canvasHeight: Math.max(textureMinSize, Math.round(textureMaxSize * heightMeters / Math.max(widthMeters, 1))),
        }
    }

    return {
        canvasWidth: Math.max(textureMinSize, Math.round(textureMaxSize * widthMeters / Math.max(heightMeters, 1))),
        canvasHeight: textureMaxSize,
    }
}

// 获取 RectangleGeometry 粒度
const getGranularity = (rectangleDegree: rectangleDegreeType, resolution: number) => {
    const [west, south, east, north] = rectangleDegree
    const maxDegrees = Math.max(Math.abs(east - west), Math.abs(north - south))
    return Cesium.Math.toRadians(Math.max(maxDegrees / resolution, 0.00001))
}

// 更新贴地材质参数
const applyMaterialSettings = () => {
    if (!floodMaterial) {
        return
    }
    const uniforms = floodMaterial.uniforms as Record<string, unknown>
    uniforms.waterLevel = waterHeight.value
    uniforms.maxDisplayDepth = maxDisplayDepth.value
    uniforms.alpha = alpha.value
    viewer.scene.requestRender()
}

// 开始/暂停上涨
const toggleAnimation = async () => {
    if (isAnimating.value) {
        stopAnimation()
        return
    }

    if (!floodPrimitive) {
        await runAnalysis()
    }
    if (!floodPrimitive) {
        return
    }

    isAnimating.value = true
    startAnimationTimer()
}

const startAnimationTimer = () => {
    waterTimer = window.setInterval(updateWaterHeight, refreshInterval.value)
}

const stopAnimation = () => {
    isAnimating.value = false
    if (waterTimer !== undefined) {
        window.clearInterval(waterTimer)
        waterTimer = undefined
    }
}

// 更新水位高度
const updateWaterHeight = () => {
    const currentWaterHeight = waterHeight.value
    const targetWaterHeight = Math.max(currentWaterHeight, Number(maxWaterHeight.value) || currentWaterHeight)
    const riseStep = Math.max(0.001, Number(step.value) || 1)
    const nextWaterHeight = currentWaterHeight + riseStep

    if (nextWaterHeight >= targetWaterHeight) {
        waterHeight.value = Number(targetWaterHeight.toFixed(3))
        stopAnimation()
        return
    }

    waterHeight.value = Number(nextWaterHeight.toFixed(3))
}

const zeroWater = () => {
    stopAnimation()
    waterHeight.value = 0
}

const clearDrawEntities = () => {
    if (boundaryLine) {
        viewer.entities.remove(boundaryLine)
        boundaryLine = undefined
    }
}

const clearFloodPrimitive = () => {
    if (floodPrimitive) {
        viewer.scene.primitives.remove(floodPrimitive)
        floodPrimitive = undefined
    }
    floodMaterial = undefined
}

const clearAnalysis = () => {
    stopAnimation()
    stopDraw()
    clearDrawEntities()
    clearFloodPrimitive()
    rectangleDegree.value = undefined
    minTerrainHeight.value = undefined
    maxTerrainHeight.value = undefined
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
    isShow.value=false
    clearAnalysis()
    handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
}

onUnmounted(() => {
    clearAnalysis()
    handler?.destroy()
})
</script>

<style scoped>
.modal {
    position: absolute;
    width: 470px;
    background-color: #ffffff;
    border-radius: 8px;
    z-index: 1;
    overflow: hidden;
}

.modal-header {
    height: 46px;
    background-color: #1e88e5;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: move;
}

.title {
    font-size: 18px;
    font-weight: 700;
    color: #ffffff;
}

.modal-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
}

.button-row {
    gap: 10px;
}

.label {
    width: 110px;
    font-size: 14px;
    font-weight: 500;
    color: #334155;
    text-align: left;
}

.label-end {
    width: 48px;
    font-size: 14px;
    font-weight: 500;
    color: #64748b;
    text-align: left;
}

.input {
    width: 180px;
}

.button {
    width: 92px;
    height: 32px;
}

.draw-button {
    width: 150px;
    height: 38px;
}

.info-row {
    min-height: 22px;
    text-align: center;
    font-size: 13px;
    color: #475569;
}
/* 关闭按钮 */
.close-modal-btn{position:absolute;top:10px;right:15px;}
</style>

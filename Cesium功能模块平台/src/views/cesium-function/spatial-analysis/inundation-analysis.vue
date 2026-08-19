<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady"/>
        <DraggableModal title="淹没分析">
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
                <label class="label">最大深度</label>
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
            <div class="row">
                <el-button
                    class="button"
                    color="#1E88E5"
                    :loading="isLoading"
                    @click="runAnalysis"
                >开始分析</el-button>

                <el-button
                    class="button"
                    :color="isAnimating ? 'red' : 'green'"
                    :disabled="isLoading"
                    @click="toggleAnimation"
                >
                    {{ isAnimating ? '暂停' : '上涨' }}
                </el-button>
                <el-button class="button" color="#1E88E5" :disabled="isLoading" @click="zeroWater">水位归零</el-button>
            </div>
            <div class="row">
                <el-button class="button" color="#1E88E5" :disabled="isLoading" @click="isEqual=!isEqual">{{ isEqual?'不贴地':'贴地' }}</el-button>
                <el-button class="button" color="#1E88E5" :disabled="isLoading" @click="clearAnalysis">清除</el-button>
            </div>
        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import { ElMessage } from 'element-plus'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import {initCesiumBase} from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

type rectangleDegreeType = [number, number, number, number]//矩形范围[西，南，东，北]
//地形纹理
type TerrainTextureInfo = {
    canvas: HTMLCanvasElement
    minElevation: number
    maxElevation: number
}

type PrimitiveOptions = {
    rectangleDegree: rectangleDegreeType
    heightMap: HTMLCanvasElement
    minElevation: number
    maxElevation: number
    waterLevel: number
    maxDepth: number
    alpha: number
    isEqual: boolean
    resolution: number
}

const CesiumPrivate = Cesium as unknown as Record<string, any>//更改cesium源码部分，防止TS报错
const textureMaxSize = 256//最大像素（canvas）
const textureMinSize = 64//最小像素(canvas)
const resolution = 256//分辨率（GPU）
//自定义primitive对象
class TerrainFloodPrimitive {
    show = true
    rectangleDegree: rectangleDegreeType//矩形绘制范围
    heightMap: HTMLCanvasElement//canvas
    minElevation: number
    maxElevation: number
    waterLevel: number
    maxDepth: number
    alpha: number
    isEqual:boolean
    resolution: number
    drawCommand: any
    heightTexture: any

    constructor(options: PrimitiveOptions) {
        this.rectangleDegree = options.rectangleDegree
        this.heightMap = options.heightMap
        this.minElevation = options.minElevation
        this.maxElevation = options.maxElevation
        this.waterLevel = options.waterLevel
        this.maxDepth = options.maxDepth
        this.isEqual=options.isEqual
        this.alpha = options.alpha
        this.resolution = options.resolution
    }
    //update,isDestoryed,destory三个必须默认构建函数
    //update用于每帧渲染，最终成果只跟update和drawcommand有关
    update(frameState: any) {//frameState是系统传入的众多数据集合
        if (!this.show) {
            return
        }
        if (!this.drawCommand) {//创建绘制命令（规则）
            this.createCommand(frameState.context)
        }
        frameState.commandList.push(this.drawCommand)//frameState.commandList:每帧的新队列,队列push
    }

    isDestroyed() {
        return false
    }

    destroy() {
        if (this.drawCommand) {
            const vertexArray = this.drawCommand.vertexArray
            const shaderProgram = this.drawCommand.shaderProgram
            if (vertexArray && !vertexArray.isDestroyed()) {
                vertexArray.destroy()
            }
            if (shaderProgram && (!shaderProgram.isDestroyed || !shaderProgram.isDestroyed())) {
                shaderProgram.destroy()
            }
            this.drawCommand = undefined
        }
        if (this.heightTexture && !this.heightTexture.isDestroyed()) {
            this.heightTexture.destroy()
        }
        return CesiumPrivate.destroyObject(this)
    }

    createCommand(context: any) {
        const [west, south, east, north] = this.rectangleDegree
        const rectangle = new Cesium.RectangleGeometry({
            ellipsoid: Cesium.Ellipsoid.WGS84,
            rectangle: Cesium.Rectangle.fromDegrees(west, south, east, north),
            vertexFormat: Cesium.VertexFormat.POSITION_AND_ST,//给顶点position（笛卡尔坐标）和st(百分比位置坐标)
            granularity: getGranularity(this.rectangleDegree, this.resolution),//粒度（隔多远插一个顶点）
            height: this.minElevation,
        })
        const geometry = Cesium.RectangleGeometry.createGeometry(rectangle)
        const attributeLocations = CesiumPrivate.GeometryPipeline.createAttributeLocations(geometry)
        const vertexArray = CesiumPrivate.VertexArray.fromGeometry({//打包
            context,
            geometry,
            attributeLocations,
        })

        this.heightTexture = new CesiumPrivate.Texture({//把CPU里的地形灰度图，打包成GPU能直接读的纹理对象
            context,
            source: this.heightMap,
            pixelFormat: Cesium.PixelFormat.RGBA,
            pixelDatatype: Cesium.PixelDatatype.UNSIGNED_BYTE,
            flipY: true,//y轴翻转，因为canvas的原点在左上角，webgl的原点在左下角
            sampler: new CesiumPrivate.Sampler({//当Shader采样纹理时，遇到缩放、坐标超出范围的情况，GPU该怎么处理，sampler:采样器
                minificationFilter: Cesium.TextureMinificationFilter.LINEAR,
                magnificationFilter: Cesium.TextureMagnificationFilter.LINEAR,
                wrapS: CesiumPrivate.TextureWrap.CLAMP_TO_EDGE,
                wrapT: CesiumPrivate.TextureWrap.CLAMP_TO_EDGE,
            }),
        })

        const shaderProgram = CesiumPrivate.ShaderProgram.fromCache({//cache:缓存,用cache可以使得如果有就不重新创建
            context,
            vertexShaderSource: commonShader + vertexShader,
            fragmentShaderSource: commonShader + fragmentShader,
            attributeLocations,
        })

        const uniformMap = {//uniform变量
            heightMap: () => this.heightTexture,
            minElevation: () => this.minElevation,
            maxElevation: () => this.maxElevation,
            waterLevel: () => this.waterLevel,
            maxDepth: () => this.maxDepth,
            isEqual:()=>this.isEqual,
            alpha: () => this.alpha,
        }

        const renderState = CesiumPrivate.RenderState.fromCache({
            depthTest: { enabled: false },//深度测试
            depthMask: false,//不写入深度
            blending: Cesium.BlendingState.ALPHA_BLEND,//透明度混合，使透明度设置生效，blend:混合
            cull: { enabled: false },//背面不写入
        })

        this.drawCommand = new CesiumPrivate.DrawCommand({
            modelMatrix: Cesium.Matrix4.IDENTITY,//告诉gpu不用做矩阵变换，IDENTITY：不变换规则,英文：身份
            vertexArray,//原料库
            primitiveType: Cesium.PrimitiveType.TRIANGLES,//图元类型：三角形
            shaderProgram,//shader规则
            uniformMap,//动态参数
            renderState,//render规则
            pass: CesiumPrivate.Pass.TRANSLUCENT,//渲染顺序
        })
    }
}

const commonShader = `
    uniform sampler2D heightMap;
    uniform float minElevation;
    uniform float maxElevation;
    uniform float waterLevel;
    uniform float maxDepth;
    uniform bool isEqual;
    uniform float alpha;

    //获取地形高度
    float terrainHeight(vec2 uv) {
        float normalizedHeight = clamp(texture(heightMap, uv).r, 0.0, 1.0);
        return minElevation + normalizedHeight * max(maxElevation - minElevation, 1.0);
    }
    //水深颜色渐变
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
`
//顶点着色器
const vertexShader = `
    in vec4 position;
    in vec2 st;
    out vec2 v_st;

    void main() {
        float currentTerrainHeight = terrainHeight(st);
        float renderHeight = currentTerrainHeight;
        if (isEqual) {
            if (waterLevel > currentTerrainHeight) {
                renderHeight = waterLevel + 0.05;
            }
        }

        vec3 normal = czm_geodeticSurfaceNormal(//从地心指向当前顶点的向量
            position.xyz,
            vec3(0.0),
            vec3(2.458172257647332e-14, 2.458172257647332e-14, 2.4747391015697002e-14)
        );
        vec3 adjustedPosition = position.xyz + normal * (renderHeight - minElevation);
        gl_Position = czm_modelViewProjection * vec4(adjustedPosition, 1.0);
        v_st = st;
    }
`
//片元着色器
const fragmentShader = `
    in vec2 v_st;

    void main() {
        float currentTerrainHeight = terrainHeight(v_st);
        float depth = waterLevel - currentTerrainHeight;
        if (depth <= 0.0) {
            discard;//GLSL关键字：丢弃
        }

        float percent = clamp(depth / max(maxDepth, 1.0), 0.0, 1.0);
        vec3 color = floodRamp(percent);
        out_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));//输出颜色
    }
`

let viewer: Cesium.Viewer
let handler: Cesium.ScreenSpaceEventHandler
let previewRectangle: Cesium.Entity | undefined
let boundaryLine: Cesium.Entity | undefined
let floodPrimitive: TerrainFloodPrimitive | undefined

const isDraw = ref(false)
const isLoading = ref(false)
const waterHeight = ref(150)//水面高度
const maxWaterHeight = ref(1000)//最大水面高度
const maxDisplayDepth = ref(400)//最大深度
const step = ref(0.5)//增长速度
const refreshInterval = ref(10)//更新时间间隔
const alpha = ref(0.85)//透明度
const isAnimating = ref(false)//是否涨水
const isEqual=ref(false)
const rectangleDegree = ref<rectangleDegreeType>()
const minTerrainHeight = ref<number>()
const maxTerrainHeight = ref<number>()
let waterTimer: number | undefined

const terrainRangeText = computed(() => {
    if (minTerrainHeight.value === undefined || maxTerrainHeight.value === undefined) {
        return ''
    }
        return `地形高程：${minTerrainHeight.value.toFixed(2)} - ${maxTerrainHeight.value.toFixed(2)} 米`
})

//开始
const onMapReady=(cesiumViewer:Cesium.Viewer) => {
    viewer = cesiumViewer
    initCesiumBase(viewer,{
        destination:{lng:114.200232,lat:31.278762,height:5000},
        orientation:{heading:0,pitch:-30,roll:0},
        terrain:true,
        osm:true,
        depthTestAgainstTerrain:true
    })
    handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)
}

watch([waterHeight, maxDisplayDepth, alpha,isEqual], () => {
    applyMaterialSettings()
})

watch(refreshInterval, () => {
    if (isAnimating.value) {
        startAnimationTimer()
    }
})
//绘制矩形区域
const drawInundationRegion = () => {
    if (isDraw.value) {
        stopDraw()
        return
    }

    clearDrawEntities()
    clearFloodPrimitive()

    let activePositions:Cesium.Cartesian3[]=[]
    let dynamicRectangle:Cesium.Entity|undefined
    let rectangle:Cesium.Rectangle|undefined
    isDraw.value = true

    handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        const position = viewer.scene.pickPosition(e.position)
        if (!position) {
            return
        }
        if(activePositions.length==0){
            activePositions.push(position)
            dynamicRectangle=addRectangle(new Cesium.CallbackProperty(()=>{return createRectangle(activePositions)},false))
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
            viewer.entities.remove(dynamicRectangle!)
            stopDraw()
        }
        
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    handler.setInputAction((event: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
        if (activePositions.length==0) {
            return
        }
        const position = viewer.scene.pickPosition(event.endPosition)
        if (!position) {
            return
        }
        if(activePositions.length>1)
        activePositions.pop()
        activePositions.push(position)
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    handler.setInputAction(() => {
        stopDraw()
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
}
//停止绘制
const stopDraw = () => {
    isDraw.value = false
    handler?.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
    handler?.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    handler?.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK)
}

//创建矩形
const createRectangle = (positions:Cesium.Cartesian3[]) => {
    if(positions.length<2) return new Cesium.Rectangle()
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

const addRectangle=(rectangle:Cesium.Rectangle|Cesium.CallbackProperty)=>{
    return viewer.entities.add({
        rectangle:{
            coordinates:rectangle,
            material:Cesium.Color.SKYBLUE.withAlpha(0.5)
        }
    })
}

const rectangleCartesianToDegree = (rectangle: Cesium.Rectangle): rectangleDegreeType => [
    Cesium.Math.toDegrees(rectangle.west),
    Cesium.Math.toDegrees(rectangle.south),
    Cesium.Math.toDegrees(rectangle.east),
    Cesium.Math.toDegrees(rectangle.north),
]

//绘制矩形边界
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
            material: Cesium.Color.CYAN.withAlpha(0.95),
            clampToGround: true
        },
    })
}

const runAnalysis = async () => {
    if (!rectangleDegree.value) {
        ElMessage.warning('请先绘制分析范围')
        return
    }

    clearFloodPrimitive()
    isLoading.value = true
    try {
        const terrainTexture = await createTerrainCanvasAndMinMaxHeight(rectangleDegree.value)//创建地形高程灰度图
        minTerrainHeight.value = terrainTexture.minElevation//最小高程
        maxTerrainHeight.value = terrainTexture.maxElevation//最大高程
        floodPrimitive = new TerrainFloodPrimitive({
            rectangleDegree: rectangleDegree.value,
            heightMap: terrainTexture.canvas,
            minElevation: terrainTexture.minElevation,
            maxElevation: terrainTexture.maxElevation,
            waterLevel: Number(waterHeight.value) || 0,
            maxDepth: Math.max(1, Number(maxDisplayDepth.value) || 100),
            alpha: Cesium.Math.clamp(Number(alpha.value) || 0.85, 0, 1),
            isEqual:isEqual.value,
            resolution,
        })
        viewer.scene.primitives.add(floodPrimitive as unknown as Cesium.Primitive)
        applyMaterialSettings()

        if (Number(waterHeight.value) <= terrainTexture.minElevation) {
            ElMessage.warning('当前水位低于范围最低高程，可能没有淹没区域')
        }
    } catch (error) {
        console.error(error)
        ElMessage.error('淹没分析生成失败')
    } finally {
        isLoading.value = false
    }
}
//创建地形高程灰度图
const createTerrainCanvasAndMinMaxHeight = async (rectangleDegree: rectangleDegreeType): Promise<TerrainTextureInfo> => {
    const { width, height } = getTextureSize(rectangleDegree)//求宽高像素值
    const points: Cesium.Cartographic[] = []
    const [west, south, east, north] = rectangleDegree
    //循环计算采样点坐标（度->Cartographic）
    for (let y = 0; y < height; y += 1) {
        const latitude = north - (north - south) * (y / Math.max(height - 1, 1))
        for (let x = 0; x < width; x += 1) {
            const longitude = west + ((east - west) * (x / Math.max(width - 1, 1)))
            points.push(Cesium.Cartographic.fromDegrees(longitude, latitude))
        }
    }

    const sampledPoints = await sampleTerrain(points)//弧度(经+纬)->弧度(经+纬+高程)
    const heights = sampledPoints.map((point) => point.height ?? 0)//高程集合
    const minElevation = Math.min(...heights)//最小高程
    const maxElevation = Math.max(...heights)//最大高程
    const heightRange = Math.max(maxElevation - minElevation, 1)//高程差值
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) {
        throw new Error('Canvas context失败')
    }

    const imageData = context.createImageData(width, height)//宽高像素数据（用于设置颜色并上色canvas）
    for (let index = 0; index < heights.length; index += 1) {
        const normalizedHeight = Cesium.Math.clamp((heights[index] - minElevation) / heightRange, 0, 1)//正则化高程（将高程转成0-1之间）
        const encoded = Math.round(normalizedHeight * 255)
        const dataIndex = index * 4
        imageData.data[dataIndex] = encoded
        imageData.data[dataIndex + 1] = encoded
        imageData.data[dataIndex + 2] = encoded
        imageData.data[dataIndex + 3] = 255
    }
    context.putImageData(imageData, 0, 0)//canvas上色

    return {
        canvas,
        minElevation,
        maxElevation,
    }
}
//弧度（经+纬）->弧度（经+纬+高）
const sampleTerrain = async (points: Cesium.Cartographic[]) => {
    try {
        return await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, points)
    } catch (error) {
        console.warn('sampleTerrainMostDetailed failed, fallback to sampleTerrain level 14.', error)
        return Cesium.sampleTerrain(viewer.terrainProvider, 14, points)
    }
}
//获取canvas宽高像素值
const getTextureSize = (rectangleDegree: rectangleDegreeType) => {
    const [west, south, east, north] = rectangleDegree
    const centerLatitude = (south + north) / 2 //中心纬度
    const centerLongitude = (west + east) / 2 //中心经度
    const widthMeters = Cesium.Cartesian3.distance(//宽度（米）
        Cesium.Cartesian3.fromDegrees(west, centerLatitude),
        Cesium.Cartesian3.fromDegrees(east, centerLatitude),
    )
    const heightMeters = Cesium.Cartesian3.distance(//高度（米）
        Cesium.Cartesian3.fromDegrees(centerLongitude, south),
        Cesium.Cartesian3.fromDegrees(centerLongitude, north),
    )
    //确定宽高像素值
    if (widthMeters >= heightMeters) {
        return {
            width: textureMaxSize,
            height: Math.max(textureMinSize, Math.round(textureMaxSize * (heightMeters / Math.max(widthMeters, 1)))),
        }
    }
    else {
        return {
            width: Math.max(textureMinSize, Math.round(textureMaxSize * (widthMeters / Math.max(heightMeters, 1)))),
            height: textureMaxSize,
        }
    }
}
//计算粒度（primitive隔多远插入一个顶点）
const getGranularity = (rectangleDegree: rectangleDegreeType, resolution: number) => {
    const [west, south, east, north] = rectangleDegree
    const maxDegrees = Math.max(Math.abs(east - west), Math.abs(north - south))//用最大的差值，防止长边性能爆炸
    return Cesium.Math.toRadians(Math.max(maxDegrees / resolution, 0.00001))
}

const applyMaterialSettings = () => {
    if (!floodPrimitive) {
        return
    }
    floodPrimitive.waterLevel = Number(waterHeight.value) || 0
    floodPrimitive.maxDepth = Math.max(1, Number(maxDisplayDepth.value) || 100)
    floodPrimitive.alpha = Cesium.Math.clamp(Number(alpha.value) || 0.85, 0, 1)
    floodPrimitive.isEqual=isEqual.value
    viewer.scene.requestRender()
}


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
    stopAnimationTimer()
    waterTimer = window.setInterval(updateWaterHeight, getRefreshInterval())
}

const stopAnimation = () => {
    isAnimating.value = false
    stopAnimationTimer()
}

const stopAnimationTimer = () => {
    if (waterTimer !== undefined) {
        window.clearInterval(waterTimer)
        waterTimer = undefined
    }
}

const updateWaterHeight = () => {
    const currentWaterHeight = Number(waterHeight.value) || 0
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

const getRefreshInterval = () => Math.max(16, Number(refreshInterval.value) || 200)

const zeroWater = () => {
    stopAnimation()
    waterHeight.value = 0
}

const clearDrawEntities = () => {
    if(!viewer||!handler) return
    if (previewRectangle) {
        viewer.entities.remove(previewRectangle)
        previewRectangle = undefined
    }
    if (boundaryLine) {
        viewer.entities.remove(boundaryLine)
        boundaryLine = undefined
    }
}

const clearFloodPrimitive = () => {
    if(!viewer||!handler) return
    if (floodPrimitive) {
        viewer.scene.primitives.remove(floodPrimitive as unknown as Cesium.Primitive)
        floodPrimitive = undefined
    }
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

const clearAll=()=>{
    stopAnimation()
    stopDraw()
    clearAnalysis()
}

onDeactivated(clearAll)
onBeforeRouteLeave(clearAll)
onUnmounted(()=>{
    clearAll
    handler.destroy()
})
</script>

<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>





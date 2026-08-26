<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
        <!-- 离屏热力图容器，用于 heatmap.js 在内存中绘制 canvas -->
        <div ref="heatmapContainer" class="heatmap-container"></div>
        <DraggableModal title="热力图">
            <div class="row">
                <el-button class="draw-button" color="#1E88E5" :loading="isLoading"
                    @click="runHeatmap">生成热力图</el-button>

            </div>
            <div class="row">
                <label class="label">影响半径</label>
                <el-input v-model.number="radius" class="input" :disabled="isLoading" />
            </div>
            <div class="row">
                <label class="label">面积上限</label>
                <el-input v-model.number="maxValue" class="input" :disabled="isLoading" />
            </div>
            <div class="row">
                <label class="label">最大高度</label>
                <el-input v-model.number="maxHeight" class="input" :disabled="isLoading" />
            </div>
            <div class="row">
                <label class="label">透明度</label>
                <el-input v-model.number="alpha" class="input" :disabled="isLoading" />
            </div>
            <div class="row">
                <el-button class="button" color="#1E88E5" :disabled="isLoading" @click="isEqual = !isEqual">{{
                    isEqual ? '平面' : '立体' }}</el-button>
                <el-button class="button" color="#1E88E5" :disabled="isLoading" @click="clearHeatmap">清除</el-button>
            </div>
        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import * as Heatmap from 'heatmap.js'
import * as turf from '@turf/turf'
import { ElMessage } from 'element-plus'
import { onBeforeUnmount, ref, watch } from 'vue'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import { initCesiumBase } from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

// 经纬度范围边界
type Bounds = {
    west: number
    south: number
    east: number
    north: number
}

// 单个热力点（经度、纬度、权重值）
type HeatPoint = {
    lng: number
    lat: number
    value: number
}

// 自定义 Primitive 构造参数
type HeatmapPrimitiveOptions = {
    bounds: Bounds              //边界
    heatMap: HTMLCanvasElement  // 热力图 canvas
    maxHeight: number           // 拉伸最大高度
    alpha: number               // 整体透明度
    resolution: number          // 网格分辨率
    isEqual: boolean
}

/* ========== 自定义 Cesium Primitive ==========
 * 把 heatmap.js 生成的一张 2D 热力图当作纹理，
 * 贴到一个覆盖目标区域的矩形几何体上，并按 alpha 通道
 * 把像素"拔高"成三维热力柱。
 */
const CesiumPrivate = Cesium as unknown as Record<string, any>
const heatmapResolution = 1024  // 矩形网格细分粒度

class HeatmapPrimitive {
    show = true
    bounds: Bounds              //边界
    heatMap: HTMLCanvasElement  //热力图canvas
    maxHeight: number           //最大高度
    alpha: number               //透明度
    resolution: number          //分辨率
    drawCommand: any           // 缓存的绘制命令
    heatTexture: any           // 热力图上传到 GPU 的纹理
    isEqual: boolean

    constructor(options: HeatmapPrimitiveOptions) {
        this.bounds = options.bounds
        this.heatMap = options.heatMap
        this.maxHeight = options.maxHeight
        this.alpha = options.alpha
        this.resolution = options.resolution
        this.isEqual = options.isEqual
    }

    // 每帧被 Cesium 调用，把绘制命令推入渲染队列
    // frameState,上下文渲染信息
    // frameState.context → 用来创建 GPU 资源
    // frameState.commandList → 用来提交绘制命令
    update(frameState: any) {
        if (!this.show) return
        if (!this.drawCommand) {
            this.createCommand(frameState.context)//创建命令
        }
        frameState.commandList.push(this.drawCommand)
    }

    isDestroyed() { return false }

    // 销毁 GPU 资源
    destroy() {
        if (this.drawCommand) {
            const vertexArray = this.drawCommand.vertexArray
            const shaderProgram = this.drawCommand.shaderProgram
            if (vertexArray && !vertexArray.isDestroyed()) vertexArray.destroy()
            if (shaderProgram && (!shaderProgram.isDestroyed || !shaderProgram.isDestroyed())) shaderProgram.destroy()
            this.drawCommand = undefined
        }
        if (this.heatTexture && !this.heatTexture.isDestroyed()) {
            this.heatTexture.destroy()
        }
        return CesiumPrivate.destroyObject(this)
    }

    // 创建矩形几何体 + 上传纹理 + 编译着色器 + 组装绘制命令
    createCommand(context: any) {
        // 1. 用经纬度范围构造一个贴地矩形
        const rectangle = new Cesium.RectangleGeometry({
            ellipsoid: Cesium.Ellipsoid.WGS84,//用 WGS84 椭球体（就是 GPS 用的那个地球模型）来算这个矩形的三维坐标
            rectangle: Cesium.Rectangle.fromDegrees(this.bounds.west, this.bounds.south, this.bounds.east, this.bounds.north),
            vertexFormat: Cesium.VertexFormat.POSITION_AND_ST,//顶点的三维坐标，纹理坐标
            granularity: getGranularity(this.bounds, this.resolution),//粒度，切成多细的三角格网
            height: 0,
        })
        const geometry = Cesium.RectangleGeometry.createGeometry(rectangle)
        const attributeLocations = CesiumPrivate.GeometryPipeline.createAttributeLocations(geometry)//给每个顶点属性分配一个编号
        const vertexArray = CesiumPrivate.VertexArray.fromGeometry({//上传到 GPU 显存，拿到 vertexArray顶点数据
            context, geometry, attributeLocations,//上下文，矩形geometry，顶点属性编号
        })

        // 2. 把热力 canvas 作为 RGBA 纹理上传
        this.heatTexture = new CesiumPrivate.Texture({
            context,
            source: this.heatMap,
            pixelFormat: Cesium.PixelFormat.RGBA,//四通道颜色
            pixelDatatype: Cesium.PixelDatatype.UNSIGNED_BYTE,//每个通道占 1 个字节
            flipY: true,//让 Cesium 在上传时自动把图片垂直翻转，保证纹理坐标和 canvas 像素一一对应
            sampler: new CesiumPrivate.Sampler({
                minificationFilter: Cesium.TextureMinificationFilter.LINEAR,//缩小时线性插槽，当纹理被缩小时，GPU 取周围 4 个像素做平均
                magnificationFilter: Cesium.TextureMagnificationFilter.LINEAR,//放大时线性插槽，当纹理被缩小时，GPU 取周围 4 个像素做平均
                wrapS: CesiumPrivate.TextureWrap.CLAMP_TO_EDGE,//横向超出纹理范围（s > 1 或 s < 0）时，取边缘最后一个像素的颜色
                wrapT: CesiumPrivate.TextureWrap.CLAMP_TO_EDGE,//纵向超出纹理范围（s > 1 或 s < 0）时，取边缘最后一个像素的颜色
            }),
        })

        // 3. 着色器程序
        const shaderProgram = CesiumPrivate.ShaderProgram.fromCache({
            context,
            vertexShaderSource: heatmapVertexShader,//顶点着色器
            fragmentShaderSource: heatmapFragmentShader,//片元着色器
            attributeLocations,//把 GLSL 里的变量名和 GPU 插槽号对上号
        })

        // 4. 统一变量映射（CPU → GPU）
        const uniformMap = {
            heatMap: () => this.heatTexture,
            maxHeight: () => this.maxHeight,
            alpha: () => this.alpha,
            isEqual: () => this.isEqual
        }

        // 5.渲染规则——怎么处理遮挡、怎么混合颜色、要不要剔除背面
        const renderState = CesiumPrivate.RenderState.fromCache({
            depthTest: { enabled: true },//深度测试
            depthMask: true,//写入深度，避免侧视时后面的热力面透过前面的热力面显示出来
            cull: { enabled: false },//背面剔除
            blending: Cesium.BlendingState.ALPHA_BLEND,//颜色透明混合
        })

        // 6. 组装绘制命令
        this.drawCommand = new CesiumPrivate.DrawCommand({
            //准备
            modelMatrix: Cesium.Matrix4.IDENTITY,//模型矩阵，IDENTITY（单位矩阵）意味着不做任何额外变换
            vertexArray: vertexArray,//顶点数组，GPU 去显存里取顶点位置（xyz）和纹理坐标（st）
            primitiveType: Cesium.PrimitiveType.TRIANGLES,//三角网
            //渲染
            renderState: renderState,//渲染规则
            pass: CesiumPrivate.Pass.OPAQUE,//按不透明物体渲染，避免侧面自叠加穿透
            //着色器
            uniformMap: uniformMap,//自定义变量
            shaderProgram: shaderProgram,//着色器
        })
    }
}

/* ========== 着色器 ========== */

// 顶点着色器：根据热力图 alpha 把顶点沿法线方向拔高
// canvas会自动映射到矩形primitive[0,1]
const heatmapVertexShader = `
  uniform sampler2D heatMap;
  uniform float maxHeight;
  uniform bool isEqual;

  in vec4 position;//顶点在 WGS84 椭球上的三维坐标，为齐次分量（米）
  in vec2 st;//纹理坐标[0,1]
  out vec2 v_st;//传给片元着色器的纹理坐标
  out float v_value;//传给片元着色器的高度权重

  void main() {
    // 从热力纹理读取颜色，用 alpha 作为高度权重
    vec4 heatColor = texture(heatMap, st);
    //热力值
    float value = clamp(heatColor.a / 0.85, 0.0, 1.0);//透明度归一化
    value = pow(value, 1.2);  // 增强对比度

    // 计算地表法线，沿法线抬升顶点形成"热力柱"，方向从地心指向该顶点，垂直于当地地表
    vec3 normal = czm_geodeticSurfaceNormal(
      position.xyz,//	顶点在地表的三维坐标（米），要算哪个点的法线
      vec3(0.0),//椭球中心
      vec3(2.458172257647332e-14, 2.458172257647332e-14, 2.4747391015697002e-14)//czm_ellipsoid
    );
    //上升后位置
    vec3 raisedPosition;
    if(isEqual){
        raisedPosition = position.xyz+normal *3000.0;
    }
    else{
        raisedPosition = position.xyz + normal * (3000.0 + value * max(maxHeight, 1.0));//基础悬浮高度+热度额外拔高部分
    }
    
    //顶点最终坐标
    gl_Position = czm_modelViewProjection * vec4(raisedPosition, 1.0);//vec4变齐次
    //输出
    v_st = st;//纹理坐标
    v_value = value;//高度权重
  }
`

// 片元着色器：输出热力颜色并丢弃透明像素
const heatmapFragmentShader = `
  uniform sampler2D heatMap;
  uniform float alpha;

  in vec2 v_st;
  in float v_value;

  void main() {
    vec4 heatColor = texture(heatMap, v_st);
    // 几近透明或权重极低的像素直接丢弃
    if (heatColor.a <= 0.01 || v_value <= 0.005) {
      discard;//直接扔了
    }
    out_FragColor = vec4(heatColor.rgb, alpha);
  }
`

/* ========== 组件状态 ========== */

let viewer: Cesium.Viewer
let heatmapPrimitive: HeatmapPrimitive | undefined
let imageDataPatched = false   // 防止重复打补丁

const heatmapContainer = ref<HTMLDivElement>()
const isLoading = ref(false)
const radius = ref(20)         // 热力点扩散半径
const maxValue = ref(120000)    // 权重归一化上限
const maxHeight = ref(4000)    // 热力柱最大高度（米）
const alpha = ref(1)         // 整体透明度
const isEqual = ref(false)


// Cesium 初始化完成回调
const onMapReady = async (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer
    await initCesiumBase(viewer, {
        destination: { lng: 117.1336, lat: 36.6772, height: 180000 },
        orientation: { heading: 0, pitch: -70, roll: 0 },
        terrain: true,
        osm: true,
        depthTestAgainstTerrain: true
    })
}

// 点击"生成热力图"主流程
const runHeatmap = async () => {
    if (!viewer || !heatmapContainer.value || isLoading.value) return

    isLoading.value = true
    clearHeatmap()                              // 先清空旧数据

    const geojson = await (await fetch(`/data/jinan_buildings/jinan_buildings.geojson`)).json()// 拉取建筑 GeoJSON

    const heatPoints = createHeatPoints(geojson) // 提取质心 + 面积作为权重
    if (!heatPoints.length) {
        ElMessage.warning('没有可用于生成热力图的建筑数据')
        return
    }

    const bounds = getHeatBounds(heatPoints)      // 计算数据包围盒
    const canvasSize = getCanvasSize(bounds)     // 根据范围决定 canvas 尺寸

    // 用 heatmap.js 把点数据渲染成 2D canvas
    const canvas = createHeatmapCanvas(heatPoints, bounds, canvasSize.width, canvasSize.height)

    // 包装成自定义 Primitive 添加到场景
    heatmapPrimitive = new HeatmapPrimitive({
        bounds: bounds,
        heatMap: canvas,
        maxHeight: Math.max(1, Number(maxHeight.value)),
        alpha: Cesium.Math.clamp(Number(alpha.value), 0, 1),
        resolution: heatmapResolution,
        isEqual: isEqual.value
    })
    viewer.scene.primitives.add(heatmapPrimitive as unknown as Cesium.Primitive)

    isLoading.value = false
}



// 把每个建筑面转成一个热力点：质心坐标 + 建筑面积
const createHeatPoints = (geojson: any): HeatPoint[] => {
    const features = Array.isArray(geojson.features) ? geojson.features : []
    return features
        .map((feature: any) => {
            if (!feature?.geometry) return undefined
            const center = turf.centroid(feature).geometry.coordinates  // 质心
            const area = turf.area(feature)                             // 面积（平方米）
            if (!Number.isFinite(center[0]) || !Number.isFinite(center[1]) || !Number.isFinite(area)) {//错误数据
                return undefined
            }
            return {
                lng: center[0],
                lat: center[1],
                // 面积裁剪到 [1, maxValue] 区间，避免极值影响颜色映射
                value: Math.min(area, maxValue.value),
            }
        })
        .filter(Boolean) as HeatPoint[]//去掉undefined的错误值，Boolean=Boolean(undefined)=false
}

// 根据点集计算经纬度包围盒，并外扩 3% 留边距
const getHeatBounds = (points: HeatPoint[]): Bounds => {
    const bounds = points.reduce(//reduce:[(累计值，正在遍历的数组元素)=>{计算},初始值],reduce就是积累结果
        (result, point) => ({
            west: Math.min(result.west, point.lng),
            south: Math.min(result.south, point.lat),
            east: Math.max(result.east, point.lng),
            north: Math.max(result.north, point.lat),
        }),
        {//result
            west: Number.POSITIVE_INFINITY,
            south: Number.POSITIVE_INFINITY,
            east: Number.NEGATIVE_INFINITY,
            north: Number.NEGATIVE_INFINITY,
        }
    )
    const lngPadding = Math.max((bounds.east - bounds.west) * 0.03, 0.01)//经度扩散
    const latPadding = Math.max((bounds.north - bounds.south) * 0.03, 0.01)//纬度扩散
    return {//边界+扩散
        west: bounds.west - lngPadding,
        south: bounds.south - latPadding,
        east: bounds.east + lngPadding,
        north: bounds.north + latPadding,
    }
}

// 根据包围盒实际米数计算合适的 canvas 尺寸（长边 1024，短边等比）
const getCanvasSize = (bounds: Bounds) => {
    const centerLat = (bounds.south + bounds.north) / 2//中心纬度，用于计算距离时用在中心纬度计算经度距离
    const centerLon = (bounds.west + bounds.east) / 2
    const widthMeters = Cesium.Cartesian3.distance(
        Cesium.Cartesian3.fromDegrees(bounds.west, centerLat),
        Cesium.Cartesian3.fromDegrees(bounds.east, centerLat)
    )
    const heightMeters = Cesium.Cartesian3.distance(
        Cesium.Cartesian3.fromDegrees(centerLon / 2, bounds.south),
        Cesium.Cartesian3.fromDegrees(centerLon / 2, bounds.north)
    )
    const maxSize = 1024
    const minSize = 512
    if (widthMeters >= heightMeters) {
        return {
            width: maxSize,
            height: Math.max(minSize, Math.round(maxSize * (heightMeters / Math.max(widthMeters, 1)))),
        }
    }
    return {
        width: Math.max(minSize, Math.round(maxSize * (widthMeters / Math.max(heightMeters, 1)))),
        height: maxSize,
    }
}

// 根据包围盒跨度计算矩形几何体的三角网粒度
const getGranularity = (bounds: Bounds, resolution: number) => {
    const maxDegrees = Math.max(Math.abs(bounds.east - bounds.west), Math.abs(bounds.north - bounds.south))//经纬跨度最大的度
    return Cesium.Math.toRadians(Math.max(maxDegrees / resolution, 0.00001))//把跨度切成resolution份，每份的跨度
}


// 把热力点数据交给 heatmap.js，输出最终 canvas
const createHeatmapCanvas = (points: HeatPoint[], bounds: Bounds, width: number, height: number) => {
    const container = heatmapContainer.value!
    patchImageDataReadonlySetter()   // 修复新版浏览器 ImageData.data 只读问题

    container.innerHTML = ''//清空dom内容
    container.style.width = `${width}px`
    container.style.height = `${height}px`

    // 初始化 heatmap 实例
    const heatmap = Heatmap.create({
        container,
        radius: Math.max(1, Number(radius.value)),//扩散半径
        maxOpacity: 0.85,//最热不透明度
        minOpacity: 0,//最冷不透明度
        blur: 0.78,//高斯模糊，0锐利，1模糊
        gradient: {
            0.05: '#0d47a1',   // 深蓝
            0.12: '#1e88e5',   // 蓝
            0.20: '#00b0ff',   // 亮蓝
            0.28: '#00e5ff',   // 青
            0.38: '#18ffff',   // 青绿
            0.48: '#76ff03',   // 绿
            0.58: '#c6ff00',   // 黄绿
            0.68: '#ffea00',   // 黄
            0.78: '#ffc400',   // 金黄
            0.86: '#ff9100',   // 橙
            0.93: '#ff5252',   // 浅红
            1.00: '#ff1744',   // 深红
        }
    })

    // 注入数据：把经纬度映射到 canvas 像素坐标
    heatmap.setData({
        min: 0,//最小映射
        max: Math.max(1, Number(maxValue.value) || 10000),//最大映射，超过变成1
        data: points.map((point) => ({
            x: Math.round(((point.lng - bounds.west) / (bounds.east - bounds.west)) * width),
            y: Math.round(((bounds.north - point.lat) / (bounds.north - bounds.south)) * height),//canva顶部是0，底部是1
            value: point.value,
        })),
    })

    // 把 heatmap.js 内部 canvas 拷贝到新 canvas 返回
    const sourceCanvas = container.querySelector('canvas')//querySelector:在 container 这个元素内部，找第一个匹配的子元素=找第一个canvas
    if (!sourceCanvas) throw new Error('heatmap canvas 创建失败')
    //copy一份副本作为结果canvas
    const resultCanvas = document.createElement('canvas')
    resultCanvas.width = width
    resultCanvas.height = height
    resultCanvas.getContext('2d')?.drawImage(sourceCanvas, 0, 0)
    return resultCanvas
}

// 修补 heatmap.js 2.0.5 对 ImageData.data 的写操作（新版浏览器该属性只读）
const patchImageDataReadonlySetter = () => {
    if (imageDataPatched || typeof CanvasRenderingContext2D === 'undefined') return
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData
    CanvasRenderingContext2D.prototype.getImageData = function (...args) {
        const imageData = originalGetImageData.apply(this, args as [sx: number, sy: number, sw: number, sh: number])
        try {
            Object.defineProperty(imageData, 'data', {
                configurable: true, enumerable: true, writable: true, value: imageData.data,
            })
        } catch {
            // 部分浏览器抛错则忽略
        }
        return imageData
    }
    imageDataPatched = true
}


// 移除并销毁热力图 Primitive
const clearHeatmap = () => {
    if (viewer && !viewer.isDestroyed() && heatmapPrimitive) {
        viewer.scene.primitives.remove(heatmapPrimitive as unknown as Cesium.Primitive)
        heatmapPrimitive = undefined
    }
    if (heatmapContainer.value) {
        heatmapContainer.value.innerHTML = ''
    }
}

// 实时调节，无需重新生成
watch([maxHeight, alpha, isEqual, maxValue], () => {
    if (!heatmapPrimitive || !viewer) return
    heatmapPrimitive.maxHeight = Math.max(1, Number(maxHeight.value) || 3000)
    heatmapPrimitive.alpha = Cesium.Math.clamp(Number(alpha.value) || 0.9, 0, 1)
    heatmapPrimitive.isEqual = isEqual.value
    viewer.scene.requestRender()
})
//更改面积上限，清除，重新绘制heatmap和primitive
watch(maxValue, () => {
    clearHeatmap()
    runHeatmap()
})

// 组件卸载时清理
onBeforeUnmount(() => {
    clearHeatmap()
})
</script>

<style scoped>
/* 页面占满父容器 */
.page-container {
    width: 100%;
    height: 100%;
}

/* 离屏热力图容器：移出可视区，仅用于 heatmap.js 绘制 */
.heatmap-container {
    position: fixed;
    left: -10000px;
    top: -10000px;
    pointer-events: none;
    opacity: 0;
}
</style>

<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />

        <DraggableModal title="立面图">
            <div class="row">
                <el-button class="draw-button" round :color="isDraw ? 'red' : 'greenyellow'" @click="drawRectangle">
                    {{ isDraw ? '结束绘制' : '绘制范围' }}
                </el-button>
            </div>
            <div class="row">
                <label class="label">观察方向</label>
                <el-select v-model="viewDirection" class="input">
                    <el-option label="自动识别" value="auto" />
                    <el-option label="从南向北" value="south" />
                    <el-option label="从北向南" value="north" />
                    <el-option label="从西向东" value="west" />
                    <el-option label="从东向西" value="east" />
                </el-select>
            </div>
            <div class="row">
                <label class="label">高度(米)</label>
                <el-input v-model.number="maxElevationHeight" class="input" />
            </div>
            <div class="row">
                <el-button class="button" color="#1E88E5" @click="generateSkylineChart">生成天际线</el-button>
            </div>
            <div class="row">
                <el-button class="button" color="#1E88E5" @click="() => generateElevationView()">浏览立面图</el-button>
                <el-button class="button" color="#1E88E5" @click="exportElevationImage">导出立面图</el-button>
            </div>
            <div class="row">
                <el-button class="button" color="#1E88E5" @click="restoreScene">恢复场景</el-button>
                <el-button class="button" color="#1E88E5" @click="clearAll">清除</el-button>
            </div>
        </DraggableModal>
        <DraggableModal title="天际线图" v-if="isShowChart" :initialLeft="10" :initialTop="460"
            :isInitialPanelSwitch="false">
            <div ref="chartRef" class="echart"></div>
        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { nextTick, onBeforeUnmount, ref } from 'vue'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import { initCesiumBase } from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

type rectangleCartographicType = [number, number, number, number]//矩形范围[西，南，东，北]

let viewer: Cesium.Viewer
let handler: Cesium.ScreenSpaceEventHandler
let osmBuildings: Cesium.Cesium3DTileset | undefined

let rectangle: Cesium.Rectangle | undefined
let rectangleCartographic: rectangleCartographicType | undefined//矩形范围[西，南，东，北]
let rectangleBaseHeight = 0//矩形地面高度
let rectangleEntity: Cesium.Entity | undefined//矩形entity
let sceneSnapshot: SceneSnapshot | undefined//场景快照
let elevationClippingPlanes: Cesium.ClippingPlaneCollection | undefined//裁切面
let elevationRenderInfo: ElevationRenderInfo | undefined
let chart: echarts.ECharts | undefined
//函数的一个返回结果
type RectangleResult = {
    rectangleCartographic: rectangleCartographicType
    rectangle: Cesium.Rectangle
    baseHeight: number
}

type ElevationDirectionMode = 'south' | 'north' | 'west' | 'east' | 'auto'

type ElevationView = {
    direction: Cesium.Cartesian3
    right: Cesium.Cartesian3
    centerX: number
    centerY: number
    width: number
    depth: number
}
type ElevationRenderInfo = {
    viewWidth: number
    viewHeight: number
    frustumWidth: number
    visibleHeight: number
}
type PixelBounds = {
    minX: number
    maxX: number
    minY: number
    maxY: number
}
//场景快照
type SceneSnapshot = {
    position: Cesium.Cartesian3
    direction: Cesium.Cartesian3
    up: Cesium.Cartesian3
    frustum: Cesium.PerspectiveFrustum | Cesium.OrthographicFrustum
    globeShow: boolean
    skyBoxShow?: boolean
    skyAtmosphereShow?: boolean
    backgroundColor: Cesium.Color
    rectangleShow?: boolean
    osmClippingPlanes?: Cesium.ClippingPlaneCollection
}

const isDraw = ref(false)//是否绘制
const viewDirection = ref<ElevationDirectionMode>('auto')//截图视角
const maxElevationHeight = ref(200)//最大高度
const isShowChart = ref(false)
const chartRef = ref<HTMLDivElement>()

const onMapReady = async (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer
    handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)

    const initResult = await initCesiumBase(viewer, {
        destination: { lng: 114.40740, lat: 30.50721, height: 1000 },
        orientation: { heading: 185, pitch: -30, roll: 0 },
        terrain: true,
        osm: true,
        depthTestAgainstTerrain: true
    })
    osmBuildings = initResult?.osmBuildings
    osmBuildings!.showOutline = false;
}
//*-----矩形绘制-----*//
//绘制矩形区域
const drawRectangle = () => {
    if (isDraw.value) {
        isDraw.value = false;
        stopDraw()
        return
    }

    clearRectangle()

    let activePositions: Cesium.Cartesian3[] = []
    let dynamicRectangle: Cesium.Entity | undefined
    isDraw.value = true

    handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        const position = viewer.scene.pickPosition(e.position)
        if (!position) {
            return
        }
        if (activePositions.length == 0) {
            activePositions.push(position)
            dynamicRectangle = addRectangle(new Cesium.CallbackProperty(() => {
                return createRectangle(activePositions)?.rectangle
            }, false))
        }
        else {
            activePositions.push(position)
            const result = createRectangle(activePositions)
            if (!result) {
                return
            }

            rectangleCartographic = result.rectangleCartographic
            rectangle = result.rectangle
            rectangleBaseHeight = result.baseHeight

            rectangleEntity = addRectangle(rectangle)

            viewer.entities.remove(dynamicRectangle!)
            stopDraw()
        }

    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    handler.setInputAction((event: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
        if (activePositions.length == 0) {
            return
        }
        const position = viewer.scene.pickPosition(event.endPosition)
        if (!position) {
            return
        }
        if (activePositions.length > 1)
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
const createRectangle = (positions: Cesium.Cartesian3[]): RectangleResult | undefined => {
    if (positions.length < 2) return undefined
    const startCartographic = Cesium.Cartographic.fromCartesian(positions[0])
    const endCartographic = Cesium.Cartographic.fromCartesian(positions[1])
    const west = Math.min(startCartographic.longitude, endCartographic.longitude)
    const east = Math.max(startCartographic.longitude, endCartographic.longitude)
    const south = Math.min(startCartographic.latitude, endCartographic.latitude)
    const north = Math.max(startCartographic.latitude, endCartographic.latitude)
    const baseHeight = Math.min(
        Number.isFinite(startCartographic.height) ? startCartographic.height : 0,
        Number.isFinite(endCartographic.height) ? endCartographic.height : 0
    )
    if (east - west < Cesium.Math.toRadians(0.000001) || north - south < Cesium.Math.toRadians(0.000001)) {
        return undefined
    }
    const rectangleCartographic: rectangleCartographicType = [west, south, east, north]
    const rectangle = new Cesium.Rectangle(west, south, east, north)
    return { rectangleCartographic, rectangle, baseHeight }
}
//添加矩形entity
const addRectangle = (rectangle: Cesium.Rectangle | Cesium.CallbackProperty) => {
    return viewer.entities.add({
        rectangle: {
            coordinates: rectangle,
            material: Cesium.Color.SKYBLUE.withAlpha(0.5),
            height: rectangleBaseHeight,
            extrudedHeight: rectangleBaseHeight + Math.max(maxElevationHeight.value, 1)
        }
    })
}
//清除矩形及其变量
const clearRectangle = () => {
    if (rectangleEntity) {
        viewer.entities.remove(rectangleEntity)
    }
    rectangleEntity = undefined
    rectangle = undefined
    rectangleCartographic = undefined
    rectangleBaseHeight = 0
}
//*-----立面图-----*//
// 生成立面图：保存快照 → 隐藏地球/天空 → 切换正交相机正对矩形

const generateElevationView = async () => {
    if (!rectangleCartographic || !rectangle) {
        ElMessage.warning('请先绘制立面图范围')
        return false
    }

    if (sceneSnapshot) {
        restoreScene()
    }
    saveSceneSnapshot()//保存场景信息
    applyElevationSceneStyle()//创建场景
    applyTilesetBoxClipping(rectangleCartographic)//裁切场景
    const elevationView = setElevationView(rectangleCartographic, viewDirection.value)//判断当前朝立面图方向
    setElevationCamera(rectangleCartographic, elevationView)//建立相机
    if (rectangleEntity) {
        rectangleEntity.show = false
    }
    //viewer.scene.requestRender()打标记，下一帧画
    //viewer.render()立刻画
    viewer.scene.requestRender()
    return true
}
//保存场景快照
const saveSceneSnapshot = () => {
    if (sceneSnapshot) {
        return
    }

    const scene = viewer.scene
    sceneSnapshot = {
        position: Cesium.Cartesian3.clone(viewer.camera.positionWC),
        direction: Cesium.Cartesian3.clone(viewer.camera.directionWC),
        up: Cesium.Cartesian3.clone(viewer.camera.upWC),//  // 相机的"上"方向向量（决定画面是否旋转/倾斜）
        // 相机投影方式
        // 透视投影参数（视野角、近远裁剪面等）
        // 立面图会临时换成正交投影，恢复时需要换回来
        frustum: viewer.camera.frustum.clone() as Cesium.PerspectiveFrustum | Cesium.OrthographicFrustum,
        globeShow: scene.globe.show,// 地球（含地形）是否显示
        skyBoxShow: scene.skyBox!.show,// 星空背景是否显示
        skyAtmosphereShow: scene.skyAtmosphere!.show,    // 大气层辉光是否显示
        backgroundColor: Cesium.Color.clone(scene.backgroundColor),// 场景背景颜色
        rectangleShow: rectangleEntity!.show,// 绘制范围的矩形框实体是否可见
        osmClippingPlanes: osmBuildings!.clippingPlanes,
    }
}
// 立面图样式：隐藏地球与天空，背景置黑（工程图效果）
const applyElevationSceneStyle = () => {
    const scene = viewer.scene
    scene.globe.show = false
    scene.skyBox!.show = false
    scene.skyAtmosphere!.show = false
    scene.backgroundColor = Cesium.Color.BLACK
}
// 创建裁切盒，裁掉盒子外面的建筑
const applyTilesetBoxClipping = (range: rectangleCartographicType) => {
    if (!osmBuildings) {
        return
    }

    const [west, south, east, north] = range
    const centerLongitude = Cesium.Math.toDegrees((west + east) / 2)
    const centerLatitude = Cesium.Math.toDegrees((south + north) / 2)
    const baseHeight = rectangleBaseHeight//矩形地面高度
    const localToWorld = Cesium.Transforms.eastNorthUpToFixedFrame(//以立方体地面中心为局部坐标原点
        Cesium.Cartesian3.fromDegrees(centerLongitude, centerLatitude, baseHeight)
    )
    const worldToLocal = Cesium.Matrix4.inverse(localToWorld, new Cesium.Matrix4())
    const corners = [//盒子底面四个点的局部坐标
        Cesium.Cartesian3.fromRadians(west, south, baseHeight),
        Cesium.Cartesian3.fromRadians(east, south, baseHeight),
        Cesium.Cartesian3.fromRadians(east, north, baseHeight),
        Cesium.Cartesian3.fromRadians(west, north, baseHeight),
    ].map((point) => Cesium.Matrix4.multiplyByPoint(worldToLocal, point, new Cesium.Cartesian3()))
    const xs = corners.map((point) => point.x)//底面四点x离原点距离
    const ys = corners.map((point) => point.y)//底面四点y离原点距离
    //AABB矩形
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    const topHeight = Math.max(maxElevationHeight.value, 1)//盒子顶部高度
    const tilesetOriginMatrix = (osmBuildings as any).clippingPlanesOriginMatrix//建筑瓦片集的根变换矩阵
    //世界坐标->osm局部坐标
    //想象你要给一栋楼贴一个"只准在这间房里拍照"的标签：
    // localToWorld你用世界地图坐标标出了这间房的墙（"经纬度 xxx，海拔 xxx"）
    //tilesetOriginMatrix但这栋楼有自己的内部工程图纸坐标系（比如"距离大门向东 50 米"）
    //inverse(tilesetOriginMatrix)你需要把世界坐标翻译回这栋楼的内部图纸坐标
    //最终结果，裁剪面在楼的内部图纸上精确标出了那间房的范围
    const clippingModelMatrix = Cesium.Matrix4.multiply(
        Cesium.Matrix4.inverse(tilesetOriginMatrix, new Cesium.Matrix4()),//世界->模型
        localToWorld,//局部->世界
        new Cesium.Matrix4()
    )

    const planes = [
        new Cesium.ClippingPlane(new Cesium.Cartesian3(1, 0, 0), -minX),//法线方向（指向保留侧），偏移量（指向东，西墙）
        new Cesium.ClippingPlane(new Cesium.Cartesian3(-1, 0, 0), maxX),//指向西，东墙
        new Cesium.ClippingPlane(new Cesium.Cartesian3(0, 1, 0), -minY),//指向北，南墙
        new Cesium.ClippingPlane(new Cesium.Cartesian3(0, -1, 0), maxY),//指向南，北墙
        new Cesium.ClippingPlane(new Cesium.Cartesian3(0, 0, -1), topHeight),//指向下，保留下面的部分
    ]
    if (!elevationClippingPlanes || elevationClippingPlanes.isDestroyed()) {
        elevationClippingPlanes = new Cesium.ClippingPlaneCollection({
            modelMatrix: clippingModelMatrix,
            unionClippingRegions: true,//5 个平面取交集
            planes,// 5个平面
        })
        osmBuildings.clippingPlanes = elevationClippingPlanes
        return
    }

    elevationClippingPlanes.enabled = true
    elevationClippingPlanes.modelMatrix = clippingModelMatrix
    elevationClippingPlanes.unionClippingRegions = true
    elevationClippingPlanes.removeAll()
    planes.forEach((plane) => elevationClippingPlanes?.add(plane))
    return
}

// 设置正交相机
const setElevationCamera = (range: rectangleCartographicType, elevationView: ElevationView) => {
    //已有锁死信息，中心位置、盒子宽/高/深、viewer比例
    const [west, south, east, north] = range
    const centerLongitude = Cesium.Math.toDegrees((west + east) / 2)
    const centerLatitude = Cesium.Math.toDegrees((south + north) / 2)
    const baseHeight = rectangleBaseHeight
    const viewWidth = Math.max(elevationView.width, 1)//宽度
    const viewHeight = Math.max(maxElevationHeight.value, 1)//高度
    const viewDepth = Math.max(elevationView.depth, 1)//深度
    const aspectRatio = viewer.canvas.clientWidth / Math.max(viewer.canvas.clientHeight, 1)//比例

    const frustumWidth = Math.max(viewWidth, viewHeight * aspectRatio)//如果宽度比高度小，宽度等于高度，后面以宽度为基准
    const visibleHeight = frustumWidth / aspectRatio//垂直可见高度（米）= 水平宽度 ÷ 宽高比
    elevationRenderInfo = { viewWidth, viewHeight, frustumWidth, visibleHeight }//用于提取天际线

    const cameraStandOff = Math.max(frustumWidth, visibleHeight, viewDepth, 1)//相机至少退到"能完整包住矩形对角线长度"的位置
    const viewDistance = viewDepth / 2 + cameraStandOff//相机到矩形中心的距离+从相机到矩形前脸的距离
    //正交视锥体
    const frustum = new Cesium.OrthographicFrustum()
    frustum.width = frustumWidth
    frustum.aspectRatio = aspectRatio
    frustum.near = cameraStandOff//近裁剪面在相机前方 cameraStandOff 米处
    frustum.far = cameraStandOff + viewDepth//远裁剪面在相机前方 cameraStandOff + viewDepth 米处
    viewer.camera.frustum = frustum//从透视投影切换为正交投影
    //原点在盒子中心的ENU
    const transform = Cesium.Transforms.eastNorthUpToFixedFrame(
        Cesium.Cartesian3.fromDegrees(centerLongitude, centerLatitude, baseHeight + visibleHeight / 2)
    )

    const offset = Cesium.Cartesian3.multiplyByScalar(elevationView.direction, -viewDistance, new Cesium.Cartesian3())//方向向量，后退距离
    viewer.camera.lookAtTransform(transform, offset)//移动*ENU（localToWorld）=视点在世界的位置
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)// 解除局部坐标系绑定
}

// 自动识别：根据当前相机在矩形中心的东/西/南/北哪一侧，决定立面观察方向
const setElevationView = (
    range: rectangleCartographicType,
    directionMode: ElevationDirectionMode
): ElevationView => {
    const [west, south, east, north] = range
    const centerLongitude = Cesium.Math.toDegrees((west + east) / 2)
    const centerLatitude = Cesium.Math.toDegrees((south + north) / 2)
    const baseHeight = rectangleBaseHeight
    const direction = getElevationDirection(range, directionMode)//朝向（正方向
    const right = Cesium.Cartesian3.normalize(//右方向
        Cesium.Cartesian3.cross(direction, Cesium.Cartesian3.UNIT_Z, new Cesium.Cartesian3()),//正方向*垂直向上方向=右方向（同时垂直于他们）
        new Cesium.Cartesian3()
    )
    const rectangleImessage = getRectangleImessage(range, centerLongitude, centerLatitude, baseHeight, direction, right)

    return {
        direction,//正方向
        right,//右方向
        ...rectangleImessage,//局部宽、深、中心点
    }
}

const getElevationDirection = (
    range: rectangleCartographicType,
    directionMode: ElevationDirectionMode
): Cesium.Cartesian3 => {
    if (directionMode !== 'auto') {
        switch (directionMode) {
            case 'north':
                return new Cesium.Cartesian3(0, -1, 0)
            case 'west':
                return new Cesium.Cartesian3(1, 0, 0)
            case 'east':
                return new Cesium.Cartesian3(-1, 0, 0)
            case 'south':
            default:
                return new Cesium.Cartesian3(0, 1, 0)
        }
    }

    const [west, south, east, north] = range
    const centerLongitude = (west + east) / 2
    const centerLatitude = (south + north) / 2
    const transform = Cesium.Transforms.eastNorthUpToFixedFrame(
        Cesium.Cartesian3.fromRadians(centerLongitude, centerLatitude, rectangleBaseHeight)
    )
    const inverseTransform = Cesium.Matrix4.inverse(transform, new Cesium.Matrix4())
    const localDirection = Cesium.Matrix4.multiplyByPointAsVector(
        inverseTransform,
        viewer.camera.directionWC,
        new Cesium.Cartesian3()
    )

    let direction: string
    if (Math.abs(localDirection.y) >= Math.abs(localDirection.x)) {
        direction = localDirection.y >= 0 ? 'south' : 'north'
    }
    else {
        direction = localDirection.x >= 0 ? 'west' : 'east'
    }
    switch (direction) {
        case 'north':
            return new Cesium.Cartesian3(0, -1, 0)
        case 'west':
            return new Cesium.Cartesian3(1, 0, 0)
        case 'east':
            return new Cesium.Cartesian3(-1, 0, 0)
        case 'south':
        default:
            return new Cesium.Cartesian3(0, 1, 0)
    }
}
//返回宽、深、中心ENU坐标
const getRectangleImessage = (
    range: rectangleCartographicType,
    centerLongitude: number,
    centerLatitude: number,
    baseHeight: number,
    direction: Cesium.Cartesian3,
    right: Cesium.Cartesian3
) => {
    const [west, south, east, north] = range
    const transform = Cesium.Transforms.eastNorthUpToFixedFrame(
        Cesium.Cartesian3.fromDegrees(centerLongitude, centerLatitude, baseHeight)
    )
    const inverseTransform = Cesium.Matrix4.inverse(transform, new Cesium.Matrix4())
    const corners = [
        Cesium.Cartesian3.fromRadians(west, south, baseHeight),
        Cesium.Cartesian3.fromRadians(east, south, baseHeight),
        Cesium.Cartesian3.fromRadians(east, north, baseHeight),
        Cesium.Cartesian3.fromRadians(west, north, baseHeight),
    ].map((point) => Cesium.Matrix4.multiplyByPoint(inverseTransform, point, new Cesium.Cartesian3()))
    //dot(A, B) 当 B 是单位向量时，结果就是 A 在 B 方向上的投影长度。
    const rightValues = corners.map((point) => Cesium.Cartesian3.dot(point, right))//取点 P 在"相机右方向"上的坐标值
    const depthValues = corners.map((point) => Cesium.Cartesian3.dot(point, direction))
    const minRight = Math.min(...rightValues)  // 最左
    const maxRight = Math.max(...rightValues)  // 最右
    const minDepth = Math.min(...depthValues)  // 最近
    const maxDepth = Math.max(...depthValues)  // 最远
    const centerRight = (minRight + maxRight) / 2
    const centerDepth = (minDepth + maxDepth) / 2
    const centerPoint = Cesium.Cartesian3.add(
        Cesium.Cartesian3.multiplyByScalar(right, centerRight, new Cesium.Cartesian3()),
        Cesium.Cartesian3.multiplyByScalar(direction, centerDepth, new Cesium.Cartesian3()),
        new Cesium.Cartesian3()
    )

    return {
        width: maxRight - minRight,
        depth: maxDepth - minDepth,
        centerX: centerPoint.x,
        centerY: centerPoint.y,
    }
}

// 导出当前 canvas 为 PNG
const exportElevationImage = () => {
    generateElevationView()
    exportCanvasImage()
    restoreScene()
}

const exportCanvasImage = () => {
    const imageData = getElevationCanvasImageData()
    const bounds = getBuildingPixelBounds(imageData)
    const canvas = bounds ? createCroppedCanvas(imageData, bounds) : createImageDataCanvas(imageData)
    if (!bounds) {
        ElMessage.warning('未识别到可裁切的建筑像素，已导出完整立面图')
    }
    downloadCanvasImage(canvas, `elevation-${Date.now()}.png`)
}
//生成天际线
const generateSkylineChart = async () => {
    await generateElevationView()
    try {
        const imageData = getElevationCanvasImageData()
        const bounds = getBuildingPixelBounds(imageData)
        if (!bounds) {
            ElMessage.warning('未识别到可用于生成天际线的建筑像素')
            return
        }

        const skylineData = extractSkylineData(imageData, bounds)
        if (!skylineData.length) {
            ElMessage.warning('未识别到可用于生成天际线的建筑像素')
            return
        }
        await drawSkylineChart(skylineData)
    }
    finally {
        restoreScene()
    }
}
//获取viewer的{width,height,rgba数组}
const getElevationCanvasImageData = () => {
    viewer.render()
    const canvas = document.createElement('canvas')
    canvas.width = viewer.canvas.width
    canvas.height = viewer.canvas.height
    const context = canvas.getContext('2d')!
    context.drawImage(viewer.canvas, 0, 0)
    return context.getImageData(0, 0, canvas.width, canvas.height)
}
//获取canvas裁切掉黑框后的边界
const getBuildingPixelBounds = (imageData: ImageData): PixelBounds | undefined => {
    const { width, height, data } = imageData
    let minX = width
    let maxX = -1
    let minY = height
    let maxY = -1

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4
            if (!isBuildingPixel(data, index)) {
                continue
            }
            minX = Math.min(minX, x)
            maxX = Math.max(maxX, x)
            minY = Math.min(minY, y)
            maxY = Math.max(maxY, y)
        }
    }

    if (maxX < minX || maxY < minY) {
        return undefined
    }

    return { minX, maxX, minY, maxY }
}

const createCroppedCanvas = (imageData: ImageData, bounds: PixelBounds) => {
    const sourceCanvas = createImageDataCanvas(imageData)

    const cropWidth = bounds.maxX - bounds.minX + 1
    const cropHeight = bounds.maxY - bounds.minY + 1
    const canvas = document.createElement('canvas')
    canvas.width = cropWidth
    canvas.height = cropHeight
    const context = canvas.getContext('2d')!
    context.drawImage(sourceCanvas, bounds.minX, bounds.minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)
    return canvas
}

const createImageDataCanvas = (imageData: ImageData) => {
    const canvas = document.createElement('canvas')
    canvas.width = imageData.width
    canvas.height = imageData.height
    const context = canvas.getContext('2d')!
    context.putImageData(imageData, 0, 0)
    return canvas
}

const downloadCanvasImage = (canvas: HTMLCanvasElement, fileName: string) => {
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

const extractSkylineData = (imageData: ImageData, bounds: PixelBounds) => {
    const { width: canvasWidth, data } = imageData
    const cropWidth = bounds.maxX - bounds.minX + 1
    const sampleStep = Math.max(1, Math.floor(cropWidth / 5000))
    const result: number[][] = []

    const scanColumn = (x: number) => {
        for (let y = bounds.minY; y <= bounds.maxY; y++) {
            const index = (y * canvasWidth + x) * 4
            if (!isBuildingPixel(data, index)) {
                continue
            }

            result.push([x - bounds.minX, bounds.maxY - y])
            return
        }

        if (result.length > 0) {
            result.push([x - bounds.minX, 0])
        }
    }

    let lastX = bounds.minX
    for (let x = bounds.minX; x <= bounds.maxX; x += sampleStep) {
        scanColumn(x)
        lastX = x
    }
    if (lastX !== bounds.maxX) {
        scanColumn(bounds.maxX)
    }

    return result
}
//判断像素是不是建筑
const isBuildingPixel = (data: Uint8ClampedArray, index: number) => {
    const alpha = data[index + 3]
    if (alpha < 20) {
        return false
    }

    const red = data[index]
    const green = data[index + 1]
    const blue = data[index + 2]
    const maxColor = Math.max(red, green, blue)
    const minColor = Math.min(red, green, blue)
    return maxColor > 18 || maxColor - minColor > 10
}

const drawSkylineChart = async (skylineData: number[][]) => {

    isShowChart.value = true
    await nextTick()//等vue的demo更新完成
    if (!chartRef.value) {
        return
    }

    const xValues = skylineData.map((item) => item[0])
    const yValues = skylineData.map((item) => item[1])
    const minX = Math.min(...xValues)
    const maxX = Math.max(...xValues)
    const maxY = Math.max(...yValues)

    chart?.dispose()//销毁
    chart = echarts.init(chartRef.value)
    chart.setOption({
        series: [{
            type: 'line',
            data: skylineData,
            smooth: false,
            showSymbol: false,//不画圆点
            lineStyle: {
                width: 2,
                color: '#1E88E5',
            },
            areaStyle: {//线条下方填充
                color: 'rgba(30,136,229,0.18)',
            },
        }],
        xAxis: {
            type: 'value',//数值轴
            name: '图像位置',
            min: minX,
            max: maxX,
            axisLabel: {
                formatter: (value: number) => value.toFixed(0),
            },
        },
        yAxis: {
            type: 'value',
            name: '轮廓高度',
            min: 0,
            max: maxY,
            axisLabel: {
                formatter: (value: number) => value.toFixed(0),
            },
        },
        tooltip: {//鼠标悬停提示
            trigger: 'axis',
            formatter: (params: any) => {
                const data = params[0].data
                return `
                    图像位置:${data[0].toFixed(2)}<br/>
                    相对高度:${data[1].toFixed(2)}
                `
            },
        },
        grid: {
            left: 5,
            right: 90,
            top: 45,
            bottom: 15,
            containLabel: true,//// label 算在 grid 内
        },
    })
}


const restoreScene = () => {
    if (!sceneSnapshot) {
        return
    }

    const snapshot = sceneSnapshot
    const scene = viewer.scene
    try {
        viewer.camera.frustum = snapshot.frustum
        viewer.camera.setView({
            destination: snapshot.position,
            orientation: {
                direction: snapshot.direction,
                up: snapshot.up,
            },
        })

        scene.globe.show = snapshot.globeShow
        if (scene.skyBox && snapshot.skyBoxShow !== undefined) {
            scene.skyBox.show = snapshot.skyBoxShow
        }
        if (scene.skyAtmosphere && snapshot.skyAtmosphereShow !== undefined) {
            scene.skyAtmosphere.show = snapshot.skyAtmosphereShow
        }
        scene.backgroundColor = snapshot.backgroundColor
        if (rectangleEntity && snapshot.rectangleShow !== undefined) {
            rectangleEntity.show = snapshot.rectangleShow
        }
        if (elevationClippingPlanes && !elevationClippingPlanes.isDestroyed()) {
            elevationClippingPlanes.enabled = false
        }
    }
    finally {
        sceneSnapshot = undefined
        viewer.scene.requestRender()
    }
}

const clearAll = () => {
    restoreScene()
    stopDraw()
    clearRectangle()
    chart?.dispose()
    chart = undefined
    isShowChart.value = false
}

onBeforeUnmount(() => {
    clearAll()
    if (handler && !handler.isDestroyed()) {
        handler.destroy()
    }
})
</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}

.echart {
    width: 900px;
    height: 320px;
}
</style>

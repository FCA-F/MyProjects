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
                <el-button class="button" color="#1E88E5" @click="generateElevationView">生成立面图</el-button>
                <el-button class="button" color="#1E88E5" @click="exportElevationImage">导出图片</el-button>
            </div>
            <div class="row">
                <el-button class="button" color="#1E88E5" @click="generateSkylineChart">生成天际线</el-button>
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
}

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
    viewer.scene.requestRender()
    await waitRenderFrames(2)
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
const exportElevationImage = async () => {
    const isSuccess = await generateElevationView()//生成立面图
    if (!isSuccess) {
        return
    }
    exportCanvasImage()
    restoreScene()
}

const exportCanvasImage = () => {
    viewer.render()
    const imageUrl = viewer.canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = `elevation-${Date.now()}.png`
    link.click()
}
//生成天际线
const generateSkylineChart = async () => {
    const isSuccess = await generateElevationView()
    if (!isSuccess || !elevationRenderInfo) {
        return
    }

    const imageData = await getElevationCanvasImageData()
    const skylineData = extractSkylineData(imageData, elevationRenderInfo)
    if (!skylineData.length) {
        ElMessage.warning('未识别到可用于生成天际线的建筑像素')
        return
    }
    await drawSkylineChart(skylineData)
}

const getElevationCanvasImageData = () => {
    viewer.render()
    const imageUrl = viewer.canvas.toDataURL('image/png')
    // resolve -> 调用它表示"成功了，结果是 xxx"
    // reject  -> 调用它表示"失败了，原因是 xxx"
    return new Promise<ImageData>((resolve, reject) => {
        const image = new Image()
        image.onload = () => {//绑监听，image加载了，绘制canvas
            const canvas = document.createElement('canvas')
            canvas.width = image.width
            canvas.height = image.height
            const context = canvas.getContext('2d')
            context!.drawImage(image, 0, 0)
            //ImageData {
            //width画布宽（像素）
            //height画布高（像素）
            //data像素数组(rgba)
            resolve(context!.getImageData(0, 0, canvas.width, canvas.height))
        }
        image.onerror = () => reject(new Error('立面图图片加载失败'))
        image.src = imageUrl
    })
}

const extractSkylineData = (imageData: ImageData, renderInfo: ElevationRenderInfo) => {
    // 从 ImageData 中解构出画布宽、高、像素rgba数组
    const { width, height, data } = imageData

    // 算出"有效建筑区域"在画布上的左右边界
    // 正交相机的视锥宽度（frustumWidth）可能比实际矩形宽度（viewWidth）更宽，因为要保证宽高比，多出来的部分就是左右黑边
    // horizontalPadding = 单侧黑边的宽度（单位：米，在真实世界坐标系里）
    const horizontalPadding = Math.max((renderInfo.frustumWidth - renderInfo.viewWidth) / 2, 0)

    // 把真实世界的黑边宽度，按比例换算成像素坐标
    // startX = 建筑区域左边缘在画布上的像素位置
    const startX = Math.max(0, Math.floor((horizontalPadding / renderInfo.frustumWidth) * (width - 1)))
    // endX = 建筑区域右边缘在画布上的像素位置
    const endX = Math.min(width - 1, Math.ceil(((horizontalPadding + renderInfo.viewWidth) / renderInfo.frustumWidth) * (width - 1)))
    // 建筑区域的实际扫描宽度（像素数）
    const scanWidth = Math.max(endX - startX, 1)

    // 降采样，最多采5000个点
    const sampleStep = Math.max(1, Math.floor(scanWidth / 5000))

    const result: number[][] = [] // 最终的天际线数据点 [[水平距离, 高度], ...]

    // 按列扫描找天际线
    for (let x = startX; x <= endX; x += sampleStep) {// x 从建筑区域左边缘扫到右边缘，每次跳 sampleStep 列
        let isCatch = false
        for (let y = 0; y < height; y++) {// y 从上往下扫（y=0 是画布最顶部 = 最高处）
            const index = (y * width + x) * 4// 计算这个像素在一维 data 数组里的起始索引，((行号 * 画布宽) + 列号) * 4

            if (!isBuildingPixel(data, index)) {// 判断这个像素是不是建筑（不是背景黑边/透明）
                continue
            }

            // 找到了这一列最高的建筑像素
            // 水平距离：这列在建筑区域里的相对位置
            // (x - startX) / scanWidth = 这列在有效区域内的百分比 (0~1)
            const distance = ((x - startX) / scanWidth) * renderInfo.viewWidth

            // 天际线高度：y 坐标从"画布坐标系"翻转并映射为真实高度
            // height - 1 - y：因为 y=0 在画布顶部（最高），y 越大越靠下（越低）
            // 除以 (height - 1) 得到百分比，再乘以可见高度 = 真实世界高度
            // Math.min(..., renderInfo.viewHeight)：兜底，防止像素对齐误差导致略微超出
            const skylineHeight = Math.min(
                ((height - 1 - y) / Math.max(height - 1, 1)) * renderInfo.visibleHeight,
                renderInfo.viewHeight
            )

            // 存进去，保留两位小数
            result.push([Number(distance.toFixed(2)), Number(skylineHeight.toFixed(2))])
            isCatch = true
            break
        }
        if (!isCatch) {
            const distance = ((x - startX) / scanWidth) * renderInfo.viewWidth
            result.push([Number(distance.toFixed(2)), 0])
        }
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
    return red + green + blue > 80
}

const drawSkylineChart = async (skylineData: number[][]) => {
    isShowChart.value = true
    await nextTick()
    if (!chartRef.value) {
        return
    }

    chart?.dispose()
    chart = echarts.init(chartRef.value)
    chart.setOption({
        series: [{
            type: 'line',
            data: skylineData,
            smooth: false,
            showSymbol: false,
            lineStyle: {
                width: 2,
                color: '#1E88E5',
            },
            areaStyle: {
                color: 'rgba(30,136,229,0.18)',
            },
        }],
        xAxis: {
            type: 'value',
            name: '水平距离(米)',
            min: 0,
            max: elevationRenderInfo?.viewWidth,
            axisLabel: {
                formatter: (value: number) => value.toFixed(0),
            },
        },
        yAxis: {
            type: 'value',
            name: '高度(米)',
            min: 0,
            max: elevationRenderInfo?.viewHeight,
            axisLabel: {
                formatter: (value: number) => value.toFixed(0),
            },
        },
        tooltip: {
            trigger: 'axis',
            formatter: (params: any) => {
                const data = params[0].data
                return `
                    水平距离:${data[0].toFixed(2)}米<br/>
                    天际线高度:${data[1].toFixed(2)}米
                `
            },
        },
        grid: {
            left: 5,
            right: 90,
            top: 45,
            bottom: 15,
            containLabel: true,
        },
    })
}

const waitRenderFrames = (count: number) => {
    return new Promise<void>((resolve) => {
        let frameCount = 0
        const removeEvent = viewer.scene.postRender.addEventListener(() => {
            frameCount += 1
            if (frameCount >= count) {
                removeEvent()
                resolve()
            }
        })
        viewer.scene.requestRender()
    })
}

const restoreScene = () => {
    if (!sceneSnapshot) {
        return
    }

    const scene = viewer.scene
    viewer.camera.frustum = sceneSnapshot.frustum
    viewer.camera.setView({
        destination: sceneSnapshot.position,
        orientation: {
            direction: sceneSnapshot.direction,
            up: sceneSnapshot.up,
        },
    })

    scene.globe.show = sceneSnapshot.globeShow
    scene.skyBox!.show = sceneSnapshot.skyBoxShow as boolean
    scene.skyAtmosphere!.show = sceneSnapshot.skyAtmosphereShow as boolean
    scene.backgroundColor = sceneSnapshot.backgroundColor
    if (rectangleEntity && sceneSnapshot.rectangleShow !== undefined) {
        rectangleEntity.show = sceneSnapshot.rectangleShow
    }
    if (elevationClippingPlanes && !elevationClippingPlanes.isDestroyed()) {
        elevationClippingPlanes.enabled = false
    }

    sceneSnapshot = undefined
    viewer.scene.requestRender()
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

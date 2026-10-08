<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import { onBeforeUnmount } from 'vue'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import { initCesiumBase } from '@/utils/cesium'

/** 坐标轴名称，限定为 x/y/z 三轴 */
type AxisName = 'x' | 'y' | 'z'

//坐标轴配置接口
interface AxisConfig {
    name: AxisName              // 轴的名字，同时作为 Map 的 key
    color: Cesium.Color         // 轴的颜色（线、箭头、标签共用）
    label: string               // 轴末端显示的文本标签
}

//拖拽状态快照接口
interface DragState {
    axis: AxisName                      // 当前正在拖拽的轴
    axisDirection: Cesium.Cartesian3    // 该轴在世界坐标系下的单位方向向量
    plane: Cesium.Plane                 // 拖拽投影平面（始终面向相机，包含被拖拽轴）
    startMousePoint: Cesium.Cartesian3  // 拖拽开始时，鼠标射线与投影平面的交点
    startModelPosition: Cesium.Cartesian3 // 拖拽开始时模型的初始位置
}

let viewer: Cesium.Viewer
let handler: Cesium.ScreenSpaceEventHandler
let model: Cesium.Entity | undefined
let modelPosition = Cesium.Cartesian3.fromDegrees(114.40740, 30.50721, 100)
let dragState: DragState | undefined

const axisLength = 120            // 轴线直线段长度（世界坐标单位，约等于米）
const axisPickWidth = 12         // 轴线拾取宽度（像素），同时作为点击热区
const arrowLength = 18           // 箭头圆锥长度
const arrowRadius = 6            // 箭头圆锥底部半径

//三轴配置数据源
const axisConfigs: AxisConfig[] = [
    { name: 'x', color: Cesium.Color.RED, label: 'X' },
    { name: 'y', color: Cesium.Color.LIME, label: 'Y' },
    { name: 'z', color: Cesium.Color.DODGERBLUE, label: 'Z' },
]

const axisEntities = new Map<AxisName, Cesium.Entity>()// 轴线实体
const arrowEntities = new Map<AxisName, Cesium.Entity>()// 圆锥实体
const labelEntities = new Map<AxisName, Cesium.Entity>()// 标签实体 

const onMapReady = async (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer
    handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas)

    await initCesiumBase(viewer, {
        destination: { lng: 114.40740, lat: 30.50721, height: 1000 },
        orientation: { heading: 185, pitch: -30, roll: 0 },
        terrain: true,
        depthTestAgainstTerrain: true,
    })

    loadModel()    // 加载 GLB 模型
    drawAxes()    // 绘制变换坐标轴
    bindAxisDrag() // 绑定鼠标拖拽事件

    if (model) {
        viewer.zoomTo(model)
    }
}

//加载 GLB 模型
const loadModel = () => {
    model = viewer.entities.add({
        position: new Cesium.ConstantPositionProperty(modelPosition), // 固定位置属性，减小callback开销
        model: {
            uri: '/data/UAV.glb',
            scale: 10.0,
        },
    })
}

//----------------绘制坐标系--------------------//
//获取指定位置处的局部坐标系（东-北-上，ENU）
const getLocalFrame = (position: Cesium.Cartesian3) => {
    const matrix = Cesium.Transforms.eastNorthUpToFixedFrame(position)
    return {
        east: new Cesium.Cartesian3(matrix[0], matrix[1], matrix[2]),  // 第一列：东方向
        north: new Cesium.Cartesian3(matrix[4], matrix[5], matrix[6]), // 第二列：北方向
        up: new Cesium.Cartesian3(matrix[8], matrix[9], matrix[10]),   // 第三列：上方向
    }
}

//获取指定轴在世界坐标系下的单位方向向量
const getAxisDirection = (axis: AxisName, position = modelPosition) => {
    const frame = getLocalFrame(position)
    const direction = axis === 'x' ? frame.east : axis === 'y' ? frame.north : frame.up
    return Cesium.Cartesian3.normalize(direction, direction)
}


// 计算轴线末端的世界坐标（直线段终点，箭头起点）
const getAxisEndPosition = (axis: AxisName, position = modelPosition) => {
    const direction = getAxisDirection(axis, position)
    const offset = Cesium.Cartesian3.multiplyByScalar(direction, axisLength, new Cesium.Cartesian3())
    return Cesium.Cartesian3.add(position, offset, new Cesium.Cartesian3())
}

//计算箭头圆锥中心的世界坐标（位于箭头长度的中点）
const getArrowCenterPosition = (axis: AxisName, position = modelPosition) => {
    const direction = getAxisDirection(axis, position)
    const distance = axisLength + arrowLength * 0.5
    const offset = Cesium.Cartesian3.multiplyByScalar(direction, distance, new Cesium.Cartesian3())
    return Cesium.Cartesian3.add(position, offset, new Cesium.Cartesian3())
}

//计算箭头尖端（标签位置）的世界坐标

const getArrowTipPosition = (axis: AxisName, position = modelPosition) => {
    const direction = getAxisDirection(axis, position)
    const distance = axisLength + arrowLength
    const offset = Cesium.Cartesian3.multiplyByScalar(direction, distance, new Cesium.Cartesian3())
    return Cesium.Cartesian3.add(position, offset, new Cesium.Cartesian3())
}

//计算箭头圆锥的朝向四元数
/*
zAxis是正方向朝向，然后需要知道x,y轴，
先用个reference做临时向量，然后reference叉乘zAxis得到必然垂直于z的x,
然后x叉乘z，得到必然垂直于z和x的y，成功建立坐标系
*/
const getAxisOrientation = (axis: AxisName) => {
    const zAxis = getAxisDirection(axis)//朝向
    // 选择一个不与 zAxis 平行的参考向量，避免叉积为零
    const reference = Math.abs(Cesium.Cartesian3.dot(zAxis, Cesium.Cartesian3.UNIT_Z)) > 0.95//dot点击，求两向量夹角的余弦值
        ? Cesium.Cartesian3.UNIT_X
        : Cesium.Cartesian3.UNIT_Z
            ? Cesium.Cartesian3.UNIT_X
            : Cesium.Cartesian3.UNIT_Z
    // 构造正交基：xAxis = reference × zAxis, yAxis = zAxis × xAxis
    const xAxis = Cesium.Cartesian3.cross(reference, zAxis, new Cesium.Cartesian3())
    Cesium.Cartesian3.normalize(xAxis, xAxis)
    const yAxis = Cesium.Cartesian3.cross(zAxis, xAxis, new Cesium.Cartesian3())
    Cesium.Cartesian3.normalize(yAxis, yAxis)
    // 列主序矩阵转四元数
    const rotation = Cesium.Matrix3.fromColumnMajorArray([//按列主序排列的数组转换成一个 Matrix3 矩阵对象
        xAxis.x, xAxis.y, xAxis.z,
        yAxis.x, yAxis.y, yAxis.z,
        zAxis.x, zAxis.y, zAxis.z,
    ])
    return Cesium.Quaternion.fromRotationMatrix(rotation)//矩阵转四元数
}
//绘制坐标轴
const drawAxes = () => {
    axisConfigs.forEach((axisConfig) => {
        // 创建轴线
        const axis = viewer.entities.add({
            polyline: {
                positions: new Cesium.CallbackProperty(() => [
                    modelPosition,//起点
                    getAxisEndPosition(axisConfig.name),//终点
                ], false),
                width: axisPickWidth,
                material: axisConfig.color,
                arcType: Cesium.ArcType.NONE, // 直线，不沿地表弯曲
                depthFailMaterial: axisConfig.color.withAlpha(0.45), // 被地形遮挡时半透明显示
            },
        })

        // 创建箭头圆锥
        const arrow = viewer.entities.add({
            position: new Cesium.CallbackPositionProperty(() => getArrowCenterPosition(axisConfig.name), false),
            orientation: new Cesium.CallbackProperty(() => getAxisOrientation(axisConfig.name), false),
            cylinder: {
                length: arrowLength,
                topRadius: 0,       // 顶部收尖
                bottomRadius: arrowRadius,
                material: axisConfig.color,
                //outline: true,
                //outlineColor: Cesium.Color.WHITE.withAlpha(0.8),
            },
        })

        // 创建标签
        const label = viewer.entities.add({
            position: new Cesium.CallbackPositionProperty(() => getArrowTipPosition(axisConfig.name), false),
            label: {
                text: axisConfig.label,
                font: '16px sans-serif',
                fillColor: axisConfig.color,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(0, -18), // 标签在箭头尖端上方
                disableDepthTestDistance: Number.POSITIVE_INFINITY, // 始终显示，不受深度测试影响
            },
        })

        // 存入 Map 供后续拾取判断
        axisEntities.set(axisConfig.name, axis)
        arrowEntities.set(axisConfig.name, arrow)
        labelEntities.set(axisConfig.name, label)
    })
}

//----------------拖拽事件--------------------//
//判断用户点中了哪根轴
const getPickedAxis = (position: Cesium.Cartesian2) => {
    const picked = viewer.scene.pick(position)
    if (!Cesium.defined(picked) || !picked.id) return undefined

    // 先检查轴线
    for (const [axis, entity] of axisEntities) {
        if (picked.id === entity) return axis
    }
    // 再检查箭头
    for (const [axis, entity] of arrowEntities) {
        if (picked.id === entity) return axis
    }
    return undefined
}

//根据轴方向构造一个面向相机的拖拽投影平面（平面包含所选轴线）,要把鼠标的 2D 位移转换成 3D 的沿轴位移
const getDragPlane = (axisDirection: Cesium.Cartesian3) => {
    //相机在世界坐标下的单位方向向量
    const cameraDirection = Cesium.Cartesian3.normalize(viewer.camera.directionWC, new Cesium.Cartesian3())
    // 将相机方向投影到轴方向上
    /*
        相机方向 ↗
                │
                │ 投影长度 = dot(camera, axis)
                │
        轴方向 →────────────● 投影向量
    */
    let planeNormal = Cesium.Cartesian3.multiplyByScalar(
        axisDirection,//方向
        Cesium.Cartesian3.dot(cameraDirection, axisDirection),//长度
        new Cesium.Cartesian3(),
    )
    // 减去投影分量，得到垂直于轴的分量作为平面法线（任何向量 = 平行于轴的分量 + 垂直于轴的分量）
    planeNormal = Cesium.Cartesian3.subtract(cameraDirection, planeNormal, planeNormal)

    // 如果相机恰好正对轴线方向（法线接近零），改用相机 up 方向
    //magnitudeSquared向量长度的平方
    if (Cesium.Cartesian3.magnitudeSquared(planeNormal) < Cesium.Math.EPSILON6) {
        planeNormal = Cesium.Cartesian3.clone(viewer.camera.upWC, planeNormal)
    }

    Cesium.Cartesian3.normalize(planeNormal, planeNormal)
    return Cesium.Plane.fromPointNormal(modelPosition, planeNormal)//点和法线单位向量构造平面
}

//将屏幕坐标转换为一条射线，求射线与指定平面的交点s
const getMousePointOnPlane = (position: Cesium.Cartesian2, plane: Cesium.Plane) => {
    const ray = viewer.camera.getPickRay(position)
    if (!ray) return undefined
    return Cesium.IntersectionTests.rayPlane(ray, plane, new Cesium.Cartesian3())//射线于平面相交
}

// 更新模型的世界坐标位置
const updateModelPosition = (position: Cesium.Cartesian3) => {
    modelPosition = Cesium.Cartesian3.clone(position)
    if (model) {
        model.position = new Cesium.ConstantPositionProperty(modelPosition)
    }
}

// 开始拖拽：记录拖拽状态快照
const startDrag = (axis: AxisName, position: Cesium.Cartesian2) => {
    const axisDirection = getAxisDirection(axis)//方向
    const plane = getDragPlane(axisDirection)//构造鼠标拖拽平面
    const startMousePoint = getMousePointOnPlane(position, plane)
    if (!startMousePoint) return

    dragState = {
        axis,
        axisDirection,
        plane,
        startMousePoint,
        startModelPosition: Cesium.Cartesian3.clone(modelPosition),
    }
    // 拖拽时禁用相机交互，避免冲突
    viewer.scene.screenSpaceCameraController.enableRotate = false
    viewer.scene.screenSpaceCameraController.enableTranslate = false
}

//拖拽中：每帧计算模型新位置
const dragModel = (position: Cesium.Cartesian2) => {
    if (!dragState) return

    const currentMousePoint = getMousePointOnPlane(position, dragState.plane)
    if (!currentMousePoint) return

    // 计算鼠标从拖拽开始到当前帧的位移
    const mouseDelta = Cesium.Cartesian3.subtract(
        currentMousePoint,
        dragState.startMousePoint,
        new Cesium.Cartesian3(),
    )
    // 将位移投影到轴方向上，得到纯标量距离
    const moveDistance = Cesium.Cartesian3.dot(mouseDelta, dragState.axisDirection)
    // 沿轴方向构造位移向量
    const positionDelta = Cesium.Cartesian3.multiplyByScalar(
        dragState.axisDirection,
        moveDistance,
        new Cesium.Cartesian3(),
    )
    // 计算新位置
    const nextPosition = Cesium.Cartesian3.add(
        dragState.startModelPosition,
        positionDelta,
        new Cesium.Cartesian3(),
    )

    updateModelPosition(nextPosition)
}

// 结束拖拽：清空状态，恢复相机交互
const stopDrag = () => {
    dragState = undefined
    if (!viewer) return
    viewer.scene.screenSpaceCameraController.enableRotate = true
    viewer.scene.screenSpaceCameraController.enableTranslate = true
}

//绑定鼠标事件
const bindAxisDrag = () => {
    // 左键按下：判断是否点中轴，开始拖拽
    handler.setInputAction((event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        const axis = getPickedAxis(event.position)
        if (axis) {
            startDrag(axis, event.position)
        }
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN)

    // 鼠标移动：如果正在拖拽，更新模型位置
    handler.setInputAction((event: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
        dragModel(event.endPosition)
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    // 左键松开：结束拖拽
    handler.setInputAction(() => {
        stopDrag()
    }, Cesium.ScreenSpaceEventType.LEFT_UP)
}

onBeforeUnmount(() => {
    if (handler && !handler.isDestroyed()) {
        handler.destroy()
    }
    stopDrag()
})
</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady"/>
        <DraggableModal title="可视域分析（地形）">
            <div class="row">
                <el-button
                class="draw-button"
                round
                :color="drawState === 'idle' ? '#16a34a' : '#f97316'"
                :disabled="isAnalyzing"
                @click="toggleDraw"
                >
                {{ drawState === 'idle' ? '绘制视点' : '绘制目标点' }}
                </el-button>
            </div>

            <div class="row">
                <span class="label">半径</span>
                <el-input-number
                v-model="analysisRadius"
                class="input"
                :min="10"
                :max="10000"
                :step="100"
                :disabled="isAnalyzing"
                />
            </div>

            <div class="row">
                <span class="label">视场角</span>
                <el-input-number
                v-model="analysisFov"
                class="input"
                :min="10"
                :max="360"
                :step="5"
                :disabled="isAnalyzing"
                />
            </div>

            <div class="row button-row">
                <el-button class="button" color="#1E88E5" :loading="isAnalyzing" :disabled="isAnalyzing" @click="runAnalysis">
                开始分析
                </el-button>
                <el-button class="button" color="#64748B" :disabled="isAnalyzing" @click="clearAnalysis">
                清空
                </el-button>
            </div>

            <div v-if="isAnalyzing" class="analysis-loading">
                <div class="loading-spinner"></div>
                <span>分析中...</span>
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

let viewer:Cesium.Viewer
let handler:Cesium.ScreenSpaceEventHandler

const onMapReady=(cesiumViewer:Cesium.Viewer)=>{
    viewer=cesiumViewer
    handler=new Cesium.ScreenSpaceEventHandler(viewer.canvas);

    initCesiumBase(viewer,{
        destination:{lng:117.30039,lat:36.53986,height:2000},
        orientation:{heading:140,pitch:-30,roll:0},
        terrain:true,
        depthTestAgainstTerrain:true,
    })
}

type DrawState = 'idle' | 'observer' | 'target'//绘制状态?

const OBSERVER_HEIGHT_OFFSET = 1//离地高度
const OVERLAY_BLEND = 0.62//透明度
const FROZEN_VIEW_RAY_COUNT = 200//线段条数
const FROZEN_VIEW_DISTANCE_STEPS = 1000//步长
const ANALYSIS_RAY_BATCH_SIZE = 6//射线采样阶段的批处理大小
const ANALYSIS_MESH_BATCH_SIZE = 10//网格构建阶段的批处理大小

const FROZEN_RESULT_HEIGHT_OFFSET = 1.0//可视高度抬高
const VISIBILITY_ANGLE_EPSILON = Cesium.Math.toRadians(0.03)//可见误差
const HEIGHT_DROP_FILTER_MAX_SLOPE = 1.2//最大允许的自然地形下落坡度
const HEIGHT_NEIGHBOR_RECOVERY_MIN_GAIN = 0.6//常高度恢复的最小增益系数

const drawState = ref<DrawState>('idle')
const analysisRadius = ref(800)
const analysisFov = ref(60)
const isAnalyzing = ref(false)

type FrozenRaySample = {
  position: Cesium.Cartesian3
  terrainAngle: number
  visibilityValue: number
  visible: boolean
}

type FrozenMeshBuffer = {
  positions: number[]
  indices: number[]
}

const visibleColor = Cesium.Color.fromCssColorString('#16a34a') //绿色
const blockedColor = Cesium.Color.fromCssColorString('#ef4444') //红色
const observerColor = Cesium.Color.YELLOW
const targetColor = Cesium.Color.ORANGE

let analysisPrimitiveCollection: Cesium.PrimitiveCollection | undefined

let observerCartesian: Cesium.Cartesian3 | undefined
let targetCartesian: Cesium.Cartesian3 | undefined
let observerEntity: Cesium.Entity | undefined
let targetEntity: Cesium.Entity | undefined
let directionEntity: Cesium.Entity | undefined

//临时存储
const scratchFrame = new Cesium.Matrix4()
const scratchInverseFrame = new Cesium.Matrix4()
const scratchLocalTarget = new Cesium.Cartesian3()
const scratchLocalDirection = new Cesium.Cartesian3()
const scratchHeightCartographic = new Cesium.Cartographic()
const scratchObserverPosition = new Cesium.Cartesian3()
const scratchTargetPosition = new Cesium.Cartesian3()
const scratchFallbackDirection = new Cesium.Cartesian3()
const scratchFallbackOffset = new Cesium.Cartesian3()
const scratchSurfaceCartographic = new Cesium.Cartographic()
const scratchNeighborCartographic = new Cesium.Cartographic()

//切换绘制
const toggleDraw = () => {
  if (!handler) {
    return
  }

  if (drawState.value !== 'idle') {
    stopDraw()
    return
  }

  resetAnalysisArtifacts()
  drawState.value = 'observer'
  installDrawHandler()
}
//加载handler
const installDrawHandler = () => {
  handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
  handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK)

  handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
    const pickedPosition = pickScenePosition(e.position)
    if (!Cesium.defined(pickedPosition)) {
      return
    }

    if (drawState.value === 'observer') {
      setObserverPoint(pickedPosition)
      drawState.value = 'target'
      viewer.scene.requestRender()
      return
    }

    if (drawState.value === 'target') {
      setTargetPoint(pickedPosition)
      stopDraw()
      viewer.scene.requestRender()
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

  handler.setInputAction(() => {
    stopDraw()
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)
}
//采集位置
const pickScenePosition = (screenPosition: Cesium.Cartesian2) => {
  const scenePosition = viewer.scene.pickPosition(screenPosition)
  if (Cesium.defined(scenePosition)) {
    return scenePosition
  }

  const ellipsoidPosition = viewer.camera.pickEllipsoid(screenPosition, viewer.scene.globe.ellipsoid)
  if (Cesium.defined(ellipsoidPosition)) {
    return ellipsoidPosition
  }

  return undefined
}
//建立观察点
const setObserverPoint = (position: Cesium.Cartesian3) => {
  observerCartesian = liftPosition(position, OBSERVER_HEIGHT_OFFSET, scratchObserverPosition)

  if (observerEntity) {
    viewer.entities.remove(observerEntity)
  }
  observerEntity = viewer.entities.add({
    position: observerCartesian,
    point: {
      pixelSize: 9,
      color: observerColor,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 1,
    },
  })
}
//建立目标点
const setTargetPoint = (position: Cesium.Cartesian3) => {
  targetCartesian = liftPosition(position, 0.0, scratchTargetPosition)

  if (targetEntity) {
    viewer.entities.remove(targetEntity)
  }
  targetEntity = viewer.entities.add({
    position: targetCartesian,
    point: {
      pixelSize: 9,
      color: targetColor,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 1,
    },
  })

  if (directionEntity) {
    viewer.entities.remove(directionEntity)
  }
  directionEntity = viewer.entities.add({
    polyline: {
      positions: [observerCartesian as Cesium.Cartesian3, targetCartesian],
      width: 2.5,
      material: Cesium.Color.CYAN.withAlpha(0.95),
    },
  })
}
//从相机方向自动生成目标点
const setTargetPointFromCamera = (radius: number) => {
  if (!observerCartesian) {
    return
  }

  const direction = Cesium.Cartesian3.normalize(viewer.camera.directionWC, scratchFallbackDirection)
  const offset = Cesium.Cartesian3.multiplyByScalar(direction, radius, scratchFallbackOffset)
  const target = Cesium.Cartesian3.add(observerCartesian, offset, new Cesium.Cartesian3())
  setTargetPoint(target)
}
//提升位置高度
const liftPosition = (position: Cesium.Cartesian3, offset: number, result: Cesium.Cartesian3) => {
  const cartographic = Cesium.Cartographic.fromCartesian(position, undefined, scratchHeightCartographic)
  const height = (cartographic.height ?? 0.0) + offset
  return Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, height, undefined, result)
}
//停止绘制
const stopDraw = () => {
  drawState.value = 'idle'
  handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
  handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK)
}
//重置分析
const resetAnalysisArtifacts = () => {
  removeFrozenAnalysisResult()
  clearSelectionEntities()
}
//清除Entity
const clearSelectionEntities = () => {
  observerCartesian = undefined
  targetCartesian = undefined

  if (observerEntity) {
    viewer.entities.remove(observerEntity)
    observerEntity = undefined
  }
  if (targetEntity) {
    viewer.entities.remove(targetEntity)
    targetEntity = undefined
  }
  if (directionEntity) {
    viewer.entities.remove(directionEntity)
    directionEntity = undefined
  }
}
//移除分析结果
const removeFrozenAnalysisResult = () => {
  if (analysisPrimitiveCollection) {
    viewer.scene.primitives.remove(analysisPrimitiveCollection)
    analysisPrimitiveCollection = undefined
  }
}
//运行分析
const runAnalysis = async () => {
  if (isAnalyzing.value) {
    return
  }

  if (!observerCartesian) {
    ElMessage.warning('缺少观察点')
    return
  }

  isAnalyzing.value = true

  try {
    stopDraw()
    removeFrozenAnalysisResult()
    await nextTick()
    await waitForNextFrame()

    const radius = Math.max(Number(analysisRadius.value) || 0, 1)
    if (!targetCartesian) {
      setTargetPointFromCamera(radius)
    }

    if (!targetCartesian) {
      ElMessage.warning('缺少目标点')
      return
    }

    const fovDeg = Cesium.Math.clamp(Number(analysisFov.value) || 0, 5, 360)
    const headingPitch = computeHeadingPitch(observerCartesian, targetCartesian)
    await buildFrozenViewshedResult(radius, fovDeg, headingPitch.heading)
    viewer.scene.requestRender()
  } finally {
    isAnalyzing.value = false
  }
}

//让出线程
const waitForNextFrame = async () => {
  await new Promise<void>((resolve) => {//await让出进程，等待resolve回来，让浏览器做别的事情
    window.requestAnimationFrame(() => resolve())//注册回调，浏览器在下一帧前执行，唤醒async函数
  })
}

//获取给定点地形高度
const getTerrainHeight = (cartographic: Cesium.Cartographic) => {
  const height = viewer.scene.globe.getHeight(cartographic)
  return Cesium.defined(height) ? (height as number) : 0.0
}
//已知球面上一点 A（经纬度），给定方位角和距离，求球面上另一点 B 的经纬度
const getSurfaceCartographicByBearing = (
  origin: Cesium.Cartographic,
  bearing: number,
  distance: number,
  result: Cesium.Cartographic,
) => {
  const angularDistance = distance / Cesium.Ellipsoid.WGS84.maximumRadius
  const sinLat = Math.sin(origin.latitude)
  const cosLat = Math.cos(origin.latitude)
  const sinDistance = Math.sin(angularDistance)
  const cosDistance = Math.cos(angularDistance)
  const sinBearing = Math.sin(bearing)
  const cosBearing = Math.cos(bearing)

  result.latitude = Math.asin((sinLat * cosDistance) + (cosLat * sinDistance * cosBearing))
  result.longitude = origin.longitude + Math.atan2(
    sinBearing * sinDistance * cosLat,
    cosDistance - (sinLat * Math.sin(result.latitude)),
  )
  result.height = 0.0

  return result
}
//通过朝向获取目标地形高度
const getTerrainHeightByBearing = (
  origin: Cesium.Cartographic,
  bearing: number,
  distance: number,
) => getTerrainHeight(getSurfaceCartographicByBearing(origin, bearing, distance, scratchNeighborCartographic))
//采样邻居点
const getNeighborTerrainMedianHeight = (
  origin: Cesium.Cartographic,
  bearing: number,
  distance: number,
  stepLength: number,
  bearingStep: number,
) => {
  const heights: number[] = []
  const addHeight = (sampleBearing: number, sampleDistance: number) => {
    if (sampleDistance <= 0.0) {
      return
    }

    heights.push(getTerrainHeightByBearing(origin, sampleBearing, sampleDistance))
  }

  addHeight(bearing - bearingStep, distance)
  addHeight(bearing + bearingStep, distance)
  addHeight(bearing - bearingStep * 0.5, distance)
  addHeight(bearing + bearingStep * 0.5, distance)
  addHeight(bearing, distance - stepLength)
  addHeight(bearing, distance + stepLength)
  addHeight(bearing - bearingStep, distance - stepLength)
  addHeight(bearing + bearingStep, distance - stepLength)
  addHeight(bearing - bearingStep, distance + stepLength)
  addHeight(bearing + bearingStep, distance + stepLength)

  if (heights.length === 0) {
    return undefined
  }

  heights.sort((left, right) => left - right)
  return heights[Math.floor(heights.length * 0.5)]
  /*
  let res=0;
  for(let i=4;i<=9;i++)
  {
    res+=heights[i];
  }
  res/=6;
  return res
  */
}
//恢复异常高度
const recoverAnomalousTerrainHeight = (
  origin: Cesium.Cartographic,
  bearing: number,
  distance: number,
  stepLength: number,
  bearingStep: number,
  rawTerrainHeight: number,//当前高度
  previousValidTerrainHeight: number | undefined,
  previousDistance: number,
) => {
  if (previousValidTerrainHeight === undefined) {
    return rawTerrainHeight
  }

  const maxAllowedDrop = (distance - previousDistance) * HEIGHT_DROP_FILTER_MAX_SLOPE//最大允许下降，距离*最大坡度
  if (rawTerrainHeight >= previousValidTerrainHeight - maxAllowedDrop) {
    return rawTerrainHeight
  }

  const neighborTerrainHeight = getNeighborTerrainMedianHeight(origin, bearing, distance, stepLength, bearingStep)
  if (
    neighborTerrainHeight !== undefined &&
    neighborTerrainHeight-rawTerrainHeight >  maxAllowedDrop * HEIGHT_NEIGHBOR_RECOVERY_MIN_GAIN
  ) {
    return neighborTerrainHeight
  }

  return rawTerrainHeight
}
//获取点通视数据
const getVisibilitySample = (
  origin: Cesium.Cartographic,
  bearing: number,
  distance: number,
  observerHeight: number,
  horizonAngle: number,
  filteredTerrainHeight?: number,
) => {
  const cartographic = getSurfaceCartographicByBearing(origin, bearing, distance, scratchSurfaceCartographic)
  const terrainHeight = filteredTerrainHeight ?? getTerrainHeight(cartographic)
  const terrainAngle = Math.atan2(terrainHeight - observerHeight, distance)
  return {
    position: Cesium.Cartesian3.fromRadians(
      cartographic.longitude,
      cartographic.latitude,
      terrainHeight + FROZEN_RESULT_HEIGHT_OFFSET,
    ),
    terrainHeight,
    terrainAngle,
    visibilityValue: terrainAngle - horizonAngle,//地形仰角-最大仰角，>0可见，判断是否可见
    visible: terrainAngle >= horizonAngle - VISIBILITY_ANGLE_EPSILON,//地形仰角是否>=最大仰角-误差，用于求可见与不可见分界位置
  }
}
// 将三维采样点写入顶点缓冲区，并返回顶点索引（WEBGL用索引画三角网）
const addMeshPoint = (buffer: FrozenMeshBuffer, position: Cesium.Cartesian3) => {
  const index = buffer.positions.length / 3
  buffer.positions.push(position.x, position.y, position.z)
  return index
}
// 多边形三角化
const addMeshPolygon = (buffer: FrozenMeshBuffer, polygon: FrozenRaySample[]) => {
  if (polygon.length < 3) {
    return
  }

  const firstIndex = addMeshPoint(buffer, polygon[0].position)
  let previousIndex = addMeshPoint(buffer, polygon[1].position)

  for (let index = 2; index < polygon.length; index += 1) {
    const currentIndex = addMeshPoint(buffer, polygon[index].position)
    buffer.indices.push(firstIndex, previousIndex, currentIndex)
    previousIndex = currentIndex
  }
}
//边界平滑插值
const interpolateMeshSample = (
  startSample: FrozenRaySample,
  endSample: FrozenRaySample,
  threshold: number,//误差
) => {
  const denominator = endSample.visibilityValue - startSample.visibilityValue
  const ratio = Math.abs(denominator) < Cesium.Math.EPSILON7//比例位置
    ? 0.5
    : Cesium.Math.clamp((threshold - startSample.visibilityValue) / denominator, 0.0, 1.0)

  return {
    position: Cesium.Cartesian3.lerp(startSample.position, endSample.position, ratio, new Cesium.Cartesian3()),
    terrainAngle: Cesium.Math.lerp(startSample.terrainAngle, endSample.terrainAngle, ratio),
    visibilityValue: threshold,
    visible: true,
  }
}
//裁切出可见或不可见多边形，内含插值
const clipCellPolygon = (
  polygon: FrozenRaySample[],
  keepVisible: boolean,//true裁切可见域，false裁切不可见域
) => {

  const clipped: FrozenRaySample[] = []

  for (let index = 0; index < polygon.length; index += 1) {
    const current = polygon[index]
    const next = polygon[(index + 1) % polygon.length]
    const threshold=-VISIBILITY_ANGLE_EPSILON////VISIBILITY_ANGLE_EPSILON，角误差
    const currentInside = keepVisible
      ? current.visibilityValue >= threshold
      : current.visibilityValue < -VISIBILITY_ANGLE_EPSILON
    const nextInside = keepVisible
      ? next.visibilityValue >= -VISIBILITY_ANGLE_EPSILON
      : next.visibilityValue < -VISIBILITY_ANGLE_EPSILON

    if (currentInside && nextInside) {
      clipped.push(next)
    } else if (currentInside && !nextInside) {
      clipped.push(interpolateMeshSample(current, next, -VISIBILITY_ANGLE_EPSILON))
    } else if (!currentInside && nextInside) {
      clipped.push(interpolateMeshSample(current, next, -VISIBILITY_ANGLE_EPSILON), next)
    }
  }

  return clipped
}
//添加可视域三角
const addViewshedCell = (
  visibleBuffer: FrozenMeshBuffer,
  blockedBuffer: FrozenMeshBuffer,
  cell: FrozenRaySample[],
) => {
  addMeshPolygon(visibleBuffer, clipCellPolygon(cell, true))
  addMeshPolygon(blockedBuffer, clipCellPolygon(cell, false))
}
//创造primitive
const createViewshedMeshPrimitive = (
  buffer: FrozenMeshBuffer,
  color: Cesium.Color,
) => {
  if (buffer.indices.length === 0) {
    return undefined
  }

  const positions = new Float64Array(buffer.positions)//将“JS友好的动态数据”转换为“GPU友好的静态二进制数据”
  const indices = buffer.positions.length / 3 > 65535
    ? new Uint32Array(buffer.indices)
    : new Uint16Array(buffer.indices)
  const geometry = new Cesium.Geometry({
    attributes: {
      position: new Cesium.GeometryAttribute({
        componentDatatype: Cesium.ComponentDatatype.DOUBLE,//设置数据类型是double
        componentsPerAttribute: 3,//每个顶点三个分量
        values: positions,//顶点数据
      }),
    } as any,
    indices,//哪几个构成三角形（构成三角形顺序）
    primitiveType: Cesium.PrimitiveType.TRIANGLES,//画三角形
    boundingSphere: Cesium.BoundingSphere.fromVertices(positions),//只渲染可见范围
  })

  return new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry,
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(color.withAlpha(OVERLAY_BLEND)),
      },
    }),
    appearance: new Cesium.PerInstanceColorAppearance({
      flat: true,
      translucent: true,
      closed: false,
      renderState: {
        depthTest: {//禁用深度测试
          enabled: true,
        },
        depthMask: false,//禁用深度写入
        cull: {//禁用背面剔除
          enabled: false,
        },
        polygonOffset: {//偏移，削弱闪烁
          enabled: true,
          factor: -1.0,
          units: -4.0,
        },
      },
    }),
    asynchronous: false,//立即创建，asynchronous：异步
  })
}
//生成结果
const buildFrozenViewshedResult = async (radius: number, fovDeg: number, heading: number) => {
  if (!observerCartesian) {
    return
  }

  removeFrozenAnalysisResult()

  const origin = Cesium.Cartographic.fromCartesian(observerCartesian)
  const observerHeight = origin.height ?? 0.0
  const fovRad = Cesium.Math.toRadians(fovDeg)
  const rayCount = FROZEN_VIEW_RAY_COUNT
  const bearingStep = rayCount > 1 ? fovRad / (rayCount - 1) : fovRad//射线角度间隔
  const stepLength = radius / FROZEN_VIEW_DISTANCE_STEPS//每段长度
  const sampledRays: FrozenRaySample[][] = []//射线集合
  const visibleBuffer: FrozenMeshBuffer = { positions: [], indices: [] }//可视域集合
  const blockedBuffer: FrozenMeshBuffer = { positions: [], indices: [] }//不可视域集合
  const primitives = new Cesium.PrimitiveCollection()//图元集合

  for (let rayIndex = 0; rayIndex < rayCount; rayIndex += 1) {
    const rayRatio = rayIndex / (rayCount - 1)
    const bearing = (heading - (fovRad * 0.5)) + (fovRad * rayRatio)//先求出视场角左边界再加角度
    const samples: FrozenRaySample[] = []
    let maxTerrainAngle = -Number.MAX_VALUE//最大仰角
    let previousValidTerrainHeight: number | undefined//前一个点的高度
    let previousDistance = 0.0//前一个点的距离

    for (let stepIndex = 1; stepIndex <= FROZEN_VIEW_DISTANCE_STEPS; stepIndex += 1) {
      const distance = stepLength * stepIndex
      const rawSample = getVisibilitySample(origin, bearing, distance, observerHeight, maxTerrainAngle)
      const filteredTerrainHeight = recoverAnomalousTerrainHeight(
        origin,
        bearing,
        distance,
        stepLength,
        bearingStep,
        rawSample.terrainHeight,
        previousValidTerrainHeight,
        previousDistance,
      )
      const sample = filteredTerrainHeight === rawSample.terrainHeight
        ? rawSample
        : getVisibilitySample(origin, bearing, distance, observerHeight, maxTerrainAngle, filteredTerrainHeight)
      samples.push(sample)
      previousValidTerrainHeight = filteredTerrainHeight
      previousDistance = distance

      if (sample.terrainAngle > maxTerrainAngle) {
        maxTerrainAngle = sample.terrainAngle
      }
    }

    sampledRays.push(samples)

    if ((rayIndex + 1) % ANALYSIS_RAY_BATCH_SIZE === 0) {//每隔多少个让浏览器呼吸一次，执行其他操作
      await waitForNextFrame()
    }
  }

  for (let rayIndex = 0; rayIndex < sampledRays.length - 1; rayIndex += 1) {
    const currentRay = sampledRays[rayIndex]
    const nextRay = sampledRays[rayIndex + 1]
    const stepCount = Math.min(currentRay.length, nextRay.length)//理论上两者一致，防采样bug

    for (let stepIndex = 0; stepIndex < stepCount - 1; stepIndex += 1) {
      addViewshedCell(visibleBuffer, blockedBuffer, [//生成一堆可视和不可视三角形
        currentRay[stepIndex],
        nextRay[stepIndex],
        nextRay[stepIndex + 1],
        currentRay[stepIndex + 1],
      ])
    }

    if ((rayIndex + 1) % ANALYSIS_MESH_BATCH_SIZE === 0) {
      await waitForNextFrame()
    }
  }

  const visiblePrimitive = createViewshedMeshPrimitive(visibleBuffer, visibleColor)
  const blockedPrimitive = createViewshedMeshPrimitive(blockedBuffer, blockedColor)
  if (visiblePrimitive) {
    primitives.add(visiblePrimitive)
  }
  if (blockedPrimitive) {
    primitives.add(blockedPrimitive)
  }

  analysisPrimitiveCollection = viewer.scene.primitives.add(primitives) as Cesium.PrimitiveCollection
}

//计算从原点到目标的朝向和俯仰角
const computeHeadingPitch = (origin: Cesium.Cartesian3, target: Cesium.Cartesian3) => {
  const frame = Cesium.Transforms.eastNorthUpToFixedFrame(origin, undefined, scratchFrame)//世界
  const inverseFrame = Cesium.Matrix4.inverseTransformation(frame, scratchInverseFrame)//局部
  const localTarget = Cesium.Matrix4.multiplyByPoint(inverseFrame, target, scratchLocalTarget)
  if (Cesium.Cartesian3.magnitudeSquared(localTarget) < Cesium.Math.EPSILON7) {
    return {
      heading: 0.0,
      pitch: 0.0,
    }
  }

  const localDirection = Cesium.Cartesian3.normalize(localTarget, scratchLocalDirection)

  return {
    heading: Math.atan2(localDirection.x, localDirection.y),
    pitch: Math.asin(Cesium.Math.clamp(localDirection.z, -1.0, 1.0)),
  }
}

const clearAnalysis = () => {
  stopDraw()
  resetAnalysisArtifacts()
  viewer.scene.requestRender()
}
</script>
<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>
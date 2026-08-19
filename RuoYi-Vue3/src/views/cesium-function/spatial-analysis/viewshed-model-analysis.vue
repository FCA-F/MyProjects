<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady"/>
        <DraggableModal title="可视域分析（模型）">
            <div class="row">
                <el-button
                class="draw-button"
                round
                :color="drawState === 'idle' ? '#16a34a' : '#f97316'"
                @click="toggleDraw"
                >
                {{ drawState === 'idle' ? '绘制视点' : '继续绘制' }}
                </el-button>
            </div>

            <div class="row">
                <span class="label">半径</span>
                <el-input-number
                v-model="analysisRadius"
                class="input"
                :min="10"
                :max="3000"
                :step="100"
                />
            </div>

            <div class="row">
                <span class="label">视场角</span>
                <el-input-number
                v-model="analysisFov"
                class="input"
                :min="10"
                :max="160"
                :step="5"
                />
            </div>

            <div class="row">
                <el-button class="button" color="#1E88E5" @click="runAnalysis">
                开始分析
                </el-button>
                <el-button class="button" color="#64748B" @click="clearAnalysis">
                清空
                </el-button>
            </div>
        </DraggableModal>
    </div>
</template>
<script setup lang="ts">
import * as Cesium from 'cesium'
import { ElMessage } from 'element-plus';
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue';
import DraggableModal from '@/components/Common/draggable-modal.vue';
import { initCesiumBase } from '@/utils/cesium';
import '@/components/Common/draggable-modal.css'

let viewer:Cesium.Viewer
let handler:Cesium.ScreenSpaceEventHandler

type DrawState = 'idle' | 'observer' | 'target'//绘制状态?

type MutableShadowMap = Cesium.ShadowMap & {
  _shadowMapTexture?: unknown
  _shadowMapMatrix?: Cesium.Matrix4
  _lightPositionEC?: Cesium.Cartesian4
  destroy?: () => void
  isDestroyed?: () => boolean
  update?: (frameState: unknown) => void
}

const OBSERVER_HEIGHT_OFFSET = 1//离地高度
const OVERLAY_BLEND = 0.62//透明度
const resolution=5000;

const visibleColor = Cesium.Color.fromCssColorString('#16a34a') //绿色
const blockedColor = Cesium.Color.fromCssColorString('#ef4444') //红色
const observerColor = Cesium.Color.YELLOW
const targetColor = Cesium.Color.ORANGE

const createViewshedFragmentShader = () => `
uniform sampler2D colorTexture;
uniform sampler2D depthTexture;
uniform samplerCube shadowMap_textureCube;
uniform mat4 shadowMap_matrix;
uniform vec4 shadowMap_lightPositionEC;
uniform vec4 shadowMap_texelSizeDepthBiasAndNormalShadingSmooth;
uniform vec4 shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness;
uniform mat4 camera_projection_matrix;
uniform mat4 camera_view_matrix;
uniform float analysisViewDistance;
uniform vec4 visibleColor;
uniform vec4 blockedColor;
uniform float mixStrength;

in vec2 v_textureCoordinates;

vec4 toEye(in vec2 uv, in float depth)
{
    vec2 xy = vec2(uv.x * 2.0 - 1.0, uv.y * 2.0 - 1.0);//xy从（0-1）变为（-1-1）
    vec4 positionEC = vec4(xy, depth, 1.0);
    positionEC = czm_inverseProjection * positionEC;//二维->三维
    return positionEC / positionEC.w;
}

float getDepth(vec4 depthTextureValue)
{
    float depth = czm_unpackDepth(depthTextureValue);
    depth = czm_reverseLogDepth(depth);//精确远处距离
    return (2.0 * depth - czm_depthRange.near - czm_depthRange.far) / (czm_depthRange.far - czm_depthRange.near);//[-1,1]
}

bool inViewCone(vec4 positionEC)
{
    vec4 positionWC = czm_inverseView * positionEC;//主相机坐标?>世界坐标
    vec4 viewPosition = camera_view_matrix * positionWC;//世界坐标->视点坐标
    float distanceToObserver = length(viewPosition.xyz);
    if (distanceToObserver <= 0.00001 * analysisViewDistance || distanceToObserver >= analysisViewDistance) {
        return false;
    }

    vec4 projected = camera_projection_matrix * viewPosition;//视点3D->2D
    projected /= projected.w;
    return all(greaterThanEqual(projected.xyz, vec3(-1.0))) && all(lessThanEqual(projected.xyz, vec3(1.0)));
}

float sampleShadowCube(vec3 directionWC)
{
    return czm_unpackDepth(texture(shadowMap_textureCube, normalize(directionWC)));
}

float compareShadowCube(vec3 directionWC, float depth)
{
    return step(depth, sampleShadowCube(directionWC));
}

float shadow(vec4 positionEC)
{
    vec3 directionEC = positionEC.xyz - shadowMap_lightPositionEC.xyz;
    float distanceToLight = length(directionEC);
    float radius = shadowMap_lightPositionEC.w;
    if (distanceToLight > radius) {
        return 1.0;
    }

    directionEC = normalize(directionEC);
    vec3 directionWC = czm_inverseViewRotation * directionEC;
    float depth = distanceToLight / radius;
    float depthBias = shadowMap_texelSizeDepthBiasAndNormalShadingSmooth.z * max(-positionEC.z * 0.005, 1.0);
    float compareDepth = depth - depthBias;
    float filterRadius = mix(0.0002, 0.0002, clamp(distanceToLight / radius, 0.0, 1.0));//采样半径
    /*
        float texel = max(
        shadowMap_texelSizeDepthBiasAndNormalShadingSmooth.x,
        shadowMap_texelSizeDepthBiasAndNormalShadingSmooth.y
        );
        float radiusScale = clamp(radius / 1500.0, 0.7, 2.0);
        float minRadius = texel * 0.6 * radiusScale;
        float maxRadius = texel * 2.0 * radiusScale;
        float filterRadius = mix(minRadius, maxRadius, clamp(distanceToLight / radius, 0.0, 1.0));
    */
    vec3 axisA = normalize(cross(directionWC, abs(directionWC.z) < 0.9 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0)));
    vec3 axisB = normalize(cross(directionWC, axisA));

    float visibility = 0.0;
    visibility += compareShadowCube(directionWC, compareDepth) * 1.0;
    visibility += compareShadowCube(directionWC + axisA * filterRadius, compareDepth);
    visibility += compareShadowCube(directionWC - axisA * filterRadius, compareDepth);
    visibility += compareShadowCube(directionWC + axisB * filterRadius, compareDepth);
    visibility += compareShadowCube(directionWC - axisB * filterRadius, compareDepth);

    return (visibility+1.0) / 6.0;//减少噪声纹理，但会增加边界刺
}
void main()
{
    vec4 sceneColor = texture(colorTexture, v_textureCoordinates);
    float depth = getDepth(texture(depthTexture, v_textureCoordinates));
    if (depth <= 0.0) {
        out_FragColor = sceneColor;
        return;
    }

    vec4 positionEC = toEye(v_textureCoordinates, depth);//主相机空间坐标
    if (!inViewCone(positionEC)) {
        out_FragColor = sceneColor;
        return;
    }

    float visibility = shadow(positionEC);
    float classifiedVisibility;

    //自定义纹理
    if(visibility>0.3)
    classifiedVisibility=1.0;
    else if(visibility>0.4)
    classifiedVisibility=0.9;
    else if(visibility>0.3)
    classifiedVisibility=0.8;
    else
    classifiedVisibility=0.0;


    //float classifiedVisibility = smoothstep(0.1,0.5, visibility);//减少纹理噪声,但会增加边界噪声
    vec3 overlayColor = mix(blockedColor.rgb, visibleColor.rgb, classifiedVisibility);//红或绿
    out_FragColor = vec4(mix(sceneColor.rgb, overlayColor, mixStrength), sceneColor.a);
}
`

let originalShadowMap: Cesium.ShadowMap | undefined
let originalTerrainShadows: Cesium.ShadowMode | undefined
let analysisShadowMap: MutableShadowMap | undefined
let analysisLightCamera: Cesium.Camera | undefined
let analysisStage: Cesium.PostProcessStage | undefined

const drawState = ref<DrawState>('idle')
const analysisRadius = ref(1200)
const analysisFov = ref(50)

let observerCartesian: Cesium.Cartesian3 | undefined
let targetCartesian: Cesium.Cartesian3 | undefined
let observerEntity: Cesium.Entity | undefined
let targetEntity: Cesium.Entity | undefined
let directionEntity: Cesium.Entity | undefined

const scratchFrame = new Cesium.Matrix4()
const scratchInverseFrame = new Cesium.Matrix4()
const scratchLocalTarget = new Cesium.Cartesian3()
const scratchLocalDirection = new Cesium.Cartesian3()
const scratchHeightCartographic = new Cesium.Cartographic()
const scratchObserverPosition = new Cesium.Cartesian3()
const scratchTargetPosition = new Cesium.Cartesian3()
const scratchFallbackDirection = new Cesium.Cartesian3()
const scratchFallbackOffset = new Cesium.Cartesian3()

const scratchShadowTexelSizeDepthBias = new Cesium.Cartesian4()
const scratchShadowMapNormalOffsetScaleDistanceMaxDistanceAndDarkness = new Cesium.Cartesian4()

const onMapReady=(cesiumViewer:Cesium.Viewer)=>{
    viewer=cesiumViewer
    handler=new Cesium.ScreenSpaceEventHandler(viewer.canvas)
    initCesiumBase(viewer,{
        destination:{lng:117.12043,lat:36.68173,height:2000},
        orientation:{heading:140,pitch:-30,roll:0},
        terrain:true,
        osm:true,
        depthTestAgainstTerrain:true,
    })
    originalShadowMap = viewer.scene.shadowMap
    originalTerrainShadows = viewer.scene.globe.shadows
}

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

const stopDraw = () => {
  drawState.value = 'idle'
  handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
  handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK)
}

const resetAnalysisArtifacts = () => {
  removeAnalysisStage()
  restoreSceneShadowMap()
  clearSelectionEntities()
}

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

const removeAnalysisStage = () => {
  if (analysisStage) {
    viewer.scene.postProcessStages.remove(analysisStage)
    analysisStage = undefined
  }
}
//恢复场景原始阴影设置
const restoreSceneShadowMap = () => {
  const currentShadowMap = analysisShadowMap

  if (originalTerrainShadows !== undefined) {
    viewer.scene.globe.shadows = originalTerrainShadows
  }

  if (originalShadowMap) {
    ;(viewer.scene as any).shadowMap = originalShadowMap
  }

  if (currentShadowMap && currentShadowMap !== originalShadowMap && !(currentShadowMap.isDestroyed?.() ?? false)) {
    currentShadowMap.destroy?.()
  }

  analysisShadowMap = undefined
  analysisLightCamera = undefined
}
//更新分析阴影贴图
const updateAnalysisShadowMap = () => {
  const shadowMap = analysisShadowMap
  if (!shadowMap || shadowMap.isDestroyed?.()) {
    return undefined
  }

  shadowMap.update?.((viewer.scene as any)._frameState)
  return shadowMap
}
//获取阴影贴图像素大小和深度偏移参数
const getShadowTexelSizeDepthBiasAndNormalShadingSmooth = () => {
  const shadowMap = updateAnalysisShadowMap() as any
  const textureSize = shadowMap?._textureSize
  const bias = shadowMap?._pointBias ?? shadowMap?._primitiveBias ?? shadowMap?._terrainBias
  return Cesium.Cartesian4.fromElements(
    textureSize?.x ? 1.0 / textureSize.x : 1.0 / resolution,
    textureSize?.y ? 1.0 / textureSize.y : 1.0 / resolution,
    bias?.depthBias ?? 0.0,
    bias?.normalShadingSmooth ?? 0.0,
    scratchShadowTexelSizeDepthBias,
  )
}
//获取阴影法线偏移参数
const getShadowMapNormalOffsetScaleDistanceMaxDistanceAndDarkness = () => {
  const shadowMap = updateAnalysisShadowMap() as any
  const bias = shadowMap?._pointBias ?? shadowMap?._primitiveBias ?? shadowMap?._terrainBias
  return Cesium.Cartesian4.fromElements(
    bias?.normalOffsetScale ?? 0.0,
    shadowMap?._distance ?? 0.0,
    shadowMap?._maximumDistance ?? 0.0,
    shadowMap?._darkness ?? 0.0,
    scratchShadowMapNormalOffsetScaleDistanceMaxDistanceAndDarkness,
  )
}
const runAnalysis = () => {
  if (!observerCartesian) {
    ElMessage.warning('请先绘制视点')
    return
  }

  stopDraw()
  removeAnalysisStage()
  restoreSceneShadowMap()

  const radius = Math.max(Number(analysisRadius.value) || 0, 1)
  if (!targetCartesian) {
    setTargetPointFromCamera(radius)
  }

  if (!targetCartesian) {
    ElMessage.warning('缺少分析方向')
    return
  }
  // 计算朝向和俯仰角
  const fovDeg = Cesium.Math.clamp(Number(analysisFov.value) || 0, 5, 360)
  const headingPitch = computeHeadingPitch(observerCartesian, targetCartesian)
  const aspectRatio = viewer.canvas.clientWidth / Math.max(viewer.canvas.clientHeight, 1) || 1.0
  const near = Math.max(0.1, radius * 0.001)
  // 计算视锥体参数
  const baseVerticalFov = Cesium.Math.toRadians(fovDeg)
  const horizontalHalfAngle = Math.atan(Math.tan(baseVerticalFov * 0.5) * aspectRatio)
  const expandedVerticalFov = Cesium.Math.clamp(
    baseVerticalFov + Cesium.Math.toRadians(15.0),
    baseVerticalFov,
    Cesium.Math.PI - 0.01,
  )
  // 创建分析相机
  analysisLightCamera = new Cesium.Camera(viewer.scene)
  analysisLightCamera.setView({
    destination: observerCartesian,
    orientation: {
      heading: headingPitch.heading,
      pitch: headingPitch.pitch,
      roll: 0.0,
    },
  })
  // 使用离轴投影矩阵（避免边缘变形）
  analysisLightCamera.frustum = new Cesium.PerspectiveOffCenterFrustum({
    left: -near * Math.tan(horizontalHalfAngle),
    right: near * Math.tan(horizontalHalfAngle),
    bottom: -near * Math.tan(expandedVerticalFov * 0.5),
    top: near * Math.tan(expandedVerticalFov * 0.5),
    near,
    far: radius,
  })
  // 创建阴影贴图
  analysisShadowMap = new (Cesium as any).ShadowMap({
    context: (viewer.scene as any).context,
    lightCamera: analysisLightCamera,
    enabled: true,
    softShadows: true,
    normalOffset: false,
    fadingEnabled: false,
    darkness: 0.0,
    fromLightSource: false,
    isPointLight: true,
    pointLightRadius: radius,
    maximumDistance: radius,
    cascadesEnabled: false,
    size: resolution,
  }) as MutableShadowMap

  ;(viewer.scene as any).shadowMap = analysisShadowMap
  viewer.scene.globe.shadows = Cesium.ShadowMode.ENABLED
  // 添加后处理阶段
  analysisStage = viewer.scene.postProcessStages.add(new Cesium.PostProcessStage({
    name: 'viewshed-analysis-stage',
    fragmentShader: createViewshedFragmentShader(),
    uniforms: {
      shadowMap_textureCube: () => updateAnalysisShadowMap()?._shadowMapTexture,
      shadowMap_matrix: () => updateAnalysisShadowMap()?._shadowMapMatrix,
      shadowMap_lightPositionEC: () => updateAnalysisShadowMap()?._lightPositionEC,
      shadowMap_texelSizeDepthBiasAndNormalShadingSmooth: getShadowTexelSizeDepthBiasAndNormalShadingSmooth,
      shadowMap_normalOffsetScaleDistanceMaxDistanceAndDarkness: getShadowMapNormalOffsetScaleDistanceMaxDistanceAndDarkness,
      camera_projection_matrix: () => analysisLightCamera?.frustum.projectionMatrix,
      camera_view_matrix: () => analysisLightCamera?.viewMatrix,
      analysisViewDistance: radius,
      visibleColor: () => visibleColor,
      blockedColor: () => blockedColor,
      mixStrength: OVERLAY_BLEND,
    },
  })) as Cesium.PostProcessStage

  viewer.scene.requestRender()
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
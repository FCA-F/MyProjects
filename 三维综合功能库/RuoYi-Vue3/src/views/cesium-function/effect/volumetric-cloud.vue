<template>
  <div class="page-container">
    <CesiumMap @ready="onMapReady" />
    <DraggableModal title="体积云" :isMove="false">
      <div class="row">
        <el-button @click="switchCloud" class="draw-button" :color="isShow ? 'red' : 'green'">
          {{ isShow ? '清除' : '开启' }}
        </el-button>
      </div>
      <div class="row">
        <label class="label">覆盖率</label>
        <el-slider v-model.number="cloudCoverage" :min="0.25" :max="0.9" :step="0.01" show-input class="slider-input" />
      </div>
      <div class="row">
        <label class="label">密度</label>
        <el-slider v-model.number="cloudDensity" :min="0.2" :max="5" :step="0.05" show-input class="slider-input" />
      </div>
      <div class="row">
        <label class="label">强度</label>
        <el-slider v-model.number="cloudOpacity" :min="0.4" :max="6" :step="0.1" show-input class="slider-input" />
      </div>
      <div class="row">
        <label class="label">速度</label>
        <el-slider v-model.number="cloudSpeed" :min="0" :max="2.5" :step="0.05" show-input class="slider-input" />
      </div>
      <div class="row">
        <label class="label">云底(m)</label>
        <el-slider v-model.number="cloudBottomHeight" :min="500" :max="20000" :step="100" show-input class="slider-input" />
      </div>
      <div class="row">
        <label class="label">厚度(m)</label>
        <el-slider v-model.number="cloudThickness" :min="1000" :max="14000" :step="100" show-input class="slider-input" />
      </div>
      <div class="row">
        <label class="label">范围(m)</label>
        <el-slider v-model.number="cloudHalfSize" :min="20000" :max="400000" :step="5000" show-input class="slider-input" />
      </div>
      <div class="row">
        <label class="label">步长(m)</label>
        <el-slider v-model.number="cloudRayStep" :min="350" :max="1800" :step="50" show-input class="slider-input" />
      </div>
      <div class="row">
        <label class="label">调试</label>
        <el-switch v-model="debugCloud" />
      </div>
    </DraggableModal>
  </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import { initCesiumBase } from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

let viewer: Cesium.Viewer

const onMapReady = (cesiumViewer: Cesium.Viewer) => {
  viewer = cesiumViewer

  initCesiumBase(viewer, {
    destination: { lng: 117.12043, lat: 36.68173, height: 5200 },
    orientation: { heading: 140, pitch: -20, roll: 0 },
    terrain: true,
  })
}

const isShow = ref(false)//显示开关
const cloudCoverage = ref(0.72)//覆盖率
const cloudDensity = ref(3.2)//密度
const cloudOpacity = ref(4)//强度
const cloudSpeed = ref(0.45)//速度
const cloudBottomHeight = ref(9000)//云底
const cloudThickness = ref(7600)//厚度
const cloudHalfSize = ref(140000)//范围
const cloudRayStep = ref(850)//步长。步长越小精度越高、边缘越平滑，但性能消耗越大
const debugCloud = ref(false)//调试开关

let volumetricCloudStage: Cesium.PostProcessStage | undefined//后处理阶段

const cloudCenter = Cesium.Cartesian3.fromDegrees(117.12043, 36.68173, 0)//云中心点
const cloudToWorld = Cesium.Transforms.eastNorthUpToFixedFrame(cloudCenter)//云局部坐标系（矩阵），右乘它可得云世界坐标
const worldToCloud = Cesium.Matrix4.inverseTransformation(cloudToWorld, new Cesium.Matrix4())//逆云坐标系（矩阵），右乘它可得云局部坐标
const viewToCloudScratch = new Cesium.Matrix4()
const boxMinScratch = new Cesium.Cartesian3()
const boxMaxScratch = new Cesium.Cartesian3()

let previousFogEnabled = true//雾效果
let previousFogDensity = 0.0001//雾密度
let previousBrightnessShift = 0//天空亮度
let previousSaturationShift = 0//天空饱和度
let previousHueShift = 0//色相

const volumetricCloudShader = `
  uniform sampler2D colorTexture;
  uniform sampler2D depthTexture;

  uniform mat4 u_viewToCloud;//云局部矩阵
  uniform vec3 u_boxMin;//范围
  uniform vec3 u_boxMax;//范围
  uniform vec3 u_cloudLightColor;//亮色（阳面）
  uniform vec3 u_cloudMidColor;//中色（中间）
  uniform vec3 u_cloudDarkColor;//暗色（阴面，云深处）

  uniform float u_cloudCoverage;//覆盖率
  uniform float u_cloudDensity;//密度
  uniform float u_cloudOpacity;//强度
  uniform float u_cloudSpeed;//速度
  uniform float u_rayStep;//步长（精度）
  uniform float u_absorption;//视线吸收速度
  uniform float u_lightAbsorption;//阳光吸收速度
  uniform float u_edgeFade;//云盒子在水平边界处平滑淡出
  uniform float u_shapeScale;//云大小
  uniform float u_detailScale;//云细节
  uniform float u_debug;//调试

  in vec2 v_textureCoordinates;//uv

  const int CLOUD_STEPS = 32;//最多32步，决定精度与性能
  const int LIGHT_STEPS = 3;//在CLOUD_STEPS基础上光照最多采样步数

  //视线方向
  vec3 getRayDirectionEC() {
    //eyeCoordinate 相机坐标
    //gl_FragCoord.xy屏幕坐标（如512, 384）,远裁剪面（最远处），齐次坐标占位符
    vec4 eyeCoordinate = czm_windowToEyeCoordinates(vec4(gl_FragCoord.xy, 1.0, 1.0));
    vec3 eye = eyeCoordinate.xyz / max(abs(eyeCoordinate.w), 0.0001);
    return normalize(eye);
  }

  // 1/方向，提前除法，后面直接用乘法，乘法比除法快
  vec3 safeInverseDirection(vec3 direction) {
    vec3 result = direction;
    result.x = abs(result.x) < 0.0001 ? (result.x < 0.0 ? -0.0001 : 0.0001) : result.x;
    result.y = abs(result.y) < 0.0001 ? (result.y < 0.0 ? -0.0001 : 0.0001) : result.y;
    result.z = abs(result.z) < 0.0001 ? (result.z < 0.0 ? -0.0001 : 0.0001) : result.z;
    return 1.0 / result;
  }
  //返回（射线到盒子距离，射线在盒子内距离）
  vec2 rayBoxDst(vec3 boundsMin, vec3 boundsMax, vec3 rayOrigin, vec3 invRayDir) {
    //原式（最早到盒子的点原始点=视点+距离*方向）boundsMin.x=rayOrigin + t × rayDirection
    vec3 t0 = (boundsMin - rayOrigin) * invRayDir;//vec3，到Min盒子面的xyz最小距离
    vec3 t1 = (boundsMax - rayOrigin) * invRayDir;
    vec3 tmin = min(t0, t1);
    vec3 tmax = max(t0, t1);

    float dstA = max(max(tmin.x, tmin.y), tmin.z);//最大的最小距离，真正进入盒子的时刻（3个分量全在盒子内）
    float dstB = min(tmax.x, min(tmax.y, tmax.z));//最小的最大距离，离开盒子的时刻
    float dstToBox = max(0.0, dstA);//点到盒子距离，相机在盒子内为0
    float dstInsideBox = max(0.0, dstB - dstToBox);//射线盒子内距离

    return vec2(dstToBox, dstInsideBox);//（射线到盒子距离，射线在盒子内距离）
  }

    //生成完全随机的[0,1)的浮点数，但是每个坐标输出的是相同的，保证GLSL点的一致性
  float hash13(vec3 p) {
    p = fract(p * 0.1031);//随机[0,1)间的数
    p += dot(p, p.yzx + 33.33);//dot点积 → 把 x、y、z 三个分量搅在一起变成一个标量
    return fract((p.x + p.y) * p.z);//看起来完全随机的浮点数，范围 [0, 1)。
  }

  //平滑连续的 3D 噪声场（像云朵的"基础材质"）
  float noise3(vec3 p) {
    vec3 i = floor(p);// 当前点在哪个网格单元（整数索引
    vec3 f = fract(p);// 在这个单元内的局部偏移（0~1）
    f = f * f * (3.0 - 2.0 * f);//Smoothstep 曲线，把线性过渡变成 S 形平滑过渡

    //采样 8 个顶点的随机值
    float n000 = hash13(i + vec3(0.0, 0.0, 0.0));
    float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash13(i + vec3(1.0, 1.0, 1.0));

    // X 轴插值（前后两个面各做一次）
    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);
    // Y 轴插值（前后两个面混合）
    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);
    //Z混合
    return mix(nxy0, nxy1, f.z);
  }

    //把同一套 3D 噪声函数以递增的频率（+偏移）和递减的权重叠加 3 次：大尺度定轮廓（52%），中尺度加褶皱（26%），小尺度补纹理（13%)。
    //每一层故意用无理数缩放和随机偏移打破规律性，最终输出一个 0~1 的自然随机值
    float fbm(vec3 p) {
        float value = 0.0;//所有层噪声的加权和，最终返回
        float amplitude = 0.52;//当前这一层噪声对结果的贡献权重

        for (int i = 0; i < 3; i++) {
        value += noise3(p) * amplitude;
        p = p * 2.11 + vec3(17.7, 31.3, 9.2);
        amplitude *= 0.5;
        }

        return value;
    }

  //返回高度渐变数
    float heightGradient(vec3 position) {
        float height01 = clamp((position.z - u_boxMin.z) / max(u_boxMax.z - u_boxMin.z, 1.0), 0.0, 1.0);//高度归一化
        
        //X 分量：水平空间 + 时间滚动,Y 分量：纯水平空间,Z分量：固定种子
        //position.x * 0.000015把云局部空间的 X 坐标（米）缩放到噪声空间
        //czm_frameNumber* 0.00011 * u_cloudSpeed把帧数转成时间偏移量，乘以速度控制飘多快
        float weather = fbm(vec3(position.xy * 0.000015 + vec2(czm_frameNumber * 0.00011 * u_cloudSpeed, 0.0), 8.0));
        
        weather = clamp(weather * 1.2, 0.0, 1.0);//	薄的地方更薄，厚的地方更厚,对比度更强

        float bottom = mix(0.08, 0.42, weather);
        float top = mix(0.58, 0.98, weather);
        float bottomFade = smoothstep(0.0, bottom, height01);//底部淡入
        float topFade = 1.0 - smoothstep(top, 1.0, height01);//顶部淡出

        return bottomFade * topFade;
    }
  //边缘平滑，找最近的边
  float edgeFade(vec3 position) {
    float edgeX = min(position.x - u_boxMin.x, u_boxMax.x - position.x);
    float edgeY = min(position.y - u_boxMin.y, u_boxMax.y - position.y);
    return smoothstep(0.0, u_edgeFade, min(edgeX, edgeY));
  }

  //采样密度
  float sampleCloudDensity(vec3 position) {
    float vertical = heightGradient(position);//垂直包络
    float edge = edgeFade(position);//水平边缘淡出

    if (vertical <= 0.0 || edge <= 0.0) {//不在云的垂直范围内，或已经在水平边缘外 → 直接没云
      return 0.0;
    }

    float time = czm_frameNumber * 0.0022 * u_cloudSpeed;

    //shapeWind大块云朵的整体飘移，慢，主要向东，稍偏北和向上
    //detailWind云表面细节的飘移，快，主要向东×2.1，偏北×0.7，向下
    vec3 shapeWind = vec3(time, time * 0.35, time * 0.08);
    vec3 detailWind = vec3(time * 2.1, time * 0.7, -time * 0.35);

    float weather = fbm(vec3(position.xy * 0.000017 + vec2(time * 0.23, -time * 0.07), 3.6));
    float weatherMask = smoothstep(0.05, 0.82, weather + u_cloudCoverage * 0.18);

    float shape = fbm(position * u_shapeScale + shapeWind);
    float coverageThreshold = mix(0.54, 0.18, u_cloudCoverage);//覆盖率越高 → 整体天气值被推高 → 更多区域通过阈值
    float base = smoothstep(coverageThreshold, 0.9, shape + weatherMask * 0.14);//	把天气值映射成 0~1 的遮罩：低于 0.05 完全没云，高于 0.82 满云
    base *= weatherMask * vertical * edge;//水平方向上最大尺度的云分布

    float detail = fbm(position * u_detailScale + detailWind);//边缘絮状细节
    float erosion = detail * pow(1.0 - base, 2.0) * 0.08;//只侵蚀边缘
    float density = max(base - erosion, 0.0);//最终云密度 = 基础云 - 被侵蚀掉的部分

    return clamp(density * u_cloudDensity, 0.0, 2.8);
  }
    

  float remap(float value, float oldMin, float oldMax, float newMin, float newMax) {
    return newMin + (value - oldMin) * (newMax - newMin) / max(oldMax - oldMin, 0.00001);
  }

  float getSceneDistance() {
    float depth = czm_unpackDepth(texture(depthTexture, v_textureCoordinates));

    if (depth <= 0.0) {
      return 1.0e20;
    }

    vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, depth);
    vec3 eye = eyeCoordinate.xyz / max(abs(eyeCoordinate.w), 0.0001);
    return length(eye);
  }


  float hg(float a, float g) {
    float g2 = g * g;
    return (1.0 - g2) / (4.0 * 3.1415926 * pow(1.0 + g2 - 2.0 * g * a, 1.5));
  }

  float phase(float cosAngle) {
    float forward = hg(cosAngle, 0.55);
    float backward = hg(cosAngle, -0.25);
    return 0.18 + forward * 1.25 + backward * 0.35;
  }

  float lightMarch(vec3 position, vec3 sunDirection) {
    vec2 lightBox = rayBoxDst(u_boxMin, u_boxMax, position, safeInverseDirection(sunDirection));
    float lightDistance = min(lightBox.y, 18000.0);
    float lightStep = lightDistance / float(LIGHT_STEPS);
    float totalDensity = 0.0;

    for (int i = 0; i < LIGHT_STEPS; i++) {
      vec3 p = position + sunDirection * (float(i) + 0.5) * lightStep;
      totalDensity += sampleCloudDensity(p) * lightStep;
    }

    return exp(-totalDensity * u_lightAbsorption);
  }

  void main() {
    vec2 uv = v_textureCoordinates;
    vec4 sceneColor = texture(colorTexture, uv);
    vec3 sceneRgb = sceneColor.rgb;

    vec3 rayDirectionEC = getRayDirectionEC();//视线方向
    vec3 rayOriginCloud = (u_viewToCloud * vec4(0.0, 0.0, 0.0, 1.0)).xyz;//摄影机坐标*云局部坐标，摄像机在云局部 ENU 坐标系里的位置，其中w=1代表点（旋转+w平移）,w=0代表方向（旋转，不w平移）
    vec3 rayDirectionCloud = normalize((u_viewToCloud * vec4(rayDirectionEC, 0.0)).xyz);//视线在云局部空间的方向

    vec2 boxHit = rayBoxDst(u_boxMin, u_boxMax, rayOriginCloud, safeInverseDirection(rayDirectionCloud));//（射线到盒子距离，射线在盒子内距离）
    
    //盒子内射线长度小于等于0，直接return
    if (boxHit.y <= 0.0) {
      out_FragColor = vec4(sceneRgb, 1.0);
      return;
    }
    //启动测试，使用测试方法
    if (u_debug > 0.5) {
      float debugStep = max(min(boxHit.y / 16.0, 2500.0), 350.0);
      float debugDensity = 0.0;

      for (int i = 0; i < 16; i++) {
        //采样位置=原始位置+射线方向*距离（视点到盒子距离+id偏移*步长）
        vec3 samplePosition = rayOriginCloud + rayDirectionCloud * (boxHit.x + (float(i) + 0.5) * debugStep);
        debugDensity += sampleCloudDensity(samplePosition);
      }

      debugDensity = clamp(debugDensity / 16.0, 0.0, 1.0);//平均浓密程度
      vec3 hitColor = mix(vec3(0.0, 0.32, 0.9), vec3(1.0, 1.0, 1.0), debugDensity);//蓝→白热力图颜色
      out_FragColor = vec4(mix(sceneRgb, hitColor, 0.45 + debugDensity * 0.35), 1.0);
      return;
    }

    float sceneDistance = getSceneDistance();
    float dstLimit = boxHit.y;

    if (sceneDistance > boxHit.x && sceneDistance < boxHit.x + boxHit.y) {
      dstLimit = max(sceneDistance - boxHit.x, 0.0);
    }

    if (dstLimit <= 1.0) {
      out_FragColor = vec4(sceneRgb, 1.0);
      return;
    }

    vec3 sunDirectionEC = normalize((czm_view * vec4(normalize(czm_sunDirectionWC), 0.0)).xyz);
    vec3 sunDirectionCloud = normalize((u_viewToCloud * vec4(sunDirectionEC, 0.0)).xyz);

    float stepSize = u_rayStep;
    float travelled = hash13(vec3(gl_FragCoord.xy, czm_frameNumber * 0.17)) * stepSize;
    float transmittance = 1.0;
    vec3 lightEnergy = vec3(0.0);
    float cosAngle = clamp(dot(rayDirectionCloud, sunDirectionCloud), -1.0, 1.0);
    float phaseValue = phase(cosAngle);

    for (int i = 0; i < CLOUD_STEPS; i++) {
      if (travelled > dstLimit) {
        break;
      }

      vec3 samplePosition = rayOriginCloud + rayDirectionCloud * (boxHit.x + travelled);
      float density = sampleCloudDensity(samplePosition);

      if (density > 0.01) {
        float lightTransmittance = lightMarch(samplePosition, sunDirectionCloud);
        float sampleAlpha = 1.0 - exp(-density * stepSize * u_absorption * u_cloudOpacity);
        sampleAlpha = clamp(sampleAlpha, 0.0, 0.62);

        vec3 cloudColor = mix(u_cloudDarkColor, u_cloudMidColor, lightTransmittance);
        cloudColor = mix(cloudColor, u_cloudLightColor, smoothstep(0.25, 1.0, lightTransmittance) * 0.65);
        cloudColor *= 0.65 + phaseValue * 1.15;

        lightEnergy += transmittance * sampleAlpha * cloudColor;
        transmittance *= 1.0 - sampleAlpha;

        if (transmittance < 0.015) {
          break;
        }
      }

      travelled += stepSize;
    }

    float cloudAlpha = clamp(1.0 - transmittance, 0.0, 0.98);
    vec3 finalColor = sceneRgb * transmittance + lightEnergy;
    finalColor = mix(sceneRgb, finalColor, clamp(cloudAlpha * 1.45, 0.0, 1.0));
    finalColor = clamp(finalColor, 0.0, 1.0);

    out_FragColor = vec4(finalColor, 1.0);
  }
`
//获得体积云局部矩阵
const getViewToCloudMatrix = () => {
    //矩阵乘法：从右到左
    //viewer.camera.inverseViewMatrix相机坐标到世界坐标
    //worldToCloud世界坐标到云局部坐标
    return Cesium.Matrix4.multiplyTransformation(worldToCloud, viewer.camera.inverseViewMatrix, viewToCloudScratch)
}
//获得体积云范围
const getBoxMin = () => {
  boxMinScratch.x = -cloudHalfSize.value
  boxMinScratch.y = -cloudHalfSize.value
  boxMinScratch.z = cloudBottomHeight.value
  return boxMinScratch
}

const getBoxMax = () => {
  boxMaxScratch.x = cloudHalfSize.value
  boxMaxScratch.y = cloudHalfSize.value
  boxMaxScratch.z = cloudBottomHeight.value + cloudThickness.value
  return boxMaxScratch
}
//保存原始天气
const saveSceneWeatherState = () => {
  previousFogEnabled = viewer.scene.fog.enabled
  previousFogDensity = viewer.scene.fog.density

  if (viewer.scene.skyAtmosphere) {
    previousBrightnessShift = viewer.scene.skyAtmosphere.brightnessShift
    previousSaturationShift = viewer.scene.skyAtmosphere.saturationShift
    previousHueShift = viewer.scene.skyAtmosphere.hueShift
  }
}

const applyCloudWeatherState = () => {
  if (viewer.scene.skyAtmosphere) {
    viewer.scene.skyAtmosphere.brightnessShift = -0.06
    viewer.scene.skyAtmosphere.saturationShift = -0.09
    viewer.scene.skyAtmosphere.hueShift = -0.01
  }

  viewer.scene.fog.enabled = true
  viewer.scene.fog.density = 0.00012
}

const restoreSceneWeatherState = () => {
  if (viewer.scene.skyAtmosphere) {
    viewer.scene.skyAtmosphere.brightnessShift = previousBrightnessShift
    viewer.scene.skyAtmosphere.saturationShift = previousSaturationShift
    viewer.scene.skyAtmosphere.hueShift = previousHueShift
  }

  viewer.scene.fog.enabled = previousFogEnabled
  viewer.scene.fog.density = previousFogDensity
}


const addVolumetricCloud = () => {
  if (!viewer || volumetricCloudStage) return

  saveSceneWeatherState()

  volumetricCloudStage = new Cesium.PostProcessStage({
    name: 'boxVolumetricCloud',
    fragmentShader: volumetricCloudShader,
    uniforms: {
      u_viewToCloud: getViewToCloudMatrix,//体积云局部矩阵
      u_boxMin: getBoxMin,//范围
      u_boxMax: getBoxMax,//范围
      u_cloudLightColor: new Cesium.Cartesian3(1.0, 0.97, 0.9),//暖白，阳光直射部分
      u_cloudMidColor: new Cesium.Cartesian3(0.78, 0.83, 0.86),//灰蓝，中间部分
      u_cloudDarkColor: new Cesium.Cartesian3(0.42, 0.46, 0.5),//深灰蓝，深处、避光部分
      u_cloudCoverage: () => cloudCoverage.value,//覆盖率
      u_cloudDensity: () => cloudDensity.value,//密度
      u_cloudOpacity: () => cloudOpacity.value,//强度
      u_cloudSpeed: () => cloudSpeed.value,//速度
      u_rayStep: () => cloudRayStep.value,//步长
      u_absorption: 0.000035,//视线吸收速度（值越大实心感越强）
      u_lightAbsorption: 0.00001,//阳光吸收速度（值越大阳光越难穿透云）
      u_edgeFade: () => Math.min(18000, Math.max(5000, cloudHalfSize.value * 0.22)),//云盒子在水平边界处平滑淡出
      u_shapeScale: 0.000035,//控制云宏观形状（大块云朵）的大小
      u_detailScale: 0.00015,//控制云表面的高频细节
      u_debug: () => debugCloud.value ? 1.0 : 0.0//调试
    }
  })

  viewer.scene.postProcessStages.add(volumetricCloudStage)
  applyCloudWeatherState()
}

const removeVolumetricCloud = () => {
  if (volumetricCloudStage) {
    viewer.scene.postProcessStages.remove(volumetricCloudStage)
    volumetricCloudStage = undefined
  }

  if (viewer) {
    restoreSceneWeatherState()
  }
}

const switchCloud = () => {
  if (isShow.value) {
    isShow.value = false
    removeVolumetricCloud()
  } else {
    isShow.value = true
    addVolumetricCloud()
  }
}

/*
  该GLSL代码借鉴网络文献与AI
*/
</script>

<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>

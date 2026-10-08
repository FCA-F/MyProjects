<template>
  <div class="page-container">
    <CesiumMap @ready="onMapReady" />
    <DraggableModal title="GLSL体积盒" :isMove="false">
            <span class="label">长</span>
            <el-slider v-model="boxLong" :min="100" :max="5000" :step="1" show-input class="slider-input"/>
            <span class="label">宽</span>
            <el-slider v-model="boxWidth" :min="100" :max="5000" :step="1" show-input class="slider-input"/>
            <span class="label">高</span>
            <el-slider v-model="boxHeight" :min="100" :max="5000" :step="1" show-input class="slider-input"/>
    </DraggableModal>
  </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import { onBeforeUnmount } from 'vue'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import { initCesiumBase } from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

let viewer: Cesium.Viewer | undefined
let redBoxStage: Cesium.PostProcessStage | undefined

const boxCenter = Cesium.Cartesian3.fromDegrees(117.14043, 36.66173, 3000)
const boxToWorld = Cesium.Transforms.eastNorthUpToFixedFrame(boxCenter)//以boxCenter为中心的局部坐标系（矩阵）,输入局部坐标输出世界坐标
const worldToBox = Cesium.Matrix4.inverseTransformation(boxToWorld, new Cesium.Matrix4())// boxToWorld的逆矩阵, 输入世界坐标 → 输出局部坐标
const viewToBoxScratch = new Cesium.Matrix4()
const boxMinScratch = new Cesium.Cartesian3()
const boxMaxScratch = new Cesium.Cartesian3()

const boxLong=ref(1800)
const boxWidth=ref(1800)
const boxHeight=ref(1200)

const redBoxShader = `
  uniform sampler2D colorTexture;
  uniform sampler2D depthTexture;

  uniform mat4 u_viewToBox;
  uniform vec3 u_boxMin;
  uniform vec3 u_boxMax;
  uniform vec3 u_boxColor;

  in vec2 v_textureCoordinates;
    //获取视点到​远裁剪面的朝向
  vec3 getRayDirectionEC() {
    vec4 eyeCoordinate = czm_windowToEyeCoordinates(vec4(gl_FragCoord.xy, 1.0, 1.0));//相机在盒子的局部坐标
    vec3 eye = eyeCoordinate.xyz / max(abs(eyeCoordinate.w), 0.0001);//屏幕像素坐标->​远裁剪面上某个点在相机空间里的齐次坐标（单位：米）
    return normalize(eye);
  }
    //安全的算出 1.0/direction
  vec3 safeInverseDirection(vec3 direction) {
    vec3 result = direction;
    result.x = abs(result.x) < 0.0001 ? (result.x < 0.0 ? -0.0001 : 0.0001) : result.x;
    result.y = abs(result.y) < 0.0001 ? (result.y < 0.0 ? -0.0001 : 0.0001) : result.y;
    result.z = abs(result.z) < 0.0001 ? (result.z < 0.0 ? -0.0001 : 0.0001) : result.z;
    return 1.0 / result;
  }
  //（到盒子表面的距离，在盒子内穿过的深度）
  vec2 rayBoxDst(vec3 boundsMin, vec3 boundsMax, vec3 rayOrigin, vec3 invRayDir) {
    //原式（最早到盒子的点原始点=视点+距离*方向）boundsMin.x=rayOrigin + t × rayDirection
    vec3 t0 = (boundsMin - rayOrigin) * invRayDir;//vec3，到Min盒子面的xyz距离
    vec3 t1 = (boundsMax - rayOrigin) * invRayDir;
    vec3 tmin = min(t0, t1);//vec3,每个x,y,z距离的最小值，x,y,z各自最先碰到的面
    vec3 tmax = max(t0, t1);

    float dstA = max(max(tmin.x, tmin.y), tmin.z);//三个轴全部进入盒子的最早时刻
    float dstB = min(tmax.x, min(tmax.y, tmax.z));//任何一个轴先离开盒子的最晚时刻
    float dstToBox = max(0.0, dstA);// 到盒子表面的距离
    float dstInsideBox = max(0.0, dstB - dstToBox);// 在盒子内穿过的深度
    return vec2(dstToBox, dstInsideBox);//（到盒子表面的距离，在盒子内穿过的深度）
  }
    //视点到场景的距离
  float getSceneDistance() {
    float depth = czm_unpackDepth(texture(depthTexture, v_textureCoordinates));//归一化深度
    if (depth <= 0.0) {
      return 1.0e20;
    }
    vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, depth);//深度坐标
    vec3 eye = eyeCoordinate.xyz / max(abs(eyeCoordinate.w), 0.0001);
    return length(eye);//相机到点的距离
  }

  void main() {
    vec2 uv = v_textureCoordinates;
    vec4 sceneColor = texture(colorTexture, uv);

    vec3 rayDirectionEC = getRayDirectionEC();//方向
    vec3 rayOriginBox = (u_viewToBox * vec4(0.0, 0.0, 0.0, 1.0)).xyz;//相机在盒子坐标的位置，vec4为相机坐标
    //把相机空间里的射线方向，旋转到盒子空间里，并且保证它是单位长度（1米方向），这样后面算出来的穿过盒子的距离才是真实的米数
    //w=1表示点，平移会生效，w=0表示线，平移失效
    vec3 rayDirectionBox = normalize((u_viewToBox * vec4(rayDirectionEC, 0.0)).xyz);
    //（到盒子表面的距离，在盒子内穿过的深度）
    vec2 boxHit = rayBoxDst(u_boxMin, u_boxMax, rayOriginBox, safeInverseDirection(rayDirectionBox));
    if (boxHit.y <= 0.0) {
      out_FragColor = sceneColor;
      return;
    }

    float sceneDistance = getSceneDistance();//相机到场景的距离
    float dstLimit = boxHit.y;//允许染色的深度
    //如果场景在盒子内，求进入盒子到场景的深度
    if (sceneDistance > boxHit.x && sceneDistance < boxHit.x + boxHit.y) {
      dstLimit = max(sceneDistance - boxHit.x, 0.0);
    }
    //防止闪烁
    if (dstLimit <= 1.0) {
      out_FragColor = sceneColor;
      return;
    }

    out_FragColor = vec4(u_boxColor, 1.0);
  }
`

const getViewToBoxMatrix = () => {
    //camera.viewMatrix,世界 → 相机,相机为原点 (0,0,0)
    //camera.inverseViewMatrix,相机 → 世界
    //return (相机->世界,世界->盒子)matrix4矩阵转换器
    return Cesium.Matrix4.multiplyTransformation(worldToBox, viewer!.camera.inverseViewMatrix, viewToBoxScratch)
}

const getBoxMin = () => {
  boxMinScratch.x = -boxLong.value/2
  boxMinScratch.y = -boxWidth.value/2
  boxMinScratch.z = -boxHeight.value/2
  return boxMinScratch
}

const getBoxMax = () => {
  boxMaxScratch.x = boxLong.value/2
  boxMaxScratch.y = boxWidth.value/2
  boxMaxScratch.z = boxHeight.value/2
  return boxMaxScratch
}

const onMapReady = (cesiumViewer: Cesium.Viewer) => {
  viewer = cesiumViewer

  initCesiumBase(viewer, {
    destination: { lng: 117.12043, lat: 36.68173, height: 4200 },
    orientation: { heading: 140, pitch: -20, roll: 0 },

  })

  redBoxStage = new Cesium.PostProcessStage({
    name: 'redBoxStage',
    fragmentShader: redBoxShader,
    uniforms: {
      u_viewToBox: getViewToBoxMatrix,
      u_boxMin: getBoxMin,
      u_boxMax: getBoxMax,
      u_boxColor: new Cesium.Cartesian3(1.0, 0.0, 0.0),
    },
  })

  viewer.scene.postProcessStages.add(redBoxStage)
}

onBeforeUnmount(() => {
  if (viewer && redBoxStage) {
    viewer.scene.postProcessStages.remove(redBoxStage)
    redBoxStage = undefined
  }
})
</script>

<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>



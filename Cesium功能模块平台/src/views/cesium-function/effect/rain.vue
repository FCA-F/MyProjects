<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
        <DraggableModal title="雨">
            <div class="row">
                <el-button @click="switchRain" class="draw-button" :color="isShow?'red':'green'">{{ isShow?'消除':'开启' }}</el-button>
            </div>
            <div class="row">
                <label class="label">打雷</label>
                <el-switch v-model="isThunder"/>
            </div>
        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import {initCesiumBase} from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

let viewer:Cesium.Viewer
const isShow=ref(false)
const isThunder=ref(true)

let modelPosition=Cesium.Cartesian3.fromDegrees(117.12043,36.68173,2000)
let modelRadius=20000//模型半径
let modelMatrix=Cesium.Transforms.eastNorthUpToFixedFrame(modelPosition)

const onMapReady=(cesiumViewer:Cesium.Viewer)=>{
    viewer=cesiumViewer

    initCesiumBase(viewer,{
        destination:{lng:117.12043,lat:36.68173,height:2000},
        orientation:{heading:140,pitch:-30,roll:0},
        terrain:true,
        osm:true,
        depthTestAgainstTerrain:true,
        shouldAnimate:true
    })
}

const createRainImage = () => {
  const canvas = document.createElement('canvas')
  canvas.width = 70
  canvas.height = 15

  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const x = canvas.width * 0.5
  const top = 6
  const bottom = canvas.height - 6

  const glowGradient = ctx.createLinearGradient(x, top, x, bottom)
  glowGradient.addColorStop(0, 'rgba(120,225,255,0)')
  glowGradient.addColorStop(0.18, 'rgba(120,225,255,0.18)')
  glowGradient.addColorStop(0.52, 'rgba(0,195,255,0.55)')
  glowGradient.addColorStop(0.82, 'rgba(0,115,255,0.75)')
  glowGradient.addColorStop(1, 'rgba(0,80,255,0)')

  ctx.shadowColor = 'rgba(0,160,255,0.85)'//发光颜色
  ctx.shadowBlur = 10// 发光的扩散范围
  ctx.strokeStyle = glowGradient//发光的“基础形状”
  ctx.lineWidth = 12//发光的“粗细”
  ctx.lineCap = 'round'//发光的“边缘形状”
  ctx.beginPath()
  ctx.moveTo(x, top)
  ctx.lineTo(x, bottom)
  ctx.stroke()

  const coreGradient = ctx.createLinearGradient(x, top, x, bottom)
  coreGradient.addColorStop(0, 'rgba(220,250,255,0)')
  coreGradient.addColorStop(0.22, 'rgba(210,245,255,0.35)')
  coreGradient.addColorStop(0.55, 'rgba(80,210,255,0.95)')
  coreGradient.addColorStop(0.86, 'rgba(0,120,255,0.9)')
  coreGradient.addColorStop(1, 'rgba(0,90,255,0)')

  ctx.shadowBlur = 0
  ctx.strokeStyle = coreGradient
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(x, top + 12)
  ctx.lineTo(x, bottom - 8)
  ctx.stroke()

  return canvas
}
//雨
let rainParticleSystem:Cesium.ParticleSystem|null;
const addRain=()=>{
    //雨粒子下落，用于Callback
    const rainParticleFall=(particle:Cesium.Particle)=>{
        let fallCartesian=new Cesium.Cartesian3()
        //正则化，赋值向量矩阵，默认方向朝上
        Cesium.Cartesian3.normalize(
            particle.position,
            fallCartesian
        )
        //更改方向朝下，并赋予长度更新位置
        Cesium.Cartesian3.multiplyByScalar(
            fallCartesian,
            Cesium.Math.randomBetween(-5,-10),
            fallCartesian
        )
        //更改粒子位置，实现下落
        Cesium.Cartesian3.add(
            particle.position,
            fallCartesian,
            particle.position
        )
    }

    rainParticleSystem = new Cesium.ParticleSystem({
        modelMatrix,
        lifetime: 3,
        image: createRainImage(),

        minimumImageSize: new Cesium.Cartesian2(12, 80),
        maximumImageSize: new Cesium.Cartesian2(26, 150),

        startColor: Cesium.Color.fromCssColorString('#00c8ff').withAlpha(0.85),
        endColor: Cesium.Color.fromCssColorString('#0078ff').withAlpha(0.25),

        emissionRate: 1200,
        emitter: new Cesium.BoxEmitter(new Cesium.Cartesian3(modelRadius, modelRadius, 2000)),

        minimumParticleLife: 1.4,
        maximumParticleLife: 2.6,

        minimumSpeed: 8,
        maximumSpeed: 22,

        updateCallback: rainParticleFall,

        sizeInMeters: false
        })
    viewer.scene.primitives.add(rainParticleSystem)
    addRainDarkStage()
}

const removeRain=()=>{
    viewer.scene.primitives.remove(rainParticleSystem)
    removeRainDarkStage()
}

const switchRain=async ()=>{
    if(isShow.value){
        isShow.value=false
        removeRain()
    }
    else{
        isShow.value=true
        addRain()
    }
}

let rainDarkStage: Cesium.PostProcessStage | undefined

const addRainDarkStage = () => {
  viewer.scene.skyAtmosphere!.brightnessShift = -0.35//skyAtmosphere:地球边缘那圈大气散射光,brightnessShift：亮度偏移
  viewer.scene.skyAtmosphere!.saturationShift = -0.35//saturationShift：饱和度偏移
  viewer.scene.skyAtmosphere!.hueShift = -0.02//雾的浓度

  rainDarkStage = new Cesium.PostProcessStage({
    name: 'rainDarkStage',
    uniforms:{
        isThunder:isThunder.value
    },
    fragmentShader: `
      uniform sampler2D colorTexture;
      uniform bool isThunder;
      in vec2 v_textureCoordinates;

      void main() {
        vec2 uv = v_textureCoordinates;
        vec4 color = texture(colorTexture, v_textureCoordinates);

        vec3 coldDark = vec3(0.03, 0.08, 0.14);
        float topDark = smoothstep(0.55, 1.0, uv.y);
        vec3 finalColor = mix(color.rgb, coldDark, 0.30 + topDark * 0.10);

        if(isThunder&&mod(czm_frameNumber,720.0)<=10.0)
        {
            finalColor = mix(finalColor,vec3(1,1,1),0.5);
        }

        out_FragColor = vec4(finalColor, color.a);
      }
    `
  })

  viewer.scene.postProcessStages.add(rainDarkStage)

  viewer.scene.fog.enabled = true
  viewer.scene.fog.density = 0.00075
}
const removeRainDarkStage = () => {
  if (rainDarkStage) {
    viewer.scene.postProcessStages.remove(rainDarkStage)
    rainDarkStage = undefined
  }
  viewer.scene.skyAtmosphere!.brightnessShift = 0
  viewer.scene.skyAtmosphere!.saturationShift = 0
  viewer.scene.skyAtmosphere!.hueShift = 0
  viewer.scene.fog.density = 0.0001
}

watch(isThunder,(isThunder)=>{
    if (rainDarkStage) {
        viewer.scene.postProcessStages.remove(rainDarkStage)
        rainDarkStage = undefined
    }
    addRainDarkStage();
})

</script>
<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>

<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
        <DraggableModal title="雪" :isMove="false">
            <div class="row">
                <el-button @click="switchSnow" class="draw-button" :color="isShow ? 'red' : 'green'">{{ isShow ? '关闭'
                    :
                    '开始' }}</el-button>
            </div>
            <div class="row">
                <label class="label"></label>
                <el-slider v-model.number="snowAmount" :min="0" :max="1" :step="0.01" show-input class="slider-input" />
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
const isShow = ref(false)
const snowAmount = ref(0.95)

//雪发射器参数
const snowModelPosition = Cesium.Cartesian3.fromDegrees(117.12043, 36.57773, 800)
const snowModelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(snowModelPosition)
const modelRadius = 1500

//模型位置参数
const modelPosition = Cesium.Cartesian3.fromDegrees(117.12043, 36.57773, 500)
const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(modelPosition)

let DA_YAN_TA: Cesium.Cesium3DTileset | undefined
let snowParticleSystem: Cesium.ParticleSystem | undefined
let groundSnowMaterial: Cesium.Material | undefined
let modelSnowCustomShader: Cesium.CustomShader | undefined

const onMapReady = async (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer

    await initCesiumBase(viewer, {
        destination: { lng: 117.12043, lat: 36.57773, height: 600 },
        orientation: { heading: 140, pitch: -30, roll: 0 },
        terrain: true,
        requestVertexNormals: true,//地形渲染必须开启
        depthTestAgainstTerrain: true,
        shouldAnimate: true,
    })

    //加载大雁塔
    DA_YAN_TA = await Cesium.Cesium3DTileset.fromUrl("http://localhost:82/daYanTa/tileset.json")
    DA_YAN_TA.root.transform = modelMatrix
    DA_YAN_TA.maximumScreenSpaceError = 32
    viewer.scene.primitives.add(DA_YAN_TA)
    viewer.zoomTo(DA_YAN_TA)
}

const switchSnow = async () => {
    if (isShow.value) {
        isShow.value = false
        removeSnow()
    } else {
        isShow.value = true
        addSnow()
    }
}

const addSnow = () => {
    addSnowParticle()//加入雪粒子
    addGroundSnow()//加入地形雪
    addModelSnow()//加入模型雪
}
//加入雪粒子
const addSnowParticle = () => {
    const snowParticleFall = (particle: Cesium.Particle) => {
        const fallCartesian = new Cesium.Cartesian3()
        Cesium.Cartesian3.normalize(particle.position, fallCartesian)
        Cesium.Cartesian3.multiplyByScalar(
            fallCartesian,
            Cesium.Math.randomBetween(-0.3, -0.6),
            fallCartesian
        )
        Cesium.Cartesian3.add(particle.position, fallCartesian, particle.position)
    }

    snowParticleSystem = new Cesium.ParticleSystem({
        modelMatrix: snowModelMatrix,
        lifetime: 9,
        image: '/data/snow.png',
        startColor: Cesium.Color.WHITE.withAlpha(1),
        endColor: Cesium.Color.WHITE.withAlpha(1),
        imageSize: new Cesium.Cartesian2(4, 4),
        startScale: 1,
        endScale: 1,
        emissionRate: 800,
        emitter: new Cesium.BoxEmitter(new Cesium.Cartesian3(modelRadius, modelRadius, 500)),
        updateCallback: snowParticleFall,
        sizeInMeters: true,
    })
    viewer.scene.primitives.add(snowParticleSystem)
}
//加入地形雪
const addGroundSnow = () => {
    groundSnowMaterial = new Cesium.Material({
        translucent: true,//透明
        fabric: {
            type: 'GroundSnow',//名字
            uniforms: {
                snowColor: Cesium.Color.fromCssColorString('#f4fbff'),
                snowAmount: snowAmount.value,
            },
            source: `
            uniform vec4 snowColor;
            uniform float snowAmount;

            czm_material czm_getMaterial(czm_materialInput materialInput)//Cesium.Material入口
            {
                czm_material material = czm_getDefaultMaterial(materialInput);//获取默认材质，不然会没有原本地形颜色，为纯黑色
                float slopeRatio = 1.0 - smoothstep(0.3, 0.9, materialInput.slope);//平坦地方为1，陡峭地方为0，雪堆积在平坦的地方
                float snowRatio= clamp(slopeRatio * snowAmount+0.1, 0.0, 1.0);//平坦度*积雪量

                material.diffuse = snowColor.rgb;
                material.alpha = snowRatio;
                return material;
            }
        `,
        },
    })
    viewer.scene.globe.material = groundSnowMaterial

    viewer.scene.requestRender()
}
//加入模型雪
const addModelSnow = () => {
    if (!DA_YAN_TA) {
        return
    }

    modelSnowCustomShader = new Cesium.CustomShader({
        uniforms: {
            u_snowAmount: {
                type: Cesium.UniformType.FLOAT,
                value: snowAmount.value,
            },
            u_snowColor: {
                type: Cesium.UniformType.VEC4,
                value: Cesium.Color.fromCssColorString('#f2f6f8').withAlpha(1.0),
            },
        },
        fragmentShaderText: `
            void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)
            {
                vec3 positionEC = fsInput.attributes.positionEC;//相机坐标系，viewer.camera的位置
                /*
                    dFdx()：求当前像素和右边相邻像素在 x 方向上的差值。
                    dFdy()：求当前像素和上面相邻像素在 y 方向上的差值。

                    positionEC 是当前像素在相机坐标系下的 3D 位置。所以：
                    pos_dx：在屏幕上往右移动 1 个像素，3D 位置变化了多少
                    pos_dy：在屏幕上往上移动 1 个像素，3D 位置变化了多少
                    这两个向量构成了屏幕上一个像素大小的 3D 平行四边形。

                    cross（叉乘）：两个向量叉乘，会得到一个垂直于这两个向量所在平面的新向量。
                    既然 pos_dx 和 pos_dy 是沿着屏幕像素的 3D 方向，它们张成的平面就是模型表面在当前像素处的微小切面。
                    叉乘的结果就是这个切面的法线（垂直向上的方向），然后再 normalize 归一化成单位向量。
                */
                vec3 pos_dx = dFdx(positionEC);
                vec3 pos_dy = dFdy(positionEC);
                vec3 normalEC = normalize(cross(pos_dx, pos_dy));//向上的角度（斜率）
                vec3 normalWC = normalize(czm_inverseViewRotation * normalEC);//像素在世界的斜方向，Rotation为3*3矩阵，去掉了齐次坐标，没有平移分量

                vec4 positionWC = normalize(czm_inverseView * vec4(positionEC, 1.0));//像素在真实地球场景中的世界坐标
                vec3 upWC = normalize(positionWC.xyz);//世界上方向，从地心指向当前像素的方向
                
                float slope = clamp(dot(normalWC, upWC), 0.0, 1.0);//点积 dot，面方向与上方向的夹角。
                float snowMask = u_snowAmount * smoothstep(0.0, 0.5, slope);
                material.diffuse = mix(material.diffuse, u_snowColor.rgb, snowMask);
            }
        `,
    })

    DA_YAN_TA.customShader = modelSnowCustomShader
    viewer.scene.requestRender()
}

const removeSnow = () => {

    viewer.scene.primitives.remove(snowParticleSystem)
    if (DA_YAN_TA)
        DA_YAN_TA.customShader = undefined
    viewer.scene.globe.material = undefined

    snowParticleSystem = undefined
    modelSnowCustomShader = undefined
    groundSnowMaterial = undefined

    viewer.scene.requestRender()
}

watch(snowAmount, (snowAmount) => {
    if (!isShow.value) {
        return
    }

    modelSnowCustomShader!.uniforms.u_snowAmount.value = snowAmount
    groundSnowMaterial!.uniforms.snowAmount = snowAmount

    viewer.scene.requestRender()
})

onBeforeUnmount(() => {
    removeSnow()
})
</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>

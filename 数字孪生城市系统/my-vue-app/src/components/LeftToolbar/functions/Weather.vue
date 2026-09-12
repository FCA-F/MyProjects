<template>
    <div class="toolbar">
        <div class="oneText">天气</div>
        <div>
            <el-radio-group v-model="weather">
                <el-radio value="sun">晴</el-radio>
                <el-radio value="fog">雾</el-radio>
                <el-radio value="rain">雨</el-radio>
                <el-radio value="snow">雪</el-radio>
            </el-radio-group>
        </div>
    </div>
</template>
<script setup lang="ts">
import * as Cesium from 'cesium'
import { ref, onMounted, watch } from 'vue'
import { useCesiumStore } from '@/stores/cesium.ts'
import '@/components/LeftToolbar/style.css'

const cesiumStore = useCesiumStore();
const viewer = cesiumStore.viewer as Cesium.Viewer;
const viewerPosition = cesiumStore.viewerPosition;
const weather = ref('sun');

//region 雾
//片元着色器(所有像素都会运行fragmentShader)
const fragmentShader = `
    //先看全局变量和主函数

    uniform sampler2D colorTexture;  //颜色纹理
    uniform sampler2D depthTexture;  //深度纹理

    in vec2 v_textureCoordinates;    //屏幕采样点坐标（从顶点着色器传入）

    uniform vec4 fogByDistance;      //雾距离渐变(x:起始距离, y:起始透明度, z:终点距离, w:终点透明度)
    uniform vec4 fogColor;           //雾颜色

    float getDistance(sampler2D depthTexture,vec2 v_textureCoordinates)  // 获得距离
    {
        float depth=czm_unpackDepth(texture(depthTexture,v_textureCoordinates));//depth:[0,1]
        if (depth==0.0) 
        {
            return czm_infinity;
        }
        vec4 eyeCoordinate=czm_windowToEyeCoordinates(gl_FragCoord.xy, depth);//eyeCoordinate:齐次坐标:(x,y,z,w),gl_FragCoord.xy决定方向,depth决定距离
        return -eyeCoordinate.z/eyeCoordinate.w;
    }

    float getAlphaByDistance(float distance,vec4 fogByDistance)  // 获得透明度
    {
        float startDistance=fogByDistance.x;   // 雾起始距离
        float startAlpha=fogByDistance.y;      // 雾起始透明度
        float endDistance=fogByDistance.z;     // 雾终止距离
        float endAlpha=fogByDistance.w;        // 雾终止透明度
        float alpha=clamp((distance-startDistance)/(endDistance-startDistance),0.0,1.0);
        return alpha;
    }

    vec4 blendColor(float alpha,vec4 fogColor)  // 混合颜色（雾和场景）
    {
        vec4 sceneColor=texture(colorTexture,v_textureCoordinates);  // 场景颜色
        return fogColor*alpha+sceneColor*(1.0-alpha);
    }

    void main()
    {
        float distance=getDistance(depthTexture,v_textureCoordinates);  // 距离
        float alpha=getAlphaByDistance(distance,fogByDistance);         // 雾透明度
        out_FragColor=blendColor(alpha,fogColor);                       // 片元颜色（最终修改目标）
    }
`;

let fogPostProcessStage: Cesium.PostProcessStage | undefined;

const addFog = () => {
    fogPostProcessStage = new Cesium.PostProcessStage({//后生成阶段
        fragmentShader: fragmentShader,
        uniforms: {
            fogByDistance: new Cesium.Cartesian4(0, 0, 10000, 1),//x:起始距离,y:起始雾透明度,z:终点距离，w:终点透明度
            fogColor: Cesium.Color.WHITE
        }
    })
    viewer.scene.postProcessStages.add(fogPostProcessStage)
}

const removeFog = () => {
    if (Cesium.defined(fogPostProcessStage))
        viewer.scene.postProcessStages.remove(fogPostProcessStage)
}
//end region 雾

let modelRainMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(viewerPosition.x, viewerPosition.y, 2000))

let modelRadius = 20000//模型半径

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
let rainParticleSystem: Cesium.ParticleSystem | null;
const addRain = () => {
    //雨粒子下落，用于Callback
    const rainParticleFall = (particle: Cesium.Particle) => {
        let fallCartesian = new Cesium.Cartesian3()
        //正则化，赋值向量矩阵，默认方向朝上
        Cesium.Cartesian3.normalize(
            particle.position,
            fallCartesian
        )
        //更改方向朝下，并赋予长度更新位置
        Cesium.Cartesian3.multiplyByScalar(
            fallCartesian,
            Cesium.Math.randomBetween(-5, -10),
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
        modelMatrix: modelRainMatrix,
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

const removeRain = () => {
    viewer.scene.primitives.remove(rainParticleSystem)
    removeRainDarkStage()
}

let rainDarkStage: Cesium.PostProcessStage | undefined

const addRainDarkStage = () => {
    viewer.scene.skyAtmosphere!.brightnessShift = -0.35//skyAtmosphere:地球边缘那圈大气散射光,brightnessShift：亮度偏移
    viewer.scene.skyAtmosphere!.saturationShift = -0.35//saturationShift：饱和度偏移
    viewer.scene.skyAtmosphere!.hueShift = -0.02//雾的浓度

    rainDarkStage = new Cesium.PostProcessStage({
        name: 'rainDarkStage',
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

        if(mod(czm_frameNumber,720.0)<=10.0)
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

////雪
let snowParticleSystem: Cesium.ParticleSystem | null;
let modelSnowMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(viewerPosition.x, viewerPosition.y, 1000))
const addSnow = () => {

    //雪粒子

    //雪粒子下落，用于Callback
    const snowParticleFall = (particle: Cesium.Particle) => {
        let fallCartesian = new Cesium.Cartesian3()
        //正则化，赋值向量矩阵，默认方向朝上
        Cesium.Cartesian3.normalize(
            particle.position,
            fallCartesian
        )
        //更改方向朝下，并赋予长度更新位置
        Cesium.Cartesian3.multiplyByScalar(
            fallCartesian,
            Cesium.Math.randomBetween(-1, -3),
            fallCartesian
        )
        //更改粒子位置，实现下落
        Cesium.Cartesian3.add(
            particle.position,
            fallCartesian,
            particle.position
        )
    }

    snowParticleSystem = new Cesium.ParticleSystem({
        modelMatrix: modelSnowMatrix,
        lifetime: 9,

        image: '/data/snow.png',
        startColor: Cesium.Color.WHITE.withAlpha(1),
        endColor: Cesium.Color.WHITE.withAlpha(1),
        imageSize: new Cesium.Cartesian2(25, 25),
        startScale: 1,
        endScale: 1,
        //maximumImageSize:new Cesium.Cartesian2(0.2,0.2),

        emissionRate: 1000,
        emitter: new Cesium.BoxEmitter(new Cesium.Cartesian3(modelRadius, modelRadius, 500)),

        updateCallback: snowParticleFall,
        sizeInMeters: true,
    })
    viewer.scene.primitives.add(snowParticleSystem)

    //地形
    const groundSnowMaterial = new Cesium.Material({
        translucent: true,//透明
        fabric: {
            type: 'GroundSnow',//名字
            uniforms: {
                snowColor: Cesium.Color.fromCssColorString('#f4fbff'),
                snowAmount: 0.85,
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

const removeSnow = () => {
    viewer.scene.primitives.remove(snowParticleSystem)
    viewer.scene.globe.material = undefined
}

onMounted(() => {

})

watch(weather, (weather) => {
    switch (weather) {
        case 'sun':
            viewer.clock.shouldAnimate = false
            removeFog()
            removeRain()
            removeSnow()
            break;
        case 'fog':
            viewer.clock.shouldAnimate = true
            addFog()
            removeRain()
            removeSnow()
            break;
        case 'rain':
            viewer.clock.shouldAnimate = true
            removeFog()
            addRain()
            removeSnow()
            break;
        case 'snow':
            viewer.clock.shouldAnimate = true
            removeFog()
            removeRain()
            addSnow()
            break;
        default: break;
    }
})

</script>

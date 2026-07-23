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
import {ref,onMounted,watch} from 'vue'
import {useCesiumStore} from '@/stores/cesium.ts'

const cesiumStore=useCesiumStore();
const viewer=cesiumStore.viewer as Cesium.Viewer;
const viewerPosition=cesiumStore.viewerPosition;
const weather=ref('sun');

//region 雾
//片元着色器(所有像素都会运行fragmentShader)
const fragmentShader=`
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

let fogPostProcessStage:Cesium.PostProcessStage|undefined;

const addFog=()=>{
    fogPostProcessStage=new Cesium.PostProcessStage({//后生成阶段
        fragmentShader:fragmentShader,
        uniforms:{
            fogByDistance:new Cesium.Cartesian4(0,0,10000,1),//x:起始距离,y:起始雾透明度,z:终点距离，w:终点透明度
            fogColor:Cesium.Color.WHITE
        }
    })
    viewer.scene.postProcessStages.add(fogPostProcessStage)
}

const removeFog=()=>{
    if(Cesium.defined(fogPostProcessStage))
    viewer.scene.postProcessStages.remove(fogPostProcessStage)
}
//end region 雾

let modelPosition=Cesium.Cartesian3.fromDegrees(viewerPosition.x,viewerPosition.y,2000)//模型位置
let modelMatrix=Cesium.Transforms.eastNorthUpToFixedFrame(modelPosition)

let modelRadius=20000//模型半径

////雨
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
            Cesium.Math.randomBetween(-20,-80),
            fallCartesian
        )
        //更改粒子位置，实现下落
        Cesium.Cartesian3.add(
            particle.position,
            fallCartesian,
            particle.position
        )
    }

    rainParticleSystem=new Cesium.ParticleSystem({
        modelMatrix:modelMatrix,
        lifetime:3,

        image:'/data/rain.png',
        imageSize:new Cesium.Cartesian2(1000,300),
        startColor:Cesium.Color.WHITE.withAlpha(0.5),
        endColor:Cesium.Color.WHITE.withAlpha(1),

        emissionRate:2000,
        emitter:new Cesium.BoxEmitter(new Cesium.Cartesian3(modelRadius,modelRadius,500)),
        
        updateCallback:rainParticleFall,
        sizeInMeters:true,
    })
    viewer.scene.primitives.add(rainParticleSystem)
}

const removeRain=()=>{
    viewer.scene.primitives.remove(rainParticleSystem)
}

////雪
let snowParticleSystem:Cesium.ParticleSystem|null;
const addSnow=()=>{
    //雪粒子下落，用于Callback
    const snowParticleFall=(particle:Cesium.Particle)=>{
        let fallCartesian=new Cesium.Cartesian3()
        //正则化，赋值向量矩阵，默认方向朝上
        Cesium.Cartesian3.normalize(
            particle.position,
            fallCartesian
        )
        //更改方向朝下，并赋予长度更新位置
        Cesium.Cartesian3.multiplyByScalar(
            fallCartesian,
            Cesium.Math.randomBetween(-1,-3),
            fallCartesian
        )
        //更改粒子位置，实现下落
        Cesium.Cartesian3.add(
            particle.position,
            fallCartesian,
            particle.position
        )
    }

    snowParticleSystem=new Cesium.ParticleSystem({
        modelMatrix:modelMatrix,
        lifetime:9,

        image:'/data/snow.png',
        startColor:Cesium.Color.WHITE.withAlpha(1),
        endColor:Cesium.Color.WHITE.withAlpha(1),
        imageSize:new Cesium.Cartesian2(25,25),
        startScale:1,
        endScale:1,
        //maximumImageSize:new Cesium.Cartesian2(0.2,0.2),

        emissionRate:1000,
        emitter:new Cesium.BoxEmitter(new Cesium.Cartesian3(modelRadius,modelRadius,500)),

        updateCallback:snowParticleFall,
        sizeInMeters:true,
    })
    viewer.scene.primitives.add(snowParticleSystem)
}

const removeSnow=()=>{
    viewer.scene.primitives.remove(snowParticleSystem)
}

onMounted(()=>{
    
})

watch(weather,(weather)=>{
    switch(weather){
        case 'sun':
            viewer.clock.shouldAnimate=false
            removeFog()
            removeRain()
            removeSnow()
            break;
        case 'fog':
            viewer.clock.shouldAnimate=true
            addFog()
            removeRain()
            removeSnow()
            break;
        case 'rain':
            viewer.clock.shouldAnimate=true
            removeFog()
            addRain()
            removeSnow()
            break;
        case 'snow':
            viewer.clock.shouldAnimate=true
            removeFog()
            removeRain()
            addSnow()
            break;
        default:break;
    }
})

</script>

<style scoped>
.toolbar {
  display: flex;
  flex-direction: column;
  gap:6px;
}

.oneText{text-align:center;
  font-size:20px;
  font-weight:600;
  color:#45a0eb; 
  margin-bottom:8px;
}
</style>
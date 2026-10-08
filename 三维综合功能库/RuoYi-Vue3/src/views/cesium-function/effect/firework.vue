<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
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
        destination: { lng: 114.40740, lat: 30.50721, height: 1000 },
        terrain: true,
        shouldAnimate: true
    })

    createManyFirework()
}
//绘制粒子//
const particleCanvas = document.createElement('canvas');
particleCanvas.width = 20;
particleCanvas.height = 20;
const context2D = particleCanvas.getContext('2d');
//绘制图案（圆）
context2D!.beginPath();
context2D!.arc(10, 10, 8, 0, Cesium.Math.TWO_PI, true);
context2D!.closePath();
//填充颜色
context2D!.fillStyle = 'rgba(255,255,255,1)';
context2D!.fill();

const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(114.40740, 30.50721));//总根矩阵
const emitterInitialLocation = new Cesium.Cartesian3(0, 0, 200);//发射位置

const particlePixel = new Cesium.Cartesian2(7, 7);//粒子大小
const particleNum = 400;//粒子个数(单个烟花)
const particleNumOffset = 200;//粒子个数偏移量

const FireworkNum = 20;//烟花个数
const lifeTime = 10;//烟花存在时间s
const burstNum = 3;//单个烟花爆炸次数

//偏移范围
const xMin = -100;
const xMax = 100;
const yMin = -100;
const yMax = 100;
const zMin = -50;
const zMax = 50;

//颜色选项
const colorOptions = [
    {
        minimumRed: 0.8,
        minimumGreen: 0.8,
        minimumBlue: 0.8,
        alpha: 1
    },
    {
        minimumRed: 0,
        minimumGreen: 0.8,
        minimumBlue: 0.8,
        alpha: 1
    },
    {
        minimumRed: 0.8,
        minimumGreen: 0,
        minimumBlue: 0.8,
        alpha: 1
    },
    {
        minimumRed: 0.8,
        minimumGreen: 0.8,
        minimumBlue: 0,
        alpha: 1
    },
]

const createManyFirework = () => {
    //循环创建烟花
    for (let i = 0; i < FireworkNum; i++) {
        //随机偏移
        let xOffset = Cesium.Math.randomBetween(xMin, xMax);
        let yOffset = Cesium.Math.randomBetween(yMin, yMax);
        let zOffset = Cesium.Math.randomBetween(zMin, zMax);
        let offset = new Cesium.Cartesian3(xOffset, yOffset, zOffset);
        let position = Cesium.Cartesian3.add(
            emitterInitialLocation,
            offset,
            new Cesium.Cartesian3()
        )
        //随机颜色
        let colorIndex = Math.floor(Cesium.Math.randomBetween(0, colorOptions.length - 1))//颜色索引
        let color = Cesium.Color.fromRandom(colorOptions[colorIndex])
        //多次爆炸
        let bursts = [];
        for (let j = 0; j < burstNum; j++) {
            bursts.push(
                new Cesium.ParticleBurst({
                    time: Cesium.Math.nextRandomNumber() * lifeTime,//（0-1）*烟花生命
                    minimum: particleNum - particleNumOffset,
                    maximum: particleNum + particleNumOffset
                })
            )
        }
        //创建单个烟花
        createOneFirework(position, color, bursts)
    }
}

//创建单个烟花
const createOneFirework = (position: Cesium.Cartesian3, color: Cesium.Color, bursts: Cesium.ParticleBurst[]) => {
    const emitterModelMatrix = Cesium.Matrix4.fromTranslation(position);
    viewer.scene.primitives.add(new Cesium.ParticleSystem({
        //矩阵
        modelMatrix: modelMatrix,//根矩阵
        emitterModelMatrix: emitterModelMatrix,//发射矩阵（发射位置结合根矩阵与发射矩阵）
        //生命
        lifetime: lifeTime,//生命时间
        bursts: bursts,//多次爆炸
        particleLife: 1,//生命周期
        //粒子
        image: particleCanvas,//粒子贴图
        startColor: color,//起始颜色
        endColor: color,//结束颜色
        imageSize: particlePixel,//粒子大小
        speed: 100,//扩散速度
        //形式
        emitter: new Cesium.SphereEmitter(0.1),
        loop: true
    }))
}

</script>
<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>

<template>
    <div class="page-container">
        <div ref="container"></div>
        <div v-if="!started" class="tip" @click="startAudio">
            点击页面开启声音
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import * as THREE from 'three'
import { initThree } from '@/utils/three';
//@ts-ignore
import { Text as TroikaText } from 'troika-three-text';

const container = ref<HTMLDivElement>()
const started = ref(false)

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let listener: THREE.AudioListener

let leftSound: THREE.PositionalAudio
let rightSound: THREE.PositionalAudio

onMounted(async () => {
    const initResult = initThree(container.value!, { position: { x: 0, y: 1, z: 15 }, targetPosition: { x: 0, y: 1, z: 0 } })
    scene = initResult.scene
    camera = initResult.camera

    listener = new THREE.AudioListener()
    camera.add(listener)

    addLeftAudio()
    addRightAudio()
    addText()

    const background = await new THREE.TextureLoader().loadAsync('/three-data/picture/wood2.jpg')
    background.colorSpace = THREE.SRGBColorSpace
    scene.background = background

})

//左边音频
const addLeftAudio = async () => {
    const geo = new THREE.BoxGeometry(1, 1, 1)
    const mat = new THREE.MeshPhongMaterial({ color: 0x0088ff })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(-5, 0, 0)
    scene.add(mesh)

    const loader = new THREE.AudioLoader()
    const music = await loader.loadAsync('/three-data/love.mp3')
    leftSound = new THREE.PositionalAudio(listener)
    leftSound.setBuffer(music)//音频对象
    leftSound.setRefDistance(2)//从这个距离开始，声音开始衰减
    leftSound.setRolloffFactor(2)//衰减速度
    leftSound.setLoop(true)//循环
    leftSound.setVolume(1.0)//声音源的基础音量
    mesh.add(leftSound)
}

//右边音频
const addRightAudio = async () => {
    const geo = new THREE.BoxGeometry(1, 1, 1)
    const mat = new THREE.MeshPhongMaterial({ color: 0xff0044 })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(5, 0, 0)
    scene.add(mesh)

    const loader = new THREE.AudioLoader()
    const music = await loader.loadAsync('/three-data/tree.mp3')
    rightSound = new THREE.PositionalAudio(listener)
    rightSound.setBuffer(music)
    rightSound.setRefDistance(2)
    rightSound.setRolloffFactor(2)
    rightSound.setLoop(true)
    rightSound.setVolume(1.0)
    mesh.add(rightSound)
}

//点击后播放
const startAudio = () => {
    if (started.value) return

    // 解冻声音
    if (listener.context.state === 'suspended') {
        listener.context.resume()
    }

    // 左边播放
    if (leftSound) {
        leftSound.play()
    }

    // 右边播放
    if (rightSound) {
        rightSound.play()
    }

    started.value = true
}

const addText = () => {
    // 左边文字 - 声源1号
    const leftText = new TroikaText()
    leftText.text = '声源1号'
    leftText.color = 'blue'
    leftText.fontSize = 1.2
    leftText.anchorX = 'center'
    leftText.anchorY = 'bottom'
    leftText.position.set(-5, 1.2, 0)  // 盒子上方
    leftText.castShadow = true
    leftText.sync()
    scene.add(leftText)

    // 右边文字 - 声源2号
    const rightText = new TroikaText()
    rightText.text = '声源2号'
    rightText.color = 'red'
    rightText.fontSize = 1.2
    rightText.anchorX = 'center'
    rightText.anchorY = 'bottom'
    rightText.position.set(5, 1.2, 0)  // 盒子上方
    rightText.castShadow = true
    rightText.sync()
    scene.add(rightText)

    const centerText = new TroikaText()
    centerText.text = '靠近声源声音越大'
    centerText.color = 'black'
    centerText.fontSize = 1.2
    centerText.anchorX = 'center'
    centerText.anchorY = 'bottom'
    centerText.position.set(0, 4, 0)  // 盒子上方
    centerText.castShadow = true
    centerText.sync()
    scene.add(centerText)
}

onUnmounted(() => {
    leftSound.stop()
    leftSound.disconnect() //断开与 AudioContext 的连接
    leftSound.dispose()
    rightSound.stop()
    rightSound.disconnect()
    rightSound.dispose()
})
</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
    position: relative;
}

.tip {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 20px;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    cursor: pointer;
    border-radius: 4px;
    z-index: 100;
}
</style>
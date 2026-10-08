<template>
    <div class="page-container">
        <div ref="container"></div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import * as THREE from 'three'
import { initThree } from '@/utils/three';
import TWEEN, { Tween } from 'three/addons/libs/tween.module.js';

const container = ref<HTMLDivElement>()
let scene: THREE.Scene
let mesh: THREE.Mesh
let tweenData: { scale: number }

onMounted(() => {
    const initResult = initThree(container.value!, {
        position: { x: 0, y: 0, z: 10 }
    })
    scene = initResult.scene
    addMesh()
    addTween()
    animate()
})

const addMesh = () => {
    const geo = new THREE.SphereGeometry(3, 128, 128)
    const mat = new THREE.MeshStandardMaterial({ color: 'blue' })
    mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)
}

const addTween = () => {
    tweenData = { scale: 1 }
    new TWEEN.Tween(tweenData)//数据
        .to({ scale: 0 }, 10000)//变换，时间
        .yoyo(true)//往返
        .repeat(Infinity)//重复
        .easing(TWEEN.Easing.Bounce.InOut)//弹跳
        .start()//开始
}

const animate = () => {
    requestAnimationFrame(animate)

    TWEEN.update()

    mesh.scale.setScalar(tweenData.scale)
}

</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
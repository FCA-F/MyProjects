<template>
    <div class="page-container">
        <div ref="container"></div>
        <video id="myVideo" ref="videoElement" muted="true" autoplay="true" loop="true" style="display:none">
            <source src="/three-data/video.mp4" type="video/mp4">
        </video>
    </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import * as THREE from 'three'
import { initThree } from '@/utils/three';
import '@/components/Common/draggable-modal.css'

const container = ref<HTMLDivElement>()
let scene: THREE.Scene
let model: THREE.Group

const videoElement = ref<HTMLVideoElement>()

onMounted(async () => {
    const initResult = initThree(container.value!, { position: { x: 2, y: 0, z: 5 }, })
    scene = initResult.scene
    addMesh()
})


const addMesh = () => {
    videoElement.value?.play()
    const texture = new THREE.VideoTexture(videoElement.value)

    const geo = new THREE.BoxGeometry(2.5, 2.5, 2.5)
    const mat = new THREE.MeshStandardMaterial({
        map: texture
    })
    const mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)
}

</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
<template>
    <div class="page-container">
        <div ref="container"></div>
    </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import * as THREE from 'three'
import { initThree } from '@/utils/three';
import draggableModal from '@/components/Common/draggable-modal.vue';
import '@/components/Common/draggable-modal.css'
import { GLTFLoader, VOXLoader, VOXMesh } from 'three/examples/jsm/Addons.js';

const container = ref<HTMLDivElement>()
let scene: THREE.Scene


onMounted(() => {
    const initResult = initThree(container.value!, { position: { x: 0, y: 0, z: 100 }, initDirectionalLight: false })
    scene = initResult.scene
    addDirectionalLight()
    loadVox()
})

const loadVox = async () => {
    const loader = new VOXLoader()
    const voxData = await loader.loadAsync('/three-data/model/vox/biome.vox')
    const group = new THREE.Group()
    for (let i = 0; i < voxData.chunks.length; i++) {
        const mesh = new VOXMesh(voxData.chunks[i])
        mesh.castShadow = true
        mesh.receiveShadow = true
        group.add(mesh)
    }
    scene.add(group)
}
const addDirectionalLight = () => {
    const directionalLight = new THREE.DirectionalLight('#ffffff', 1.0)
    directionalLight.position.set(5, 12, 8)
    directionalLight.castShadow = true
    directionalLight.shadow.camera.left = -100
    directionalLight.shadow.camera.right = 100
    directionalLight.shadow.camera.top = 100
    directionalLight.shadow.camera.bottom = -100
    directionalLight.shadow.camera.near = 1
    directionalLight.shadow.camera.far = 100
    directionalLight.shadow.mapSize.set(2048, 2048)
    directionalLight.shadow.bias = -0.0001
    directionalLight.shadow.normalBias = 0.02
    scene.add(directionalLight)
}

</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>

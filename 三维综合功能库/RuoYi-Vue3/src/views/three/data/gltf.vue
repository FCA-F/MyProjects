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
import { GLTFLoader } from 'three/examples/jsm/Addons.js';

const container = ref<HTMLDivElement>()
let scene: THREE.Scene


onMounted(() => {
    const initResult = initThree(container.value!, { position: { x: 0, y: 5, z: 20 } })
    scene = initResult.scene
    loadModel()
})

const loadModel = async () => {
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync('/three-data/model/waterfall/scene.gltf')
    gltf.scene.traverse((object) => {//遍历实例
        if (object instanceof THREE.Mesh) {
            object.castShadow = true
            object.receiveShadow = true
            object.material.depthWrite = true
        }
    })

    scene.add(gltf.scene)
}
</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>

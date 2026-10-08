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
import { PLYLoader } from 'three/examples/jsm/Addons.js';

const container = ref<HTMLDivElement>()
let scene: THREE.Scene


onMounted(() => {
    const initResult = initThree(container.value!, { position: { x: 0, y: 0, z: 15 } })
    scene = initResult.scene
    loadPoints()
})

const loadPoints = async () => {
    const loader = new PLYLoader()
    const ply = await loader.loadAsync('/three-data/model/carcloud.ply')
    const mat = new THREE.PointsMaterial({ color: 'red', size: 0.1 })
    const points = new THREE.Points(ply, mat)
    scene.add(points)
}

</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
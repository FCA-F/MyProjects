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

const container = ref<HTMLDivElement>()
let scene: THREE.Scene


onMounted(() => {
    const initResult = initThree(container.value!, { position: { x: 0, y: 0, z: 3 } })
    scene = initResult.scene

    addPoints()
})

const addPoints = () => {


    const geo = new THREE.TorusKnotGeometry(0.5, 0.2, 100, 100)//半径，管子粗细，管状分段数，径向分段数
    const mat = new THREE.PointsMaterial({
        color: 'red',
        size: 0.01
    })
    const points = new THREE.Points(geo, mat)
    scene.add(points)
}

</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
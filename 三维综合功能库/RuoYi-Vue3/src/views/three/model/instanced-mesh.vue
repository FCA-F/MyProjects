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
import { T } from 'vue-router/dist/router-CWoNjPRp.mjs';

const container = ref<HTMLDivElement>()
let scene: THREE.Scene

let mesh: THREE.InstancedMesh

onMounted(() => {
    const initResult = initThree(container.value!, { position: { x: 0, y: 0, z: 300 } })
    scene = initResult.scene
    //scene.background = new THREE.Color('black')

    addInstancedMesh()
})

const addInstancedMesh = () => {
    const amount = 500000
    const mat = new THREE.MeshStandardMaterial({
        color: 'yellow'
    })
    const geo = new THREE.BoxGeometry(1, 1, 1)
    mesh = new THREE.InstancedMesh(geo, mat, amount)
    for (let i = 0; i < amount; i++) {
        const x = Math.random() * 200 - 100
        const y = Math.random() * 200 - 100
        const z = Math.random() * 200 - 100
        const matrix = new THREE.Matrix4()
        matrix.makeTranslation(x, y, z)
        mesh.setMatrixAt(i, matrix)
    }
    scene.add(mesh)
}

onBeforeUnmount(() => {
    scene.remove(mesh);
    mesh.dispose()
});
</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
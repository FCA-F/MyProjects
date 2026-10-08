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
import { BufferGeometryUtils } from 'three/examples/jsm/Addons.js';

const container = ref<HTMLDivElement>()
let scene: THREE.Scene

let mesh: THREE.Mesh

onMounted(() => {
    const initResult = initThree(container.value!, { position: { x: 0, y: 0, z: 250 } })
    scene = initResult.scene

    addMergeMesh()
})

const addMergeMesh = () => {
    const amount = 250000
    const geos = []
    const mat = new THREE.MeshStandardMaterial({
        color: 'yellow'
    })
    for (let i = 0; i < amount / 3; i++) {
        const x = Math.random() * 200 - 100
        const y = Math.random() * 200 - 100
        const z = Math.random() * 200 - 100
        const geo = new THREE.BoxGeometry(1, 1, 5)
        geo.translate(x, y, z)
        geos.push(geo)
    }
    for (let i = 0; i < amount / 3; i++) {
        const x = Math.random() * 200 - 100
        const y = Math.random() * 200 - 100
        const z = Math.random() * 200 - 100
        const geo = new THREE.BoxGeometry(1, 5, 1)
        geo.translate(x, y, z)
        geos.push(geo)
    }
    for (let i = 0; i < amount / 3; i++) {
        const x = Math.random() * 200 - 100
        const y = Math.random() * 200 - 100
        const z = Math.random() * 200 - 100
        const geo = new THREE.BoxGeometry(5, 1, 1)
        geo.translate(x, y, z)
        geos.push(geo)
    }
    const mergeGeo = BufferGeometryUtils.mergeGeometries(geos)
    mesh = new THREE.Mesh(mergeGeo, mat)
    scene.add(mesh)
}

onBeforeUnmount(() => {
    scene.remove(mesh);
    mesh.dispose()
})
</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
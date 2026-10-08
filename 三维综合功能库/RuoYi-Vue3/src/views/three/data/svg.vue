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
import { SVGLoader } from 'three/examples/jsm/Addons.js';

const container = ref<HTMLDivElement>()
let scene: THREE.Scene


onMounted(() => {
    const initResult = initThree(container.value!, { position: { x: 0, y: 0, z: 10 } })
    scene = initResult.scene

    loadSVG()
})

const loadSVG = async () => {
    const svg = await new SVGLoader().loadAsync('/three-data/model/batman.svg')
    const svgGroup = new THREE.Group()
    svg.paths.forEach((path) => {
        const shapes = path.toShapes()
        shapes.forEach((shape) => {
            const geo = new THREE.ExtrudeGeometry(shape, { depth: 100 })
            const mat = new THREE.MeshStandardMaterial({ color: 'red', side: THREE.DoubleSide })
            const mesh = new THREE.Mesh(geo, mat)
            svgGroup.add(mesh)
        })
    })
    svgGroup.position.set(-5, -3, 0)
    svgGroup.scale.set(0.01, 0.01, 0.01)
    scene.add(svgGroup)
}
</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
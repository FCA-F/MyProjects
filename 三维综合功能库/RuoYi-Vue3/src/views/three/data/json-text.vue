<template>
    <div class="page-container">
        <div ref="container"></div>
    </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import * as THREE from 'three'
import { addGround, initThree } from '@/utils/three';
import draggableModal from '@/components/Common/draggable-modal.vue';
import '@/components/Common/draggable-modal.css'
import { FontLoader, TextGeometry } from 'three/examples/jsm/Addons.js';

const container = ref<HTMLDivElement>()
let scene: THREE.Scene


onMounted(() => {
    const initResult = initThree(container.value!, { position: { x: 0, y: 2, z: 6 } })
    scene = initResult.scene

    addGround(scene, -1)
    loadJSONText()
})

const loadJSONText = () => {
    new FontLoader().loadAsync('/three-data/fonts/helvetiker_regular.typeface.json').then((font) => {
        const geo = new TextGeometry('Minecraft', {
            font: font,
            size: 1,
            depth: 0.5,
            curveSegments: 64
        })
        const mat = new THREE.MeshStandardMaterial({ color: 'greenyellow', metalness: 0.3, roughness: 0.4, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geo, mat)
        mesh.position.set(-3, 0, 0)
        mesh.castShadow = true
        scene.add(mesh)
    })
}

</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
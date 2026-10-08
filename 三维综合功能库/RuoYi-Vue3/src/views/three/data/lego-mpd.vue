<template>
    <div class="page-container">
        <div ref="container"></div>
    </div>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as THREE from 'three'
import { initThree } from '@/utils/three';
import { LDrawLoader } from 'three/examples/jsm/Addons.js';
import { LDrawConditionalLineMaterial } from 'three/addons/materials/LDrawConditionalLineMaterial.js'

const container = ref<HTMLDivElement>()
let scene: THREE.Scene

let lego: THREE.Object3D

onMounted(() => {
    const initResult = initThree(container.value!, {
        position: { x: 0, y: 300, z: 600 },
    })
    scene = initResult.scene

    loadLego()
})

const loadLego = async () => {
    const loader = new LDrawLoader()
    loader.setConditionalLineMaterial(LDrawConditionalLineMaterial)
    lego = await loader.loadAsync('/three-data/model/lego/7140-1-X-wingFighter.mpd_Packed.mpd')
    lego.rotation.x = Math.PI
    lego.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true
            child.receiveShadow = true
        }
    })
    scene.add(lego)
}


onBeforeUnmount(() => {
    scene.remove(lego)
    lego.dispose()
})

</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>

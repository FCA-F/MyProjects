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
import { MTLLoader, OBJLoader } from 'three/examples/jsm/Addons.js';

const container = ref<HTMLDivElement>()
let scene: THREE.Scene


onMounted(() => {
    const initResult = initThree(container.value!, { position: { x: -2, y: 0, z: 4 } })
    scene = initResult.scene
    loadOBJMTL()
})

const loadOBJMTL = async () => {
    const mtlLoader = new MTLLoader()
    const mtl = await mtlLoader.loadAsync('/three-data/model/butterfly/butterfly.mtl')

    const objLoader = new OBJLoader()
    objLoader.setMaterials(mtl)
    const obj = await objLoader.loadAsync('/three-data/model/butterfly/butterfly.obj')
    obj.scale.set(20, 20, 20)
    scene.add(obj)
}

</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
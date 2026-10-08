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

const container = ref<HTMLDivElement>()
let scene: THREE.Scene


onMounted(() => {
    const initResult = initThree(container.value!, { position: { x: 0, y: 0, z: 10 } })
    scene = initResult.scene

    loadSprite()
    addGround(scene)
})

const loadSprite = () => {
    const mat = new THREE.SpriteMaterial({ color: 'red' })
    const sprite = new THREE.Sprite(mat)
    scene.add(sprite)
}
</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
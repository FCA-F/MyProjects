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
//@ts-ignore
import { Text as TroikaText } from 'troika-three-text';

const container = ref<HTMLDivElement>()
let scene: THREE.Scene

onMounted(() => {
    const initResult = initThree(container.value!)
    scene = initResult.scene

    addGround(scene, -2)
    loadTroikaText()
})

const loadTroikaText = () => {
    const troikaText = new TroikaText()
    troikaText.text = 'Minecraft'
    troikaText.color = 'greenyellow'
    troikaText.fontSize = 3
    troikaText.position.set(-8, 2, 0)
    troikaText.castShadow = true
    troikaText.sync()
    scene.add(troikaText)
}

</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>

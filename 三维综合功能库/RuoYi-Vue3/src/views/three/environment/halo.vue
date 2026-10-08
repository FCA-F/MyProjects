<template>
    <div class="page-container">
        <div ref="container"></div>
    </div>
</template>
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import * as THREE from 'three'
import { initThree } from '@/utils/three';
import draggableModal from '@/components/Common/draggable-modal.vue';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import '@/components/Common/draggable-modal.css'
import { Lensflare, LensflareElement } from 'three/examples/jsm/Addons.js';

let scene: THREE.Scene
const container = ref<HTMLDivElement>()

let pointLight: THREE.PointLight

onMounted(() => {
    const initResult = initThree(container.value!,
        {
            position: { x: 0, y: 6, z: 20 },
            targetPosition: { x: 0, y: 2, z: 0 },
            initDirectionalLight: false
        })
    scene = initResult.scene

    const ambientLight = scene.children.find(
        (object): object is THREE.AmbientLight => object instanceof THREE.AmbientLight
    )
    if (ambientLight) {
        ambientLight.intensity = 0.12
    }

    scene.background = new THREE.Color('blue')
    loadGltf()
    loadPointLight()
})

const loadGltf = () => {
    const loader = new GLTFLoader()
    loader.load('/three-data/model/waterfall/scene.gltf', (gltf) => {
        gltf.scene.traverse((object) => {//遍历实例
            if (object instanceof THREE.Mesh) {
                object.castShadow = true
                object.receiveShadow = true
            }
        })

        scene.add(gltf.scene)
    })
}

const loadPointLight = () => {
    pointLight = new THREE.PointLight()
    pointLight.position.set(3, 7, 0)
    pointLight.intensity = 50
    pointLight.castShadow = true
    pointLight.shadow.mapSize.set(2048, 2048)
    pointLight.shadow.bias = 0.0001
    pointLight.shadow.normalBias = 0.1
    pointLight.add(createLensFlare())
    scene.add(pointLight)
}

const createLensFlare = () => {
    const textureLoader = new THREE.TextureLoader()
    const textureFlare0 = textureLoader.load('/three-data/picture/lensflare0.png')//光源的光源
    const textureFlare1 = textureLoader.load('/three-data/picture/lensflare1.png')//光晕

    const lensFlare = new Lensflare()
    lensFlare.addElement(new LensflareElement(textureFlare0, 512, 0))//(纹理，大小，距相机（1为相机）)
    lensFlare.addElement(new LensflareElement(textureFlare1, 60, 0.6))
    lensFlare.addElement(new LensflareElement(textureFlare1, 70, 0.7))
    lensFlare.addElement(new LensflareElement(textureFlare1, 120, 0.9))
    lensFlare.addElement(new LensflareElement(textureFlare1, 70, 1.0))
    return lensFlare
}


</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>

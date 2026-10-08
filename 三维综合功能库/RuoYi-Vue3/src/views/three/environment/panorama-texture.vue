<template>
    <div class="page-container">
        <div ref="container"></div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import * as THREE from 'three'
import { initThree } from '@/utils/three'
import '@/components/Common/draggable-modal.css'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { LightProbeGenerator } from 'three/examples/jsm/lights/LightProbeGenerator.js'

let scene: THREE.Scene
let renderer: THREE.WebGLRenderer

const container = ref<HTMLDivElement>()

onMounted(() => {
    const initResult = initThree(container.value!, {
        initFog: false,
        initDirectionalLight: false
    })

    scene = initResult.scene
    renderer = initResult.renderer

    loadBackground(renderer)
    loadGltf()
})

const loadBackground = async (renderer: THREE.WebGLRenderer) => {
    const textureLoader = new THREE.TextureLoader()
    const texture = await textureLoader.loadAsync('/three-data/picture/equi.jpeg')

    texture.colorSpace = THREE.SRGBColorSpace
    texture.mapping = THREE.EquirectangularReflectionMapping

    scene.background = texture

    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(texture.image.height)
    cubeRenderTarget.fromEquirectangularTexture(renderer, texture)

    scene.environment = cubeRenderTarget.texture

    const lightProbe = await LightProbeGenerator.fromCubeRenderTarget(
        renderer,
        cubeRenderTarget
    )
    lightProbe.intensity = 10
    scene.add(lightProbe)
}

const loadGltf = () => {
    const loader = new GLTFLoader()
    loader.load('/three-data/model/waterfall/scene.gltf', (gltf) => {
        gltf.scene.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                object.castShadow = true
                object.receiveShadow = true
            }
        })

        scene.add(gltf.scene)
    })
}
</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>

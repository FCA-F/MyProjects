<template>
    <div class="page-container">
        <div ref="container"></div>
    </div>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as THREE from 'three'
import { addGround, initThree } from '@/utils/three';
import { DragControls, OrbitControls } from 'three/examples/jsm/Addons.js';

const container = ref<HTMLDivElement>()

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let orbitControls: OrbitControls
let dragControls: DragControls

const selectableObjects: THREE.Mesh[] = []

onMounted(() => {
    const initResult = initThree(container.value!, {
        position: { x: 0, y: 5, z: 16 },
        targetPosition: { x: 0, y: 0, z: 0 },
    })
    scene = initResult.scene
    camera = initResult.camera
    renderer = initResult.renderer
    orbitControls = initResult.orbitControls

    addGround(scene, -2)
    addSelectableObjects()
    initDragControls()
})

//核心，仅需这几行
const initDragControls = () => {
    dragControls = new DragControls(
        selectableObjects,
        camera,
        renderer.domElement,
    )
    dragControls.addEventListener('dragstart', (event) => {
        orbitControls.enabled = false
    })

    dragControls.addEventListener('dragend', (event) => {
        orbitControls.enabled = true
    })

}
//添加物体
const addSelectableObjects = () => {
    const geometry = new THREE.BoxGeometry(2.2, 2.2, 2.2)
    const colors = [0x3b82f6, 0xef4444, 0x10b981, 0xf59e0b, 0x8b5cf6]
    const positions = [[-4, 0, 0], [-2, 2.8, -1], [0, 0, 0], [2.2, 2.5, -1.5], [4.3, 0, 0],]

    positions.forEach(([x, y, z], index) => {
        const material = new THREE.MeshStandardMaterial({
            color: colors[index],
            roughness: 0.45,
            metalness: 0.05,
        })
        const mesh = new THREE.Mesh(geometry, material)
        mesh.name = `Cube ${index + 1}`
        mesh.position.set(x, y, z)
        mesh.rotation.set(
            index * 0.18,
            index * 0.28,
            index * 0.12,
        )
        mesh.castShadow = true
        mesh.receiveShadow = true
        selectableObjects.push(mesh)
        scene.add(mesh)
    })
}

onBeforeUnmount(() => {

    dragControls?.dispose()
    orbitControls?.dispose()

    selectableObjects.forEach((object) => {
        scene.remove(object)
        object.geometry.dispose()
    })
})

</script>

<style>
.page-container {
    position: relative;
    width: 100%;
    height: 100%;
}
</style>

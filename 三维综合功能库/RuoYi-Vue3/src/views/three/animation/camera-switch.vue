<template>
    <div class="page-container">
        <div ref="container"></div>
        <draggableModal title="相机视角">
            <div class="row">
                <div class="row">
                    <div class="label">相机1</div>
                    <el-switch v-model="switchCamera"></el-switch>
                    <div class="label">相机2</div>
                </div>

            </div>
        </draggableModal>
    </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import * as THREE from 'three'
import { initThree } from '@/utils/three';
import draggableModal from '@/components/Common/draggable-modal.vue';
import '@/components/Common/draggable-modal.css'
import { OrbitControls } from 'three/examples/jsm/Addons.js';

const container = ref<HTMLDivElement>()
let scene: THREE.Scene
let renderer: THREE.WebGLRenderer
let orbitControls: OrbitControls

let cube: THREE.Mesh
let camera1: THREE.PerspectiveCamera
let orbitControls1: OrbitControls
let orbitControls2: OrbitControls
let camera2: THREE.PerspectiveCamera
let cameraHelp2: THREE.CameraHelper
const switchCamera = ref(false)

onMounted(() => {
    const initResult = initThree(container.value!, { initAnimate: false })
    scene = initResult.scene
    renderer = initResult.renderer

    loadCube()
    loadCamera()

    animate()
})

const loadCube = () => {
    const cubeGeo = new THREE.BoxGeometry()
    const cubeMat = new THREE.MeshPhongMaterial({ color: 'red' })//高光
    cube = new THREE.Mesh(cubeGeo, cubeMat)

    cube.castShadow = true
    scene.add(cube)
}

const loadCamera = () => {
    camera1 = new THREE.PerspectiveCamera()
    camera1.position.set(0, 2, 16)

    scene.add(camera1)
    orbitControls1 = new OrbitControls(camera1, renderer.domElement)

    camera2 = new THREE.PerspectiveCamera()
    camera2.near = 1
    camera2.far = 6

    cameraHelp2 = new THREE.CameraHelper(camera2)

    scene.add(camera2)
    scene.add(cameraHelp2)
    orbitControls2 = new OrbitControls(camera2, renderer.domElement)
}

const animate = () => {
    requestAnimationFrame(animate)
    animateCube()
    animateCamera()

}

let step = 0
const animateCube = () => {

    step += 0.005
    cube.position.x = 4 * (Math.cos(step))
    cube.position.y = 4 * Math.abs(Math.sin(step))
}

const animateCamera = () => {

    camera2.lookAt(cube.position)
    if (switchCamera.value) {
        renderer.render(scene, camera2)
        orbitControls1.update()
    }

    else {
        renderer.render(scene, camera1)
        orbitControls2.update()
    }


}

</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
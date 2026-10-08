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
import { GLTFLoader } from 'three/examples/jsm/Addons.js';
import render from '@/utils/generator/render';

const container = ref<HTMLDivElement>()
let scene: THREE.Scene
let renderer: THREE.WebGLRenderer
let model: THREE.Group

let cubeMap: THREE.CubeTexture
let cubeCamera: THREE.CubeCamera
let group = new THREE.Group()

onMounted(async () => {
    const initResult = initThree(container.value!, { position: { x: 0, y: 0, z: 10 }, initDirectionalLight: false })
    scene = initResult.scene
    renderer = initResult.renderer
    addDirLight()//灯
    addMesh()//立方体

    await loadCubeMap()//贴图
    loadModel()//模型并设置反射


    scene.background = cubeMap
    animate()
})

const addDirLight = () => {
    const dirLight = new THREE.DirectionalLight(0xffffff, 5)
    dirLight.position.set(5, 10, -2)
    dirLight.castShadow = true
    scene.add(dirLight)
}

const addMesh = () => {
    const positions = [
        [-1.5, 1.0, 0.2],
        [1.5, 1.0, 0.8],
        [-1.5, -0.5, 0.9],
        [1.5, -1.5, 0.3],
        [0, 2, -1.0],
        [0, -2, 0.4],
        [-2.0, 0, -1.5],
        [2.0, 1.2, -0.9],
        [0.8, -2.2, 0.1],
    ]
    positions.map((position) => {
        let geo = new THREE.BoxGeometry(0.5, 0.5, 0.5)
        let mat = new THREE.MeshPhongMaterial({
            color: new THREE.Color(Math.random(), Math.random(), Math.random())
        })
        let mesh = new THREE.Mesh(geo, mat)
        mesh.position.set(position[0], position[1], position[2])
        group.add(mesh)
    })
    scene.add(group)
}

const loadCubeMap = async () => {
    const loader = new THREE.CubeTextureLoader()
    cubeMap = await loader.loadAsync([
        '/three-data/picture/car/right.png',
        '/three-data/picture/car/left.png',
        '/three-data/picture/car/top.png',
        '/three-data/picture/car/bottom.png',
        '/three-data/picture/car/front.png',
        '/three-data/picture/car/back.png',
    ])
}

const loadModel = async () => {
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync('/three-data/model/ball.glb')
    model = gltf.scene
    gltf.scene.traverse((object) => {//遍历实例
        if (object instanceof THREE.Mesh) {
            //object.castShadow = true
            //object.receiveShadow = true
        }
    })
    gltf.scene.scale.setScalar(0.01)
    scene.add(gltf.scene)

    applyReflectionMaterial()
}

const applyReflectionMaterial = () => {
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(128)
    cubeCamera = new THREE.CubeCamera(0.1, 10, cubeRenderTarget)
    cubeCamera.position.copy(model.position)
    scene.add(cubeCamera)

    const mat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        envMap: cubeRenderTarget.texture
    })

    model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
            object.material = mat
        }
    })
}
const animate = () => {
    requestAnimationFrame(animate)
    model.visible = false
    cubeCamera.update(renderer, scene)
    model.visible = true

    //立方体旋转
    group.rotation.x += 0.005
    group.rotation.y += 0.001
    group.rotation.z += 0.001
}
</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
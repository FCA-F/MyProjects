<template>
    <div class="page-container">
        <div ref="container"></div>
        <DraggableModal title="控制器">
            <el-select v-model="controlsType" @change="createControls" class="input">
                <el-option label="OrbitControls" value="OrbitControls" />
                <el-option label="ArcballControls" value="ArcballControls" />
                <el-option label="TrackballControls" value="TrackballControls" />
                <el-option label="FlyControls" value="FlyControls" />
                <el-option label="FirstPersonControls" value="FirstPersonControls" />
            </el-select>
        </DraggableModal>
    </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import * as THREE from 'three'
import '@/components/Common/draggable-modal.css'
import { ArcballControls, FirstPersonControls, FlyControls, GLTFLoader, OrbitControls, TrackballControls } from 'three/examples/jsm/Addons.js';
import DraggableModal from '@/components/Common/draggable-modal.vue';

const container = ref<HTMLDivElement>()
let scene: THREE.Scene
let renderer: THREE.WebGLRenderer
let camera: THREE.PerspectiveCamera
let ambientLight: THREE.AmbientLight
let controls: OrbitControls | ArcballControls | TrackballControls | FlyControls | FirstPersonControls | undefined
let timer: THREE.Timer

const controlsType = ref('OrbitControls')

onMounted(() => {
    initScene()
    addGLTF()
})

const initScene = () => {
    //scene
    scene = new THREE.Scene()
    scene.background = new THREE.Color('white')
    //camera
    camera = new THREE.PerspectiveCamera(50, window.window.innerWidth / innerHeight)
    camera.position.set(80, 100, 300)
    //renderer
    renderer = new THREE.WebGLRenderer()
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.setSize(window.innerWidth, window.innerHeight)
    container.value!.appendChild(renderer.domElement)
    //ambientLight
    ambientLight = new THREE.AmbientLight('white', 0.4)
    scene.add(ambientLight)
    //timer
    timer = new THREE.Timer()
    timer.connect(document)

    createControls()
    animate()
}

const createControls = () => {
    clearControls()
    switch (controlsType.value) {
        case 'OrbitControls':
            controls = new OrbitControls(camera, renderer.domElement)
            break;
        case 'ArcballControls':
            controls = new ArcballControls(camera, renderer.domElement, scene);
            break;
        case 'TrackballControls':
            controls = new TrackballControls(camera, renderer.domElement)
            break;
        case 'FlyControls':
            controls = new FlyControls(camera, renderer.domElement)
            controls.movementSpeed = 25//平移速度
            controls.rollSpeed = Math.PI / 24//翻滚/俯仰偏航角速度
            controls.autoForward = false//自动往前飞
            controls.dragToLook = true//鼠标移动即转|按住拖才转
            break;
        case 'FirstPersonControls':
            controls = new FirstPersonControls(camera, renderer.domElement)
            controls.lookSpeed = 0.1        // 鼠标看的速度（默认 0.005）
            controls.movementSpeed = 25     // 移动速度
            break;

        default: break;
    }
}

const clearControls = () => {
    controls?.dispose()
    controls = undefined
}

const animate = () => {
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
    timer.update()
    if (controls) {
        if (controls instanceof FlyControls || controls instanceof FirstPersonControls)
            controls.update(timer.getDelta())
        else
            controls.update()
    }
}

const addGLTF = () => {
    const loader = new GLTFLoader()
    loader.load('/three-data/model/sea_house/scene.gltf', (gltf) => {
        gltf.scene.traverse((object) => {//遍历实例
            if (object instanceof THREE.Mesh) {
                object.castShadow = true
                object.receiveShadow = true
                object.material.depthWrite = true
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
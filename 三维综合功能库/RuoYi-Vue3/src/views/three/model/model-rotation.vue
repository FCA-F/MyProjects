<template>
    <div class="page-container">
        <div ref="container"></div>
    </div>

</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js'

const container = ref<HTMLDivElement | null>(null)

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let orbitControls: OrbitControls

let cube: THREE.Mesh
let torusKnot: THREE.Mesh
let ground: THREE.Mesh

onMounted(() => {
    init()
})

const init = () => {
    //场景
    scene = new THREE.Scene()
    scene.background = new THREE.Color('white')
    scene.fog = new THREE.Fog(new THREE.Color('white'), 10, 50)

    //相机
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight)
    camera.position.set(0, 2, 8)

    //渲染
    renderer = new THREE.WebGLRenderer({ antialias: true })//antialias狂锯齿
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.VSMShadowMap//方差阴影贴图
    renderer.setSize(window.innerWidth, window.innerHeight)
    container.value?.appendChild(renderer.domElement)

    //操控器
    orbitControls = new OrbitControls(camera, renderer.domElement)

    //光源
    scene.add(new THREE.AmbientLight(0x666666))//基本光源

    const dirLight = new THREE.DirectionalLight(0xaaaaaa)//方向光源
    dirLight.position.set(5, 12, 8)
    dirLight.castShadow = true
    scene.add(dirLight)



    //网格
    //立方体
    const cubeGeo = new THREE.BoxGeometry()
    const cubeMat = new THREE.MeshPhongMaterial({ color: 0x000FF })//高光
    cube = new THREE.Mesh(cubeGeo, cubeMat)

    cube.position.x = -1
    cube.castShadow = true
    scene.add(cube)
    //环面结
    const torusKnotGeo = new THREE.TorusKnotGeometry(0.5, 0.2, 100, 100)
    const torusKnotMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, roughness: 0.1 })//真实
    torusKnot = new THREE.Mesh(torusKnotGeo, torusKnotMat)

    torusKnot.castShadow = true
    torusKnot.position.x = 2
    scene.add(torusKnot)
    //地面
    const groundGeo = new THREE.PlaneGeometry(10000, 10000)
    const groundMat = new THREE.MeshLambertMaterial({ color: 0xffffff })//哑光
    ground = new THREE.Mesh(groundGeo, groundMat)

    ground.position.set(0, -2, 0)
    ground.rotation.set(Math.PI / -2, 0, 0)
    ground.receiveShadow = true
    scene.add(ground)

    animate()
}

const animate = () => {
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
    orbitControls.update()
    addMeshAnimate()//给网格添加动画（可选）
}

let step = 0//计数器
//添加网格动画
const addMeshAnimate = () => {
    //旋转
    cube.rotation.x += 0.01
    cube.rotation.y += 0.01
    cube.rotation.z += 0.01

    torusKnot.rotation.x += 0.01
    torusKnot.rotation.y += 0.01
    torusKnot.rotation.z += 0.01

    //平移
    step += 0.01
    cube.position.x = 4 * (Math.cos(step))
    cube.position.y = 4 * Math.abs(Math.sin(step))
}


</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
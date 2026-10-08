<template>
    <div class="page-container">
        <div ref="container"></div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref, } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js'
import { GLTFLoader } from 'three/examples/jsm/Addons.js'
import { EffectComposer } from 'three/examples/jsm/Addons.js'
import { RenderPass } from 'three/examples/jsm/Addons.js'
import { ShaderPass } from 'three/examples/jsm/Addons.js'

const container = ref<HTMLDivElement>()
let scene: THREE.Scene
let renderer: THREE.WebGLRenderer
let camera: THREE.PerspectiveCamera
let controls: OrbitControls
let composer: EffectComposer

// 自定义灰度着色器
const grayShader = {
    uniforms: {
        tDiffuse: { value: null },    // 上一道 Pass 的输出画面
        rPower: { value: 0.299 },     // 红色通道权重
        gPower: { value: 0.587 },     // 绿色通道权重
        bPower: { value: 0.114 },     // 蓝色通道权重
    },
    vertexShader: `
        varying vec2 vUv;//从顶点传递到像素的中间变量，GPU完成插值
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);//position模型局部坐标,模型局部坐标->相机坐标->裁剪坐标
        }
    `,
    fragmentShader: `
        uniform float rPower;
        uniform float gPower;
        uniform float bPower;
        uniform sampler2D tDiffuse;
        varying vec2 vUv;
        void main() {
            vec4 texel = texture2D(tDiffuse, vUv);
            if(texel.g>max(texel.r,texel.b)){//红色通道大于其余通道直接保留原色
                gl_FragColor=texel;
            }
             else{
                float gray = texel.r * rPower + texel.g * gPower + texel.b * bPower;
                gl_FragColor = vec4(vec3(gray), texel.w);
             }
            
        }
    `,
}

onMounted(async () => {
    init()
    await loadModel()
    addComposer()
    animate()
})
const init = () => {
    let w = container.value!.clientWidth || window.innerWidth
    let h = container.value!.clientHeight || window.innerHeight

    // 1. 场景
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)

    // 2. 相机
    camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000)
    camera.position.set(-50, 50, 300)

    // 3. 渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    container.value!.appendChild(renderer.domElement)

    // 4. 控制器
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.target.set(0, 0, 0)

    // 5. 灯光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)
}

const loadModel = async () => {
    const loader = new GLTFLoader()
    loader.load('/three-data/model/sea_house/scene.gltf', (gltf) => {
        const model = gltf.scene
        model.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
                obj.castShadow = true
                obj.receiveShadow = true
                obj.material.depthWrite = true
            }
        })
        model.rotation.y = 3.14
        scene.add(model)
    })
}

const addComposer = () => {
    composer = new EffectComposer(renderer)
    composer.setSize(window.innerWidth, window.innerHeight)
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(new ShaderPass(grayShader))
}

const animate = () => {
    requestAnimationFrame(animate)
    controls.update()
    composer.render()
}
</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
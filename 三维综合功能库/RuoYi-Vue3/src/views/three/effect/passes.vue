<template>
    <div class="page-container">
        <div ref="container"></div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import * as THREE from 'three'
import { initThree } from '@/utils/three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { MaskPass, ClearMaskPass } from 'three/examples/jsm/postprocessing/MaskPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RGBShiftShader, UnrealBloomPass } from 'three/examples/jsm/Addons.js'

const container = ref<HTMLDivElement>()

let renderer: THREE.WebGLRenderer
let camera: THREE.PerspectiveCamera
let controls: OrbitControls

let scene: THREE.Scene
let earth: THREE.Mesh
let mars: THREE.Mesh
let composer: EffectComposer
let sceneBG: THREE.Scene
let sceneEarth: THREE.Scene
let sceneMars: THREE.Scene

onMounted(() => {
    const initResult = initThree(container.value!, {
        position: { x: 0, y: 20, z: 40 },
        initAnimate: false,
    })

    scene = initResult.scene
    renderer = initResult.renderer
    camera = initResult.camera
    controls = initResult.orbitControls
    renderer.autoClear = false

    sceneEarth = new THREE.Scene()
    sceneMars = new THREE.Scene()
    sceneBG = new THREE.Scene()

    sceneBG.background = new THREE.TextureLoader().load(
        '/three-data/picture/texture/star.jpg',
    )

    addEarth(sceneEarth)
    addMars(sceneMars)
    addComposer()
    renderer.setAnimationLoop(animate)
})
const addEarth = (scene: THREE.Scene) => {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2)
    scene.add(ambientLight)

    const textureLoader = new THREE.TextureLoader()
    const map = textureLoader.load('/three-data/picture/texture/earth/earth.png')
    map.colorSpace = THREE.SRGBColorSpace

    const mat = new THREE.MeshPhongMaterial({
        map,
        normalMap: textureLoader.load('/three-data/picture/texture/earth/normal.png'),
        specularMap: textureLoader.load('/three-data/picture/texture/earth/specular.png'),

    })

    earth = new THREE.Mesh(new THREE.SphereGeometry(15, 40, 40), mat)
    scene.add(earth)

    scene.translateX(-16)
    scene.scale.setScalar(1.2)
}

const addMars = (scene: THREE.Scene) => {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2)
    scene.add(ambientLight)

    const textureLoader = new THREE.TextureLoader()
    const map = textureLoader.load('/three-data/picture/texture/mars/mars_1k_color.jpg')
    map.colorSpace = THREE.SRGBColorSpace

    const mat = new THREE.MeshPhongMaterial({
        map,
        normalMap: textureLoader.load('/three-data/picture/texture/mars/mars_1k_normal.jpg'),
        normalScale: new THREE.Vector2(1.5, 1.5),
    })

    mars = new THREE.Mesh(new THREE.SphereGeometry(15, 40, 40), mat)
    scene.add(mars)

    scene.translateX(16)
    scene.translateY(6)
    scene.scale.setScalar(0.2)
}

const addComposer = () => {
    //composer
    const renderTarget = new THREE.WebGLRenderTarget(
        window.innerWidth,
        window.innerHeight,
        {
            depthBuffer: true,//深度缓冲,GPU需要知道哪个像素离相机近、哪个远，才能正确判断"前面的物体挡住后面的"
            stencilBuffer: true,//模板缓冲,渲染sceneMars被画到的像素，模板值设为 1,后续Pass只在"模板值 == 1"的像素上生效
        },
    )
    composer = new EffectComposer(renderer, renderTarget)

    //通道
    const bgRenderPass = new RenderPass(sceneBG, camera)
    const earthRenderPass = new RenderPass(sceneEarth, camera)
    earthRenderPass.clear = false
    const marsRenderPass = new RenderPass(sceneMars, camera)
    marsRenderPass.clear = false

    const earthBloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.5,  // strength: 发光强度，0.6~1.2 比较自然
        0.1,  // radius: 泛光半径
        0.1  // threshold: 亮度阈值，高于此值才发光
    )

    const rgbShiftPass = new ShaderPass(RGBShiftShader)
    rgbShiftPass.uniforms.amount.value = 0.008

    const marsMask = new MaskPass(sceneMars, camera)
    const earthMask = new MaskPass(sceneEarth, camera)
    const clearMask = new ClearMaskPass()

    //原始图像
    composer.addPass(bgRenderPass)
    composer.addPass(earthRenderPass)
    composer.addPass(marsRenderPass)

    //仅后处理火星
    composer.addPass(marsMask)
    composer.addPass(rgbShiftPass)
    composer.addPass(clearMask)

    //仅后处理地球
    composer.addPass(earthMask)
    composer.addPass(earthBloomPass)
    composer.addPass(clearMask)

    composer.addPass(new OutputPass())


}

const animate = () => {
    earth.rotation.y += 0.001
    mars.rotation.y -= 0.001

    controls.update()
    renderer.clear()
    composer.render()
}

</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100vh;
    overflow: hidden;
}
</style>
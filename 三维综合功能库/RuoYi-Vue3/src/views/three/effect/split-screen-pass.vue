<template>
    <div ref="container" class="page-container"></div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import * as THREE from 'three'
import { initThree } from '@/utils/three'
import {
    EffectComposer,
    GlitchPass,
    GLTFLoader,
    HalftonePass,
    OrbitControls,
    RenderPass,
    RGBShiftShader,
    ShaderPass,
    UnrealBloomPass,
} from 'three/examples/jsm/Addons.js'

const container = ref<HTMLDivElement>()

let scene: THREE.Scene
let renderer: THREE.WebGLRenderer
let camera: THREE.PerspectiveCamera
let controls: OrbitControls

const composers: EffectComposer[] = []

onMounted(() => {
    const initResult = initThree(container.value!, {
        position: { x: 80, y: 100, z: 300 },
        initAnimate: false,
    })

    scene = initResult.scene
    renderer = initResult.renderer
    camera = initResult.camera
    controls = initResult.orbitControls


    addComposers()
    loadModel()
    animate()
})

const loadModel = async () => {
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync('/three-data/model/sea_house/scene.gltf')

    gltf.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
            object.castShadow = true
            object.receiveShadow = true
            object.material.depthWrite = true
        }
    })

    scene.add(gltf.scene)
}

const addComposers = () => {
    const glitchPass = new GlitchPass()//pass1
    const unrealBloomPass = new UnrealBloomPass(//pass2
        new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2),
        0.3,
        0.4,
        0.85,
    )
    const halftonePass = new HalftonePass({//pass3
        shape: 1,                              // 网点形状：1圆点 2椭圆 3线 4方块 5菱形
        radius: 4,                             // 网点半径/大小，像素感，越大点越粗
        rotateR: Math.PI / 12,                 // R 通道栅格旋转（弧度）
        rotateG: Math.PI / 12 * 2,             // G
        rotateB: Math.PI / 12 * 3,             // B
        scatter: 0,                            // 0~1 网点随机抖动，0最规整
        blending: 1,                           // 0~1 网点结果与原始图混合比例，1更纯网点
        blendingMode: 1,                       // 1线性 2正片叠底 3相加 4变亮 5变暗
        greyscale: false,                      // true 出灰度半调
        disable: false                         // true 相当于关掉
    })

    const rgbShiftPass = new ShaderPass(RGBShiftShader)//pass4
    rgbShiftPass.uniforms.amount.value = 0.02

    composers.push(
        createComposer(glitchPass),
        createComposer(halftonePass),
        createComposer(unrealBloomPass),
        createComposer(rgbShiftPass),
    )
}

const createComposer = (pass: ShaderPass | UnrealBloomPass | GlitchPass | HalftonePass) => {
    const composer = new EffectComposer(renderer)

    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(pass)

    return composer
}

const animate = () => {
    requestAnimationFrame(animate)
    controls.update()

    renderComposer(composers[0], 0, 0)
    renderComposer(composers[1], 1, 0)
    renderComposer(composers[2], 0, 1)
    renderComposer(composers[3], 1, 1)
}

const renderComposer = (composer: EffectComposer, column: number, row: number) => {
    const { halfWidth, halfHeight } = getRenderSize()
    const x = column * halfWidth//左下角坐标
    const y = row * halfHeight

    renderer.setViewport(x, y, halfWidth, halfHeight)//	把 NDC 坐标映射到正确的屏幕区域
    renderer.setScissor(x, y, halfWidth, halfHeight)//	防止渲染结果"画到格子外面"
    renderer.setScissorTest(true)
    composer.render()
}

const getRenderSize = () => {
    const width = window.innerWidth
    const height = window.innerHeight
    const halfWidth = Math.floor(width / 2)
    const halfHeight = Math.floor(height / 2)

    return { width, height, halfWidth, halfHeight }
}
</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>

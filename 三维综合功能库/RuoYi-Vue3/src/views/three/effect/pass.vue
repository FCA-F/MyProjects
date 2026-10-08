<template>
    <div class="page-container">
        <div ref="container"></div>
        <draggable-modal title="通道">
            <el-select v-model="passType" @change="switchPass" class="input">
                <el-option label="default" value="default" />
                <el-option label="RGBShift" value="RGBShift" />
                <el-option label="DotScreen" value="DotScreen" />
                <el-option label="Film" value="Film" />
                <el-option label="UnrealBloom" value="UnrealBloom" />
                <el-option label="Outline" value="Outline" />
                <el-option label="Glitch" value="Glitch" />
                <el-option label="Halftone" value="Halftone" />
                <el-option label="HorizontalBlur" value="HorizontalBlur" />
                <el-option label="Bokeh" value="Bokeh" />
                <el-option label="Focus" value="Focus" />
                <el-option label="SSAO" value="SSAO" />
                <el-option label="Mirror" value="Mirror" />
            </el-select>
        </draggable-modal>
    </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import * as THREE from 'three'
import { initThree } from '@/utils/three';
import draggableModal from '@/components/Common/draggable-modal.vue';
import '@/components/Common/draggable-modal.css'
import { BokehPass, DotScreenShader, EffectComposer, FilmShader, FocusShader, GlitchPass, GLTFLoader, HalftonePass, HorizontalBlurShader, MirrorShader, OrbitControls, OutlinePass, RenderPass, RGBShiftShader, ShaderPass, SSAOPass, UnrealBloomPass } from 'three/examples/jsm/Addons.js';

const container = ref<HTMLDivElement>()
let scene: THREE.Scene
let renderer: THREE.WebGLRenderer
let camera: THREE.PerspectiveCamera
let controls: OrbitControls

let model: THREE.Group
const passType = ref('RGBShiftShader')
let nowPass: ShaderPass | UnrealBloomPass | OutlinePass | GlitchPass | HalftonePass | BokehPass | SSAOPass
let composer: EffectComposer


onMounted(() => {
    const initResult = initThree(container.value!, {
        position: { x: 80, y: 100, z: 300 },
        initAnimate: false
    })
    scene = initResult.scene
    renderer = initResult.renderer
    camera = initResult.camera
    controls = initResult.orbitControls
    loadModel()
    addComposer()
    animate()
})

const loadModel = async () => {
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync('/three-data/model/sea_house/scene.gltf')
    model = gltf.scene
    model.traverse((object) => {//遍历实例
        if (object instanceof THREE.Mesh) {
            object.castShadow = true
            object.receiveShadow = true
            object.material.depthWrite = true
        }
    })

    scene.add(model)
}

const addComposer = () => {
    composer = new EffectComposer(renderer)
    const renderPass = new RenderPass(scene, camera)
    composer.addPass(renderPass)

    applyRGBShift()
}

const applyRGBShift = () => {
    let pass = new ShaderPass(RGBShiftShader)
    pass.uniforms.amount.value = 0.01//rgb分离距离
    composer.addPass(pass)

    nowPass = pass
}

const applyDotScreen = () => {
    let pass = new ShaderPass(DotScreenShader)
    pass.uniforms.scale.value = 8//点大小和密集度
    composer.addPass(pass)

    nowPass = pass
}
const applyFilm = () => {
    let pass = new ShaderPass(FilmShader)
    composer.addPass(pass)

    nowPass = pass
}
const applyUnrealBloom = () => {
    const pass = new UnrealBloomPass(// 分辨率、强度、半径、阈值（超过才发光）
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.2,
        0.2,
        0.85,
    )
    composer.addPass(pass)

    nowPass = pass
}

const applyOutline = () => {
    scene.background = new THREE.Color('black')
    let pass = new OutlinePass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        scene, camera, [model]
    )
    pass.edgeStrength = 3.0      // 边缘强度，默认3，调大更亮 
    pass.edgeGlow = 0.8          // 外发光，0~1
    pass.edgeThickness = 3.0     // 边缘厚度
    pass.pulsePeriod = 0        // 0=不呼吸，>0 闪烁
    pass.visibleEdgeColor.set(0x00ff00) // 可见边缘颜色

    composer.addPass(pass)

    nowPass = pass
}
const applyGlitch = () => {
    let pass = new GlitchPass()
    composer.addPass(pass)

    nowPass = pass
}
const applyHalfTone = () => {
    const pass = new HalftonePass({
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
    composer.addPass(pass)

    nowPass = pass
}

const applyHorizontalBlur = () => {
    let pass = new ShaderPass(HorizontalBlurShader)
    composer.addPass(pass)

    nowPass = pass
}
const applyBokehBlur = () => {//3D模糊
    let pass = new BokehPass(scene, camera, {
        focus: 50,      // 焦距
        aspect: camera.aspect, // 宽高比
        aperture: 0.0002,     // 光圈大小
        maxblur: 1            // 最大模糊程度
    })
    composer.addPass(pass)

    nowPass = pass
}
const applyFocus = () => {//2D模糊
    let pass = new ShaderPass(FocusShader)
    // ✅ 必须设置屏幕尺寸，否则采样比例不对
    pass.uniforms['screenWidth'].value = window.innerWidth
    pass.uniforms['screenHeight'].value = window.innerHeight

    // 调整模糊强度（越大越糊）
    pass.uniforms['sampleDistance'].value = 5

    // 波动效果（0 = 关闭，纯模糊）
    pass.uniforms['waveFactor'].value = 0
    composer.addPass(pass)

    nowPass = pass
}
const applySSAO = () => {
    let pass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight)
    pass.kernelRadius = 16
    pass.output = SSAOPass.OUTPUT.Default
    composer.addPass(pass)

    nowPass = pass
}
const applyMirror = () => {
    let pass = new ShaderPass(MirrorShader)
    pass.uniforms['side'].value = 2//镜像方向
    composer.addPass(pass)

    nowPass = pass
}

/*
const apply = () => {
    let pass = new ShaderPass()
    composer.addPass(pass)

    nowPass = pass
}
*/

const switchPass = () => {
    scene.background = new THREE.Color(0xffffff)
    composer.removePass(nowPass)

    switch (passType.value) {
        case 'default': break
        case 'RGBShift': applyRGBShift(); break
        case 'DotScreen': applyDotScreen(); break
        case 'Film': applyFilm(); break
        case 'UnrealBloom': applyUnrealBloom(); break
        case 'Outline': applyOutline(); break
        case 'Glitch': applyGlitch(); break
        case 'Halftone': applyHalfTone(); break
        case 'HorizontalBlur': applyHorizontalBlur(); break
        case 'Bokeh': applyBokehBlur(); break
        case 'Focus': applyFocus(); break
        case 'SSAO': applySSAO(); break
        case 'Mirror': applyMirror(); break
        default: break;
    }
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

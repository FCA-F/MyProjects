<template>
    <div class="page-container">
        <div ref="container"></div>
        <draggableModal title="点">
            <div class="row">
                <div class="label">样式</div>
                <el-select v-model="textureType" @change="switchTextureType" class="input">
                    <el-option label="default" value="default" />
                    <el-option label="canvas" value="canvas" />
                    <el-option label="png" value="png" />
                </el-select>
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

const container = ref<HTMLDivElement>()
let scene: THREE.Scene

let points: THREE.Points
let canvasTexture: THREE.Texture
let pngTexture: THREE.Texture
const textureType = ref('default')

onMounted(() => {
    const initResult = initThree(container.value!, { position: { x: 0, y: 0, z: 35 } })
    scene = initResult.scene

    createCanvasTexture()
    createPngTexture()
    loadPoints()
})

const loadPoints = () => {
    let vectors: THREE.Vector3[] = []
    for (let x = 1; x <= 50000; x++) {
        let point = new THREE.Vector3(
            Math.random() * 100 - 50,
            Math.random() * 100 - 50,
            Math.random() * 100 - 50)
        vectors.push(point)
    }

    let positions = new Float32Array(vectors.length * 3)
    vectors.forEach((point, i) => {
        positions[i * 3] = point.x
        positions[i * 3 + 1] = point.y
        positions[i * 3 + 2] = point.z
    })

    let colors = new Float32Array(vectors.length * 3)
    vectors.forEach((point, i) => {
        const color = randomColor()
        colors[i * 3] = color.r
        colors[i * 3 + 1] = color.g
        colors[i * 3 + 2] = color.b
    })

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const mat = new THREE.PointsMaterial({
        size: 0.7,
        vertexColors: true,//每个点用各自的颜色
        sizeAttenuation: true, // 近大远小
        map: null,//纹理
    })
    points = new THREE.Points(geo, mat)
    scene.add(points)
}

const createCanvasTexture = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 放大4倍（原始图形28px → 112px，填满128画布）
    ctx.scale(4, 4)
    // 重新算 translate 让图形居中（原来 -84 改成 -86）
    ctx.translate(-81, -86)

    // 以下全部原样保留，不用动 

    // the body
    ctx.fillStyle = 'orange'
    ctx.beginPath()
    ctx.moveTo(83, 116)
    ctx.lineTo(83, 102)
    ctx.bezierCurveTo(83, 94, 89, 88, 97, 88)
    ctx.bezierCurveTo(105, 88, 111, 94, 111, 102)
    ctx.lineTo(111, 116)
    ctx.lineTo(106.333, 111.333)
    ctx.lineTo(101.666, 116)
    ctx.lineTo(97, 111.333)
    ctx.lineTo(92.333, 116)
    ctx.lineTo(87.666, 111.333)
    ctx.lineTo(83, 116)
    ctx.fill()

    // the eyes
    ctx.fillStyle = 'white'
    ctx.beginPath()
    ctx.moveTo(91, 96)
    ctx.bezierCurveTo(88, 96, 87, 99, 87, 101)
    ctx.bezierCurveTo(87, 103, 88, 106, 91, 106)
    ctx.bezierCurveTo(94, 106, 95, 103, 95, 101)
    ctx.bezierCurveTo(95, 99, 94, 96, 91, 96)
    ctx.moveTo(103, 96)
    ctx.bezierCurveTo(100, 96, 99, 99, 99, 101)
    ctx.bezierCurveTo(99, 103, 100, 106, 103, 106)
    ctx.bezierCurveTo(106, 106, 107, 103, 107, 101)
    ctx.bezierCurveTo(107, 99, 106, 96, 103, 96)
    ctx.fill()

    // the pupils
    ctx.fillStyle = 'blue'
    ctx.beginPath()
    ctx.arc(101, 102, 2, 0, Math.PI * 2, true)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(89, 102, 2, 0, Math.PI * 2, true)
    ctx.fill()

    canvasTexture = new THREE.Texture(canvas)
    canvasTexture.needsUpdate = true
}

const createPngTexture = async () => {
    pngTexture = await new THREE.TextureLoader().loadAsync('/three-data/picture/raindrop-3t.png')
    pngTexture.needsUpdate = true
}

const applyDefaultTexture = () => {
    const mat = points.material as THREE.PointsMaterial
    mat.map = null
    mat.needsUpdate = true//刷新，每次用完自动变成false
}

const applyCanvasTexture = () => {
    const mat = points.material as THREE.PointsMaterial
    mat.map = canvasTexture
    mat.transparent = true//有透明像素
    mat.alphaTest = 0.1//透明度低的扔掉
    mat.needsUpdate = true//刷新，每次用完自动变成false
}

const applyPngTexture = () => {
    const mat = points.material as THREE.PointsMaterial
    mat.map = pngTexture
    mat.transparent = true//有透明像素
    mat.alphaTest = 0.1//透明度低的扔掉
    mat.needsUpdate = true//刷新，每次用完自动变成false
}

const randomColor = () => {
    const r = Math.random()
    const g = Math.random()
    const b = Math.random()
    return new THREE.Color(r, g, b)
}

const switchTextureType = () => {
    switch (textureType.value) {
        case 'default': applyDefaultTexture(); break
        case 'canvas': applyCanvasTexture(); break
        case 'png': applyPngTexture(); break
        default: break
    }
}

</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
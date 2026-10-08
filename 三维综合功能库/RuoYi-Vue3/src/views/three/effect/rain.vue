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

const container = ref<HTMLDivElement>()
let scene: THREE.Scene

let points: THREE.Points
let canvasTexture: THREE.Texture
let pngTexture: THREE.Texture
const textureType = ref('default')

onMounted(async () => {
    const initResult = initThree(container.value!, { position: { x: 0, y: 0, z: 35 } })
    scene = initResult.scene

    await createPngTexture()
    loadPoints()
    animate()
})

const createPngTexture = async () => {
    pngTexture = await new THREE.TextureLoader().loadAsync('/three-data/picture/raindrop-3t.png')
    pngTexture.needsUpdate = true
}


const loadPoints = () => {
    //vector
    let vectors: THREE.Vector3[] = []
    for (let x = 1; x <= 50000; x++) {
        let point = new THREE.Vector3(
            Math.random() * 100 - 50,
            Math.random() * 100 - 50,
            Math.random() * 100 - 50)
        vectors.push(point)
    }
    //position
    let positions = new Float32Array(vectors.length * 3)
    vectors.forEach((point, i) => {
        positions[i * 3] = point.x
        positions[i * 3 + 1] = point.y
        positions[i * 3 + 2] = point.z
    })
    //color
    let colors = new Float32Array(vectors.length * 3)
    vectors.forEach((point, i) => {
        const color = new THREE.Color('white')
        colors[i * 3] = color.r
        colors[i * 3 + 1] = color.g
        colors[i * 3 + 2] = color.b
    })
    //velocity(速度)
    let velocities = new Float32Array(vectors.length * 2)
    vectors.forEach((point, i) => {
        const velocityX = Math.random() * 0.005
        const velocityY = -0.01 - Math.random() * 0.1

        velocities[i * 2] = velocityX
        velocities[i * 2 + 1] = velocityY
    })
    //geo
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 2))
    //mat
    const mat = new THREE.PointsMaterial({
        size: 0.7,
        vertexColors: true,//每个点用各自的颜色
        sizeAttenuation: true, // 近大远小
        map: pngTexture,//纹理
        transparent: true,//有透明像素
        alphaTest: 0.1,//透明度低的扔掉
    })
    //points
    points = new THREE.Points(geo, mat)
    scene.add(points)
}

const updatePointsPosition = () => {
    let positionArray = points.geometry.attributes.position.array
    let velocityArray = points.geometry.attributes.velocity.array
    for (let i = 0; i < points.geometry.attributes.position.count; i++) {
        const addX = velocityArray[i * 2]
        const addY = velocityArray[i * 2 + 1]
        positionArray[i * 3] += addX
        positionArray[i * 3 + 1] += addY
        if (positionArray[i * 3] > 50)
            positionArray[i * 3] = -50
        if (positionArray[i * 3 + 1] < -50)
            positionArray[i * 3 + 1] = 50
    }
    points.geometry.attributes.position.needsUpdate = true
}

const animate = () => {
    requestAnimationFrame(animate)
    updatePointsPosition()
}


</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
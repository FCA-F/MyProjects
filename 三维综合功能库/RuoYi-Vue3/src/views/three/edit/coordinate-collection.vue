<template>
    <div class="page-container">
        <div ref="container" class="canvas-container"></div>

        <!-- 坐标悬浮提示 -->
        <div v-if="tooltip.show" class="coord-tooltip" :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }">
            <div class="tooltip-title">世界坐标</div>
            <div class="tooltip-row"><span>X:</span> {{ tooltip.pos.x.toFixed(4) }}</div>
            <div class="tooltip-row"><span>Y:</span> {{ tooltip.pos.y.toFixed(4) }}</div>
            <div class="tooltip-row"><span>Z:</span> {{ tooltip.pos.z.toFixed(4) }}</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import * as THREE from 'three'
import { initThree } from '@/utils/three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const container = ref<HTMLDivElement>()

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer

const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const clickableMeshes: THREE.Mesh[] = []

const tooltip = ref({ show: false, x: 0, y: 0, pos: { x: 0, y: 0, z: 0 } })

//录点击的 3D 世界坐标
const clickedWorldPos = new THREE.Vector3()
let marker: THREE.Mesh

let pointerDownPos = { x: 0, y: 0 }
let tooltipLoopId: number | null = null

onMounted(() => {
    const initResult = initThree(container.value!, {
        position: { x: 0, y: 10000, z: -7.8 },
        targetPosition: { x: 0, y: 0.2, z: 0 },
    })

    scene = initResult.scene
    camera = initResult.camera
    renderer = initResult.renderer
    const controls = initResult.orbitControls

    controls.zoomSpeed = 3
    controls.minDistance = 4
    controls.maxDistance = 10000
    controls.enableDamping = true
    controls.dampingFactor = 0.08

    camera.far = 15000
    camera.near = 1
    camera.updateProjectionMatrix()

    loadModel()
    container.value!.addEventListener('pointerdown', onPointerDown)
    container.value!.addEventListener('pointerup', onPointerUp)
    startTooltipUpdateLoop()
})

const loadModel = async () => {
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync('/three-data/model/city/scene.gltf')

    gltf.scene.scale.set(800, 800, 800)

    gltf.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
            object.castShadow = true
            object.receiveShadow = true
            object.material.depthWrite = true
            clickableMeshes.push(object)
        }
    })

    gltf.scene.updateMatrixWorld(true)
    scene.add(gltf.scene)
}

const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return
    pointerDownPos.x = event.clientX
    pointerDownPos.y = event.clientY
}

const onPointerUp = (event: PointerEvent) => {
    if (event.button !== 0) return

    const dx = Math.abs(event.clientX - pointerDownPos.x)
    const dy = Math.abs(event.clientY - pointerDownPos.y)
    if (dx > 5 || dy > 5) return

    doRaycast(event)
}

const doRaycast = (event: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect()

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(clickableMeshes, false)

    if (intersects.length > 0) {
        const hit = intersects[0]
        const p = hit.point

        console.log(`🎯 命中: ${hit.object.name || 'unnamed'}`, p)

        // ✅ 保存 3D 世界坐标
        clickedWorldPos.copy(p)

        // 更新 tooltip 内容（不消失，只是刷新）
        tooltip.value.show = true
        tooltip.value.pos = { x: p.x, y: p.y, z: p.z }

        addMarker(p)
    } else {
        // ✅ 点空白处才隐藏
        tooltip.value.show = false
    }
}

// ========== 每帧投影 3D 坐标到屏幕 ==========
const updateTooltipPosition = () => {
    if (!tooltip.value.show) return

    const vector = clickedWorldPos.clone()
    vector.project(camera)

    // 点在相机背后，不更新
    if (vector.z > 1) return

    const rect = renderer.domElement.getBoundingClientRect()
    const x = (vector.x * 0.5 + 0.5) * rect.width
    const y = -(vector.y * 0.5 - 0.5) * rect.height

    tooltip.value.x = x + 16
    tooltip.value.y = y + 16
}

const startTooltipUpdateLoop = () => {
    const loop = () => {
        updateTooltipPosition()
        tooltipLoopId = requestAnimationFrame(loop)
    }
    loop()
}

const addMarker = (pos: THREE.Vector3) => {
    if (!marker) {
        const geo = new THREE.SphereGeometry(10, 16, 16)
        const mat = new THREE.MeshBasicMaterial({
            color: 'red',
            depthTest: false
        })
        marker = new THREE.Mesh(geo, mat)
        scene.add(marker)
    }

    marker.position.set(pos.x, pos.y, pos.z)
}

onUnmounted(() => {
    container.value?.removeEventListener('pointerdown', onPointerDown)
    container.value?.removeEventListener('pointerup', onPointerUp)
    if (tooltipLoopId) cancelAnimationFrame(tooltipLoopId)
})
</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
}

.canvas-container {
    width: 100%;
    height: 100%;
}

.coord-tooltip {
    position: absolute;
    background: rgba(0, 0, 0, 0.88);
    color: #00ff88;
    padding: 12px 16px;
    border-radius: 10px;
    font-size: 13px;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    pointer-events: none;
    z-index: 1000;
    line-height: 1.6;
    border: 1px solid rgba(0, 255, 136, 0.35);
    backdrop-filter: blur(6px);
    box-shadow: 0 4px 20px rgba(0, 255, 136, 0.15);
    animation: tooltipIn 0.15s ease-out;
    user-select: none;
    will-change: left, top;
}

.tooltip-title {
    font-weight: 700;
    margin-bottom: 6px;
    font-size: 14px;
    color: #fff;
    border-bottom: 1px solid rgba(0, 255, 136, 0.2);
    padding-bottom: 4px;
}

.tooltip-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
}

.tooltip-row span {
    color: #888;
}

@keyframes tooltipIn {
    from {
        opacity: 0;
        transform: scale(0.9) translateY(4px);
    }

    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}
</style>
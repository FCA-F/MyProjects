<template>
    <div class="page-container">
        <div ref="container" class="three-container"></div>
        <draggable-modal title="变换">
            <div class="row">
                <div class="label">模式</div>
            </div>
            <div class="row">
                <el-radio-group v-model="transformMode">
                    <el-radio-button value="translate">移动</el-radio-button>
                    <el-radio-button value="rotate">旋转</el-radio-button>
                    <el-radio-button value="scale">缩放</el-radio-button>
                </el-radio-group>
            </div>
            <div class="row">
                <div class="label">坐标系</div>
            </div>
            <div class="row">
                <el-radio-group v-model="transformSpace">
                    <el-radio-button value="local">局部坐标</el-radio-button>
                    <el-radio-button value="world">世界坐标</el-radio-button>
                </el-radio-group>
            </div>
        </draggable-modal>
    </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls, TransformControls } from 'three/examples/jsm/Addons.js'
import { addGround, initThree } from '@/utils/three'
import DraggableModal from '@/components/Common/draggable-modal.vue'

type TransformMode = 'translate' | 'rotate' | 'scale'
type TransformSpace = 'world' | 'local'

const container = ref<HTMLDivElement>()
const transformMode = ref<TransformMode>('translate')
const transformSpace = ref<TransformSpace>('world')

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let orbitControls: OrbitControls
let transformControls: TransformControls

const selectableObjects: THREE.Mesh[] = []
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()

const handleDraggingChanged = (event: { value: unknown }) => {
    orbitControls.enabled = !event.value
}

const handlePointerDown = (event: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(pointer, camera)
    const intersection = raycaster.intersectObjects(selectableObjects, false)[0]

    if (intersection) {
        transformControls.attach(intersection.object)
    }
}

const initTransformControls = () => {
    transformControls = new TransformControls(camera, renderer.domElement)
    transformControls.setMode(transformMode.value)
    transformControls.setSpace(transformSpace.value)
    transformControls.addEventListener('dragging-changed', handleDraggingChanged)//拖动开始与结束事件，拖动时禁用相机移动
    scene.add(transformControls.getHelper())
    renderer.domElement.addEventListener('pointerdown', handlePointerDown)//按下
}

watch([transformMode, transformSpace], ([transformMode, transformSpace]) => {
    transformControls.setMode(transformMode)
    transformControls.setSpace(transformSpace)
})


const addSelectableObjects = () => {
    const geometry = new THREE.BoxGeometry(2.2, 2.2, 2.2)
    const colors = [0x3b82f6, 0xef4444, 0x10b981]
    const positions = [-3, 0, 3]

    positions.forEach((x, index) => {
        const material = new THREE.MeshStandardMaterial({
            color: colors[index],
            roughness: 0.45,
            metalness: 0.05,
        })
        const mesh = new THREE.Mesh(geometry, material)
        mesh.name = `Cube ${index + 1}`
        mesh.position.set(x, 0, 0)
        mesh.rotation.set(index * 0.15, index * 0.25, 0)
        mesh.castShadow = true
        mesh.receiveShadow = true
        selectableObjects.push(mesh)
        scene.add(mesh)
    })
}

onMounted(() => {
    const initResult = initThree(container.value!, {
        position: { x: 0, y: 5, z: 16 },
        targetPosition: { x: 0, y: 0, z: 0 },
    })
    scene = initResult.scene
    camera = initResult.camera
    renderer = initResult.renderer
    orbitControls = initResult.orbitControls

    addGround(scene, -2)
    addSelectableObjects()
    initTransformControls()
    transformControls.attach(selectableObjects[0])
})

onBeforeUnmount(() => {
    renderer?.domElement.removeEventListener('pointerdown', handlePointerDown)

    if (transformControls) {
        transformControls.removeEventListener('dragging-changed', handleDraggingChanged)
        transformControls.detach()
        scene.remove(transformControls.getHelper())
        transformControls.dispose()
    }

    orbitControls?.dispose()

    selectableObjects.forEach((object) => {
        scene.remove(object)
        object.geometry.dispose()
        if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose())
        } else {
            object.material.dispose()
        }
    })
})
</script>

<style scoped>
.page-container {
    position: relative;
    width: 100%;
    height: 100%;
}
</style>

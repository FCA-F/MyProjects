<template>
    <div class="page-container">
        <div ref="container"></div>
        <DraggableModal title="选择对象">
            <div v-if="selectedObject">
                <div>{{ selectedObject.name }}</div>
                <div>{{ selectionPosition }}</div>
            </div>
        </DraggableModal>

    </div>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as THREE from 'three'
import { addGround, initThree } from '@/utils/three';
import DraggableModal from '@/components/Common/draggable-modal.vue';

const container = ref<HTMLDivElement>()
const selectedObject = ref<THREE.Mesh | null>(null)
const selectionPosition = ref('')

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let raycaster: THREE.Raycaster
let pointer: THREE.Vector2
let ground: THREE.Mesh
const selectableObjects: THREE.Mesh[] = []

onMounted(() => {
    const initResult = initThree(container.value!, {
        position: { x: 0, y: 5, z: 16 },
        targetPosition: { x: 0, y: 0, z: 0 },
    })
    scene = initResult.scene
    camera = initResult.camera
    renderer = initResult.renderer

    raycaster = new THREE.Raycaster()
    pointer = new THREE.Vector2()

    addGround(scene, -2)
    addSelectableObjects()

    //renderer.domElement=canvas
    renderer.domElement.addEventListener('pointermove', handlePointerMove)//鼠标移动
    renderer.domElement.addEventListener('click', handleClick)//鼠标点击
})

//添加物体
const addSelectableObjects = () => {
    const geometry = new THREE.BoxGeometry(2.2, 2.2, 2.2)
    const colors = [0x3b82f6, 0xef4444, 0x10b981, 0xf59e0b, 0x8b5cf6]
    const positions = [[-4, 0, 0], [-2, 2.8, -1], [0, 0, 0], [2.2, 2.5, -1.5], [4.3, 0, 0],]

    positions.forEach(([x, y, z], index) => {
        const material = new THREE.MeshStandardMaterial({
            color: colors[index],
            roughness: 0.45,
            metalness: 0.05,
        })
        const mesh = new THREE.Mesh(geometry, material)
        mesh.name = `Cube ${index + 1}`
        mesh.position.set(x, y, z)
        mesh.rotation.set(
            index * 0.18,
            index * 0.28,
            index * 0.12,
        )
        mesh.castShadow = true
        mesh.receiveShadow = true
        selectableObjects.push(mesh)
        scene.add(mesh)
    })
}

//计算鼠标NDC位置
const updatePointer = (event: PointerEvent) => {
    //canvas在页面中的位置和尺寸
    //返回类似{left:100,top:50,width:800,height:600}
    const rect = renderer.domElement.getBoundingClientRect()

    //求NDC
    //1.鼠标在 canvas 内部的 X 坐标（px）
    //2.鼠标在 canvas 水平方向的百分比
    //3.百分比(0~1) → NDC(-1~+1)
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
}

//射线检测物体
const getIntersectedObject = (event: PointerEvent) => {
    updatePointer(event)
    raycaster.setFromCamera(pointer, camera)//(NDC坐标,相机)
    const intersections = raycaster.intersectObjects(selectableObjects, false)//(检测的物体数组，不递归检查子物体)
    return intersections[0]?.object as THREE.Mesh | undefined
}

//鼠标移动事件
const handlePointerMove = (event: PointerEvent) => {
    const object = getIntersectedObject(event)
    renderer.domElement.style.cursor = object ? 'pointer' : 'default'
}

//鼠标点击事件
const handleClick = (event: MouseEvent) => {
    const object = getIntersectedObject(event as PointerEvent)
    selectObject(object)
}

//选择物体
const selectObject = (object?: THREE.Mesh) => {
    clearSelectedObject()
    if (!object) return

    //高光
    const material = object.material as THREE.MeshStandardMaterial
    material.emissive.set(0xffd166)
    material.emissiveIntensity = 1

    //赋值
    selectedObject.value = object
    selectionPosition.value =
        `position: (${object.position.x.toFixed(2)}, ` +
        `${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)})`
}

//清除选择物体
const clearSelectedObject = () => {
    if (!selectedObject.value) {
        return
    }

    const material = selectedObject.value.material as THREE.MeshStandardMaterial
    material.emissive.set(0x000000)
    material.emissiveIntensity = 0
    selectedObject.value = null
    selectionPosition.value = ''
}

onBeforeUnmount(() => {
    /*
    renderer?.domElement.removeEventListener('pointermove', handlePointerMove)
    renderer?.domElement.removeEventListener('click', handleClick)
    renderer?.domElement.removeEventListener('pointerleave', handlePointerLeave)

    selectableObjects.forEach((object) => {
        scene.remove(object)
        object.geometry.dispose()
    })
        */
})

</script>

<style>
.page-container {
    position: relative;
    width: 100%;
    height: 100%;
}
</style>

<template>
    <div class="page-container">
        <div ref="container"></div>
        <draggableModal title="添加、删除">
            <div class="row">
                <el-button @click="addMesh">添加</el-button>
                <el-button @click="reomveMesh">删除</el-button>
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

let scene: THREE.Scene

const container = ref<HTMLDivElement>()

onMounted(() => {
    const initResult = initThree(container.value!, { position: { x: 0, y: 5, z: 20 } })
    scene = initResult.scene

    addGround()
})


const addMesh = () => {
    const color = randomColor()
    const position = randomPosition()
    const rotation = randomRotation()

    const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5)
    const mat = new THREE.MeshStandardMaterial(
        {
            color: color,
            //roughness: 0.1,//粗糙度，1粗糙
            //metalness: 0.9//金属度，1金属
        }
    )
    const cube = new THREE.Mesh(geo, mat)
    cube.position.copy(position)
    cube.rotation.setFromVector3(rotation)
    cube.castShadow = true
    scene.add(cube)


}

const reomveMesh = () => {
    scene.children.pop()
}

const randomColor = () => {
    const r = Math.random()
    const g = Math.random()
    const b = Math.random()
    return new THREE.Color(r, g, b)
}

const randomPosition = () => {
    const x = -8 + Math.random() * 8
    const y = Math.random() * 8
    const z = -4 + Math.random() * 8
    return new THREE.Vector3(x, y, z)
}

const randomRotation = () => {
    const x = Math.random() * (Math.PI * 2)
    const y = Math.random() * (Math.PI * 2)
    const z = Math.random() * (Math.PI * 2)
    return new THREE.Vector3(x, y, z)
}

const addGround = () => {
    const groundGeo = new THREE.PlaneGeometry(10000, 10000)
    const groundMat = new THREE.MeshLambertMaterial({ color: 0xffffff })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.position.set(0, -2, 0)
    ground.rotation.set(Math.PI / -2, 0, 0)
    ground.receiveShadow = true
    scene.add(ground)
}

</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
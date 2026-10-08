<template>
    <div class="page-container">
        <div ref="container"></div>
        <draggableModal title="组" :isMove="false">
            <div class="long-label">组旋转</div>
            <el-slider v-model="groupRX" class="slider-input" show-input @input="group.rotation.x = groupRX"
                :min="-3.14" :max="3.14" :step="0.1" />
            <div class="long-label">Box旋转</div>
            <el-slider v-model="boxRX" class="slider-input" show-input @input="box.rotation.x = boxRX" :min="-3.14"
                :max="3.14" :step="0.1" />
            <div class="long-label">TorusKnot旋转</div>
            <el-slider v-model="torusKnotRX" class="slider-input" show-input @input="torusKnot.rotation.x = torusKnotRX"
                :min="-3.14" :max="3.14" :step="0.1" />
            <div class="long-label">Tetrahedron旋转</div>
            <el-slider v-model="tetrahedronRX" class="slider-input" show-input
                @input="tetrahedron.rotation.x = tetrahedronRX" :min="-3.14" :max="3.14" :step="0.1" />
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

let group: THREE.Group
let box: THREE.Mesh
let torusKnot: THREE.Mesh
let tetrahedron: THREE.Mesh

const groupRX = ref(0)
const boxRX = ref(0)
const torusKnotRX = ref(0)
const tetrahedronRX = ref(0)

onMounted(() => {
    const initResult = initThree(container.value!, { position: { x: 0, y: 0, z: 10 } })
    scene = initResult.scene
    createMesh()
    addGroup()
})

const createMesh = () => {
    //mat
    let boxMat = new THREE.MeshStandardMaterial({ color: 'red' })
    let torusKnotMat = new THREE.MeshStandardMaterial({ color: 'blue' })
    let tetrahedronMat = new THREE.MeshStandardMaterial({ color: 'yellow' })

    let boxGeo = new THREE.BoxGeometry()
    let torusKnotGeo = new THREE.TorusKnotGeometry(0.5, 0.1)
    let tetrahedronGeo = new THREE.TetrahedronGeometry()
    box = new THREE.Mesh(boxGeo, boxMat)
    box.position.set(-2, 0, 0)
    torusKnot = new THREE.Mesh(torusKnotGeo, torusKnotMat)
    torusKnot.position.set(0, 0, 0)
    tetrahedron = new THREE.Mesh(tetrahedronGeo, tetrahedronMat)
    tetrahedron.position.set(2, 0, 0)
}

const addGroup = () => {
    group = new THREE.Group()
    group.add(box)
    group.add(torusKnot)
    group.add(tetrahedron)
    scene.add(group)
}

</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
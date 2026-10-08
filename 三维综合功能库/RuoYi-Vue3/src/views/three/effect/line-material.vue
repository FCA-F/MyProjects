<template>
    <div class="page-container">
        <div ref="container"></div>
        <draggableModal title="线材质">
            <el-select v-model="lineMaterialType" @change="updateLineMaterial" class="input">
                <el-option label="lineBasicMaterial" value="lineBasicMaterial"></el-option>
                <el-option label="lineDashedMaterial" value="lineDashedMaterial"></el-option>
            </el-select>
        </draggableModal>
    </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import * as THREE from 'three'
import { initThree } from '@/utils/three';
import draggableModal from '@/components/Common/draggable-modal.vue';
import '@/components/Common/draggable-modal.css'
import { gosper } from 'three/examples/jsm/utils/GeometryUtils.js';

const container = ref<HTMLDivElement>()
let scene: THREE.Scene

const lineMaterialType = ref('lineBasicMaterial')
let lineMesh: THREE.Line


onMounted(() => {
    const initResult = initThree(container.value!, { position: { x: 0, y: 0, z: 400 } })
    scene = initResult.scene

    addLine()
})

const addLine = () => {
    const points = gosper(5)
    let vecs: THREE.Vector3[] = []
    for (let i = 0; i < points.length; i += 3) {
        vecs.push(new THREE.Vector3(points[i], points[i + 1], points[i + 2]))
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(vecs)
    const lineMat = new THREE.LineBasicMaterial({ color: 'red' })
    lineMesh = new THREE.Line(lineGeo, lineMat)
    lineMesh.position.set(0, 150, 0)
    scene.add(lineMesh)
}

const applyLineBasicMaterial = () => {
    const lineBasicMaterial = new THREE.LineBasicMaterial({ color: 'red' })
    lineMesh.material = lineBasicMaterial
}

const applyLineDashedMaterial = () => {
    const lineDashedMaterial = new THREE.LineDashedMaterial({ color: 'red' })
    lineMesh.material = lineDashedMaterial
    lineMesh.computeLineDistances()
}

const updateLineMaterial = () => {
    switch (lineMaterialType.value) {
        case 'lineBasicMaterial': applyLineBasicMaterial(); break
        case 'lineDashedMaterial': applyLineDashedMaterial(); break
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
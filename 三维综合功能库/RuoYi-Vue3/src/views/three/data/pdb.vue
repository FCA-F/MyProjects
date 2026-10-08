<template>
    <div class="page-container">
        <div ref="container"></div>
    </div>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as THREE from 'three'
import { initThree } from '@/utils/three';
import { PDBLoader } from 'three/examples/jsm/Addons.js';

const container = ref<HTMLDivElement>()
let scene: THREE.Scene

let atomGeometry: THREE.SphereGeometry
let group: THREE.Group


onMounted(() => {
    const initResult = initThree(container.value!, {
        position: { x: 0, y: 0, z: 12 },
        targetPosition: { x: 0, y: 0, z: 0 },
    })
    scene = initResult.scene
    loadMolecule()
})

const loadMolecule = async () => {
    group = new THREE.Group()

    const loader = new PDBLoader()
    const pdb = await loader.loadAsync('/three-data/model/molecules/caffeine.pdb')
    const atomPositions = pdb.geometryAtoms.getAttribute('position')//原子位置
    const atomColors = pdb.geometryAtoms.getAttribute('color')//原子颜色
    const bondPositions = pdb.geometryBonds.getAttribute('position')//化学键位置

    atomGeometry = new THREE.SphereGeometry(0.22, 20, 12)

    //原子
    for (let i = 0; i < atomPositions.count; i++) {
        const color = new THREE.Color(
            atomColors.getX(i),
            atomColors.getY(i),
            atomColors.getZ(i),
        )
        const atomMaterial = new THREE.MeshPhongMaterial({
            color,
            shininess: 80,
        })
        const atom = new THREE.Mesh(atomGeometry, atomMaterial)
        atom.position.fromBufferAttribute(atomPositions, i)
        atom.castShadow = true
        atom.receiveShadow = true
        group.add(atom)
    }

    //化学键
    for (let i = 0; i < bondPositions.count; i += 2) {
        const start = new THREE.Vector3().fromBufferAttribute(bondPositions, i)
        const end = new THREE.Vector3().fromBufferAttribute(bondPositions, i + 1)
        const path = new THREE.LineCurve3(start, end)//直线型曲线
        const bondGeometry = new THREE.TubeGeometry(path, 1, 0.065, 8, false)//路径，分段数，半径，横截面是正几边形，是否闭合
        const bondMaterial = new THREE.MeshPhongMaterial({
            color: 0x8d8d8d,
            shininess: 60,
        })
        const bond = new THREE.Mesh(bondGeometry, bondMaterial)
        bond.castShadow = true
        bond.receiveShadow = true
        group.add(bond)
    }
    scene.add(group)
}

onBeforeUnmount(() => {
    scene.remove(group)
})

</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}

.page-container>div {
    width: 100%;
    height: 100%;
}
</style>

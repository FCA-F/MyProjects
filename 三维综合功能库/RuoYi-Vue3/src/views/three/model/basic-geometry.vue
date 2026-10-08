<template>
    <div class="page-container">
        <div ref="container"></div>
        <draggableModal title="基本几何体">
            <div class="row">
                <el-select v-model="meshType" @change="switchMesh()" class="input">
                    <el-option label="PlaneGeometry" value="PlaneGeometry" />
                    <el-option label="CircleGeometry" value="CircleGeometry" />
                    <el-option label="RingGeometry" value="RingGeometry" />
                    <el-option label="ShapeGeometry" value="ShapeGeometry" />
                    <el-option label="BoxGeometry" value="BoxGeometry" />
                    <el-option label="SphereGeometry" value="SphereGeometry" />
                    <el-option label="CylinderGeometry" value="CylinderGeometry" />
                    <el-option label="ConeGeometry" value="ConeGeometry" />
                    <el-option label="TorusKnotGeometry" value="TorusKnotGeometry" />
                    <el-option label="TetrahedronGeometry" value="TetrahedronGeometry" />
                    <el-option label="OctahedronGeometry" value="OctahedronGeometry" />
                    <el-option label="DodecahedronGeometry" value="DodecahedronGeometry" />
                    <el-option label="IcosahedronGeometry" value="IcosahedronGeometry" />
                </el-select>
            </div>

            <div class="row">
                <div class="label">线框</div>
                <el-switch v-model="isWireframe" @change="switchWireframe" />
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

let mesh: THREE.Mesh
const meshType = ref('PlaneGeometry')
const isWireframe = ref(false)

onMounted(() => {
    const initResult = initThree(container.value!, { position: { x: 0, y: 4, z: 20 } })
    scene = initResult.scene

    addGround()
    switchMesh()
})

const addPlaneGeometry = () => {
    const geo = new THREE.PlaneGeometry(10, 10)
    const mat = new THREE.MeshStandardMaterial({ color: 'red', side: THREE.DoubleSide })
    mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)
}

const addCircleGeometry = () => {
    const geo = new THREE.CircleGeometry(5)
    const mat = new THREE.MeshStandardMaterial({ color: 'red', side: THREE.DoubleSide })
    mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)
}

const addRingGeometry = () => {
    const geo = new THREE.RingGeometry(2, 5)
    const mat = new THREE.MeshStandardMaterial({ color: 'red', side: THREE.DoubleSide })
    mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)
}

const addShapeGeometry = () => {
    // 脸（大圆）
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 10, 0, Math.PI * 2, false);//x偏移，y偏移，半径，起始角度，终止角度，顺逆时针

    // 左眼（洞）
    const leftEye = new THREE.Path();
    leftEye.absellipse(-3.5, 3, 1.2, 1.5, 0, Math.PI * 2, true);//x偏移，y偏移，x半径，y半径，起始角度，终止角度，顺逆时针
    shape.holes.push(leftEye);

    // 右眼（洞）
    const rightEye = new THREE.Path();
    rightEye.absellipse(3.5, 3, 1.2, 1.5, 0, Math.PI * 2, true);
    shape.holes.push(rightEye);

    // 嘴巴（洞）
    const mouth = new THREE.Path();
    mouth.absarc(0, -2, 4, Math.PI, Math.PI * 2, false); // 下半圆弧（U型）
    mouth.closePath(); // 直线连回起点，形成闭合洞
    shape.holes.push(mouth);

    // 生成几何体和材质
    const geo = new THREE.ShapeGeometry(shape, 64);//shape,圆精细度
    const mat = new THREE.MeshStandardMaterial({ color: 'red', side: THREE.DoubleSide });

    mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
};

const addBoxGeometry = () => {
    const geo = new THREE.BoxGeometry(20, 5, 5)
    const mat = new THREE.MeshStandardMaterial({ color: 'red', side: THREE.DoubleSide });
    mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)
}

const addSphereGeometry = () => {
    const geo = new THREE.SphereGeometry(5)
    const mat = new THREE.MeshStandardMaterial({ color: 'red', side: THREE.DoubleSide });
    mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)
}

const addCylinderGeometry = () => {
    const geo = new THREE.CylinderGeometry(3, 5, 10)
    const mat = new THREE.MeshStandardMaterial({ color: 'red', side: THREE.DoubleSide });
    mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)
}

const addConeGeometry = () => {
    const geo = new THREE.ConeGeometry(5, 10)
    const mat = new THREE.MeshStandardMaterial({ color: 'red', side: THREE.DoubleSide });
    mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)
}

const addTorusKnotGeometry = () => {
    const geo = new THREE.TorusKnotGeometry(5, 1, 64, 8)//半径，管道半径，外圈数，内圈数
    const mat = new THREE.MeshStandardMaterial({ color: 'red', side: THREE.DoubleSide });
    mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)
}

const addTetrahedronGeometry = () => {
    const geo = new THREE.TetrahedronGeometry(5)
    const mat = new THREE.MeshStandardMaterial({ color: 'red', side: THREE.DoubleSide });
    mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)
}

const addOctahedronGeometry = () => {
    const geo = new THREE.OctahedronGeometry(5)
    const mat = new THREE.MeshStandardMaterial({ color: 'red', side: THREE.DoubleSide });
    mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)
}

const addDodecahedronGeometry = () => {
    const geo = new THREE.DodecahedronGeometry(5)
    const mat = new THREE.MeshStandardMaterial({ color: 'red', side: THREE.DoubleSide });
    mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)
}

const addIcosahedronGeometry = () => {
    const geo = new THREE.IcosahedronGeometry(5)
    const mat = new THREE.MeshStandardMaterial({ color: 'red', side: THREE.DoubleSide });
    mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)
}
/*
const addGeometry = () => {
    const geo = new THREE
    const mat = new THREE.MeshStandardMaterial({ color: 'red', side: THREE.DoubleSide });
    mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)
}
*/


const removeMesh = () => {
    if (mesh) {
        scene.remove(mesh)
    }
}

const addGround = () => {
    const groundGeo = new THREE.PlaneGeometry(10000, 10000)
    const groundMat = new THREE.MeshLambertMaterial({ color: 0xffffff })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.position.set(0, -10, 0)
    ground.rotation.set(Math.PI / -2, 0, 0)
    ground.receiveShadow = true
    scene.add(ground)
}


const switchMesh = () => {
    removeMesh()
    switch (meshType.value) {
        case 'PlaneGeometry': addPlaneGeometry(); break
        case 'CircleGeometry': addCircleGeometry(); break
        case 'RingGeometry': addRingGeometry(); break
        case 'ShapeGeometry': addShapeGeometry(); break
        case 'BoxGeometry': addBoxGeometry(); break
        case 'SphereGeometry': addSphereGeometry(); break
        case 'CylinderGeometry': addCylinderGeometry(); break
        case 'ConeGeometry': addConeGeometry(); break
        case 'TorusKnotGeometry': addTorusKnotGeometry(); break
        case 'TetrahedronGeometry': addTetrahedronGeometry(); break
        case 'OctahedronGeometry': addOctahedronGeometry(); break
        case 'DodecahedronGeometry': addDodecahedronGeometry(); break
        case 'IcosahedronGeometry': addIcosahedronGeometry(); break
        default: break
    }
    (mesh.material as THREE.MeshStandardMaterial).wireframe = isWireframe.value
    mesh.castShadow = true
}

const switchWireframe = () => {
    if (isWireframe.value) {
        (mesh.material as THREE.MeshStandardMaterial).wireframe = true
    }
    else {
        (mesh.material as THREE.MeshStandardMaterial).wireframe = false
    }
}
</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
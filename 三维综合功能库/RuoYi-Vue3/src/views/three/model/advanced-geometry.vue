<template>
    <div class="page-container">
        <div ref="container"></div>
        <draggableModal title="高级几何体">
            <div class="row">
                <el-select v-model="meshType" @change="switchMesh()" class="input">
                    <el-option label="ConvexGeometry" value="ConvexGeometry" />
                    <el-option label="LatheGeometry" value="LatheGeometry" />
                    <el-option label="BoxLineGeometry" value="BoxLineGeometry" />
                    <el-option label="RoundedBoxGeometry" value="RoundedBoxGeometry" />
                    <el-option label="TeapotGeometry" value="TeapotGeometry" />
                    <el-option label="ExtrudeGeometry" value="ExtrudeGeometry" />
                    <el-option label="TubeGeometry" value="TubeGeometry" />
                    <el-option label="ParametricGeometry" value="ParametricGeometry" />
                    <el-option label="EdgesGeometry" value="EdgesGeometry" />
                    <el-option label="WireFrameGeometry" value="WireFrameGeometry" />
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
import { BoxLineGeometry, ConvexGeometry, ParametricGeometry, RoundedBoxGeometry, TeapotGeometry } from 'three/examples/jsm/Addons.js';

const container = ref<HTMLDivElement>()
let scene: THREE.Scene

let mesh: THREE.Mesh | THREE.LineSegments
const meshType = ref('ConvexGeometry')
const isWireframe = ref(false)

onMounted(() => {
    const initResult = initThree(container.value!, { position: { x: 0, y: 4, z: 20 } })
    scene = initResult.scene

    addGround()
    switchMesh()
})

const addConvexGeometry = () => {
    const points: THREE.Vector3[] = []
    for (let i = 0; i < 20; i++) {
        let x = -4 + Math.random() * 8
        let y = -4 + Math.random() * 8
        let z = -4 + Math.random() * 8
        points.push(new THREE.Vector3(x, y, z))
    }

    const geo = new ConvexGeometry(points)
    const mat = new THREE.MeshStandardMaterial({ color: 'red', side: THREE.DoubleSide });
    mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)
}

const addLatheGeometry = () => {
    const points: THREE.Vector2[] = []

    // 高脚杯轮廓（x = 半径, y = 高度）
    points.push(new THREE.Vector2(0, 0))        // 底部中心
    points.push(new THREE.Vector2(3, 0))        // 底座边缘
    points.push(new THREE.Vector2(3, 0.5))      // 底座厚度
    points.push(new THREE.Vector2(0.5, 0.5))    // 杯柄底部
    points.push(new THREE.Vector2(0.5, 6))      // 杯柄顶部
    points.push(new THREE.Vector2(4, 7))        // 杯身底部
    points.push(new THREE.Vector2(5, 9))        // 杯身最宽处
    points.push(new THREE.Vector2(4, 11))       // 杯口
    points.push(new THREE.Vector2(0, 11))       // 杯口中心（闭合顶部）


    const geo = new THREE.LatheGeometry(points, 64)// 第二个参数 64 = 旋转方向分段数，越大越圆
    const mat = new THREE.MeshStandardMaterial({ color: 'red', side: THREE.DoubleSide })
    mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(0, -4, 0)
    scene.add(mesh)
}


const addBoxLineGeometry = () => {
    const geo = new BoxLineGeometry(20, 5, 5)
    const mat = new THREE.LineBasicMaterial({ color: 'red', side: THREE.DoubleSide });
    mesh = new THREE.LineSegments(geo, mat)
    scene.add(mesh)
}

const addRoundedBoxGeometry = () => {
    const geo = new RoundedBoxGeometry(20, 5, 5, 10, 2)//x,y,z,	圆角处的分段数,圆角半径
    const mat = new THREE.MeshStandardMaterial({ color: 'red', side: THREE.DoubleSide });
    mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)
}

const addTeapotGeometry = () => {
    const geo = new TeapotGeometry(5)
    const mat = new THREE.MeshStandardMaterial({ color: 'red', side: THREE.DoubleSide });
    mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)
}

const addExtrudeGeometry = () => {
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

    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 10,
        curveSegments: 64
    })
    const mat = new THREE.MeshStandardMaterial({ color: 'red', side: THREE.DoubleSide });
    mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(0, 0, -10)
    scene.add(mesh)
}

const addTubeGeometry = () => {
    const points: THREE.Vector3[] = []
    for (let i = 0; i < 20; i++) {
        let x = -4 + Math.random() * 8
        let y = -4 + Math.random() * 8
        let z = -4 + Math.random() * 8
        points.push(new THREE.Vector3(x, y, z))
    }

    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, 0.3, 32, false)//path,tubularSegments,radius,radialSegments,closed
    const mat = new THREE.MeshStandardMaterial({ color: 'red', side: THREE.DoubleSide });
    mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)
}

const addParametricGeometry = () => {
    const wave = (u: number, v: number, optionalTarget: THREE.Vector3) => {
        var result = optionalTarget || new THREE.Vector3()
        var r = 20
        var x = Math.sin(u) * r - 10
        var z = Math.sin(v / 2) * 2 * r + -10
        var y = Math.sin(u * 4 * Math.PI) + Math.cos(v * 2 * Math.PI)
        return result.set(x, y, z)
    }
    const geo = new ParametricGeometry(wave, 120, 120)
    const mat = new THREE.MeshStandardMaterial({ color: 'red', side: THREE.DoubleSide });
    mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)
}

const addEdgesGeometry = () => {
    const baseGeo = new RoundedBoxGeometry(5, 5, 5, 10, 1)//x,y,z,圆角分段数，r
    const geo = new THREE.EdgesGeometry(baseGeo, 1.5)//基础geo，阈值角度​ — 两个相邻面的法线夹角大于这个值才显示边线
    const mat = new THREE.LineBasicMaterial({ color: 'red', side: THREE.DoubleSide });
    mesh = new THREE.LineSegments(geo, mat)
    scene.add(mesh)
}

const addWireFrameGeometry = () => {
    const baseGeo = new THREE.TorusKnotGeometry(3, 1, 100, 20, 6, 9)//半径，管道半径，​沿管子长度方向的分段数,管子横截面的边数,外圈数，内圈数
    const geo = new THREE.WireframeGeometry(baseGeo)
    const mat = new THREE.LineBasicMaterial({ color: 'red', side: THREE.DoubleSide });
    mesh = new THREE.LineSegments(geo, mat)
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
        case 'ConvexGeometry': addConvexGeometry(); break
        case 'LatheGeometry': addLatheGeometry(); break
        case 'BoxLineGeometry': addBoxLineGeometry(); break
        case 'RoundedBoxGeometry': addRoundedBoxGeometry(); break
        case 'TeapotGeometry': addTeapotGeometry(); break
        case 'ExtrudeGeometry': addExtrudeGeometry(); break
        case 'TubeGeometry': addTubeGeometry(); break
        case 'ParametricGeometry': addParametricGeometry(); break
        case 'EdgesGeometry': addEdgesGeometry(); break
        case 'WireFrameGeometry': addWireFrameGeometry(); break
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
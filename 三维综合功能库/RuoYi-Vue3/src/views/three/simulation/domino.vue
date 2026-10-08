<template>
    <div class="page-container">
        <div ref="container" class="three-container"></div>
        <draggableModal title="多米诺骨牌">
            <div class="row">
                <el-button class="draw-button" type="success" @click="pushFirstDomino">
                    推倒
                </el-button>
                <el-button class="draw-button" type="primary" @click="resetDominos">
                    重建
                </el-button>

            </div>
            <div class="row">
                {{ standingCount }} / {{ dominoCount }} standing
            </div>
        </draggableModal>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import * as THREE from 'three'
import * as RAPIER from '@dimforge/rapier3d'
import { initThree, loadWoodBackground } from '@/utils/three'
import draggableModal from '@/components/Common/draggable-modal.vue'
import '@/components/Common/draggable-modal.css'

interface Domino {
    mesh: THREE.Mesh
    body: RAPIER.RigidBody
}

const DOMINO_WIDTH = 0.05//骨牌宽度
const DOMINO_HEIGHT = 0.5//骨牌高度
const DOMINO_DEPTH = 0.2//骨牌深度
const DOMINO_DENSITY = 120//骨牌密度
const START_TORQUE_IMPULSE = 0.05//开始推力

const BOARD_SIZE = 8//底盘边长
const BOARD_TOP = 0//底盘Y坐标
const railHeight = 0.65//围栏高度
const railThickness = 0.18//围栏厚度

const container = ref<HTMLDivElement>()
let scene: THREE.Scene
let world: RAPIER.World
let dominosGroup: THREE.Group
let dominos: Domino[] = []
let dominoGeometry: THREE.BoxGeometry
let dominoMaterials: THREE.MeshStandardMaterial[]

const dominoCount = ref(0)//骨牌数量
const standingCount = ref(0)//站立数量
let frameCount = 0//帧数

onMounted(async () => {
    const initResult = initThree(container.value!, {
        position: { x: 7, y: 7, z: 10 },
        targetPosition: { x: 0, y: 0, z: 0 },
    })
    scene = initResult.scene
    await loadWoodBackground(scene)

    world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
    addBoard()
    createDominos()
    animate()
})

const addBoard = () => {
    const boardMaterial = new THREE.MeshStandardMaterial({
        color: '#8a552d',
        roughness: 0.82,
        metalness: 0.05,
    })
    const railMaterial = new THREE.MeshStandardMaterial({
        color: '#5f351d',
        roughness: 0.88,
        metalness: 0.02,
    })
    //地面
    addStaticBox(
        new THREE.Vector3(BOARD_SIZE, 0.35, BOARD_SIZE),
        new THREE.Vector3(0, -0.175, 0),
        boardMaterial
    )
    //墙
    addStaticBox(
        new THREE.Vector3(BOARD_SIZE, railHeight, railThickness),
        new THREE.Vector3(0, railHeight / 2, -(BOARD_SIZE - railThickness) / 2),
        railMaterial
    )
    addStaticBox(
        new THREE.Vector3(BOARD_SIZE, railHeight, railThickness),
        new THREE.Vector3(0, railHeight / 2, (BOARD_SIZE - railThickness) / 2),
        railMaterial
    )
    addStaticBox(
        new THREE.Vector3(railThickness, railHeight, BOARD_SIZE - railThickness * 2),
        new THREE.Vector3(-(BOARD_SIZE - railThickness) / 2, railHeight / 2, 0),
        railMaterial
    )
    addStaticBox(
        new THREE.Vector3(railThickness, railHeight, BOARD_SIZE - railThickness * 2),
        new THREE.Vector3((BOARD_SIZE - railThickness) / 2, railHeight / 2, 0),
        railMaterial
    )
}

const addStaticBox = (
    size: THREE.Vector3,
    position: THREE.Vector3,
    material: THREE.MeshStandardMaterial
) => {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(size.x, size.y, size.z),
        material
    )
    mesh.position.copy(position)
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)

    const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(
            position.x,
            position.y,
            position.z
        )
    )
    const collider = RAPIER.ColliderDesc.cuboid(
        size.x / 2,
        size.y / 2,
        size.z / 2
    )
        .setFriction(0.85)//摩擦力
        .setRestitution(0.05)//恢复力
    world.createCollider(collider, body)
}

const getPoints = () => {
    const points: THREE.Vector3[] = []
    const radius = 2.8
    const centerX = 0
    const centerZ = 0
    let circleOffset = 0

    for (let i = 0; i < 1200; i += 6 + circleOffset) {
        circleOffset = 1.5 * (i / 360)
        const distance = (radius / 1440) * (1440 - i)
        const angle = i * (Math.PI / 180)
        const x = distance * Math.cos(angle) + centerX
        const z = distance * Math.sin(angle) + centerZ
        points.push(new THREE.Vector3(x, BOARD_TOP + DOMINO_HEIGHT / 2, z))
    }

    return points
}

const createDominos = () => {
    dominosGroup = new THREE.Group()
    dominosGroup.name = 'dominos'
    scene.add(dominosGroup)

    dominoGeometry = new THREE.BoxGeometry(
        DOMINO_WIDTH,
        DOMINO_HEIGHT,
        DOMINO_DEPTH
    )
    dominoMaterials = [
        new THREE.MeshStandardMaterial({
            color: 0x66ff00,
            roughness: 0.48,
            metalness: 0.08,
        }),
        new THREE.MeshStandardMaterial({
            color: 0x6600ff,
            roughness: 0.48,
            metalness: 0.08,
        }),
    ]

    getPoints().forEach((point, index) => {
        const mesh = new THREE.Mesh(
            dominoGeometry,
            dominoMaterials[index % dominoMaterials.length]
        )
        mesh.position.copy(point)
        mesh.lookAt(new THREE.Vector3(0, point.y, 0))
        mesh.castShadow = true
        mesh.receiveShadow = true
        dominosGroup.add(mesh)

        const rotation = mesh.quaternion
        const bodyDescription = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(mesh.position.x, mesh.position.y, mesh.position.z)
            .setRotation({
                x: rotation.x,
                y: rotation.y,
                z: rotation.z,
                w: rotation.w,
            })
            .setCanSleep(true)
            .setSleeping(true)//创建时睡眠
            .setCcdEnabled(true)//连续碰撞检测
            .setAdditionalSolverIterations(2)//额外求解迭代2次，更精细
        const body = world.createRigidBody(bodyDescription)

        const collider = RAPIER.ColliderDesc.cuboid(
            DOMINO_WIDTH / 2,
            DOMINO_HEIGHT / 2,
            DOMINO_DEPTH / 2
        )
            .setFriction(0.72)
            .setRestitution(0.02)
            .setDensity(DOMINO_DENSITY)
        world.createCollider(collider, body)

        dominos.push({ mesh, body })
    })

    dominoCount.value = dominos.length
    standingCount.value = dominos.length
}

const resetDominos = () => {
    if (!world || !scene) return

    dominos.forEach(({ mesh, body }) => {
        dominosGroup.remove(mesh)
        scene.remove(mesh)
        world.removeRigidBody(body)
    })
    dominos = []
    createDominos()
}

const pushFirstDomino = () => {

    const firstDomino = dominos[0]
    const secondDomino = dominos[1]
    if (!firstDomino || !secondDomino) return

    const direction = new THREE.Vector3()
        .subVectors(secondDomino.mesh.position, firstDomino.mesh.position)//从第一块指向第二块的向量
        .setY(0)//Y分量清零
        .normalize()//正则化
    const rotationAxis = new THREE.Vector3()
        .crossVectors(new THREE.Vector3(0, 1, 0), direction)//与Y叉乘，得倒下的旋转轴，垂直于骨牌面向
        .normalize()

    firstDomino.body.applyTorqueImpulse(//扭矩冲量，给力让骨牌原地翻转
        {
            x: rotationAxis.x * START_TORQUE_IMPULSE,//方向*力量大小
            y: rotationAxis.y * START_TORQUE_IMPULSE,
            z: rotationAxis.z * START_TORQUE_IMPULSE,
        },
        true//唤醒
    )
}

const animate = () => {
    requestAnimationFrame(animate)
    world.step()

    dominos.forEach(({ mesh, body }) => {
        const position = body.translation()
        const rotation = body.rotation()
        mesh.position.set(position.x, position.y, position.z)
        mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
    })

    frameCount += 1
    if (frameCount % 8 === 0) {
        const up = new THREE.Vector3(0, 1, 0)
        let count = 0
        for (const domino of dominos) {
            up.set(0, 1, 0).applyQuaternion(domino.mesh.quaternion) //Y分量*旋转
            if (up.y > 0.707) count++   //倾斜 45°
        }
        standingCount.value = count
    }
}

</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>

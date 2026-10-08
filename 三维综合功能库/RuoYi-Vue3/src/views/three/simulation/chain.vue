<template>
    <div class="page-container">
        <div ref="container" class="page-container"></div>
        <draggableModal title="链子">
            <div class="row">
                <el-button class="draw-button" type="primary" @click="resetChain">添加</el-button>
            </div>
        </draggableModal>
    </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import * as RAPIER from '@dimforge/rapier3d'
import { initThree, loadWoodBackground } from '@/utils/three'
import draggableModal from '@/components/Common/draggable-modal.vue'
import '@/components/Common/draggable-modal.css'

interface Bead {
    mesh: THREE.Mesh
    body: RAPIER.RigidBody
}

const BEAD_COUNT = 50//珠子数量
const BEAD_RADIUS = 0.05//珠子半径
const BEAD_START_X = -4//珠子起始X
const BEAD_SPACING = 1 / 7//珠子间隔
const BEAD_START_Y = 2//珠子起始高度
const BAR_LENGTH = 7//杆子长度
const BAR_RADIUS = 0.2//杆子半径

const container = ref<HTMLDivElement>()

let scene: THREE.Scene
let world: RAPIER.World
let beadsGroup: THREE.Group
let barMesh: THREE.Mesh
let barBody: RAPIER.RigidBody
let beads: Bead[] = []
let animationFrame = 0
let beadGeometry: THREE.SphereGeometry
let beadMaterials: THREE.MeshStandardMaterial[]

onMounted(async () => {
    const initResult = initThree(container.value!, {
        position: { x: -1.5, y: 3, z: 8 },
        targetPosition: { x: 0, y: 0, z: 0 },
    })
    scene = initResult.scene
    await loadWoodBackground(scene)

    world = new RAPIER.World({ x: 0, y: -5, z: 0 })
    createBar()
    createBeads()
    animate()
})

const createBar = () => {
    barMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(BAR_RADIUS, BAR_RADIUS, BAR_LENGTH, 64),
        new THREE.MeshStandardMaterial({
            color: 0xff4444,
            roughness: 0.42,
            metalness: 0.18,
        })
    )
    barMesh.castShadow = true
    barMesh.receiveShadow = true
    barMesh.position.set(0, 0, 0)
    barMesh.rotation.x = Math.PI / 2
    scene.add(barMesh)

    const barRotation = new THREE.Quaternion().setFromEuler(barMesh.rotation)//欧拉角转四元数
    const bodyDescription = RAPIER.RigidBodyDesc.fixed()
        .setTranslation(0, 0, 0)
        .setRotation({
            x: barRotation.x,
            y: barRotation.y,
            z: barRotation.z,
            w: barRotation.w,
        })
        .setCanSleep(false)
    barBody = world.createRigidBody(bodyDescription)

    const collider = RAPIER.ColliderDesc.cylinder(
        BAR_LENGTH / 2,
        BAR_RADIUS
    ).setFriction(0)
    world.createCollider(collider, barBody)
}

const createBeads = () => {
    beadsGroup = new THREE.Group()
    beadsGroup.name = 'beads'
    scene.add(beadsGroup)

    beadGeometry = new THREE.SphereGeometry(BEAD_RADIUS, 20, 14)
    beadMaterials = [
        new THREE.MeshStandardMaterial({
            color: 0x66ff00,
            roughness: 0.36,
            metalness: 0.08,
            transparent: true,
            opacity: 0.9,
        }),
        new THREE.MeshStandardMaterial({
            color: 0x6600ff,
            roughness: 0.36,
            metalness: 0.08,
            transparent: true,
            opacity: 0.9,
        }),
    ]

    for (let i = 0; i < BEAD_COUNT; i++) {
        const position = new THREE.Vector3(
            BEAD_START_X + i * BEAD_SPACING,
            BEAD_START_Y,
            0
        )
        const mesh = new THREE.Mesh(
            beadGeometry,
            beadMaterials[i % beadMaterials.length]
        )
        mesh.position.set(position.x, position.y, position.z)
        mesh.castShadow = true
        mesh.receiveShadow = true
        beadsGroup.add(mesh)

        const bodyDescription = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(position.x, position.y, position.z)
            .setCanSleep(false)
        const body = world.createRigidBody(bodyDescription)
        world.createCollider(
            RAPIER.ColliderDesc.ball(BEAD_RADIUS),
            body
        )
        beads.push({ mesh, body })
    }

    createChain()
}

const createChain = () => {
    for (let i = 1; i < beads.length; i++) {
        const previousBead = beads[i - 1]
        const thisBead = beads[i]

        const params = RAPIER.JointData.spherical(//球节点，在各自刚体上选一个点，钉在球心
            { x: 0, y: 0, z: 0 },
            { x: BEAD_SPACING, y: 0, z: 0 }
        )
        world.createImpulseJoint(
            params,
            thisBead.body,
            previousBead.body,
            true
        )
    }
}

const resetChain = () => {
    if (!world || !scene) return

    beads.forEach(({ mesh, body }) => {
        beadsGroup.remove(mesh)
        world.removeRigidBody(body)
    })
    scene.remove(beadsGroup)
    beads = []
    createBeads()
}

const animate = () => {
    animationFrame = requestAnimationFrame(animate)
    world.step()

    beads.forEach(({ mesh, body }) => {
        const position = body.translation()
        const rotation = body.rotation()
        mesh.position.set(position.x, position.y, position.z)
        mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
    })
}

onBeforeUnmount(() => {
    cancelAnimationFrame(animationFrame)
    beads.forEach(({ mesh, body }) => {
        beadsGroup.remove(mesh)
        world.removeRigidBody(body)
    })
    scene.remove(beadsGroup)
    beads = []
})
</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
}
</style>

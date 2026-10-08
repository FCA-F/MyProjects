<template>
    <div class="page-container">
        <div ref="container"></div>
        <draggableModal title="物体弹跳">
            <div class="row">
                <el-button class="draw-button" @click="addSphere()" type="primary">添加</el-button>
            </div>
        </draggableModal>
    </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import * as THREE from 'three'
import { initThree, loadWoodBackground } from '@/utils/three';
import draggableModal from '@/components/Common/draggable-modal.vue';
import '@/components/Common/draggable-modal.css'
import * as RAPIER from '@dimforge/rapier3d'

interface sphere {
    mesh: THREE.Mesh
    body: RAPIER.RigidBody
}

let group: sphere[] = []

const container = ref<HTMLDivElement>()
let scene: THREE.Scene


let world: RAPIER.World

onMounted(async () => {
    const initResult = initThree(container.value!, { position: { x: 0, y: 10, z: 40 }, })
    scene = initResult.scene
    await loadWoodBackground(scene)

    world = new RAPIER.World({ x: 0, y: -3, z: 0 })//-9.81为地球重力
    addGround()
    addSphere()
    animate()
})

const addGround = () => {
    const geo = new THREE.BoxGeometry(30, 0.2, 30)
    const mat = new THREE.MeshStandardMaterial({
        color: '#2a2a2a',
        roughness: 0.8,      // 地面粗糙一点，小球弹跳更真实
        metalness: 0.1
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(0, -5, 0)
    scene.add(mesh)

    const bodyDesc = new RAPIER.RigidBodyDesc(RAPIER.RigidBodyType.Fixed)//rigid刚体，不变性
    const body = world.createRigidBody(bodyDesc)//刚体
    body.setTranslation({ x: 0, y: -5, z: 0 }, true)//位置移动，true为唤醒沉睡物体
    const colliderDesc = RAPIER.ColliderDesc.cuboid(15, 0.1, 15)
        .setRestitution(0.7)//弹性
        .setFriction(0.5)// 摩擦力调低
    world.createCollider(colliderDesc, body)//外壳，碰撞体
}

const addSphere = () => {
    for (let i = 0; i < 100; i++) {
        const color = randomColor()
        const position = randomPosition()

        //Three
        const geo = new THREE.SphereGeometry(0.5)
        const mat = new THREE.MeshPhongMaterial({ color })
        const mesh = new THREE.Mesh(geo, mat)
        mesh.position.set(position.x, position.y, position.z)
        scene.add(mesh)

        //Rapier
        const bodyDesc = new RAPIER.RigidBodyDesc(RAPIER.RigidBodyType.Dynamic)
        const body = world.createRigidBody(bodyDesc)
        body.setTranslation({ x: position.x, y: position.y, z: position.z }, true)
        const colliderDesc = RAPIER.ColliderDesc.ball(0.5)
            .setRestitution(0.85)// ← 弹性，0.8~0.9 弹得很欢
            .setFriction(0.2)// ← 摩擦力调低，减少水平方向能量损耗
            .setDensity(0.5)    // 密度低一点，球更轻，弹得更高
        world.createCollider(colliderDesc, body)

        group.push({ mesh, body })
    }
}

const animate = () => {
    requestAnimationFrame(animate)
    world.step()

    group = group.filter((sphere) => {
        const mesh = sphere.mesh
        const body = sphere.body
        const position = body.translation()
        const rotation = body.rotation()
        mesh.position.set(position.x, position.y, position.z)
        mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
        if (position.y < -40) {
            scene.remove(mesh)
            world.removeRigidBody(body)
            return false
        }
        return true
    })

}
//other
const randomColor = () => {
    const r = Math.random()
    const g = Math.random()
    const b = Math.random()
    return new THREE.Color(r, g, b)
}

const randomPosition = () => {
    const x = -10 + Math.random() * 20
    const y = Math.random() * 30
    const z = -10 + Math.random() * 20
    return new THREE.Vector3(x, y, z)
}



</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
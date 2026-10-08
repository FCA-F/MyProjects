<template>
    <div class="page-container">
        <div ref="container"></div>
        <draggableModal>
            <div class="row">
                <el-button class="draw-button" @click="addDropBox" type="primary">添加</el-button>
                <el-button class="draw-button" @click="levelStick" type="danger">整平</el-button>
            </div>
        </draggableModal>
    </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import * as THREE from 'three'
import * as RAPIER from '@dimforge/rapier3d'
import { initThree, loadWoodBackground } from '@/utils/three';
import draggableModal from '@/components/Common/draggable-modal.vue';
import '@/components/Common/draggable-modal.css'

interface MB {
    mesh: THREE.Mesh,
    body: RAPIER.RigidBody
}

const container = ref<HTMLDivElement>()
let scene: THREE.Scene
let world: RAPIER.World

let centerBox: MB
let stick: MB
let dropBox: MB
let group: MB[] = []


onMounted(async () => {
    const initResult = initThree(container.value!, { position: { x: 0, y: 2, z: 5 } })
    scene = initResult.scene
    world = new RAPIER.World({ x: 0, y: -5, z: 0 })

    await loadWoodBackground(scene)

    addCenterBox()//固定盒子
    addStick()//旋转杆子
    joinCenterBoxAndStick()//连接盒子和杆子
    addDropBox()

    animate()
})

const addCenterBox = () => {
    const position = { x: 0, y: 0, z: 0 }
    const size = { x: 0.5, y: 0.5, z: 0.5 }
    const geo = new THREE.BoxGeometry(size.x, size.y, size.z)
    const mat = new THREE.MeshStandardMaterial({ color: 'red' })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(position.x, position.y, position.z)
    scene.add(mesh)

    const bodyDesc = new RAPIER.RigidBodyDesc(RAPIER.RigidBodyType.Fixed)
    const body = world.createRigidBody(bodyDesc)
    body.setTranslation({ x: position.x, y: position.y, z: position.z }, true)
    const colliderDesc = RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2)
    const collider = world.createCollider(colliderDesc, body)


    centerBox = { mesh, body }
    group.push(centerBox)
}

const addStick = () => {
    const position = { x: 0, y: 0, z: 0.5 }
    const size = { x: 4, y: 0.1, z: 0.5 }
    const geo = new THREE.BoxGeometry(size.x, size.y, size.z)
    const mat = new THREE.MeshStandardMaterial({ color: 'yellow' })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(position.x, position.y, position.z)
    scene.add(mesh)

    const bodyDesc = new RAPIER.RigidBodyDesc(RAPIER.RigidBodyType.Dynamic)
    const body = world.createRigidBody(bodyDesc)
    body.setAngularDamping(0.08)
    const colliderDesc = RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2)
    const collider = world.createCollider(colliderDesc, body)
    body.setTranslation({ x: position.x, y: position.y, z: position.z }, true)

    stick = { mesh, body }
    group.push(stick)
}

const joinCenterBoxAndStick = () => {
    const params = RAPIER.JointData.revolute(
        { x: 0, y: 0, z: 0 },//锚点1
        { x: 0, y: 0, z: -0.5 },//锚点2
        { x: 0, y: 0, z: 1 }//旋转轴
    )
    world.createImpulseJoint(params, centerBox.body, stick.body, true)
}

const addDropBox = () => {
    const position = { x: 1, y: 5, z: 0.5 }
    const size = { x: 0.2, y: 0.2, z: 0.2 }
    const geo = new THREE.BoxGeometry(size.x, size.y, size.z)
    const mat = new THREE.MeshStandardMaterial({ color: 'green' })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(position.x, position.y, position.z)
    scene.add(mesh)

    const bodyDesc = new RAPIER.RigidBodyDesc(RAPIER.RigidBodyType.Dynamic)
    const body = world.createRigidBody(bodyDesc)
    const colliderDesc = RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2)
    const collider = world.createCollider(colliderDesc, body)
    body.setTranslation({ x: position.x, y: position.y, z: position.z }, true)

    dropBox = { mesh, body }
    group.push(dropBox)
}

const levelStick = () => {
    stick.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
    stick.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    stick.body.setAngvel({ x: 0, y: 0, z: 0 }, true)

}

const animate = () => {
    requestAnimationFrame(animate)
    world.step()

    group = group.filter(({ mesh, body }) => {
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
</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
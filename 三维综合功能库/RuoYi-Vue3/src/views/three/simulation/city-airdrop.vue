<template>
    <div class="page-container">
        <div ref="container"></div>
        <draggableModal title="城市空投">
            <div class="row">
                <el-button class="draw-button" @click="addBox()" type="primary">添加</el-button>
                <el-button class="draw-button" @click="clearBox()" type="danger">删除</el-button>
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
import { GLTFLoader } from 'three/examples/jsm/Addons.js';

interface box {
    group: THREE.Group
    body: RAPIER.RigidBody
}
let boxModel: THREE.Group
let boxGroup: box[] = []
let boxModelSize = new THREE.Vector3()

const container = ref<HTMLDivElement>()
let scene: THREE.Scene


let world: RAPIER.World

onMounted(async () => {
    const initResult = initThree(container.value!, { position: { x: 0, y: 10, z: 100 }, })
    scene = initResult.scene
    await loadSkyBackground(scene)

    world = new RAPIER.World({ x: 0, y: -5, z: 0 })//-9.81为地球重力

    await addCity()
    await loadBox()
    addBox()
    animate()
})

const loadSkyBackground = async (scene: THREE.Scene) => {
    const background = await new THREE.TextureLoader().loadAsync('/three-data/picture/sky.jpg')
    background.colorSpace = THREE.SRGBColorSpace
    scene.background = background
}

const loadBox = async () => {
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync('/three-data/model/box.glb')
    boxModel = gltf.scene
    boxModel.scale.setScalar(0.4)

    boxModel.traverse((object) => {
        if (object instanceof THREE.Mesh) {
            object.castShadow = true
            object.receiveShadow = true
            object.material.depthWrite = true
        }
    })

    const box3 = new THREE.Box3().setFromObject(boxModel)
    box3.getSize(boxModelSize)
}

const addCity = async () => {
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync('/three-data/model/city/scene.gltf')
    gltf.scene.scale.set(10, 10, 10)// 放大 10 倍

    gltf.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
            object.castShadow = true
            object.receiveShadow = true
            object.material.depthWrite = true
            object.updateWorldMatrix(true, false)// 更新世界矩阵（包含根节点的 scale=10）//第一个true:如果父级的 matrixWorld 还没算过，先递归更新父级，第二个false:不更新子级

            const geometry = object.geometry
            const clonedGeo = geometry.clone()
            clonedGeo.applyMatrix4(object.matrixWorld)//把矩阵里的变换，逐个作用到几何体每一个顶点上;给一个变换矩阵，对每个顶点的位置做矩阵乘法，结果直接覆盖旧坐标

            const vertices = new Float32Array(clonedGeo.attributes.position.array)//顶点
            const indices = new Uint32Array(clonedGeo.index.array)//索引

            const bodyDesc = RAPIER.RigidBodyDesc.fixed() // 静态刚体，不设置 translation（顶点已在世界空间）
            const body = world.createRigidBody(bodyDesc)

            const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices)//三角网格
                .setFriction(0.8)
                .setRestitution(0.01)
            world.createCollider(colliderDesc, body)

            clonedGeo.dispose()
        }
    })

    scene.add(gltf.scene)
}

const addBox = () => {
    for (let i = 0; i < 30; i++) {
        const position = randomPosition()

        //Three
        const group = boxModel.clone()
        group.position.set(position.x, position.y, position.z)
        scene.add(group)

        //Rapier
        const bodyDesc = new RAPIER.RigidBodyDesc(RAPIER.RigidBodyType.Dynamic)
        const body = world.createRigidBody(bodyDesc)
        body.setTranslation({ x: position.x, y: position.y, z: position.z }, true)
        world.createCollider(RAPIER.ColliderDesc.cuboid(boxModelSize.x / 2, boxModelSize.y / 2, boxModelSize.z / 2), body)

        boxGroup.push({ group, body })
    }
}

const clearBox = () => {
    boxGroup.forEach((box) => {
        const group = box.group
        const body = box.body
        scene.remove(group)
        world.removeRigidBody(body)
    })
    boxGroup = []
}

const animate = () => {
    requestAnimationFrame(animate)
    world.step()

    boxGroup = boxGroup.filter((box) => {
        const group = box.group
        const body = box.body
        const position = body.translation()
        const rotation = body.rotation()
        group.position.set(position.x, position.y, position.z)
        group.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
        if (position.y < -40) {
            scene.remove(group)
            world.removeRigidBody(body)
            return false
        }
        return true
    })

}
//other

const randomPosition = () => {
    const x = -30 + Math.random() * 60
    const y = 10 + Math.random() * 30
    const z = -50 + Math.random() * 100
    return new THREE.Vector3(x, y, z)
}

onBeforeUnmount(() => {
    clearBox()
})

</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
<template>
    <div class="page-container">
        <div ref="container"></div>
        <draggableModal title="反射 - 折射">
            <div class="row">
                <el-select v-model="textureType" @change="switchTextureType" class="input">
                    <el-option label="反射" value="reflection" />
                    <el-option label="折射" value="refraction" />
                </el-select>
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
import { GLTFLoader } from 'three/examples/jsm/Addons.js';

const container = ref<HTMLDivElement>()
let scene: THREE.Scene
let model: THREE.Group

const textureType = ref('reflection')
let cubeMap: THREE.CubeTexture


onMounted(async () => {
    const initResult = initThree(container.value!, { position: { x: 0, y: 0, z: 10 }, initDirectionalLight: false })
    scene = initResult.scene

    addDirLight()
    await loadCubeMap()
    loadModel()

    scene.background = cubeMap
})

const addDirLight = () => {
    const dirLight = new THREE.DirectionalLight(0xffffff, 5)
    dirLight.position.set(5, 10, -2)  // 从斜上方打光
    dirLight.castShadow = true
    scene.add(dirLight)
}

const loadCubeMap = async () => {
    const loader = new THREE.CubeTextureLoader()
    cubeMap = await loader.loadAsync([
        '/three-data/picture/car/right.png',
        '/three-data/picture/car/left.png',
        '/three-data/picture/car/top.png',
        '/three-data/picture/car/bottom.png',
        '/three-data/picture/car/front.png',
        '/three-data/picture/car/back.png',
    ])
}

const loadModel = async () => {
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync('/three-data/model/ball.glb')
    model = gltf.scene
    gltf.scene.traverse((object) => {//遍历实例
        if (object instanceof THREE.Mesh) {
            //object.castShadow = true
            //object.receiveShadow = true
        }
    })
    gltf.scene.scale.setScalar(0.01)
    scene.add(gltf.scene)

    applyReflectionMaterial()
}

const applyReflectionMaterial = () => {
    cubeMap.mapping = THREE.CubeReflectionMapping
    const mat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        envMap: cubeMap,
        envMapIntensity: 1,
    })
    model.traverse((object) => {//遍历实例
        if (object instanceof THREE.Mesh) {
            object.material = mat
        }
    })
}

const applyRefractionMaterial = () => {
    cubeMap.mapping = THREE.CubeRefractionMapping
    const mat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        envMap: cubeMap,
        envMapIntensity: 1,
    })
    model.traverse((object) => {//遍历实例
        if (object instanceof THREE.Mesh) {
            object.material = mat
        }
    })
}


const switchTextureType = () => {
    switch (textureType.value) {
        case 'reflection': applyReflectionMaterial(); break;
        case 'refraction': applyRefractionMaterial(); break;
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
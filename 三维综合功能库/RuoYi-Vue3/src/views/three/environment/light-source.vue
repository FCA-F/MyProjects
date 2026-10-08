<template>
    <div class="page-container">
        <div ref="container"></div>
        <draggableModal title="光源">
            <div class="row">
                <el-select v-model="selectLightType" class="input">
                    <el-option label="spotLight" value="spotLight"></el-option>
                    <el-option label="pointLight" value="pointLight"></el-option>
                    <el-option label="directionalLight" value="directionalLight"></el-option>
                    <el-option label="hemisphereLight" value="hemisphereLight"></el-option>
                    <el-option label="rectAreaLight" value="rectAreaLight"></el-option>
                </el-select>
            </div>
        </draggableModal>
    </div>
</template>
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import * as THREE from 'three'
import { initThree } from '@/utils/three';
import draggableModal from '@/components/Common/draggable-modal.vue';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import '@/components/Common/draggable-modal.css'

let scene: THREE.Scene
const container = ref<HTMLDivElement>()

const selectLightType = ref('spotLight')

let spotLight: THREE.SpotLight
let spotLightHelper: THREE.SpotLightHelper
let spotLightShadowHelper: THREE.CameraHelper

let pointLight: THREE.PointLight
let pointLightHelper: THREE.PointLightHelper
let pointLightShadowHelper: THREE.CameraHelper

let directionalLight: THREE.DirectionalLight
let directionalLightHelper: THREE.DirectionalLightHelper
let directionalLightShadowHelper: THREE.CameraHelper

let hemisphereLight: THREE.HemisphereLight
let hemisphereLightHelper: THREE.HemisphereLightHelper

let rectAreaLight: THREE.RectAreaLight

onMounted(() => {
    const initResult = initThree(container.value!,
        {
            position: { x: 0, y: 8, z: 16 },
            initDirectionalLight: false
        })
    scene = initResult.scene

    const ambientLight = scene.children.find(
        (object): object is THREE.AmbientLight => object instanceof THREE.AmbientLight
    )
    if (ambientLight) {
        ambientLight.intensity = 0.12
    }

    loadGltf()
    loadSpotLight()
    animate()
})

const loadGltf = () => {
    const loader = new GLTFLoader()
    loader.load('/three-data/model/waterfall/scene.gltf', (gltf) => {
        gltf.scene.traverse((object) => {//遍历实例
            if (object instanceof THREE.Mesh) {
                object.castShadow = true
                object.receiveShadow = true
            }
        })

        scene.add(gltf.scene)
    })
}

const loadSpotLight = () => {
    spotLight = new THREE.SpotLight(0xffffff)
    spotLight.position.set(10, 14, 5)
    spotLight.intensity = 300
    spotLight.distance = 30
    spotLight.angle = Math.PI / 15
    spotLight.castShadow = true
    spotLight.shadow.camera.near = 3
    spotLight.shadow.camera.far = 30
    spotLight.shadow.mapSize.set(2048, 2048)
    spotLight.shadow.bias = -0.0001// 消除表面条纹
    spotLight.shadow.normalBias = 0.02//消除阴影伪影

    scene.add(spotLight)
    scene.add(spotLight.target)

    spotLightHelper = new THREE.SpotLightHelper(spotLight)
    spotLightHelper.color = 'red'
    scene.add(spotLightHelper)

    spotLightShadowHelper = new THREE.CameraHelper(spotLight.shadow.camera)
    scene.add(spotLightShadowHelper)
}

const loadPointLight = () => {
    pointLight = new THREE.PointLight()
    pointLight.position.set(0, 2, 0)
    pointLight.intensity = 10
    pointLight.distance = 10
    pointLight.castShadow = true
    pointLight.shadow.mapSize.set(1024, 1024)
    pointLight.shadow.camera.near = 0.5
    pointLight.shadow.camera.far = 10
    pointLight.shadow.bias = -0.0001
    pointLight.shadow.normalBias = 0.02
    scene.add(pointLight)

    pointLightHelper = new THREE.PointLightHelper(pointLight)
    pointLightHelper.color = 'red'
    scene.add(pointLightHelper)

    pointLightShadowHelper = new THREE.CameraHelper(pointLight.shadow.camera)
    scene.add(pointLightShadowHelper)
}

const loadDirectionalLight = () => {
    directionalLight = new THREE.DirectionalLight()
    directionalLight.position.set(10, 14, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.camera.near = 2
    directionalLight.shadow.camera.far = 30
    directionalLight.shadow.camera.left = -10
    directionalLight.shadow.camera.right = 10
    directionalLight.shadow.camera.top = 10
    directionalLight.shadow.camera.bottom = -10
    directionalLight.shadow.mapSize.set(2048, 2048)
    directionalLight.shadow.bias = -0.0001
    directionalLight.shadow.normalBias = 0.02

    scene.add(directionalLight)

    directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight)
    directionalLightHelper.color = "red"
    scene.add(directionalLightHelper)

    directionalLightShadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera)
    scene.add(directionalLightShadowHelper)
}

const removeLight = () => {
    scene.remove(spotLight)
    scene.remove(spotLightHelper)
    scene.remove(spotLightShadowHelper)

    scene.remove(pointLight)
    scene.remove(pointLightHelper)
    scene.remove(pointLightShadowHelper)

    scene.remove(directionalLight)
    scene.remove(directionalLightHelper)
    scene.remove(directionalLightShadowHelper)

    scene.remove(hemisphereLight)
    scene.remove(hemisphereLightHelper)

    scene.remove(rectAreaLight)
}

const loadHemisphereLight = () => {
    hemisphereLight = new THREE.HemisphereLight("red", 'blue', 10)//color1,color2,intensity
    hemisphereLight.position.set(0, 5, 0)
    scene.add(hemisphereLight)

    hemisphereLightHelper = new THREE.HemisphereLightHelper(hemisphereLight)
    scene.add(hemisphereLightHelper)
}

const loadRectAreaLight = () => {
    rectAreaLight = new THREE.RectAreaLight()
    rectAreaLight.position.set(0, 0, 6)

    scene.add(rectAreaLight)
}

const animate = () => {
    requestAnimationFrame(animate)
    if (selectLightType.value == 'spotLight') {
        spotLightHelper.update()
        spotLightShadowHelper.update()
    }
    else if (selectLightType.value == 'pointLight') {
        pointLightHelper.update()
        pointLightShadowHelper.update()
    }
    else if (selectLightType.value == 'directionalLight') {
        directionalLightHelper.update()
        directionalLightShadowHelper.update()
    }
    else if (selectLightType.value == 'hemisphereLight') {
        hemisphereLightHelper.update()
    }

}

watch(selectLightType, (type) => {
    removeLight()
    switch (type) {
        case 'spotLight': loadSpotLight(); break
        case 'pointLight': loadPointLight(); break
        case 'directionalLight': loadDirectionalLight(); break
        case 'hemisphereLight': loadHemisphereLight(); break
        case 'rectAreaLight': loadRectAreaLight(); break
        default: break
    }

})

</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>

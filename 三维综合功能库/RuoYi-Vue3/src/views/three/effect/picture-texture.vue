<template>
    <div class="page-container">
        <div ref="container"></div>
        <draggableModal title="贴图纹理">
            <div class="row">
                <el-select v-model="textureType" @change="switchTextureType" class="input">
                    <el-option label="图片(picture)" value="picture" />
                    <el-option label="凹凸(bump)" value="bump" />
                    <el-option label="法线(normal)" value="normal" />
                    <el-option label="位移(displacement)" value="displacement" />
                    <el-option label="环境光遮蔽(ao)" value="ao" />
                    <el-option label="金属(metal)" value="metal" />
                    <el-option label="粗糙(rough)" value="rough" />
                    <el-option label="透明(alpha)" value="alpha" />
                    <el-option label="发光(emissive)" value="emissive" />
                    <el-option label="高光(specular)" value="specular" />
                    <el-option label="画布(canvas)" value="canvas" />
                </el-select>
            </div>
        </draggableModal>
    </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import * as THREE from 'three'
import { addGround, initThree } from '@/utils/three';
import draggableModal from '@/components/Common/draggable-modal.vue';
import '@/components/Common/draggable-modal.css'
import { EXRExporter, EXRLoader, GLTFLoader } from 'three/examples/jsm/Addons.js';

const container = ref<HTMLDivElement>()
let scene: THREE.Scene
let model: THREE.Group

const textureType = ref('picture')


onMounted(() => {
    const initResult = initThree(container.value!, { position: { x: 0, y: 0, z: 5 }, initDirectionalLight: false })
    scene = initResult.scene

    addGround(scene, -1)
    addDirLight()
    loadModel()
})

const addDirLight = () => {
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5)
    dirLight.position.set(5, 10, 5)  // 从斜上方打光
    dirLight.castShadow = true
    scene.add(dirLight)
}

const loadModel = async () => {
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync('/three-data/model/ball.glb')
    model = gltf.scene
    gltf.scene.traverse((object) => {//遍历实例
        if (object instanceof THREE.Mesh) {
            object.castShadow = true
            object.receiveShadow = true
        }
    })
    gltf.scene.scale.setScalar(0.01)
    scene.add(gltf.scene)

    applyPictureTexture()
}

const applyPictureTexture = async () => {
    const textureloader = new THREE.TextureLoader()
    const texture = await textureloader.loadAsync('/three-data/picture/texture/wall/diff.jpg')
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)

    const material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        map: texture
    })
    model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
            object.material = material
        }
    })
}

const applyBumpTexture = async () => {

    const textureloader = new THREE.TextureLoader()
    const texture = await textureloader.loadAsync('/three-data/picture/texture/wall/diff.jpg')
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)

    const bumpMap = await textureloader.loadAsync('/three-data/picture/texture/wall/disp.png')
    bumpMap.wrapS = THREE.RepeatWrapping
    bumpMap.wrapT = THREE.RepeatWrapping
    bumpMap.repeat.set(4, 4)

    const material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        map: texture,
        bumpMap: bumpMap,
        bumpScale: 100
    })
    model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
            object.material = material
        }
    })
}

const applyNormalTexture = async () => {
    const textureloader = new THREE.TextureLoader()
    const texture = await textureloader.loadAsync('/three-data/picture/texture/wall/diff.jpg')
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)

    const exrLoder = new EXRLoader()
    const normalMap = await exrLoder.loadAsync('/three-data/picture/texture/wall/nor_gl.exr')
    normalMap.wrapS = THREE.RepeatWrapping
    normalMap.wrapT = THREE.RepeatWrapping
    normalMap.repeat.set(4, 4)

    const material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        map: texture,
        normalMap: normalMap,
        normalScale: new THREE.Vector2(10, 10)
    })
    model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
            object.material = material
        }
    })
}

const applyDisplacementTexture = async () => {
    const textureloader = new THREE.TextureLoader()
    const texture = await textureloader.loadAsync('/three-data/picture/texture/stone/diff.jpg')
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)

    const displacementMap = await textureloader.loadAsync('/three-data/picture/texture/stone/disp.png')
    displacementMap.wrapS = THREE.RepeatWrapping
    displacementMap.wrapT = THREE.RepeatWrapping
    displacementMap.repeat.set(4, 4)

    //最终位移量 = 贴图采样值(0~1) × displacementScale + displacementBias
    const material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        map: texture,
        displacementMap: displacementMap,
        displacementScale: 18,
        bumpMap: displacementMap,
        bumpScale: 100
    })
    model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
            object.material = material
        }
    })
}

const applyAoTexture = async () => {
    const textureloader = new THREE.TextureLoader()
    const texture = await textureloader.loadAsync('/three-data/picture/texture/wall/diff.jpg')
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)

    const exrLoder = new EXRLoader()
    const aoMap = await exrLoder.loadAsync('/three-data/picture/texture/wall/AORoughMetal.exr')
    aoMap.wrapS = THREE.RepeatWrapping
    aoMap.wrapT = THREE.RepeatWrapping
    aoMap.repeat.set(4, 4)

    const material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        map: texture,
        aoMap: aoMap,
        aoMapIntensity: 1
    })
    model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
            //if (!object.geometry.attributes.uv2) {
            //   object.geometry.setAttribute('uv2', object.geometry.attributes.uv)
            //}
            object.material = material
        }
    })
}

const applyMetalTexture = async () => {
    const textureloader = new THREE.TextureLoader()
    const texture = await textureloader.loadAsync('/three-data/picture/texture/metal/diff.jpg')
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)

    const exrLoder = new EXRLoader()
    const metalMap = await exrLoder.loadAsync('/three-data/picture/texture/metal/AORoughMetal.exr')
    metalMap.wrapS = THREE.RepeatWrapping
    metalMap.wrapT = THREE.RepeatWrapping
    metalMap.repeat.set(4, 4)

    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: texture,
        metalnessMap: metalMap,
        metalness: 10
    })
    model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
            object.material = material
        }
    })
}

const applyRoughTexture = async () => {
    const textureloader = new THREE.TextureLoader()
    const texture = await textureloader.loadAsync('/three-data/picture/texture/metal/diff.jpg')
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)

    const exrLoder = new EXRLoader()
    const roughMap = await exrLoder.loadAsync('/three-data/picture/texture/metal/AORoughMetal.exr')
    roughMap.wrapS = THREE.RepeatWrapping
    roughMap.wrapT = THREE.RepeatWrapping
    roughMap.repeat.set(4, 4)

    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: texture,
        roughnessMap: roughMap,
        roughness: 10
    })
    model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
            object.material = material
        }
    })
}

const applyAlphaTexture = async () => {
    const textureloader = new THREE.TextureLoader()
    const texture = await textureloader.loadAsync('/three-data/picture/texture/alpha.png')
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)

    const material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        alphaMap: texture,
        transparent: true
    })
    model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
            object.material = material
        }
    })
}

const applyEmissiveTexture = async () => {
    const textureloader = new THREE.TextureLoader()
    const texture = await textureloader.loadAsync('/three-data/picture/texture/lava/lava.png')
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)

    const material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        map: texture,
        emissive: 0xffffff,
        emissiveMap: texture,
        emissiveIntensity: 8,
    })
    model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
            object.material = material
        }
    })
}

const applySpecularTexture = async () => {
    const textureloader = new THREE.TextureLoader()
    const texture = await textureloader.loadAsync('/three-data/picture/texture/earth/earth.png')

    const specularMap = await textureloader.loadAsync('/three-data/picture/texture/earth/specular.png')
    const normalMap = await textureloader.loadAsync('/three-data/picture/texture/earth/normal.png')
    const material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        map: texture,
        specularMap: specularMap,
        normalMap: normalMap,
        normalScale: new THREE.Vector2(20, 20),
        specular: 4000
    })
    model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
            object.material = material
        }
    })
}

const applyCanvasTexture = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 放大4倍
    ctx.scale(4, 4)
    ctx.translate(-81, -86)

    // the body
    ctx.fillStyle = 'orange'
    ctx.beginPath()
    ctx.moveTo(83, 116)
    ctx.lineTo(83, 102)
    ctx.bezierCurveTo(83, 94, 89, 88, 97, 88)
    ctx.bezierCurveTo(105, 88, 111, 94, 111, 102)
    ctx.lineTo(111, 116)
    ctx.lineTo(106.333, 111.333)
    ctx.lineTo(101.666, 116)
    ctx.lineTo(97, 111.333)
    ctx.lineTo(92.333, 116)
    ctx.lineTo(87.666, 111.333)
    ctx.lineTo(83, 116)
    ctx.fill()

    // the eyes
    ctx.fillStyle = 'white'
    ctx.beginPath()
    ctx.moveTo(91, 96)
    ctx.bezierCurveTo(88, 96, 87, 99, 87, 101)
    ctx.bezierCurveTo(87, 103, 88, 106, 91, 106)
    ctx.bezierCurveTo(94, 106, 95, 103, 95, 101)
    ctx.bezierCurveTo(95, 99, 94, 96, 91, 96)
    ctx.moveTo(103, 96)
    ctx.bezierCurveTo(100, 96, 99, 99, 99, 101)
    ctx.bezierCurveTo(99, 103, 100, 106, 103, 106)
    ctx.bezierCurveTo(106, 106, 107, 103, 107, 101)
    ctx.bezierCurveTo(107, 99, 106, 96, 103, 96)
    ctx.fill()

    // the pupils
    ctx.fillStyle = 'blue'
    ctx.beginPath()
    ctx.arc(101, 102, 2, 0, Math.PI * 2, true)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(89, 102, 2, 0, Math.PI * 2, true)
    ctx.fill()

    const canvasTexture = new THREE.Texture(canvas)
    canvasTexture.magFilter = THREE.NearestFilter  // 像素风，不模糊
    canvasTexture.wrapS = THREE.RepeatWrapping
    canvasTexture.wrapT = THREE.RepeatWrapping
    canvasTexture.repeat.set(10, 10)
    canvasTexture.needsUpdate = true

    const canvasMaterial = new THREE.MeshPhongMaterial({
        map: canvasTexture,
        transparent: true,
    })
    model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
            object.material = canvasMaterial

        }
    })
}


const switchTextureType = () => {
    switch (textureType.value) {
        case 'picture': applyPictureTexture(); break;
        case 'bump': applyBumpTexture(); break;
        case 'normal': applyNormalTexture(); break;
        case 'displacement': applyDisplacementTexture(); break;
        case 'ao': applyAoTexture(); break;
        case 'metal': applyMetalTexture(); break;
        case 'rough': applyRoughTexture(); break;
        case 'alpha': applyAlphaTexture(); break;
        case 'emissive': applyEmissiveTexture(); break;
        case 'specular': applySpecularTexture(); break;
        case 'canvas': applyCanvasTexture(); break;
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
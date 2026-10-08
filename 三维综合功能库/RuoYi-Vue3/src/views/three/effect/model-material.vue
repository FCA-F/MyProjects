<template>
    <div class="page-container">
        <div ref="container"></div>
        <draggableModal title="材质">
            <el-select v-model="materialType" @change="updateMaterial" class="input">
                <el-option label="meshBasicMaterial" value="meshBasicMaterial" />
                <el-option label="meshNormalMaterial" value="meshNormalMaterial" />
                <el-option label="groupMaterial" value="groupMaterial" />
                <el-option label="meshDepthMaterial" value="meshDepthMaterial" />
                <el-option label="wireframe" value="wireframe" />
                <el-option label="meshLambertMaterial" value="meshLambertMaterial" />
                <el-option label="meshPhongMaterial" value="meshPhongMaterial" />
                <el-option label="meshToonMaterial" value="meshToonMaterial" />
                <el-option label="meshStandardMaterial" value="meshStandardMaterial" />
                <el-option label="meshPhysicalMaterial" value="meshPhysicalMaterial" />
                <el-option label="shadowMaterial" value="shadowMaterial" />
            </el-select>
        </draggableModal>
    </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import * as THREE from 'three'
import draggableModal from '@/components/Common/draggable-modal.vue';
import '@/components/Common/draggable-modal.css'
import { GLTFLoader, OrbitControls } from 'three/examples/jsm/Addons.js';


const container = ref<HTMLDivElement>()
let scene: THREE.Scene
let renderer: THREE.WebGLRenderer
let camera: THREE.PerspectiveCamera
let meshDepthMaterialCamera: THREE.PerspectiveCamera
let orbitControls: OrbitControls
let meshDepthMaterialOrbitControls: OrbitControls

const materialType = ref('meshBasicMaterial')

onMounted(() => {
    init()
    addGround()
    addMesh()
    loadGltf()
})

const addMesh = () => {
    for (let i = 1; i <= 100; i++) {
        const color = randomColor()
        const position = randomPosition()
        const rotation = randomRotation()

        const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5)
        const mat = new THREE.MeshBasicMaterial(
            {
                color: color,
            }
        )
        const cube = new THREE.Mesh(geo, mat)
        cube.position.copy(position)
        cube.rotation.setFromVector3(rotation)
        cube.castShadow = true
        scene.add(cube)
    }
}

const loadGltf = () => {
    const loader = new GLTFLoader()
    loader.load('/three-data/model/ball.glb', (object) => {
        const model = object.scene
        model.traverse((object) => {//遍历实例
            if (object instanceof THREE.Mesh) {
                object.castShadow = true
                object.receiveShadow = true
                object.material = new THREE.MeshBasicMaterial({ color: randomColor() })
            }
        })
        model.position.set(6, 0, 0)
        model.scale.setScalar(0.01)

        scene.add(model)
    })
}

const applyMeshBasicMaterial = () => {
    scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.name != 'ground') {
            const meshBasicMaterial = new THREE.MeshBasicMaterial({
                color: randomColor(),
            })
            child.material = meshBasicMaterial
        }
    })
}

const applyGroupMaterial = () => {
    scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.name != 'ground') {
            const mat1 = new THREE.MeshBasicMaterial({ color: randomColor() })
            const mat2 = new THREE.MeshBasicMaterial({ color: randomColor() })
            const mat3 = new THREE.MeshBasicMaterial({ color: randomColor() })
            const mat4 = new THREE.MeshBasicMaterial({ color: randomColor() })
            const mat5 = new THREE.MeshBasicMaterial({ color: randomColor() })
            const mat6 = new THREE.MeshBasicMaterial({ color: randomColor() })
            const groupMaterial = [mat1, mat2, mat3, mat4, mat5, mat6]
            child.material = groupMaterial
        }
    })
}

const applyMeshNormalMaterial = () => {
    scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.name != 'ground') {
            const meshBasicMaterial = new THREE.MeshNormalMaterial()
            child.material = meshBasicMaterial
        }
    })
}

const applyMeshDepthMaterial = () => {
    scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.name != 'ground') {
            const meshDepthMaterial = new THREE.MeshDepthMaterial()
            child.material = meshDepthMaterial
        }
    })
}



const applyWireframeMaterial = () => {
    scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.name != 'ground') {
            const meshBasicMaterial = new THREE.MeshBasicMaterial({
                wireframe: true,
                color: randomColor()
            })
            child.material = meshBasicMaterial
        }
    })
}

const applyMeshLambertMaterial = () => {
    scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.name != 'ground') {
            const meshLambertMaterial = new THREE.MeshLambertMaterial({
                color: randomColor(),
                emissive: randomColor(),
                emissiveIntensity: Math.random()
            })
            child.material = meshLambertMaterial
        }
    })
}

const applyMeshPhongMaterial = () => {
    scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.name != 'ground') {
            const meshPhongMaterial = new THREE.MeshPhongMaterial({
                color: randomColor(),
            })
            child.material = meshPhongMaterial
        }
    })
}
const applyMeshPToonMaterial = () => {
    scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.name != 'ground') {
            const meshToonMaterial = new THREE.MeshToonMaterial({
                color: randomColor(),
            })
            child.material = meshToonMaterial
        }
    })
}

const applyMeshStandardMaterial = () => {
    scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.name != 'ground') {
            const meshStandardMaterial = new THREE.MeshStandardMaterial({
                color: randomColor(),
            })
            child.material = meshStandardMaterial
        }
    })
}

const applyMeshPhysicalMaterial = () => {
    scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.name != 'ground') {
            const meshPhysicalMaterial = new THREE.MeshPhysicalMaterial({
                color: randomColor(),
            })
            child.material = meshPhysicalMaterial
        }
    })
}

const applyShadowMaterial = () => {
    scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.name != 'ground') {
            const shadowMaterial = new THREE.ShadowMaterial({
                color: randomColor(),
            })
            child.material = shadowMaterial
        }
    })
}


const updateMaterial = () => {
    switch (materialType.value) {
        case 'meshBasicMaterial': applyMeshBasicMaterial(); break;
        case 'meshDepthMaterial': applyMeshDepthMaterial(); break
        case 'wireframe': applyWireframeMaterial(); break
        case 'meshNormalMaterial': applyMeshNormalMaterial(); break
        case 'groupMaterial': applyGroupMaterial(); break
        case 'meshLambertMaterial': applyMeshLambertMaterial(); break
        case 'meshPhongMaterial': applyMeshPhongMaterial(); break
        case 'meshToonMaterial': applyMeshPToonMaterial(); break
        case 'meshStandardMaterial': applyMeshStandardMaterial(); break
        case 'meshPhysicalMaterial': applyMeshPhysicalMaterial(); break
        case 'shadowMaterial': applyShadowMaterial(); break;
        default: break
    }
}

const randomColor = () => {
    const r = Math.random()
    const g = Math.random()
    const b = Math.random()
    return new THREE.Color(r, g, b)
}

const randomPosition = () => {
    const x = -4 + Math.random() * 8
    const y = Math.random() * 4
    const z = -4 + Math.random() * 8
    return new THREE.Vector3(x, y, z)
}

const randomRotation = () => {
    const x = Math.random() * (Math.PI * 2)
    const y = Math.random() * (Math.PI * 2)
    const z = Math.random() * (Math.PI * 2)
    return new THREE.Vector3(x, y, z)
}

const addGround = () => {
    const groundGeo = new THREE.PlaneGeometry(10000, 10000)
    const groundMat = new THREE.MeshLambertMaterial({ color: 0xffffff })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.name = 'ground'
    ground.position.set(0, -2, 0)
    ground.rotation.set(Math.PI / -2, 0, 0)
    ground.receiveShadow = true
    scene.add(ground)
}

const init = () => {
    scene = new THREE.Scene()
    scene.background = new THREE.Color(new THREE.Color('white'))

    //相机
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight)
    camera.position.set(0, 3, 13)
    camera.lookAt(0, 7, 0)
    meshDepthMaterialCamera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 20)
    meshDepthMaterialCamera.position.set(0, 6, 5)
    meshDepthMaterialCamera.lookAt(0, 6, 0)

    //渲染
    renderer = new THREE.WebGLRenderer
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.setSize(window.innerWidth, window.innerHeight)
    container.value!.appendChild(renderer.domElement)

    //操控器
    orbitControls = new OrbitControls(camera, renderer.domElement)
    meshDepthMaterialOrbitControls = new OrbitControls(meshDepthMaterialCamera, renderer.domElement)
    //光线
    let ambientLight = new THREE.AmbientLight('#fff5e6', 0.4)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight('#ffffff', 1.0)
    directionalLight.position.set(5, 12, 8)
    directionalLight.castShadow = true
    directionalLight.shadow.camera.left = -25
    directionalLight.shadow.camera.right = 25
    directionalLight.shadow.camera.top = 25
    directionalLight.shadow.camera.bottom = -25
    directionalLight.shadow.camera.near = 1
    directionalLight.shadow.camera.far = 100
    directionalLight.shadow.mapSize.set(2048, 2048)
    directionalLight.shadow.bias = -0.0001
    directionalLight.shadow.normalBias = 0.02
    scene.add(directionalLight)
    animate()
}

const animate = () => {
    requestAnimationFrame(() => animate())
    renderer.render(scene, camera)
    if (materialType.value != 'meshDepthMaterial') {
        renderer.render(scene, camera)
        orbitControls.update()
    }

    else {
        renderer.render(scene, meshDepthMaterialCamera)
        meshDepthMaterialOrbitControls.update()
    }

}

</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js';

interface initThreeBaseOptions {
    position?: { x: number, y: number, z: number },
    targetPosition?: { x: number, y: number, z: number },
    initFog?: boolean,
    initDirectionalLight?: boolean
    initAnimate?: boolean
}

export function initThree(
    container: HTMLDivElement, options: initThreeBaseOptions = {}
) {

    const { position, initFog, initAnimate, targetPosition, initDirectionalLight } = options

    //场景
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(new THREE.Color('white'))
    if (initFog === true)
        scene.fog = new THREE.Fog(new THREE.Color('white'), 10, 100)

    //相机
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight)
    if (position)
        camera.position.set(position.x, position.y, position.z)
    else
        camera.position.set(0, 5, 12)


    //渲染
    const renderer = new THREE.WebGLRenderer
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.setSize(window.innerWidth, window.innerHeight)
    container.appendChild(renderer.domElement)

    //操控器
    const orbitControls = new OrbitControls(camera, renderer.domElement)
    if (targetPosition) {
        orbitControls.target.set(targetPosition.x, targetPosition.y, targetPosition.z)

    }

    //光线
    const ambientLight = new THREE.AmbientLight('#fff5e6', 0.6)
    scene.add(ambientLight)
    if (initDirectionalLight !== false) {
        const directionalLight = new THREE.DirectionalLight('#ffffff', 1.0)
        directionalLight.position.set(5, 12, 8)
        directionalLight.castShadow = true
        directionalLight.shadow.camera.left = -50
        directionalLight.shadow.camera.right = 50
        directionalLight.shadow.camera.top = 50
        directionalLight.shadow.camera.bottom = -50
        directionalLight.shadow.camera.near = 1
        directionalLight.shadow.camera.far = 50
        directionalLight.shadow.mapSize.set(2048, 2048)
        directionalLight.shadow.bias = -0.0001
        directionalLight.shadow.normalBias = 0.02
        scene.add(directionalLight)
    }

    if (initAnimate !== false)
        animate(scene, camera, renderer, orbitControls)
    //renderer.setAnimationLoop(animate)

    return { scene, camera, renderer, orbitControls }
}

function animate(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    orbitControls: OrbitControls) {
    requestAnimationFrame(() => animate(scene, camera, renderer, orbitControls))
    renderer.render(scene, camera)
    orbitControls.update()
}

export function addGround(scene: THREE.Scene, height: number = -10) {
    const groundGeo = new THREE.PlaneGeometry(10000, 10000)
    const groundMat = new THREE.MeshLambertMaterial({ color: 0xffffff })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.position.set(0, height, 0)
    ground.rotation.set(Math.PI / -2, 0, 0)
    ground.receiveShadow = true
    scene.add(ground)
}

export async function loadWoodBackground(scene: THREE.Scene) {
    const background = await new THREE.TextureLoader().loadAsync('/three-data/picture/wood2.jpg')
    background.colorSpace = THREE.SRGBColorSpace
    scene.background = background
}

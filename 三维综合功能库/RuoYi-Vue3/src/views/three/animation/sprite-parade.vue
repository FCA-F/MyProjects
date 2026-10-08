<template>
    <div class="page-container">
        <div ref="container" class="three-container"></div>
    </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { initThree } from '@/utils/three'

const FRAME_COUNT = 5
const MOVE_SPEED = 180//像素每秒

const container = ref<HTMLDivElement | null>(null)

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let overlayScene: THREE.Scene | null = null
let overlayCamera: THREE.OrthographicCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let orbitControls: { update: () => void; dispose: () => void } | null = null

let cube: THREE.Mesh | null = null
let torusKnot: THREE.Mesh | null = null
let ground: THREE.Mesh | null = null
let sprite: THREE.Sprite | null = null
let spriteTexture: THREE.Texture | null = null

let animationFrameId: number | null = null
let resizeHandler: (() => void) | null = null
let direction = 1
let currentFrame = 0
let lastTime = 0

onMounted(async () => {
    if (!container.value) return

    const three = initThree(container.value, {
        position: { x: 0, y: 2.5, z: 14 },
        targetPosition: { x: 0, y: 0, z: 0 },
        initAnimate: false,
    })

    scene = three.scene
    camera = three.camera
    renderer = three.renderer
    orbitControls = three.orbitControls

    scene.background = new THREE.Color('white')
    renderer.autoClear = false
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    createSceneObjects()//创建物体

    overlayScene = new THREE.Scene()
    overlayCamera = new THREE.OrthographicCamera(0, 1, 1, 0, -10, 10)
    overlayCamera.position.z = 1

    resizeHandler = resize
    window.addEventListener('resize', resizeHandler)//窗口尺寸变化时
    resize()

    spriteTexture = await new THREE.TextureLoader().loadAsync(
        '/three-data/picture/sprite-sheet.png',
    )

    spriteTexture.colorSpace = THREE.SRGBColorSpace
    spriteTexture.magFilter = THREE.NearestFilter//放大纹理时，最近邻采样，像素块清晰锐利，不模糊
    spriteTexture.minFilter = THREE.NearestFilter
    spriteTexture.wrapS = THREE.ClampToEdgeWrapping//超出部分用边缘像素填充（
    spriteTexture.wrapT = THREE.ClampToEdgeWrapping
    spriteTexture.repeat.set(1 / FRAME_COUNT, 1)//x:20%，y:100%
    spriteTexture.offset.set(0, 0)//初始位置

    const spriteMaterial = new THREE.SpriteMaterial({
        map: spriteTexture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
    })

    sprite = new THREE.Sprite(spriteMaterial)
    overlayScene.add(sprite)
    resize()

    lastTime = performance.now()
    animate(lastTime)
})

function createSceneObjects() {
    if (!scene) return

    const cubeGeometry = new THREE.BoxGeometry(1.6, 1.6, 1.6)
    const cubeMaterial = new THREE.MeshStandardMaterial({
        color: '#4e82ff',
        roughness: 0.3,
        metalness: 0.15,
    })
    cube = new THREE.Mesh(cubeGeometry, cubeMaterial)
    cube.position.set(-2.2, 0, 0)
    cube.castShadow = true
    scene.add(cube)

    const torusGeometry = new THREE.TorusKnotGeometry(1.05, 0.28, 128, 32)
    const torusMaterial = new THREE.MeshStandardMaterial({
        color: '#32c995',
        roughness: 0.2,
        metalness: 0.1,
    })
    torusKnot = new THREE.Mesh(torusGeometry, torusMaterial)
    torusKnot.position.set(2.2, 0.35, 0)
    torusKnot.castShadow = true
    scene.add(torusKnot)

    const groundGeometry = new THREE.PlaneGeometry(30, 30)
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: '#f7fafc',
        roughness: 0.95,
    })
    ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.position.y = -1.45
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)
}

function animate(time: number) {
    if (
        !scene ||
        !camera ||
        !overlayScene ||
        !overlayCamera ||
        !renderer ||
        !orbitControls ||
        !sprite ||
        !spriteTexture
    ) {
        return
    }

    animationFrameId = requestAnimationFrame(animate)

    const delta = Math.min((time - lastTime) / 1000, 0.05)//帧时间间隔
    lastTime = time

    if (cube) {
        cube.rotation.x += delta * 0.8
        cube.rotation.y += delta * 1.1
        cube.rotation.z += delta * 0.55
    }

    if (torusKnot) {
        torusKnot.rotation.x -= delta * 0.55
        torusKnot.rotation.y += delta * 0.9
        torusKnot.rotation.z -= delta * 0.35
    }

    moveSprite(delta)
    orbitControls.update()

    renderer.clear()
    renderer.render(scene, camera)
    renderer.clearDepth()//清理深度缓冲
    renderer.render(overlayScene, overlayCamera)
}
//图案移动与切换
function moveSprite(delta: number) {
    if (!sprite || !spriteTexture || !container.value) return

    const width = container.value.clientWidth || window.innerWidth
    const halfSize = sprite.scale.x / 2
    const minX = halfSize
    const maxX = Math.max(minX, width - halfSize)

    sprite.position.x += direction * MOVE_SPEED * delta//方向*速度*时间间隔

    if (sprite.position.x >= maxX) {
        sprite.position.x = maxX
        direction = -1
        changeSpriteFrame()//切换图案
    } else if (sprite.position.x <= minX) {
        sprite.position.x = minX
        direction = 1
        changeSpriteFrame()
    }
}
//改变图案
function changeSpriteFrame() {
    if (!spriteTexture) return

    currentFrame = (currentFrame + 1) % FRAME_COUNT
    spriteTexture.offset.x = currentFrame / FRAME_COUNT
}

//窗口尺寸变化时更新
function resize() {
    if (!container.value || !camera || !overlayCamera || !renderer) return

    const width = container.value.clientWidth || window.innerWidth
    const height = container.value.clientHeight || window.innerHeight

    camera.aspect = width / height
    camera.updateProjectionMatrix()

    overlayCamera.left = 0
    overlayCamera.right = width
    overlayCamera.top = height
    overlayCamera.bottom = 0
    overlayCamera.updateProjectionMatrix()

    renderer.setSize(width, height, false)

    if (sprite) {
        const size = Math.max(44, Math.min(128, width * 0.22, height * 0.3))
        const halfSize = size / 2

        sprite.scale.set(size, size, 1)
        sprite.position.y = halfSize + 100
        sprite.position.x = Math.min(
            Math.max(sprite.position.x, halfSize),//精灵中心最少位置 → 左边缘刚好在 x=0（贴左边界）
            Math.max(halfSize, width - halfSize),
        )
    }
}

onBeforeUnmount(() => {

    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
    }

    if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler)
        resizeHandler = null
    }

    if (sprite && overlayScene) {
        overlayScene.remove(sprite)
        sprite.material.dispose()
        sprite = null
    }

    spriteTexture?.dispose()
    spriteTexture = null

    cube?.geometry.dispose();
    (cube?.material as THREE.Material | undefined)?.dispose()
    torusKnot?.geometry.dispose();
    (torusKnot?.material as THREE.Material | undefined)?.dispose()
    ground?.geometry.dispose();
    (ground?.material as THREE.Material | undefined)?.dispose()

    orbitControls?.dispose()

    if (renderer) {
        renderer.dispose()
        renderer.domElement.parentElement?.removeChild(renderer.domElement)
    }

    scene?.clear()
    overlayScene?.clear()
    scene = null
    camera = null
    overlayScene = null
    overlayCamera = null
    renderer = null
    orbitControls = null
    cube = null
    torusKnot = null
    ground = null
})
</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>

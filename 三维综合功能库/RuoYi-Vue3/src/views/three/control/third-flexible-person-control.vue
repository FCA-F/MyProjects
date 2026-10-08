<template>
    <div ref="container" class="page-container"></div>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/Addons.js'
import { initThree } from '@/utils/three'

const MODEL_URL = '/three-data/model/fbx/People.fbx'
const WALK_ANIMATION_URL = '/three-data/model/fbx/Walking.fbx'
const IDLE_ANIMATION_URL = '/three-data/model/fbx/Idle.fbx'
const RUN_ANIMATION_URL = '/three-data/model/fbx/Running.fbx'
const WALK_SPEED = 2.4
const RUN_SPEED = 10
const TURN_AROUND_SPEED = 20

const container = ref<HTMLDivElement>()

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: ReturnType<typeof initThree>['orbitControls']
let player: THREE.Group | undefined
let mixer: THREE.AnimationMixer | undefined
let currentAction: THREE.AnimationAction | undefined
let idleAction: THREE.AnimationAction | undefined
let walkAction: THREE.AnimationAction | undefined
let runAction: THREE.AnimationAction | undefined
let animationFrameId = 0
let cameraDragPointerId: number | undefined
let previousCameraPointerX = 0
let previousCameraPointerY = 0

const clock = new THREE.Clock()
const pressedKeys = new Set<string>()
const worldUp = new THREE.Vector3(0, 1, 0)
const cameraForward = new THREE.Vector3()
const cameraRight = new THREE.Vector3()
const movementDirection = new THREE.Vector3()
const playerDelta = new THREE.Vector3()
const previousPlayerPosition = new THREE.Vector3()
const cameraLookAtOffset = new THREE.Vector3(0, 2, 0)

onMounted(() => {
    const initResult = initThree(container.value!, {
        position: { x: 0, y: 3.2, z: -7.8 },
        targetPosition: { x: 0, y: 0.2, z: 0 },
        initAnimate: false,
    })

    scene = initResult.scene
    camera = initResult.camera
    renderer = initResult.renderer
    controls = initResult.orbitControls
    controls.enabled = true//开启
    controls.enableDamping = true//开启阻尼
    controls.dampingFactor = 0.08//阻尼系数
    controls.enablePan = false//禁用右键平移
    controls.minDistance = 4//限制相机距离
    controls.maxDistance = 14
    controls.minPolarAngle = 0.35//垂直视角限制
    controls.maxPolarAngle = Math.PI / 2 + 0.1

    scene.background = new THREE.Color('#dbe7f3')

    scene.add(new THREE.HemisphereLight('#ffffff', '#b8c4d1', 1.5))

    addGround()
    loadPlayer()

    //补上按着shift移动orbitControl无法转视角的问题
    renderer.domElement.addEventListener('pointerdown', handleCameraPointerDown, true)
    window.addEventListener('pointermove', handleCameraPointerMove, true)
    window.addEventListener('pointerup', handleCameraPointerUp, true)
    window.addEventListener('pointercancel', handleCameraPointerUp, true)
    //键盘事件
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', clearPressedKeys)

    animate()
})
//载入角色数据
const loadPlayer = async () => {
    const loader = new FBXLoader()
    const [playerFbx, walkFbx, idleFbx, runFbx] = await Promise.all([
        loader.loadAsync(MODEL_URL),
        loader.loadAsync(WALK_ANIMATION_URL),
        loader.loadAsync(IDLE_ANIMATION_URL),
        loader.loadAsync(RUN_ANIMATION_URL)
    ])

    player = playerFbx
    player.scale.setScalar(0.02)
    player.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        object.castShadow = true
        object.receiveShadow = true
    })
    scene.add(player)
    previousPlayerPosition.copy(player.position)

    mixer = new THREE.AnimationMixer(player)
    walkAction = createAction(walkFbx.animations[0])
    idleAction = createAction(idleFbx.animations[0])
    runAction = createAction(runFbx.animations[0])

    if (idleAction) {
        currentAction = idleAction
        currentAction.play()
    }

    controls.target.copy(player.position).add(cameraLookAtOffset)
    controls.update()
    updateCamera()
}

const animate = () => {
    animationFrameId = requestAnimationFrame(animate)

    const delta = Math.min(clock.getDelta(), 0.05)
    const nextAction = updatePlayer(delta)
    updateAction(nextAction)
    mixer?.update(delta)
    updateCamera()
    renderer.render(scene, camera)
}

const createAction = (clip: THREE.AnimationClip | undefined) => {
    if (!mixer || !clip) return undefined

    const action = mixer.clipAction(clip)
    action.setLoop(THREE.LoopRepeat, Infinity)
    action.clampWhenFinished = false
    return action
}



const updatePlayer = (delta: number) => {
    let nextAction: THREE.AnimationAction
    if (!player) return undefined

    // A 左转，D 右转。单独转向时也缓慢向前走，避免原地旋转。
    const forwardValue = getKey('KeyW') - getKey('KeyS')
    const strafeValue = getKey('KeyA') - getKey('KeyD')
    const moving = forwardValue !== 0 || strafeValue !== 0
    const running = pressedKeys.has('ShiftLeft') && moving

    if (moving) {
        camera.getWorldDirection(cameraForward)//拿到相机正前方的方向向量
        cameraForward.y = 0//前进方向水平
        cameraForward.normalize()
        cameraRight.crossVectors(worldUp, cameraForward).normalize()//叉乘算出相机的"右方向"
        movementDirection//移动方向
            .copy(cameraForward)
            .multiplyScalar(forwardValue)//判断前后
            .addScaledVector(cameraRight, strafeValue)//判断左右，相机右方向*旋转数
            .normalize()

        //旋转
        const targetRotationY = Math.atan2(//给定方向向量，算出从 Z 轴正方向到这个点的夹角
            movementDirection.x,
            movementDirection.z,
        )
        const rotationDelta = Math.atan2(//角色走最短路径转过去
            Math.sin(targetRotationY - player.rotation.y),
            Math.cos(targetRotationY - player.rotation.y),
        )
        const rotationStep = 1 - Math.exp(-TURN_AROUND_SPEED * delta)//每帧转多少（平滑系数），先快后慢，角色开始转得快，快到位时慢下来

        player.rotation.y += rotationDelta * rotationStep//角色水平转向，rotationDelta = 离目标方向还差多少，rotationStep = 这帧该转其中的多少比例（0~1 之间）
        player.rotation.z = THREE.MathUtils.damp(//角色身体倾斜
            player.rotation.z,
            -strafeValue * 0.06,
            8,
            delta,
        )

        const currentSpeed = running ? RUN_SPEED : WALK_SPEED
        player.position.addScaledVector(movementDirection, currentSpeed * delta)
    }
    else {
        player.rotation.z = THREE.MathUtils.damp(player.rotation.z, 0, 8, delta)
    }
    //计算下一步状态
    if (!moving) {
        nextAction = idleAction!
    } else if (running) {
        nextAction = runAction!
    } else {
        nextAction = walkAction!
    }
    return nextAction
}

// 动画渐变更新
const updateAction = (nextAction: THREE.AnimationAction | undefined) => {
    if (!nextAction || nextAction === currentAction) return

    nextAction.reset()
    nextAction.play()

    if (currentAction) {
        currentAction.crossFadeTo(nextAction, 0.18, false)
    }

    currentAction = nextAction
}

//更新相机
const updateCamera = () => {
    if (!player) return

    playerDelta.subVectors(player.position, previousPlayerPosition)//当前帧玩家位置 - 上一帧玩家位置 = 这一帧玩家移动了多少
    if (playerDelta.lengthSq() > 0) {//长度方向的平方>0
        camera.position.add(playerDelta)
        controls.target.add(playerDelta)
        previousPlayerPosition.copy(player.position)
    }
    controls.update()
}


//------事件处理------//
//按着shift移动
const handleCameraPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !event.shiftKey || !controls?.enabled) return

    cameraDragPointerId = event.pointerId
    previousCameraPointerX = event.clientX
    previousCameraPointerY = event.clientY
    renderer.domElement.setPointerCapture(event.pointerId)//强制把后续所有指针事件都锁定派发给 renderer.domElement（canvas），哪怕用户把鼠标拖到了浏览器外面、拖到了地址栏上
    event.preventDefault()
    event.stopImmediatePropagation()//不仅阻止事件继续传播，还阻止同一个元素上其他监听器执行，阻止OrbitControl重复执行
}

const handleCameraPointerMove = (event: PointerEvent) => {
    if (cameraDragPointerId !== event.pointerId) return

    //计算偏移量
    const elementHeight = renderer.domElement.clientHeight || 1
    const deltaX = event.clientX - previousCameraPointerX
    const deltaY = event.clientY - previousCameraPointerY

    controls.rotateLeft((Math.PI * 2 * deltaX) / elementHeight)
    controls.rotateUp((Math.PI * 2 * deltaY) / elementHeight)
    //更新当前位置
    previousCameraPointerX = event.clientX
    previousCameraPointerY = event.clientY
    event.preventDefault()
    event.stopImmediatePropagation()
}

const handleCameraPointerUp = (event: PointerEvent) => {
    if (cameraDragPointerId !== event.pointerId) return

    cameraDragPointerId = undefined
    if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId)//释放指针捕获
    }
    event.preventDefault()
    event.stopImmediatePropagation()
}

//键盘是否按下
const getKey = (code: string) => {
    return pressedKeys.has(code) ? 1 : 0
}

//键盘按下加入集合
const handleKeyDown = (event: KeyboardEvent) => {
    // [修改] 加入 ShiftLeft 和 ShiftRight 的监听
    if (!['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft'].includes(event.code)) return

    event.preventDefault()
    pressedKeys.add(event.code)
}

//键盘弹起移出集合
function handleKeyUp(event: KeyboardEvent) {
    if (!['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft'].includes(event.code)) return

    event.preventDefault()
    pressedKeys.delete(event.code)
}

//清空集合
const clearPressedKeys = () => {
    pressedKeys.clear()
}

//------其他------//
function addGround() {
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: '#f1f5f9',
        roughness: 1,
        metalness: 0,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
    })

    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(120, 120),
        groundMaterial,
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = 0
    ground.receiveShadow = true
    scene.add(ground)

    const grid = new THREE.GridHelper(120, 30, '#64748b', '#aebdca')
    grid.position.y = 0
    grid.material.transparent = true
    grid.material.opacity = 0.9
    grid.material.polygonOffset = true
    grid.material.polygonOffsetFactor = -1
    grid.material.polygonOffsetUnits = -1
    scene.add(grid)
}


onBeforeUnmount(() => {
    cancelAnimationFrame(animationFrameId)
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
    window.removeEventListener('blur', clearPressedKeys)
    renderer?.domElement.removeEventListener('pointerdown', handleCameraPointerDown, true)
    window.removeEventListener('pointermove', handleCameraPointerMove, true)
    window.removeEventListener('pointerup', handleCameraPointerUp, true)
    window.removeEventListener('pointercancel', handleCameraPointerUp, true)

    controls?.dispose()
    renderer?.dispose()
    mixer?.stopAllAction()

    scene?.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return

        object.geometry.dispose()
        if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose())
        } else {
            object.material.dispose()
        }
    })
})
</script>
<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>

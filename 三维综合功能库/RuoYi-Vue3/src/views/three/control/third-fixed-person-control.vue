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
const TURNING_MOVE_RATIO = 0.1
const TURN_SPEED = 2.4
const TURN_AROUND_SPEED = 80

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
let wasMovingBackward = false
let cameraRotationY = 0
let turnTargetY: number | undefined

const clock = new THREE.Clock()
const pressedKeys = new Set<string>()
const forwardDirection = new THREE.Vector3()
const worldUp = new THREE.Vector3(0, 1, 0)
const cameraOffset = new THREE.Vector3(0, 3.5, -7)
const cameraLookAtOffset = new THREE.Vector3(0, 2, 0)

onMounted(() => {
    const initResult = initThree(container.value!, {
        position: { x: 0, y: 3.2, z: -7.8 },
        targetPosition: { x: 0, y: 0.2, z: 0 },
    })

    scene = initResult.scene
    camera = initResult.camera
    renderer = initResult.renderer
    controls = initResult.orbitControls
    controls.enabled = false
    scene.background = new THREE.Color('#dbe7f3')

    scene.add(new THREE.HemisphereLight('#ffffff', '#b8c4d1', 1.5))

    addGround()
    loadPlayer()
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', clearPressedKeys)

    animate()
})

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

    mixer = new THREE.AnimationMixer(player)
    walkAction = createAction(walkFbx.animations[0])
    idleAction = createAction(idleFbx.animations[0])
    runAction = createAction(runFbx.animations[0])

    if (idleAction) {
        currentAction = idleAction
        currentAction.play()
    }

    updateCamera()
}

const createAction = (clip: THREE.AnimationClip | undefined) => {
    if (!mixer || !clip) return undefined

    const action = mixer.clipAction(clip)
    action.setLoop(THREE.LoopRepeat, Infinity)
    action.clampWhenFinished = false
    return action
}

const animate = () => {
    animationFrameId = requestAnimationFrame(animate)

    const delta = Math.min(clock.getDelta(), 0.05)
    const nextAction = updatePlayer(delta)
    updateAction(nextAction)
    mixer?.update(delta)
    updateCamera()
}

const updatePlayer = (delta: number) => {
    let nextAction: THREE.AnimationAction
    if (!player) return undefined

    // A 左转，D 右转。单独转向时也缓慢向前走，避免原地旋转。
    const rawTurnValue = getKey('KeyA') - getKey('KeyD')
    const moveValue = getKey('KeyW') - getKey('KeyS')
    const movingBackward = moveValue < 0

    if (moveValue !== 0 && movingBackward !== wasMovingBackward) {
        turnTargetY = player.rotation.y + Math.PI
    }
    if (moveValue !== 0) {
        wasMovingBackward = movingBackward
    }

    const turnValue = wasMovingBackward ? -rawTurnValue : rawTurnValue
    const turning = turnValue !== 0
    const moving = moveValue !== 0 || turning
    const running = (pressedKeys.has('ShiftLeft') || pressedKeys.has('ShiftRight')) && moving

    ////旋转
    if (turning) {
        const turnDelta = turnValue * TURN_SPEED * delta
        if (turnTargetY === undefined) {
            player.rotation.y += turnDelta
        } else {
            turnTargetY += turnDelta
        }
        cameraRotationY += turnDelta
    }
    if (turnTargetY !== undefined) {
        player.rotation.y = THREE.MathUtils.damp(
            player.rotation.y,
            turnTargetY,
            TURN_AROUND_SPEED,
            delta,
        )

        if (Math.abs(player.rotation.y - turnTargetY) < 0.001) {
            player.rotation.y = turnTargetY
            turnTargetY = undefined
        }
    }
    //旋转倾斜
    player.rotation.z = THREE.MathUtils.damp(player.rotation.z, -turnValue * 0.06, 8, delta)

    //行走/跑步
    // Keep S-facing changes separate from the camera yaw.
    if (moving) {
        player.getWorldDirection(forwardDirection)

        const movementValue = moveValue !== 0
            ? Math.abs(moveValue)
            : TURNING_MOVE_RATIO

        const currentSpeed = running ? RUN_SPEED : WALK_SPEED
        player.position.addScaledVector(forwardDirection, movementValue * currentSpeed * delta)
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

    camera.position
        .copy(cameraOffset)
        .applyAxisAngle(worldUp, cameraRotationY)
        .add(player.position)

    camera.lookAt(player.position.clone().add(cameraLookAtOffset))
}

//键盘是否按下
const getKey = (code: string) => {
    return pressedKeys.has(code) ? 1 : 0
}

//键盘按下加入集合
const handleKeyDown = (event: KeyboardEvent) => {
    // [修改] 加入 ShiftLeft 和 ShiftRight 的监听
    if (!['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight'].includes(event.code)) return

    event.preventDefault()
    pressedKeys.add(event.code)
}

//键盘弹起移出集合
function handleKeyUp(event: KeyboardEvent) {
    if (!['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight'].includes(event.code)) return

    event.preventDefault()
    pressedKeys.delete(event.code)
}

//清空集合
const clearPressedKeys = () => {
    pressedKeys.clear()
    wasMovingBackward = false
}

//other
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

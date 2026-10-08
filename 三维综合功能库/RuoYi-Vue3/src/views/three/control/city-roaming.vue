<template>
    <div ref="container" class="page-container"></div>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { FBXLoader, GLTFLoader } from 'three/examples/jsm/Addons.js'
import { initThree } from '@/utils/three'
import RAPIER from '@dimforge/rapier3d'

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: ReturnType<typeof initThree>['orbitControls']
let world: RAPIER.World
let playerBody: RAPIER.RigidBody | undefined
let playerCollider: RAPIER.Collider | undefined
let characterController: RAPIER.KinematicCharacterController | undefined

const MODEL_URL = '/three-data/model/fbx/People.fbx'
const WALK_ANIMATION_URL = '/three-data/model/fbx/Walking.fbx'
const IDLE_ANIMATION_URL = '/three-data/model/fbx/Idle.fbx'
const RUN_ANIMATION_URL = '/three-data/model/fbx/Running.fbx'
const JUMP_ANIMATION_URL = '/three-data/model/fbx/Jump.fbx'
const WALK_SPEED = 50
const RUN_SPEED = 150
const TURN_AROUND_SPEED = 20
const JUMP_SPEED = 180
const GRAVITY = -400

const container = ref<HTMLDivElement>()


let player: THREE.Group | undefined
let mixer: THREE.AnimationMixer | undefined
let currentAction: THREE.AnimationAction | undefined
let idleAction: THREE.AnimationAction | undefined
let walkAction: THREE.AnimationAction | undefined
let runAction: THREE.AnimationAction | undefined
let jumpAction: THREE.AnimationAction | undefined
let animationFrameId = 0
let cameraDragPointerId: number | undefined
let previousCameraPointerX = 0
let previousCameraPointerY = 0
let playerPhysicsOffsetY = 0
let playerVerticalVelocity = 0//垂直速度
let playerGrounded = false
let jumpRequested = false
let isJumping = false

const clock = new THREE.Clock()
const pressedKeys = new Set<string>()
const worldUp = new THREE.Vector3(0, 1, 0)
const cameraForward = new THREE.Vector3()
const cameraRight = new THREE.Vector3()
const movementDirection = new THREE.Vector3()
const desiredMovement = new THREE.Vector3()
const playerDelta = new THREE.Vector3()
const previousPlayerPosition = new THREE.Vector3()
const cameraLookAtOffset = new THREE.Vector3(0, 40, 0)

onMounted(async () => {
    const initResult = initThree(container.value!, {
        position: { x: 0, y: 3.2, z: -7.8 },
        targetPosition: { x: 0, y: 0.2, z: 0 },
        initAnimate: false,
    })

    scene = initResult.scene
    camera = initResult.camera
    renderer = initResult.renderer
    controls = initResult.orbitControls
    world = new RAPIER.World({ x: 0, y: GRAVITY, z: 0 })
    camera.far = 5000
    camera.updateProjectionMatrix()
    controls.enabled = true//开启
    controls.enableDamping = true//开启阻尼
    controls.dampingFactor = 0.08//阻尼系数
    controls.enablePan = false//禁用右键平移
    controls.minDistance = 4//限制相机距离
    controls.maxDistance = 300
    controls.minPolarAngle = 0.35//垂直视角限制
    controls.maxPolarAngle = Math.PI / 2 + 0.1
    scene.background = new THREE.Color('#dbe7f3')

    scene.add(new THREE.HemisphereLight('#ffffff', '#b8c4d1', 1.5))//半球光

    await Promise.all([loadCity(), loadPlayer()])

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
const loadCity = async () => {
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync('/three-data/model/city/scene.gltf')
    gltf.scene.scale.setScalar(800)//放大

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

            const bodyDesc = RAPIER.RigidBodyDesc.fixed() // 静态刚体
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
//载入角色数据
const loadPlayer = async () => {
    const loader = new FBXLoader()
    const [playerFbx, walkFbx, idleFbx, runFbx, jumpFbx] = await Promise.all([
        loader.loadAsync(MODEL_URL),
        loader.loadAsync(WALK_ANIMATION_URL),
        loader.loadAsync(IDLE_ANIMATION_URL),
        loader.loadAsync(RUN_ANIMATION_URL),
        loader.loadAsync(JUMP_ANIMATION_URL),
    ])

    player = playerFbx
    player.position.set(820, -909, -969)
    player.scale.setScalar(0.3)
    player.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        object.castShadow = true
        object.receiveShadow = true
    })
    scene.add(player)
    setupPlayerPhysics()
    previousPlayerPosition.copy(player.position)

    mixer = new THREE.AnimationMixer(player)
    walkAction = createAction(walkFbx.animations[0])
    idleAction = createAction(idleFbx.animations[0])
    runAction = createAction(runFbx.animations[0])
    jumpAction = createAction(jumpFbx.animations[0])
    if (jumpAction) {
        jumpAction.timeScale = 0.5
        jumpAction.setLoop(THREE.LoopOnce, 1)
        jumpAction.clampWhenFinished = true
    }

    if (idleAction) {
        currentAction = idleAction
        currentAction.play()
    }

    controls.target.copy(player.position).add(cameraLookAtOffset)
    controls.update()
    updateCamera()
}

const setupPlayerPhysics = () => {
    if (!player) return

    const playerBounds = new THREE.Box3().setFromObject(player)
    const playerSize = playerBounds.getSize(new THREE.Vector3())//外接球
    const playerRadius = Math.max(Math.min(playerSize.x, playerSize.z) * 0.35)//水平半径
    const capsuleHalfHeight = playerSize.y * 0.5 - playerRadius //中间圆柱高度，胶囊=上半球+中间圆柱+下半球

    playerPhysicsOffsetY = playerBounds.min.y - player.position.y + playerSize.y * 0.5//模型中心坐标的偏移结果，原模型Y+该偏移=模型中心

    const bodyDesc = RAPIER.RigidBodyDesc
        .kinematicPositionBased()//位置运动
        .setTranslation(
            player.position.x,
            player.position.y + playerPhysicsOffsetY,
            player.position.z,
        )
    playerBody = world.createRigidBody(bodyDesc)

    const colliderDesc = RAPIER.ColliderDesc
        .capsule(capsuleHalfHeight, playerRadius)//胶囊体
        .setFriction(0)
        .setRestitution(0)
    playerCollider = world.createCollider(colliderDesc, playerBody)

    //计算工具
    characterController = world.createCharacterController(
        Math.max(playerRadius * 0.05, 0.01),//皮肤厚度
    )
    characterController.setUp({ x: 0, y: 1, z: 0 })
    characterController.setSlideEnabled(true)//	滑动：前面有墙，角色沿着墙滑过去
    characterController.setMaxSlopeClimbAngle(THREE.MathUtils.degToRad(45))//最大爬坡角度
    characterController.enableAutostep(//自动上台阶
        Math.max(playerRadius * 0.2, 0.1),//低于这个高度的台阶不触发自动上台阶
        Math.max(playerRadius * 1.5, 0.1),//高于这个高度的台阶也上不去
        false,//只有在角色正在移动时才尝试上台阶
    )
    characterController.enableSnapToGround(
        Math.max(playerRadius * 0.5, 0.1),//角色在地面上方很近的距离内移动时，自动把角色"吸"到地面上
    )
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
    const currentSpeed = running ? RUN_SPEED : WALK_SPEED

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

    }
    else {//WSAD全松开，身体倾斜回正
        player.rotation.z = THREE.MathUtils.damp(player.rotation.z, 0, 8, delta)//当前，目标，阻尼，帧间隔
    }

    if (playerBody && playerCollider && characterController) {
        world.timestep = delta
        if (jumpRequested && playerGrounded) {
            playerVerticalVelocity = JUMP_SPEED
            playerGrounded = false
            isJumping = true
            jumpRequested = false
        }
        if (playerGrounded && playerVerticalVelocity < 0) {
            playerVerticalVelocity = 0
        }
        playerVerticalVelocity += world.gravity.y * delta

        desiredMovement.set(//这一帧角色想往哪走、走多远打包成一个向量
            moving ? movementDirection.x * currentSpeed * delta : 0,//x
            playerVerticalVelocity * delta,//y
            moving ? movementDirection.z * currentSpeed * delta : 0,//z
        )

        characterController.computeColliderMovement(//把胶囊碰撞体 + 期望位移喂给控制器,结果存在内部缓冲区,不进行任何操作
            playerCollider,
            desiredMovement,
        )
        const correctedMovement = characterController.computedMovement()//取出修正后的位移
        const physicsPosition = playerBody.translation()//拿到胶囊体当前帧在世界坐标里的位置

        playerBody.setNextKinematicTranslation({//当前位置 + 修正位移 = 新位置
            x: physicsPosition.x + correctedMovement.x,
            y: physicsPosition.y + correctedMovement.y,
            z: physicsPosition.z + correctedMovement.z,
        })
        world.step()//更新

        //更新模型位置
        const nextPhysicsPosition = playerBody.translation()
        player.position.set(
            nextPhysicsPosition.x,
            nextPhysicsPosition.y - playerPhysicsOffsetY,
            nextPhysicsPosition.z,
        )
        playerGrounded = characterController.computedGrounded()
        if (playerGrounded && playerVerticalVelocity < 0) {
            playerVerticalVelocity = 0
        }
        if (playerGrounded) {
            isJumping = false
        }
    }
    //计算下一步状态
    if (isJumping) {
        nextAction = jumpAction!
    } else if (!moving) {
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
    controls.target.add(playerDelta)
    previousPlayerPosition.copy(player.position)
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
    if (event.code === 'Space') {
        event.preventDefault()
        if (!event.repeat && !isJumping) {//长按
            jumpRequested = true
        }
        return
    }
    if (!['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft'].includes(event.code)) return

    event.preventDefault()
    pressedKeys.add(event.code)
}

//键盘弹起移出集合
function handleKeyUp(event: KeyboardEvent) {
    if (event.code === 'Space') {
        event.preventDefault()
        return
    }

    if (!['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft'].includes(event.code)) return

    event.preventDefault()
    pressedKeys.delete(event.code)
}

//清空集合
const clearPressedKeys = () => {
    pressedKeys.clear()
    jumpRequested = false
}

//------其他------//
onBeforeUnmount(() => {
    cancelAnimationFrame(animationFrameId)
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
    window.removeEventListener('blur', clearPressedKeys)
    renderer?.domElement.removeEventListener('pointerdown', handleCameraPointerDown, true)
    window.removeEventListener('pointermove', handleCameraPointerMove, true)
    window.removeEventListener('pointerup', handleCameraPointerUp, true)
    window.removeEventListener('pointercancel', handleCameraPointerUp, true)

    if (characterController) {
        world.removeCharacterController(characterController)
    }
    if (playerBody) {
        world.removeRigidBody(playerBody)
    }
    world?.free()
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

<template>
    <div class="page-container">
        <div ref="container" class="scene-container"></div>
        <DraggableModal title="蒙皮动画" :isMove="false">
            <div class="row">
                <el-button @click="handleRun" class="draw-button" color="greenyellow">
                    {{ isRun ? '暂停' : '播放' }}
                </el-button>
            </div>

            <!-- 动作切换下拉框 -->
            <div class="row">
                <div class="label">动作</div>
                <el-select v-model="currentAnimName" @change="handleChangeAnim" placeholder="选择动作" class="input">
                    <el-option label="走路" value="Walking"></el-option>
                    <el-option label="踢腿" value="Kick"></el-option>
                    <el-option label="跳舞" value="Dance"></el-option>
                    <el-option label="坐" value="Sitting"></el-option>
                    <el-option label="俯卧" value="lying"></el-option>
                </el-select>
            </div>

            <div class="row">
                <div class="label">进度</div>
                <el-slider v-model.number="runPercentage" :min="0" :max="1" :step="0.001" @input="updatePercentage"
                    class="slider-input" show-input />
            </div>
        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import * as THREE from 'three'
import { initThree } from '@/utils/three'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import '@/components/Common/draggable-modal.css'
import { FBXLoader, OrbitControls } from 'three/examples/jsm/Addons.js'

const container = ref<HTMLDivElement>()
let scene: THREE.Scene
let controls: OrbitControls

const isRun = ref(true)
const runPercentage = ref(0)
const currentAnimName = ref('Walking')
const animNames = ['Walking', 'Dance', 'Sitting', 'lying', 'Kick']

let model: THREE.Group | undefined
let animationDuration = 0
let mixer: THREE.AnimationMixer | undefined

// 存储所有加载好的动画动作
const actions: Record<string, THREE.AnimationAction> = {}
let currentAction: THREE.AnimationAction | undefined
let currentName: string | undefined

const clock = new THREE.Clock()

onMounted(() => {
    const initResult = initThree(container.value!, {
        position: { x: 4, y: 3, z: 10 },
    })

    scene = initResult.scene
    controls = initResult.orbitControls

    scene.background = new THREE.Color('#0f172a')

    addFloor()
    loadModel()
    animate()
})

const loadModel = async () => {
    const loader = new FBXLoader()
    //加载带皮肤的基准模型
    const peopleFbx = await loader.loadAsync('/three-data/model/fbx/People.fbx')
    model = peopleFbx
    model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        object.castShadow = true
        object.receiveShadow = true
    })
    model.position.set(0, -0.5, 0)
    model.scale.setScalar(0.02)
    scene.add(model)

    // 初始化动画混合器（绑定到模型）
    mixer = new THREE.AnimationMixer(model)

    // 定义并并行加载纯动作文件

    const animPromises = animNames.map(name =>
        loader.loadAsync(`/three-data/model/fbx/${name}.fbx`)
    )
    const animFbxes = await Promise.all(animPromises)

    // 将动作绑定到混合器
    animFbxes.forEach((animFbx, index) => {
        const name = animNames[index]
        if (animFbx.animations && animFbx.animations.length > 0) {
            const action = mixer!.clipAction(animFbx.animations[0])
            actions[name] = action
            action.setLoop(THREE.LoopRepeat, Infinity)
            action.clampWhenFinished = false
        }
    })

    // 默认播放第一个动作（Walking）
    if (actions['Walking']) {
        currentAction = actions['Walking']
        currentName = 'Walking'
        animationDuration = currentAction.getClip().duration
        currentAction.play()
    }
}

// 切换动作（使用 crossFade 实现平滑过渡）
const handleChangeAnim = (targetName: string) => {
    if (!mixer || !actions[targetName] || targetName === currentName) return

    const nextAction = actions[targetName]

    // 准备并播放新动作
    nextAction.reset()
    nextAction.play()

    // 从当前动作淡入淡出到新动作（0.5秒过渡）
    if (currentAction) {
        currentAction.crossFadeTo(nextAction, 0.5, true)//要淡入的新动作,过渡时长,时间扭曲
    }

    currentAction = nextAction
    currentName = targetName
    animationDuration = nextAction.getClip().duration

    // 切换后自动播放
    if (!isRun.value) {
        isRun.value = true
        if (currentAction) currentAction.paused = false
    }
}

// 渲染循环
const animate = () => {
    requestAnimationFrame(animate)

    const delta = Math.min(clock.getDelta(), 0.05)
    if (mixer && currentAction) {
        mixer.update(delta)
        if (isRun.value && animationDuration > 0) {
            runPercentage.value = Number((currentAction.time % animationDuration / animationDuration).toFixed(3))
        }
    }

}

// 播放/暂停
const handleRun = () => {
    isRun.value = !isRun.value
    if (!currentAction) return
    currentAction.paused = !isRun.value
}

// 进度条拖拽更新
const updatePercentage = () => {
    if (!mixer || !currentAction || !animationDuration) return

    currentAction.paused = false
    currentAction.time = runPercentage.value * animationDuration
    mixer.update(0)// 强制更新一帧，让画面跳到对应姿势
    currentAction.paused = true
    isRun.value = false
}

// 添加地面
const addFloor = () => {
    const floor = new THREE.Mesh(
        new THREE.CircleGeometry(4.5, 64),
        new THREE.MeshStandardMaterial({
            color: '#263449',
            roughness: 0.82,
            metalness: 0.08,
        }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -1.08
    floor.receiveShadow = true
    scene.add(floor)

    const ring = new THREE.Mesh(
        new THREE.RingGeometry(3.2, 3.23, 64),
        new THREE.MeshBasicMaterial({
            color: '#f59e0b',
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
        }),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = -1.075
    scene.add(ring)
}
</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
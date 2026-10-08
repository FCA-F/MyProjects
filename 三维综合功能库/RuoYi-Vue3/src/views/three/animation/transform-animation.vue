<template>
    <div class="page-container">
        <div ref="container" class="scene-container"></div>
        <DraggableModal title="变形动画" :isMove="false">
            <div class="row">
                <el-button @click="handleRun" class="draw-button" color="greenyellow">{{ isRun ? '暂停' : '播放'
                }}</el-button>
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
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { initThree } from '@/utils/three'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import '@/components/Common/draggable-modal.css'
import { OrbitControls } from 'three/examples/jsm/Addons.js'

const container = ref<HTMLDivElement>()
let scene: THREE.Scene
let controls: OrbitControls

const isRun = ref(true)//是否变化
const runPercentage = ref(0)//变化进度百分比


let model: THREE.Group | undefined
let animationDuration: number//动画时长
let mixer: THREE.AnimationMixer | undefined
let action: THREE.AnimationAction | undefined
const clock = new THREE.Clock()

onMounted(() => {
    const initResult = initThree(container.value!, {
        position: { x: 3.8, y: 2.6, z: 6.8 },
        targetPosition: { x: 0, y: 0, z: 0 },
    })

    scene = initResult.scene
    controls = initResult.orbitControls

    scene.background = new THREE.Color('#0f172a')
    controls.enableDamping = true//开启鼠标拖拽后的惯性滑动
    controls.dampingFactor = 0.06//滑动阻尼
    controls.minDistance = 3// 滚轮放大到离目标最近 3 单位
    controls.maxDistance = 14
    controls.maxPolarAngle = Math.PI * 0.48//0是天，Math.PI/2是水平线

    addFloor()
    loadModel()
    animate()
})

const loadModel = async () => {
    const loader = new GLTFLoader()

    let gltf = await loader.loadAsync('/three-data/model/blender-morph-targets/morph-targets.gltf')
    model = gltf.scene
    model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        object.castShadow = true
        object.receiveShadow = true
    })
    scene.add(model)

    /*
    动画剪辑     AnimationClip      一盘录像带（里面录好了动作数据）
    动画混合器  ​ AnimationMixer     一台录像机（负责播放录像带）
    动画动作     A​nimationAction    遥控器（控制播放/暂停/速度/循环等）
    */
    if (gltf.animations.length > 0) {//有动画
        mixer = new THREE.AnimationMixer(model)
        action = mixer.clipAction(gltf.animations[0])// 把动画剪辑交给混合器，生成一个"动画动作"
        animationDuration = gltf.animations[0].duration//动画时长

        action.setLoop(THREE.LoopRepeat, Infinity)//重复、无限播放
        action.clampWhenFinished = false//动画播完后，不锁定在最后一帧，而是回到循环里继续播
        action.play()//启动动画
    }
}

const animate = () => {
    requestAnimationFrame(animate)

    const delta = Math.min(clock.getDelta(), 0.05)
    if (mixer && action && isRun.value) {
        mixer.update(delta)
        runPercentage.value = Number((action.time % animationDuration / animationDuration).toFixed(3))
    }
}
//处理暂停
const handleRun = () => {
    isRun.value = !isRun.value
    if (!action) return
    action.paused = !isRun.value
}
//滑条更新百分比
const updatePercentage = () => {
    if (!mixer || !action || !animationDuration) return
    action.paused = false//取消暂停，保证更新一帧
    mixer.setTime(runPercentage.value * animationDuration)//百分比*总时间
    action.paused = true//暂停，方便查看
    isRun.value = false//暂停
}

//other
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

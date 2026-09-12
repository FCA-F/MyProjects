<template>
    <DraggableModal title="操控无人机">
        <div class="row">
            <el-button @click="toggleKeyboardFlying" :type="isFlying ? 'danger' : 'primary'" class="button">
                {{ isFlying ? '关闭键盘飞行' : '开启键盘飞行' }}
            </el-button>
        </div>
        <div>
            <div>W/S: 俯仰</div>
            <div>A/D: 偏航</div>
            <div>Q/E: 翻滚</div>
            <div>1/2: 调整速度</div>
        </div>
    </DraggableModal>
</template>
<script setup lang="ts">
import { onMounted, ref, onBeforeUnmount } from 'vue'

import * as Cesium from 'cesium'
import { useCesiumStore } from '@/stores/cesium.ts'
import DraggableModal from '@/components/TopToolbar/draggable-modal.vue'
import '@/components/TopToolbar/draggable-modal.css'

const cesiumStore = useCesiumStore();
const viewer = cesiumStore.viewer as Cesium.Viewer;

let glb: Cesium.Entity | undefined
let position = Cesium.Cartesian3.fromDegrees(117.0105, 36.6715, 20)
let headingPitchRoll = new Cesium.HeadingPitchRoll()
let preUpdate: Cesium.Event.RemoveCallback | undefined

const isFlying = ref(false)
const speed = ref(0.5)//速度
const deltaSpeed = 0.01
//改变一次角度
const deltaHeadingRadians = Cesium.Math.toRadians(0.5)
const deltaPitchRadians = Cesium.Math.toRadians(0.2)
const deltaRollRadians = Cesium.Math.toRadians(0.5)
//'north'局部坐标系的 X 轴指向正北
//'west'局部坐标系的 Y 轴指向正西
//打开页面，无人机默认面朝正北，W 是往北飞，S 是往南飞
const fixedFrameTransform = Cesium.Transforms.localFrameToFixedFrameGenerator('north', 'west')//规则
const cameraBackDistance = 50
const cameraUpDistance = 12
const cameraLookAheadDistance = 20
const pressedKeys = new Set<string>()

onMounted(() => {
    loadGLB()
    if (glb) {
        void viewer.zoomTo(glb)
    }
})

const getOrientation = () => {
    return Cesium.Transforms.headingPitchRollQuaternion(
        position,
        headingPitchRoll,
        Cesium.Ellipsoid.WGS84,
        fixedFrameTransform,//规则
    )
}

const getModelMatrix = () => {
    return Cesium.Transforms.headingPitchRollToFixedFrame(
        position,
        headingPitchRoll,
        Cesium.Ellipsoid.WGS84,
        fixedFrameTransform,//规则
    )
}

const updateModelPose = () => {
    if (!glb) return
    glb.position = new Cesium.ConstantPositionProperty(position)
    glb.orientation = new Cesium.ConstantProperty(getOrientation())
}

const loadGLB = () => {
    glb = viewer.entities.add({
        position: new Cesium.ConstantPositionProperty(position),
        orientation: new Cesium.ConstantProperty(getOrientation()),
        model: {
            uri: '/data/UAV.glb',
            scale: 0.5,
        },
    })
}

const onKeyDown = (event: KeyboardEvent) => {
    if (!isFlying.value) return

    const key = event.key.toLowerCase()//实际按键，忽略大小写
    if (['w', 's', 'a', 'd', 'q', 'e', '1', '2'].includes(key)) {
        event.preventDefault()//阻止浏览器默认按键行为
        pressedKeys.add(key)
    }
}

const onKeyUp = (event: KeyboardEvent) => {
    pressedKeys.delete(event.key.toLowerCase())
}

const updateHeadingPitchRoll = () => {
    if (pressedKeys.has('w')) {
        headingPitchRoll.pitch += deltaPitchRadians
    }
    if (pressedKeys.has('s')) {
        headingPitchRoll.pitch -= deltaPitchRadians
    }
    if (pressedKeys.has('a')) {
        headingPitchRoll.heading -= deltaHeadingRadians
    }
    if (pressedKeys.has('d')) {
        headingPitchRoll.heading += deltaHeadingRadians
    }
    if (pressedKeys.has('q')) {
        headingPitchRoll.roll -= deltaRollRadians
    }
    if (pressedKeys.has('e')) {
        headingPitchRoll.roll += deltaRollRadians
    }
    if (pressedKeys.has('1')) {
        speed.value = Math.min(speed.value + deltaSpeed, 30)
    }
    if (pressedKeys.has('2')) {
        speed.value = Math.max(speed.value - deltaSpeed, 0.1)
    }
}

const updateFlyingPosition = () => {
    const modelMatrix = getModelMatrix()
    const localMove = Cesium.Cartesian3.multiplyByScalar(//点
        Cesium.Cartesian3.UNIT_X,//局部坐标系里的 X 轴正方向单位向量
        speed.value,
        new Cesium.Cartesian3(),
    )
    //multiplyByPoint把一个点从“模型自己的坐标系”变换到“世界（地球）坐标系”
    position = Cesium.Matrix4.multiplyByPoint(modelMatrix, localMove, new Cesium.Cartesian3())
}

const updateFollowCamera = () => {
    const modelMatrix = getModelMatrix()
    const cameraLocalPosition = new Cesium.Cartesian3(//相机在模型身边的站位（相对）
        -cameraBackDistance,
        0,
        cameraUpDistance,
    )
    const targetLocalPosition = new Cesium.Cartesian3(//相机盯着看的目标点（相对）
        cameraLookAheadDistance,
        0,
        0,
    )
    const cameraPosition = Cesium.Matrix4.multiplyByPoint(//相机绝对位置
        modelMatrix,
        cameraLocalPosition,
        new Cesium.Cartesian3(),
    )
    const targetPosition = Cesium.Matrix4.multiplyByPoint(//目标绝对位置
        modelMatrix,
        targetLocalPosition,
        new Cesium.Cartesian3(),
    )
    const direction = Cesium.Cartesian3.subtract(//视线方向
        targetPosition,
        cameraPosition,
        new Cesium.Cartesian3(),
    )
    Cesium.Cartesian3.normalize(direction, direction)

    const up = new Cesium.Cartesian3(modelMatrix[8], modelMatrix[9], modelMatrix[10])
    Cesium.Cartesian3.normalize(up, up)

    viewer.camera.setView({
        destination: cameraPosition,
        orientation: {
            direction,
            up,
        },
    })
}

const startKeyboardFlying = () => {
    if (isFlying.value || !viewer || !glb) return

    isFlying.value = true
    pressedKeys.clear()
    document.addEventListener('keydown', onKeyDown, false)
    document.addEventListener('keyup', onKeyUp, false)

    if (preUpdate) {
        preUpdate()
    }

    preUpdate = viewer.scene.preUpdate.addEventListener(() => {// 每一帧渲染之前触发的事件
        updateHeadingPitchRoll() // 根据按键更新模型的姿态（偏航/俯仰/翻滚）
        updateFlyingPosition()   // 根据当前朝向和速度计算新位置
        updateModelPose()        // 将位置和姿态同步到 Cesium Entity
        updateFollowCamera()     // 让相机始终跟随在无人机后方
    })
}

const stopKeyboardFlying = () => {
    if (!viewer) return

    isFlying.value = false
    pressedKeys.clear()
    document.removeEventListener('keydown', onKeyDown, false)
    document.removeEventListener('keyup', onKeyUp, false)

    if (preUpdate) {
        preUpdate()
        preUpdate = undefined
    }

    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)//让相机回到不受约束的自由状态
}

const toggleKeyboardFlying = () => {
    if (isFlying.value) {
        stopKeyboardFlying()
    } else {
        startKeyboardFlying()
    }
}

onBeforeUnmount(() => {
    stopKeyboardFlying()
    if (glb) {
        viewer.entities.remove(glb)
    }
})



</script>

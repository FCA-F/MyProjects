<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
        <DraggableModal title="海量模型">
            <div class="row">
                <span class="label">模型数量</span>
                <el-input-number v-model.number="modelCount" :min="100" :max="50000" :step="1000"
                    @change="createModels" />
            </div>
            <div class="row">
                <span class="label">模型缩放</span>
                <el-input-number v-model.number="modelScale" :min="0.1" :max="200" :step="0.1" :precision="1"
                    @change="createModels" />
            </div>
            <div class="row">
                <el-button type="primary" @click="createModels">生成模型</el-button>
                <el-button @click="clearModels()">清除</el-button>
            </div>
        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import { onBeforeUnmount, ref } from 'vue'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import { initCesiumBase } from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

type InstanceFeatureData = {
    positions: Float32Array
    scales: Float32Array
    rtcCenter: [number, number, number]
    boundingSphere: [number, number, number, number]
    range: number
}

type TilesetResource = {
    tileset: Cesium.Cesium3DTileset
    urls: string[]
}

interface PointData {
    longitude: number
    latitude: number
}

const MODEL_URL = '/data/fox.glb'
const CENTER_LNG = 80
const CENTER_LAT = 30
const I3DM_HEADER_BYTES = 32
const I3DM_VERSION = 1
const GLTF_FORMAT_BINARY = 1

const modelCount = ref(10000)
const modelScale = ref(5)

let viewer: Cesium.Viewer
let sourceGlbBuffer: ArrayBuffer | undefined//二进制内存
let tilesetPrimitive: Cesium.Cesium3DTileset | undefined
let objectUrls: string[] = []

const onMapReady = (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer
    void initCesiumBase(viewer, {
        destination: { lng: CENTER_LNG - 0.23, lat: CENTER_LAT - 0.23, height: 3000 },
        orientation: { heading: 40, pitch: -20, roll: 0 },
        debugShowFramesPerSecond: true,
    })
    createModels()
}

const createModels = async () => {
    clearModels()

    const { tileset, urls } = await addPrimitives()
    tilesetPrimitive = viewer.scene.primitives.add(tileset) as Cesium.Cesium3DTileset
    objectUrls = urls
}

const addPrimitives = async (): Promise<TilesetResource> => {
    const sourceBuffer = await getSourceGlbBuffer()//glb缓存数据
    const featureData = createRandomFeatures()//位置数据
    const i3dmBuffer = createI3dm(sourceBuffer, featureData)
    const i3dmUrl = URL.createObjectURL(new Blob([i3dmBuffer], { type: 'application/octet-stream' }))//二进制内存->虚拟文件->网址
    const tilesetJson = createTilesetJson(i3dmUrl, featureData.boundingSphere, featureData.range)
    const tilesetUrl = URL.createObjectURL(new Blob([JSON.stringify(tilesetJson)], { type: 'application/json' }))
    const urls = [i3dmUrl, tilesetUrl]

    const tileset = await Cesium.Cesium3DTileset.fromUrl(tilesetUrl, {
        maximumScreenSpaceError: 32,
    })
    return { tileset, urls }
}

const getSourceGlbBuffer = async () => {
    if (sourceGlbBuffer) return sourceGlbBuffer.slice(0)
    const response = await fetch(MODEL_URL)
    sourceGlbBuffer = await response.arrayBuffer()
    return sourceGlbBuffer.slice(0)
}

const createRandomPointsCoordinates = (count: number): PointData[] => {
    const points: PointData[] = []
    for (let i = 0; i < count; i++) {
        points.push({
            longitude: Cesium.Math.randomBetween(CENTER_LNG - 0.2, CENTER_LNG + 0.2),
            latitude: Cesium.Math.randomBetween(CENTER_LAT - 0.2, CENTER_LAT + 0.2)
        })
    }
    return points
}

const createRandomFeatures = (): InstanceFeatureData => {
    const count = modelCount.value
    const positions = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const center = Cesium.Cartesian3.fromDegrees(CENTER_LNG, CENTER_LAT, 0)
    let radius = 0

    const points = createRandomPointsCoordinates(count)

    for (let i = 0; i < count; i++) {
        const point = points[i]
        const worldPosition = Cesium.Cartesian3.fromDegrees(point.longitude, point.latitude, 0)
        const relativePosition = Cesium.Cartesian3.subtract(worldPosition, center, new Cesium.Cartesian3())

        positions[i * 3] = relativePosition.x
        positions[i * 3 + 1] = relativePosition.y
        positions[i * 3 + 2] = relativePosition.z

        scales[i] = modelScale.value

        const dist = Cesium.Cartesian3.distance(worldPosition, center)
        radius = Math.max(radius, dist)
    }

    radius += Math.max(500, modelScale.value * 60)

    return {
        positions,
        scales,
        rtcCenter: [center.x, center.y, center.z],
        boundingSphere: [center.x, center.y, center.z, radius],
        range: radius,
    }
}

const createI3dm = (glbBuffer: ArrayBuffer, featureData: InstanceFeatureData) => {
    //I3DM 分为头部分、 JSON 部分（描述结构）和 Binary 部分（存实际数据）。
    const positionByteOffset = 0//位置数据从 Binary 的第 0 个字节开始
    const scaleByteOffset = featureData.positions.byteLength
    const featureTableJson = {
        INSTANCES_LENGTH: modelCount.value,//实例总数
        RTC_CENTER: featureData.rtcCenter,//相对中心
        EAST_NORTH_UP: true, //自动对齐地表
        POSITION: { byteOffset: positionByteOffset },//去Binary的哪个位置读位置数据，偏移0，三个一组
        SCALE: { byteOffset: scaleByteOffset },//去 Binary 的哪个位置读缩放数据，去 Binary 的哪个位置读缩放数据，一个一组
    }
    const featureJsonBytes = padJsonBytes(JSON.stringify(featureTableJson), 8)//->JSON 字符串-> UTF-8(补齐末尾8位)

    const featureBinaryBytes = mergeFeatureBinary(featureData.positions, featureData.scales)//把 positions（Float32Array）和 scales（Float32Array）的二进制数据拼在一起
    const glbBytes = new Uint8Array(glbBuffer)//模型最底层二进制转8字节视图，视图可操作
    const byteLength = I3DM_HEADER_BYTES + featureJsonBytes.byteLength + featureBinaryBytes.byteLength + glbBytes.byteLength//算整个 i3dm 文件的总字节数，四段相加：32 字节头 + JSON段 + Binary段 + glb模型段

    //视图写入
    const i3dmBuffer = new ArrayBuffer(byteLength)//分配一块全新的、指定大小的原始二进制内存
    const headWriter = new DataView(i3dmBuffer)// 写头部字段（32 字节 header），DataView:可以按任意字节写入的视图。任意字节精细控制
    const bodyWriter = new Uint8Array(i3dmBuffer)//写JSON，Binary，glb段。整块搬速度快
    let offset = 0//当前写入位置指针，标记"写到第几个字节了

    //写入头（全局信息）
    for (let i = 0; i < 'i3dm'.length; i++)
        headWriter.setUint8(offset + i, 'i3dm'.charCodeAt(i))//写入output前四个字节'id3m'的ascii码
    offset += 4
    headWriter.setUint32(offset, I3DM_VERSION, true)//版本
    headWriter.setUint32(offset + 4, byteLength, true)//整个文件总字节数
    headWriter.setUint32(offset + 8, featureJsonBytes.byteLength, true)//	JSON 段长度
    headWriter.setUint32(offset + 12, featureBinaryBytes.byteLength, true)//	Binary 段长度
    headWriter.setUint32(offset + 16, 0, true)//0（没用），Batch Table JSON，没有给每个实例挂额外属性如 id、名称等
    headWriter.setUint32(offset + 20, 0, true)//0（没用）， Batch Table Binary ，没有给每个实例挂额外属性如 id、名称等
    headWriter.setUint32(offset + 24, GLTF_FORMAT_BINARY, true)//1
    offset += 28

    //写入身体（具体内容）
    bodyWriter.set(featureJsonBytes, offset)//写入JSON
    offset += featureJsonBytes.byteLength
    bodyWriter.set(featureBinaryBytes, offset)//写入Binary
    offset += featureBinaryBytes.byteLength
    bodyWriter.set(glbBytes, offset)//写入Model

    return i3dmBuffer

    /*i3dmBuffer 前 32 字节：
    ┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐
    │ 105│ 51 │ 100│ 109│ 1  │ 0  │ 0  │ 0  │...总字节数...│...JSON长度...│...BIN长度...│
    │ 'i'│ '3'│ 'd'│ 'm'│ ver│    │    │    │               │              │             │
    └────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘
    0    1    2    3    4    5    6    7    8              12             16
    ┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐
    │ 0  │ 0  │ 0  │ 0  │ 0  │ 0  │ 0  │ 0  │ 1  │ 0  │ 0  │ 0  │
    │batchJSON=0    │batchBIN=0     │gltfFormat=1  │
    └────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘
    20           24           28           31



    i3dmBuffer 完整结构：
    ┌──────────┬─────────────────────┬──────────────────┬──────────────┐
    │ Header   │ Feature Table JSON  │ Feature Table    │ glb 模型     │
    │ 32 字节  │ (对齐后，比如 200B) │ Binary (对齐后)  │ (比如 2MB)   │
    ├──────────┼─────────────────────┼──────────────────┼──────────────┤
    │ offset=0 │ offset=32           │ offset=32+jsonLen│ offset=32+jsonLen+binLen│
    └──────────┴─────────────────────┴──────────────────┴──────────────┘

    
    */
}

const padJsonBytes = (json: string, alignment: number) => {
    const encoder = new TextEncoder()//浏览器原生 API，把字符串编码成 UTF-8 字节序列
    const bytes = encoder.encode(json)//编码成UTF-8
    const paddedLength = alignTo(bytes.byteLength, alignment)//向上取整到 alignment 的倍数
    const output = new Uint8Array(paddedLength)//分配一块内存，大小是对齐后的总长度
    output.set(bytes)//把 JSON 的字节拷贝到前面
    output.fill(0x20, bytes.byteLength)//从 bytes.byteLength 开始到末尾，全部填 0x20,即空格
    return output
}

const mergeFeatureBinary = (positions: Float32Array, scales: Float32Array) => {
    const positionsBytes = new Uint8Array(positions.buffer)
    const scalesBytes = new Uint8Array(scales.buffer)
    const byteLength = alignTo(positionsBytes.byteLength + scalesBytes.byteLength, 8)
    const output = new Uint8Array(byteLength)
    output.set(positionsBytes, 0)
    output.set(scalesBytes, positionsBytes.byteLength)
    return output
}

const createTilesetJson = (i3dmUrl: string, sphere: [number, number, number, number], range: number) => ({
    asset: { version: '1.0' },
    geometricError: range,//当相机离这个 tileset 的距离产生的屏幕误差超过 range 米时，我就不该显示这个 tileset
    root: {
        boundingVolume: { sphere },//相机在不在包围球附近 → 决定要不要请求/渲染这个 tile
        geometricError: Math.max(1, range / 10),//root tile 的几何误差
        refine: 'ADD',//子 tile 加载后，父 tile 继续显示
        content: { uri: i3dmUrl },// tile 的数据在哪
    },
})

//向上取整
const alignTo = (value: number, alignment: number) => Math.ceil(value / alignment) * alignment

const clearModels = () => {
    viewer.scene.primitives.remove(tilesetPrimitive)
    objectUrls.forEach((url) => URL.revokeObjectURL(url))
    tilesetPrimitive = undefined
    objectUrls = []
}

onBeforeUnmount(() => {
    clearModels()
})
</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
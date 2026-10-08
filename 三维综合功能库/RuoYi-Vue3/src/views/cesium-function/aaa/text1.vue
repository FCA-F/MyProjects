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
                <span class="label">间距</span>
                <el-input-number v-model.number="modelSpacing" :min="20" :max="500" :step="10" @change="createModels" />
            </div>
            <div class="row">
                <el-button type="primary" @click="createModels">生成模型</el-button>
                <el-button @click="flyToModels">定位</el-button>
                <el-button @click="clear">清除</el-button>
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
const CENTER_LNG = 114.40740
const CENTER_LAT = 30.50721
const I3DM_HEADER_BYTES = 32
const I3DM_VERSION = 1
const GLTF_FORMAT_BINARY = 1

const modelCount = ref(5000)
const modelScale = ref(10)
const modelSpacing = ref(80)

let viewer: Cesium.Viewer
let sourceGlbBuffer: ArrayBuffer | undefined
let tilesetPrimitive: Cesium.Cesium3DTileset | undefined
let objectUrls: string[] = []

const onMapReady = (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer
    void initCesiumBase(viewer, {
        destination: { lng: CENTER_LNG, lat: CENTER_LAT, height: 5000 },
        debugShowFramesPerSecond: true,
    })
    createModels()
}

const createModels = async () => {
    if (!viewer) return
    clearModels()

    const { tileset, urls } = await addPrimitives()
    tilesetPrimitive = viewer.scene.primitives.add(tileset) as Cesium.Cesium3DTileset
    objectUrls = urls
    flyToModels()
}

const addPrimitives = async (): Promise<TilesetResource> => {
    const sourceBuffer = await getSourceGlbBuffer()//GLB二进制缓存数据
    const featureData = createRandomFeatures()
    const i3dmBuffer = createI3dm(sourceBuffer, featureData)
    const i3dmUrl = URL.createObjectURL(new Blob([i3dmBuffer], { type: 'application/octet-stream' }))
    const tilesetJson = createTilesetJson(i3dmUrl, featureData.boundingSphere, featureData.range)
    const tilesetUrl = URL.createObjectURL(new Blob([JSON.stringify(tilesetJson)], { type: 'application/json' }))
    const urls = [i3dmUrl, tilesetUrl]

    try {
        const tileset = await Cesium.Cesium3DTileset.fromUrl(tilesetUrl, {
            maximumScreenSpaceError: 16,
            cullRequestsWhileMoving: false,
            skipLevelOfDetail: false,
        })
        return { tileset, urls }
    } catch (error) {
        revokeUrls(urls)
        throw error
    }
}

const getSourceGlbBuffer = async () => {
    if (sourceGlbBuffer) return sourceGlbBuffer.slice(0)//slice为从0切到末尾，复制一份
    const response = await fetch(MODEL_URL)
    sourceGlbBuffer = await response.arrayBuffer()//原始二进制读取，类似json()
    return sourceGlbBuffer.slice(0)
}

const createRandomFeatures = (): InstanceFeatureData => {
    const count = modelCount.value
    const positions = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const sideCount = Math.ceil(Math.sqrt(count))//每边数量
    const halfSide = (sideCount - 1) / 2
    const center = Cesium.Cartesian3.fromDegrees(CENTER_LNG, CENTER_LAT, 0)
    const enuMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(center)
    const localPosition = new Cesium.Cartesian3()
    const worldPosition = new Cesium.Cartesian3()
    const relativePosition = new Cesium.Cartesian3()
    let radius = 0

    for (let i = 0; i < count; i++) {
        const row = Math.floor(i / sideCount)
        const column = i % sideCount
        const offsetX = (column - halfSide) * modelSpacing.value
        const offsetY = (row - halfSide) * modelSpacing.value
        const offsetZ = 120 + (i % 8) * 12
        const positionIndex = i * 3

        Cesium.Cartesian3.fromElements(offsetX, offsetY, offsetZ, localPosition)
        Cesium.Matrix4.multiplyByPoint(enuMatrix, localPosition, worldPosition)
        Cesium.Cartesian3.subtract(worldPosition, center, relativePosition)

        positions[positionIndex] = relativePosition.x
        positions[positionIndex + 1] = relativePosition.y
        positions[positionIndex + 2] = relativePosition.z
        scales[i] = modelScale.value
        radius = Math.max(radius, Cesium.Cartesian3.magnitude(localPosition))
    }

    radius += Math.max(300, modelScale.value * 60)

    return {
        positions,
        scales,
        rtcCenter: [center.x, center.y, center.z],
        boundingSphere: [center.x, center.y, center.z, radius],
        range: radius,
    }
}



const createI3dm = (glbBuffer: ArrayBuffer, featureData: InstanceFeatureData) => {
    const positionByteOffset = 0
    const scaleByteOffset = featureData.positions.byteLength
    const featureTableJson = {
        INSTANCES_LENGTH: modelCount.value,
        RTC_CENTER: featureData.rtcCenter,
        EAST_NORTH_UP: true,
        POSITION: { byteOffset: positionByteOffset },
        SCALE: { byteOffset: scaleByteOffset },
    }
    const featureJsonBytes = padJsonBytes(JSON.stringify(featureTableJson), 8)
    const featureBinaryBytes = mergeFeatureBinary(featureData.positions, featureData.scales)
    const glbBytes = new Uint8Array(glbBuffer)
    const byteLength = I3DM_HEADER_BYTES + featureJsonBytes.byteLength + featureBinaryBytes.byteLength + glbBytes.byteLength
    const i3dmBuffer = new ArrayBuffer(byteLength)
    const view = new DataView(i3dmBuffer)
    const output = new Uint8Array(i3dmBuffer)
    let offset = 0

    writeAscii(output, offset, 'i3dm')
    offset += 4
    view.setUint32(offset, I3DM_VERSION, true)
    view.setUint32(offset + 4, byteLength, true)
    view.setUint32(offset + 8, featureJsonBytes.byteLength, true)
    view.setUint32(offset + 12, featureBinaryBytes.byteLength, true)
    view.setUint32(offset + 16, 0, true)
    view.setUint32(offset + 20, 0, true)
    view.setUint32(offset + 24, GLTF_FORMAT_BINARY, true)
    offset += 28

    output.set(featureJsonBytes, offset)
    offset += featureJsonBytes.byteLength
    output.set(featureBinaryBytes, offset)
    offset += featureBinaryBytes.byteLength
    output.set(glbBytes, offset)

    return i3dmBuffer
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
    geometricError: range,
    root: {
        boundingVolume: { sphere },
        geometricError: Math.max(1, range / 10),
        refine: 'ADD',
        content: { uri: i3dmUrl },
    },
})

const padJsonBytes = (json: string, alignment: number) => {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(json)
    const paddedLength = alignTo(bytes.byteLength, alignment)
    const output = new Uint8Array(paddedLength)
    output.set(bytes)
    output.fill(0x20, bytes.byteLength)
    return output
}

const writeAscii = (target: Uint8Array, offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) target[offset + i] = text.charCodeAt(i)
}

const alignTo = (value: number, alignment: number) => Math.ceil(value / alignment) * alignment

const flyToModels = () => {
    if (!viewer) return
    const sideCount = Math.ceil(Math.sqrt(modelCount.value))
    const range = Math.max(2500, sideCount * modelSpacing.value * 2.5)
    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(CENTER_LNG, CENTER_LAT, range),
        orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-55),
            roll: 0,
        },
        duration: 0.8,
    })
}

const createRandomPointsCoordinates = (count: number): PointData[] => {
    const points: PointData[] = []
    for (let i = 0; i < count; i++) {
        points.push({
            longitude: Cesium.Math.randomBetween(70, 135),
            latitude: Cesium.Math.randomBetween(20, 55)
        })
    }
    return points
}

const clearModels = () => {
    if (viewer && tilesetPrimitive) viewer.scene.primitives.remove(tilesetPrimitive)
    revokeUrls(objectUrls)
    tilesetPrimitive = undefined
    objectUrls = []
}

const revokeUrls = (urls: string[]) => {
    urls.forEach((url) => URL.revokeObjectURL(url))
}

const clear = () => {
    clearModels()
}

onBeforeUnmount(() => {
    clear()
})
</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
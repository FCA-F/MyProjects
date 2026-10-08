<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />

        <DraggableModal title="SPH流体参数">
            <div class="row">
                <label class="label">水源半径</label>
                <el-input id="water-source-radius" v-model.number="options.waterSourceRadius" class="input" />
            </div>

            <div class="row">
                <label class="label">出水量</label>
                <el-input id="water-add-rate" v-model.number="options.waterAddRate" class="input" />
            </div>

            <div class="row">
                <label class="label">重力强度</label>
                <el-input id="gravity" v-model.number="options.gravity" class="input" />
            </div>

            <div class="row">
                <label class="label">渲染质量</label>
                <el-input id="render-depth" v-model.number="options.depth" class="input" />
            </div>

            <div class="row">
                <label class="label">水透明度</label>
                <el-input id="water-alpha" v-model.number="options.waterAlpha" class="input" min="0.1" max="1" />
            </div>

            <div class="row">
                <el-button v-if="waterSourceActive" class="button" @click="stopWaterSource" color="blue">
                    停止涌水
                </el-button>
                <el-button class="button" color="red" @click="clearWater">
                    清空水
                </el-button>
            </div>
            <div class="status">
                {{ waterSourceActive ? '水源已设置，正在持续涌水' : '请点击地形设置水源' }}
            </div>
        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import { onBeforeUnmount, reactive, ref } from 'vue'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import { initCesiumBase } from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

const CesiumPrivate = Cesium as any

const TEXTURE_SIZE = 1024
const DATA_CENTER = [-119.5509508318, 37.7379837881] as const
const DATA_SIDE_LENGTH = 20000
const HEIGHT_MAP_URL = '/data/1724136544296.png'
const MIN_ELEVATION = 1153.0408311859962
const MAX_ELEVATION = 3158.762303474051

function createSquareExtent(
    centerLongitude: number,
    centerLatitude: number,
    sideLength: number,
) {
    const earthRadius = 6371000
    const angularDistance = (sideLength / earthRadius) * (180 / Math.PI)
    const longitudeDistance = angularDistance / Math.cos(
        (centerLatitude * Math.PI) / 180,
    )
    return [
        centerLongitude - longitudeDistance / 2,
        centerLatitude - angularDistance / 2,
        centerLongitude + longitudeDistance / 2,
        centerLatitude + angularDistance / 2,
    ] as const
}

const EXTENT = createSquareExtent(
    DATA_CENTER[0],
    DATA_CENTER[1],
    DATA_SIDE_LENGTH,
)

const options = reactive({
    waterAddRate: 0.03,
    waterSourceRadius: 0.05,
    gravity: 4.5,
    initialWaterLevel: 0.0,
    depth: 180,
    shallow: Cesium.Color.fromCssColorString('#48cae4'),
    deep: Cesium.Color.fromCssColorString('#023e8a'),
    waterAlpha: 0.85,
})

const waterSourceActive = ref(false)
const initialPanelLeft = typeof window !== 'undefined' && window.innerWidth > 900
    ? window.innerWidth - 350
    : 45

const volumeRenderState = {
    cull: {
        enabled: true,
        face: Cesium.CullFace.BACK,
    },
    blending: {
        enabled: true,
        equationRgb: Cesium.BlendEquation.ADD,
        equationAlpha: Cesium.BlendEquation.ADD,
        functionSourceRgb: Cesium.BlendFunction.SOURCE_ALPHA,
        functionSourceAlpha: Cesium.BlendFunction.ONE,
        functionDestinationRgb: Cesium.BlendFunction.ONE_MINUS_SOURCE_ALPHA,
        functionDestinationAlpha: Cesium.BlendFunction.ONE_MINUS_SOURCE_ALPHA,
    },
    depthTest: {
        enabled: true,
    },
}

function createSimulationTexture(context: any) {
    return new CesiumPrivate.Texture({
        context,
        width: TEXTURE_SIZE,
        height: TEXTURE_SIZE,
        pixelFormat: Cesium.PixelFormat.RGBA,
        pixelDatatype: Cesium.PixelDatatype.FLOAT,
        source: {
            arrayBufferView: new Float32Array(TEXTURE_SIZE * TEXTURE_SIZE * 4),
        },
    })
}

class FluidComputeStage {
    show = true
    private command?: any

    constructor(
        private readonly fragmentShaderSource: any,
        private readonly uniformMap: Record<string, () => unknown>,
        private readonly outputTexture: any,
    ) { }

    update(frameState: any) {
        if (!this.show) return
        if (!this.command) {
            this.command = new CesiumPrivate.ComputeCommand({
                owner: this,
                fragmentShaderSource: this.fragmentShaderSource,
                uniformMap: this.uniformMap,
                outputTexture: this.outputTexture,
                persists: true,
            })
        }
        frameState.commandList.push(this.command)
    }

    isDestroyed() {
        return false
    }

    destroy() {
        this.command = undefined
        return Cesium.destroyObject(this)
    }
}

class FluidVolumeStage {
    show = true
    private command?: any

    constructor(
        private readonly geometry: any,
        private readonly modelMatrix: Cesium.Matrix4,
        private readonly uniformMap: Record<string, () => unknown>,
        private readonly vertexShaderSource: any,
        private readonly fragmentShaderSource: any,
    ) { }

    private createCommand(context: any) {
        const attributeLocations = CesiumPrivate.GeometryPipeline.createAttributeLocations(this.geometry)
        const vertexArray = CesiumPrivate.VertexArray.fromGeometry({
            context,
            geometry: this.geometry,
            attributeLocations,
            bufferUsage: CesiumPrivate.BufferUsage.STATIC_DRAW,
        })
        const shaderProgram = CesiumPrivate.ShaderProgram.fromCache({
            context,
            attributeLocations,
            vertexShaderSource: this.vertexShaderSource,
            fragmentShaderSource: this.fragmentShaderSource,
        })

        return new CesiumPrivate.DrawCommand({
            owner: this,
            vertexArray,
            primitiveType: Cesium.PrimitiveType.TRIANGLES,
            uniformMap: this.uniformMap,
            modelMatrix: this.modelMatrix,
            shaderProgram,
            renderState: CesiumPrivate.RenderState.fromCache(volumeRenderState),
            pass: CesiumPrivate.Pass.OPAQUE,
        })
    }

    update(frameState: any) {
        if (!this.show) return
        if (!this.command) {
            this.command = this.createCommand(frameState.context)
        }
        frameState.commandList.push(this.command)
    }

    isDestroyed() {
        return false
    }

    destroy() {
        if (this.command) {
            this.command.vertexArray = this.command.vertexArray?.destroy()
            this.command.shaderProgram = this.command.shaderProgram?.destroy()
            this.command = undefined
        }
        return Cesium.destroyObject(this)
    }
}

const sphKernelSource = `
#define range(i,a,b) for(int i = a; i <= b; i++)

const int textureSize = 1024;
#define dt 1.0
uniform float gravity;
#define dist 1.00
#define dif 0.3
#define difd 0.0
uniform float initialMass;
uniform vec2 waterSource;
uniform float waterSourceRadius;
uniform float waterAddRate;
uniform float waterSourceHeight;
uniform bool hasWaterSource;
#define border_h 5.
uniform sampler2D heightMap;

// 越过模拟区域的邻居视为空粒子，避免纹理 mod 造成左右边界相连。
vec4 texelSafe(sampler2D source, vec2 position) {
    if (
        position.x < 0.0 ||
        position.y < 0.0 ||
        position.x >= float(textureSize) ||
        position.y >= float(textureSize)
    ) {
        return vec4(0.0);
    }
    return texelFetch(source, ivec2(position), 0);
}

#define texel(a, p) texelSafe(a, p)

float terrainHeight(vec2 pos) {
    vec2 uv = clamp(pos / float(textureSize), 0.0, 1.0);
    return texture(heightMap, uv).r * 4.0;
}

vec2 terrainGrad(vec2 pos) {
    const float eps = 1.0;
    return vec2(
        terrainHeight(pos + vec2(eps, 0.0)) - terrainHeight(pos - vec2(eps, 0.0)),
        terrainHeight(pos + vec2(0.0, eps)) - terrainHeight(pos - vec2(0.0, eps))
    ) / (2.0 * eps);
}

vec2 destimator(vec2 dx, float M) {
    return dist * clamp(1.0 - difd * abs(dx), 0.002, 1.0) + dif * dt;
}

float sdBox(in vec2 p, in vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float border(vec2 p) {
    vec2 R = vec2(float(textureSize));
    return -sdBox(p - R * 0.5, R * vec2(0.5));
}

const float BORDER_STEP = 1.0;
vec3 bN(vec2 p) {
    vec3 dx = vec3(-BORDER_STEP, 0.0, BORDER_STEP);
    vec4 idx = vec4(-1.0 / BORDER_STEP, 0.0, 1.0 / BORDER_STEP, 0.25);
    vec3 r = idx.zyw * border(p + dx.zy)
        + idx.xyw * border(p + dx.xy)
        + idx.yzw * border(p + dx.yz)
        + idx.yxw * border(p + dx.yx);
    return vec3(normalize(r.xy), r.z + 1e-4);
}

vec2 decode(float x) {
    return unpackSnorm2x16(floatBitsToUint(x));
}

float encode(vec2 x) {
    return uintBitsToFloat(packSnorm2x16(clamp(x, vec2(-1.0), vec2(1.0))));
}

vec3 hash32(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yxz + 33.33);
    return fract((p3.xxy + p3.yzz) * p3.zyx);
}

float G(vec2 x) {
    return exp(-dot(x, x));
}

struct particle {
    vec2 X;
    vec2 V;
    vec2 M;
};

particle getParticle(vec4 data, vec2 pos) {
    particle P;
    P.X = decode(data.x) + pos;
    P.V = decode(data.y);
    P.M = data.zw;
    return P;
}

vec4 saveParticle(particle P, vec2 pos) {
    P.X = clamp(P.X - pos, vec2(-0.5), vec2(0.5));
    return vec4(encode(P.X), encode(P.V), P.M);
}

vec3 distribution(vec2 x, vec2 p, vec2 K) {
    vec4 aabb0 = vec4(p - 0.5, p + 0.5);
    vec4 aabb1 = vec4(x - K * 0.5, x + K * 0.5);
    vec4 aabbX = vec4(max(aabb0.xy, aabb1.xy), min(aabb0.zw, aabb1.zw));
    vec2 center = 0.5 * (aabbX.xy + aabbX.zw);
    vec2 size = max(aabbX.zw - aabbX.xy, 0.0);
    return vec3(center, size.x * size.y / (K.x * K.y));
}

void Reintegration(sampler2D ch, inout particle P, vec2 pos) {
    range(i, -2, 2) range(j, -2, 2) {
        vec2 tpos = pos + vec2(i, j);
        particle P0 = getParticle(texel(ch, tpos), tpos);
        vec2 difR = destimator(P0.X - tpos, P0.M.x);
        P0.X += P0.V * dt;
        vec3 D = distribution(P0.X, pos, difR);
        float m = P0.M.x * D.z;
        P.X += D.xy * m;
        P.V += P0.V * m;
        P.M.y += P0.M.y * m;
        P.M.x += m;
    }

    if (P.M.x != 0.0) {
        P.X /= P.M.x;
        P.V /= P.M.x;
        P.M.y /= P.M.x;
    }
}

void Simulation(sampler2D ch, inout particle P, vec2 pos) {
    vec2 F = vec2(0.0);
    vec3 avgV = vec3(0.0);

    range(i, -2, 2) range(j, -2, 2) {
        vec2 tpos = pos + vec2(i, j);
        particle P0 = getParticle(texel(ch, tpos), tpos);
        vec2 dx = P0.X - P.X;
        float avgP = gravity * 0.1 * P0.M.x * (P.M.x + P0.M.x);
        F -= 0.5 * G(dx) * avgP * dx;
        avgV += P0.M.x * G(dx) * vec3(P0.V, 1.0);
    }

    F -= gravity * 0.232 * P.M.x * terrainGrad(pos);
    avgV.xy /= max(avgV.z, 0.000001);

    float sourceDist = distance(pos / float(textureSize), waterSource);
    if (hasWaterSource && sourceDist < waterSourceRadius) {
        float sourceMask = 1.0 - smoothstep(waterSourceRadius * 0.55, waterSourceRadius, sourceDist);
        float terrainOverSource = max(terrainHeight(pos) - waterSourceHeight, 0.0);
        float heightMask = 1.0 - smoothstep(0.02, 0.16, terrainOverSource);
        P.M.x += waterAddRate * dt * sourceMask * heightMask;
    }

    F -= P.V * 0.0005;
    P.V += F * dt / max(P.M.x, 0.000001);

    vec3 N = bN(P.X);
    float vdotN = step(N.z, border_h) * dot(-N.xy, P.V);
    P.V += 0.5 * (N.xy * vdotN + N.xy * abs(vdotN));
    if (N.z < 0.0) P.V = vec2(0.0);

    float v = length(P.V);
    P.V /= max(v, 1.0);
}

vec2 hitBox(vec3 orig, vec3 dir) {
    const vec3 box_min = vec3(-0.5);
    const vec3 box_max = vec3(0.5);
    vec3 inv_dir = 1.0 / dir;
    vec3 tmin_tmp = (box_min - orig) * inv_dir;
    vec3 tmax_tmp = (box_max - orig) * inv_dir;
    vec3 tmin = min(tmin_tmp, tmax_tmp);
    vec3 tmax = max(tmin_tmp, tmax_tmp);
    return vec2(max(tmin.x, max(tmin.y, tmin.z)), min(tmax.x, min(tmax.y, tmax.z)));
}
`

const particleIntegrationSource = `
uniform sampler2D iChannel0;
uniform int iFrame;
uniform bool resetSimulation;

void main() {
    vec2 pos = gl_FragCoord.xy;
    if (max(pos.x, pos.y) > float(textureSize)) discard;

    particle P;
    P.X = vec2(0.0);
    P.V = vec2(0.0);
    P.M = vec2(0.0);
    Reintegration(iChannel0, P, pos);

    if (resetSimulation) {
        P.X = pos;
        P.V = vec2(0.0);
        P.M = vec2(1e-6);
    } else if (iFrame < 1) {
        vec3 rand = hash32(pos + vec2(0.0, 1.0) + 0.28);
        if (rand.z < 0.6 && initialMass > 0.0) {
            P.X = pos + 0.3 * (rand.yz - 0.5);
            P.V = 0.65 * (rand.xy - 0.5);
            P.M = vec2(initialMass, 0.0);
        } else {
            P.X = pos;
            P.V = vec2(0.0);
            P.M = vec2(1e-6);
        }
    }
    out_FragColor = saveParticle(P, pos);
}
`

const particleSimulationSource = `
uniform sampler2D iChannel0;

void main() {
    vec2 pos = gl_FragCoord.xy;
    if (max(pos.x, pos.y) > float(textureSize)) discard;
    particle P = getParticle(texel(iChannel0, pos), pos);
    if (P.M.x != 0.0) Simulation(iChannel0, P, pos);
    out_FragColor = saveParticle(P, pos);
}
`

const surfaceSmoothingSource = `
uniform sampler2D iChannel0;

void main() {
    vec2 pos = gl_FragCoord.xy;
    if (max(pos.x, pos.y) > float(textureSize)) discard;

    float rho = 0.0;
    float hei = 0.0;
    float weight = 0.0;
    range(i, -2, 2) range(j, -2, 2) {
        vec2 pos0 = pos + vec2(float(i), float(j));
        float w = G(0.75 * (pos - pos0));
        weight += w;
        rho += getParticle(texel(iChannel0, pos0), pos0).M.x * w;
        hei += terrainHeight(pos0) * w;
    }
    out_FragColor = vec4(rho / weight, hei / weight, 0.0, (rho + hei) / weight);
}
`

const fluidVolumeFragmentSource = `
uniform sampler2D iChannel0;
uniform int depth;
uniform vec3 shallow;
uniform vec3 deep;
uniform float waterAlpha;
in vec3 vo;
in vec3 vd;

const vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
const float heightScale = 0.15;

vec2 getHeight(in vec3 p) {
    vec4 data = texture(iChannel0, clamp(p.xz + 0.5, 0.0, 1.0));
    return vec2(data.y * heightScale - 0.5, (data.y + data.x) * heightScale - 0.5);
}

float getWaterDepth(in vec3 p) {
    return texture(iChannel0, clamp(p.xz + 0.5, 0.0, 1.0)).x * heightScale;
}

vec3 getNormal(in vec3 p, int comp) {
    float d = 2.0 / float(textureSize);
    float hMid = comp == 0 ? getHeight(p).x : getHeight(p).y;
    float hRight = comp == 0 ? getHeight(p + vec3(d, 0.0, 0.0)).x : getHeight(p + vec3(d, 0.0, 0.0)).y;
    float hTop = comp == 0 ? getHeight(p + vec3(0.0, 0.0, d)).x : getHeight(p + vec3(0.0, 0.0, d)).y;
    return normalize(cross(vec3(0.0, hTop - hMid, d), vec3(d, hRight - hMid, 0.0)));
}

float fresnel(vec3 viewDir, vec3 normal) {
    float cosTheta = max(dot(-viewDir, normal), 0.0);
    return 0.02 + 0.98 * pow(1.0 - cosTheta, 5.0);
}

vec4 renderVolume(in vec3 ro, in vec3 rd) {
    vec3 rayDir = normalize(rd);
    vec2 ret = hitBox(ro, rayDir);
    if (ret.x > ret.y) discard;
    ret.x = max(ret.x, 0.0);

    float tt = ret.x;
    for (int i = 0; i < depth; i++) {
        vec3 p = ro + rd * tt;
        float h = p.y - getHeight(p).x;
        if (h < 0.0002 || tt > ret.y) break;
        tt += h * 0.4;
    }

    float wt = ret.x;
    for (int i = 0; i < depth; i++) {
        vec3 p = ro + rd * wt;
        float h = p.y - getHeight(p).y;
        if (h < 0.0002 || wt > min(tt, ret.y)) break;
        wt += h * 0.4;
    }

    vec3 color = vec3(0.0);
    float alpha = 0.0;
    if (wt < ret.y) {
        vec3 waterPos = ro + rd * wt;
        float waterDepth = getWaterDepth(waterPos);
        if (waterDepth > 0.001) {
            vec3 waterNormal = getNormal(waterPos, 1);
            float F = fresnel(rayDir, waterNormal);
            vec3 reflectDir = reflect(rayDir, waterNormal);
            vec3 skyColor = mix(
                czm_gammaCorrect(vec3(0.5, 0.7, 1.0)),
                czm_gammaCorrect(vec3(0.2, 0.4, 0.8)),
                reflectDir.y * 0.5 + 0.5
            );
            float underwaterDist = min(tt - wt, 0.3);
            vec3 underwaterColor = exp(-0.18 * vec3(1.0, 0.467, 0.180) * max(underwaterDist * 100.0, 0.0));
            vec3 waterColor = mix(
                czm_gammaCorrect(shallow),
                czm_gammaCorrect(deep),
                smoothstep(0.0, 0.1, waterDepth)
            );
            float spec = pow(max(dot(lightDir, reflectDir), 0.0), 64.0);
            color = mix(waterColor * underwaterColor, skyColor, F * 0.5);
            color += spec * vec3(1.0) * 0.8;
            alpha = mix(0.3, waterAlpha, smoothstep(0.0, 0.05, waterDepth));
            alpha = mix(alpha, 1.0, F * 0.3 + spec * 0.5);
        }
    }

    if (alpha < 0.01 && tt < ret.y) discard;
    return vec4(color, alpha);
}

void main() {
    vec4 color = renderVolume(vo, normalize(vd));
    if (color.a < 0.01) discard;
    out_FragColor = color;
}
`

function generateModelMatrix(
    position: [number, number, number],
    rotation: [number, number, number],
    scale: [number, number, number],
) {
    const rotationX = Cesium.Matrix4.fromRotationTranslation(
        Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(rotation[0])),
    )
    const rotationY = Cesium.Matrix4.fromRotationTranslation(
        Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(rotation[1])),
    )
    const rotationZ = Cesium.Matrix4.fromRotationTranslation(
        Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(rotation[2])),
    )
    const positionCartesian = Cesium.Cartesian3.fromDegrees(...position)
    const enuMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(positionCartesian)
    Cesium.Matrix4.multiply(enuMatrix, rotationX, enuMatrix)
    Cesium.Matrix4.multiply(enuMatrix, rotationY, enuMatrix)
    Cesium.Matrix4.multiply(enuMatrix, rotationZ, enuMatrix)
    return Cesium.Matrix4.multiply(
        enuMatrix,
        Cesium.Matrix4.fromScale(new Cesium.Cartesian3(...scale)),
        new Cesium.Matrix4(),
    )
}

function getRectangleMetrics(rectangle: Cesium.Rectangle) {
    const center = Cesium.Rectangle.center(rectangle)
    const verticalGeodesic = new Cesium.EllipsoidGeodesic(
        new Cesium.Cartographic(center.longitude, rectangle.south),
        new Cesium.Cartographic(center.longitude, rectangle.north),
    )
    const horizontalGeodesic = new Cesium.EllipsoidGeodesic(
        new Cesium.Cartographic(rectangle.west, center.latitude),
        new Cesium.Cartographic(rectangle.east, center.latitude),
    )
    return {
        center,
        width: horizontalGeodesic.surfaceDistance,
        height: verticalGeodesic.surfaceDistance,
    }
}

class TerrainFluidSimulation {
    private readonly volumeCenterElevation = (MIN_ELEVATION + MAX_ELEVATION) / 2
    private readonly volumeThickness = MAX_ELEVATION - MIN_ELEVATION
    private readonly waterSourcePosition = new Cesium.Cartesian2(1.0, 0.0)
    private waterSourceHeight = 0.0
    private readonly textures: any[] = []
    private readonly stages: Array<FluidComputeStage | FluidVolumeStage> = []
    private readonly waterEntity: Cesium.Entity
    private readonly postRenderListener: () => void
    private frame = 0
    private hasWaterSource = false
    private resetRequested = false

    constructor(
        private readonly viewer: Cesium.Viewer,
        private readonly heightMapImage: any,
    ) {
        const metrics = getRectangleMetrics(Cesium.Rectangle.fromDegrees(...EXTENT))
        this.waterEntity = viewer.entities.add({
            name: 'SPH volume',
            position: Cesium.Cartesian3.fromDegrees(
                (EXTENT[0] + EXTENT[2]) / 2,
                (EXTENT[1] + EXTENT[3]) / 2,
                this.volumeCenterElevation,
            ),
            box: {
                dimensions: new Cesium.Cartesian3(
                    metrics.width,
                    metrics.height,
                    this.volumeThickness,
                ),
                fill: false,
                outline: true,
                outlineColor: Cesium.Color.YELLOW.withAlpha(0.75),
            },
        })
        this.postRenderListener = () => {
            this.frame += 1
            this.resetRequested = false
        }
        this.buildPipeline()
        viewer.scene.postRender.addEventListener(this.postRenderListener)
    }

    setWaterSource(position: Cesium.Cartesian2, normalizedHeight: number) {
        this.waterSourcePosition.x = position.x
        this.waterSourcePosition.y = position.y
        this.waterSourceHeight = normalizedHeight
        this.hasWaterSource = true
    }

    stopWaterSource() {
        this.hasWaterSource = false
    }

    clearWater() {
        this.hasWaterSource = false
        this.resetRequested = true
    }

    destroy() {
        this.viewer.scene.postRender.removeEventListener(this.postRenderListener)
        for (const stage of this.stages) {
            this.viewer.scene.primitives.remove(stage as unknown as Cesium.Primitive)
        }
        this.viewer.entities.remove(this.waterEntity)
        for (const texture of this.textures) {
            if (!texture.isDestroyed()) texture.destroy()
        }
        this.stages.length = 0
        this.textures.length = 0
    }

    private buildPipeline() {
        const context = (this.viewer.scene as any).context
        const particleTexture = this.addTexture(createSimulationTexture(context))
        const simulationTexture = this.addTexture(createSimulationTexture(context))
        const surfaceTexture = this.addTexture(createSimulationTexture(context))
        const historyTexture = this.addTexture(createSimulationTexture(context))
        const heightMapTexture = this.addTexture(new CesiumPrivate.Texture({
            context,
            width: TEXTURE_SIZE,
            height: TEXTURE_SIZE,
            pixelFormat: Cesium.PixelFormat.RGBA,
            pixelDatatype: Cesium.PixelDatatype.UNSIGNED_BYTE,
            flipY: false,
            sampler: new CesiumPrivate.Sampler({
                minificationFilter: Cesium.TextureMinificationFilter.LINEAR,
                magnificationFilter: Cesium.TextureMagnificationFilter.LINEAR,
                wrapS: CesiumPrivate.TextureWrap.CLAMP_TO_EDGE,
                wrapT: CesiumPrivate.TextureWrap.CLAMP_TO_EDGE,
            }),
            source: this.heightMapImage,
        }))

        const makeShader = (source: string) =>
            new CesiumPrivate.ShaderSource({ sources: [sphKernelSource, source] })

        const integrationStage = new FluidComputeStage(
            makeShader(particleIntegrationSource),
            {
                iFrame: () => this.frame,
                iChannel0: () => historyTexture,
                initialMass: () => options.initialWaterLevel,
                resetSimulation: () => this.resetRequested,
            },
            particleTexture,
        )
        const simulationStage = new FluidComputeStage(
            makeShader(particleSimulationSource),
            {
                iChannel0: () => particleTexture,
                heightMap: () => heightMapTexture,
                waterSource: () => this.waterSourcePosition,
                waterSourceRadius: () => options.waterSourceRadius,
                waterAddRate: () => options.waterAddRate,
                waterSourceHeight: () => this.waterSourceHeight,
                gravity: () => options.gravity,
                hasWaterSource: () => this.hasWaterSource,
            },
            simulationTexture,
        )
        const surfaceStage = new FluidComputeStage(
            makeShader(surfaceSmoothingSource),
            {
                iChannel0: () => simulationTexture,
                heightMap: () => heightMapTexture,
            },
            surfaceTexture,
        )
        const historyStage = new FluidComputeStage(
            makeShader(particleSimulationSource),
            {
                iChannel0: () => simulationTexture,
                heightMap: () => heightMapTexture,
                waterSource: () => this.waterSourcePosition,
                waterSourceRadius: () => options.waterSourceRadius,
                waterAddRate: () => options.waterAddRate,
                waterSourceHeight: () => this.waterSourceHeight,
                gravity: () => options.gravity,
                hasWaterSource: () => this.hasWaterSource,
            },
            historyTexture,
        )

        const rectangle = Cesium.Rectangle.fromDegrees(...EXTENT)
        const metrics = getRectangleMetrics(rectangle)
        const modelMatrix = generateModelMatrix(
            [
                Cesium.Math.toDegrees(metrics.center.longitude),
                Cesium.Math.toDegrees(metrics.center.latitude),
                this.volumeCenterElevation,
            ],
            [90, 0, 0],
            [metrics.width, this.volumeThickness, metrics.height],
        )
        const boxGeometry = Cesium.BoxGeometry.fromDimensions({
            vertexFormat: Cesium.VertexFormat.POSITION_ONLY,
            dimensions: new Cesium.Cartesian3(1, 1, 1),
        })
        const geometry = Cesium.BoxGeometry.createGeometry(boxGeometry)
        if (!geometry) throw new Error('Unable to create SPH volume geometry')

        const volumeStage = new FluidVolumeStage(
            geometry,
            modelMatrix,
            {
                iChannel0: () => surfaceTexture,
                depth: () => options.depth,
                shallow: () => options.shallow,
                deep: () => options.deep,
                waterAlpha: () => options.waterAlpha,
            },
            new CesiumPrivate.ShaderSource({
                sources: [`
                    in vec3 position;
                    out vec3 vo;
                    out vec3 vd;
                    void main() {
                        vo = czm_encodedCameraPositionMCHigh + czm_encodedCameraPositionMCLow;
                        vd = position - vo;
                        gl_Position = czm_modelViewProjection * vec4(position, 1.0);
                    }
                `],
            }),
            new CesiumPrivate.ShaderSource({ sources: [sphKernelSource, fluidVolumeFragmentSource] }),
        )

        this.stages.push(integrationStage, simulationStage, surfaceStage, historyStage, volumeStage)
        for (const stage of this.stages) {
            this.viewer.scene.primitives.add(stage as unknown as Cesium.Primitive)
        }
    }

    private addTexture(texture: any) {
        this.textures.push(texture)
        return texture
    }
}

let viewer: Cesium.Viewer | undefined
let simulation: TerrainFluidSimulation | undefined
let clickHandler: Cesium.ScreenSpaceEventHandler | undefined
let initializing = false

function calculateNormalizedPosition(position: Cesium.Cartesian3) {
    const cartographic = Cesium.Cartographic.fromCartesian(position)
    const longitude = Cesium.Math.toDegrees(cartographic.longitude)
    const latitude = Cesium.Math.toDegrees(cartographic.latitude)
    const normalizedElevation = Cesium.Math.clamp(
        (cartographic.height - MIN_ELEVATION) / (MAX_ELEVATION - MIN_ELEVATION),
        0,
        1,
    )
    return {
        x: (longitude - EXTENT[0]) / (EXTENT[2] - EXTENT[0]),
        y: 1 - (latitude - EXTENT[1]) / (EXTENT[3] - EXTENT[1]),
        height: normalizedElevation * 4.0,
    }
}

function pickTerrainPosition(
    cesiumViewer: Cesium.Viewer,
    screenPosition: Cesium.Cartesian2,
) {
    const ray = cesiumViewer.camera.getPickRay(screenPosition)
    const globePosition = ray
        ? cesiumViewer.scene.globe.pick(ray, cesiumViewer.scene)
        : undefined
    if (Cesium.defined(globePosition)) return globePosition

    return cesiumViewer.camera.pickEllipsoid(
        screenPosition,
        cesiumViewer.scene.globe.ellipsoid,
    )
}

async function onMapReady(cesiumViewer: Cesium.Viewer) {
    if (initializing) return
    initializing = true
    viewer = cesiumViewer

    try {
        await initCesiumBase(viewer, {
            terrain: true,
            requestVertexNormals: true,
            osm: true,
            depthTestAgainstTerrain: true,
            shouldAnimate: true,
        })
        viewer.scene.msaaSamples = 4
        viewer.scene.highDynamicRange = true
        viewer.postProcessStages.fxaa.enabled = true

        await viewer.camera.flyTo({
            destination: Cesium.Rectangle.fromDegrees(...EXTENT),
            duration: 1.0,
        })

        const heightMapImage = await Cesium.Resource.fetchImage({ url: HEIGHT_MAP_URL })
        simulation = new TerrainFluidSimulation(viewer, heightMapImage)

        clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
        clickHandler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
            if (!simulation || !viewer) return

            const pickedPosition = pickTerrainPosition(viewer, movement.position)
            if (!Cesium.defined(pickedPosition)) return

            const normalized = calculateNormalizedPosition(pickedPosition)
            if (normalized.x < 0 || normalized.x > 1 || normalized.y < 0 || normalized.y > 1) return
            simulation.setWaterSource(
                new Cesium.Cartesian2(normalized.x, normalized.y),
                normalized.height,
            )
            waterSourceActive.value = true
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    } catch (error) {
        console.error('[SPH] 初始化失败', error)
    } finally {
        initializing = false
    }
}

onBeforeUnmount(() => {
    clickHandler?.destroy()
    clickHandler = undefined
    simulation?.destroy()
    simulation = undefined
    viewer = undefined
})

function stopWaterSource() {
    simulation?.stopWaterSource()
    waterSourceActive.value = false
}

function clearWater() {
    simulation?.clearWater()
    waterSourceActive.value = false
}
</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
}
</style>

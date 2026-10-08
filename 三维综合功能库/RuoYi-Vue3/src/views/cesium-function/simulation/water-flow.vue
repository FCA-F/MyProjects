<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import { onBeforeUnmount } from 'vue'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import { initCesiumBase } from '@/utils/cesium'

const CesiumPrivate = Cesium as any

const TEXTURE_SIZE = 1024
const DATA_CENTER = [-119.5509508318, 37.7379837881] as const
const DATA_SIDE_LENGTH = 20000
const HEIGHT_MAP_URL = '/data/1724136544296.png'
const MIN_ELEVATION = 1153.0408311859962
const MAX_ELEVATION = 3158.762303474051

//中心点+边长求正方形范围
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

const options = {
    waterAddRate: 0.03,
    waterSourceRadius: 0.05,
    gravity: 4.5,
    initialWaterLevel: 0.0,
    depth: 180,
    shallow: Cesium.Color.fromCssColorString('#48cae4'),
    deep: Cesium.Color.fromCssColorString('#023e8a'),
    waterAlpha: 0.85,
}

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
    //GPU 计算阶段封装器——把"跑一段片元着色器、读输入纹理、写输出纹理"这件事包装成一个 Cesium 能每帧调度的对象
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
//SPH函数库
const sphKernelSource = `
// ============================================================
// sphKernelSource — 流体模拟公共函数库
// 包含：宏定义、uniform 声明、工具函数、SPH 核函数、
//       粒子编解码、地形采样、边界碰撞、再整合、物理模拟
// 这个文件没有 main()，由各个计算阶段通过 makeShader() 拼到前面
// ============================================================


// ==================== 基础宏 ====================

// 把坐标 p 包裹到 [0, textureSize-1] 范围内（防止纹理采样越界）
#define Bi(p) ivec2(mod(p, vec2(float(textureSize))))

// 从纹理 a 的 p 位置安全采样（自动处理越界）
#define texel(a, p) texelFetch(a, Bi(p), 0)

// 简化 for 循环写法，展开为 for(int i = a; i <= b; i++)
#define range(i,a,b) for(int i = a; i <= b; i++)


// ==================== 常量 ====================

const int textureSize = 1024;   // 粒子网格分辨率 1024×1024 = 约100万个粒子
#define dt 1.0                 // 时间步长（每帧推进的时间单位）
uniform float gravity;          // 重力加速度（外部传入，控制水流速度）
#define dist 1.00              // 粒子影响半径基准值（1个网格单元）
#define dif 0.3                // 扩散系数（影响半径随时间的扩散量）
#define difd 0.0               // 距离衰减系数（当前关闭，靠高斯核做衰减）
uniform float initialMass;     // 初始水量（第一帧每个粒子的质量）
uniform vec2 waterSource;      // 水源位置（归一化 0~1，点击时更新）
uniform float waterSourceRadius; // 水源半径（归一化）
uniform float waterAddRate;    // 加水速率（每帧每网格加多少质量）
uniform bool hasWaterSource;   // 当前帧是否有水源（点击那帧为 true）
#define border_h 5.            // 边界反弹阈值（距离边界 5 像素内开始反弹）
uniform sampler2D heightMap;   // 高程贴图（地形高度，R 通道 0~1）


// ==================== 地形相关 ====================

// 从高程贴图采样地形高度
// pos: 网格坐标 (0~1023)
// 返回: 地形高度（缩放后）
float terrainHeight(vec2 pos) {
    // 网格坐标转 UV 归一化坐标 (0~1)，clamp 防止越界
    vec2 uv = clamp(pos / float(textureSize), 0.0, 1.0);
    // 采样高程贴图 R 通道（高度值 0~1），乘以 4.0 映射到实际高程范围
    return texture(heightMap, uv).r * 4.0;
}

// 计算地形坡度（梯度），用中心差分法
// pos: 网格坐标
// 返回: vec2(∂h/∂x, ∂h/∂y)，指向最陡上升方向
vec2 terrainGrad(vec2 pos) {
    const float eps = 1.0;  // 差分步长 = 1 个网格
    return vec2(
        terrainHeight(pos + vec2(eps, 0.0)) - terrainHeight(pos - vec2(eps, 0.0)), // x 方向偏导
        terrainHeight(pos + vec2(0.0, eps)) - terrainHeight(pos - vec2(0.0, eps))  // y 方向偏导
    ) / (2.0 * eps);  // 除以 2*eps 得到中心差分
}


// ==================== 粒子影响半径 ====================

// 计算粒子的影响半径（决定粒子能波及多远范围内的邻居）
// dx: 粒子间距离向量
// M: 粒子质量
// 返回: vec2 影响半径（x 和 y 方向）
vec2 destimator(vec2 dx, float M) {
    // dist * clamp(1.0 - difd * abs(dx), 0.002, 1.0) + dif * dt
    // 当前 difd=0 所以 clamp 恒等于 1.0，返回值恒为 dist + dif * dt = 1.0 + 0.3 = 1.3
    // 即每个粒子影响半径恒为 1.3 个网格单元
    return dist * clamp(1.0 - difd * abs(dx), 0.002, 1.0) + dif * dt;
}


// ==================== 边界 SDF（有向距离场） ====================

// 2D 盒子 SDF（有向距离场）
// p: 当前点坐标
// b: 盒子半尺寸
// 返回: 正数=点在盒子外（到最近边的距离），负数=点在盒子内（到最近边的负距离）
float sdBox(in vec2 p, in vec2 b) {
    vec2 d = abs(p) - b;  // 到盒子各边的有符号距离
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

// 包围盒边界距离函数
// p: 网格坐标
// 返回: 正值=点在模拟区域内，负值=点在区域外
float border(vec2 p) {
    vec2 R = vec2(float(textureSize));  // 1024
    // 平移到盒子中心，计算 SDF，取负号让内部为正
    return -sdBox(p - R * 0.5, R * vec2(0.5));
}

// 边界法线计算（用中心差分对 border 函数求梯度）
// p: 粒子位置
// 返回: vec3(法线.xy, border值+小偏移)
const float BORDER_STEP = 1.0;
vec3 bN(vec2 p) {
    vec3 dx = vec3(-BORDER_STEP, 0.0, BORDER_STEP); // -1, 0, +1
    vec4 idx = vec4(-1.0 / BORDER_STEP, 0.0, 1.0 / BORDER_STEP, 0.25); // 差分权重
    // 在 4 个方向偏移采样 border 值，组合出梯度（法线方向）
    vec3 r = idx.zyw * border(p + dx.zy)   // 右
        + idx.xyw * border(p + dx.xy)       // 左
        + idx.yzw * border(p + dx.yz)       // 上
        + idx.yxw * border(p + dx.yx);      // 下
    // 返回归一化的法线 xy + z 分量（border 值 + 1e-4 防除零）
    return vec3(normalize(r.xy), r.z + 1e-4);
}


// ==================== 粒子数据编解码 ====================

// 从 float 解码出 vec2
// 纹理每个通道只有 1 个 float，需要把 2 个 float 打包存进去
// 方法：2个 float → pack 成 2个 int16 → 合并成 1个 uint32 → reinterpret 为 float
// 读取时反向操作
vec2 decode(float x) {
    return unpackSnorm2x16(floatBitsToUint(x));
}

// 把 vec2 编码成 float（存入纹理）
// clamp 到 [-1,1] 确保 packSnorm2x16 不出错
float encode(vec2 x) {
    return uintBitsToFloat(packSnorm2x16(clamp(x, vec2(-1.0), vec2(1.0))));
}


// ==================== 伪随机函数 ====================

// 确定性伪随机哈希（Dave Hoskins 实现）
// 同一个输入 p 永远返回同一个随机值
// 用于第一帧撒粒子时给每个网格不同的随机偏移
vec3 hash32(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); // 乘质数散列
    p3 += dot(p3, p3.yxz + 33.33);  // 非线性混合
    return fract((p3.xxy + p3.yzz) * p3.zyx); // 再次混合输出 3 个随机分量
}


// ==================== SPH 高斯核 ====================

// 高斯核函数：e^(-|x|²)
// x: 粒子间距离向量
// 距离越近 → 值越大（最大 1.0）→ 影响越大
// 距离越远 → 值迅速衰减到 0
// 这是 SPH 流体模拟中计算粒子间相互影响权重的核心函数
float G(vec2 x) {
    return exp(-dot(x, x));
}


// ==================== 粒子结构体 ====================

// 粒子数据结构，每个网格存一个粒子
struct particle {
    vec2 X;   // 位置偏移（相对于所在网格中心），解码后 + 网格坐标 = 世界坐标
    vec2 V;   // 速度（x/y 方向，单位：网格/帧）
    vec2 M;   // M.x = 粒子质量（水量），M.y = 辅助量（密度累积等）
};


// ==================== 粒子读写 ====================

// 从纹理数据解码出粒子结构体
// data: 纹理像素 RGBA
// pos: 当前网格坐标
particle getParticle(vec4 data, vec2 pos) {
    particle P;
    P.X = decode(data.x) + pos;  // 解码位置偏移 + 网格坐标 = 世界坐标
    P.V = decode(data.y);         // 解码速度
    P.M = data.zw;                // 直接读质量（M.x=质量, M.y=辅助量）
    return P;
}

// 把粒子结构体编码回纹理数据
// P: 粒子
// pos: 当前网格坐标
// 返回: vec4 可写入纹理
vec4 saveParticle(particle P, vec2 pos) {
    P.X = clamp(P.X - pos, vec2(-0.5), vec2(0.5)); // 转回相对偏移（限制在网格内）
    return vec4(encode(P.X), encode(P.V), P.M);     // 编码位置/速度，直接存质量
}


// ==================== 分布计算 ====================

// 计算粒子 x 在网格 p 内的分布比例
// x: 粒子世界坐标
// p: 网格坐标
// K: 影响半径
// 返回: vec3(分布中心.xy, 面积占比)
vec3 distribution(vec2 x, vec2 p, vec2 K) {
    vec4 aabb0 = vec4(p - 0.5, p + 0.5);           // 当前网格的 AABB
    vec4 aabb1 = vec4(x - K * 0.5, x + K * 0.5);   // 粒子影响范围的 AABB
    vec4 aabbX = vec4(max(aabb0.xy, aabb1.xy), min(aabb0.zw, aabb1.zw)); // 交集
    vec2 center = 0.5 * (aabbX.xy + aabbX.zw);     // 交集中心
    vec2 size = max(aabbX.zw - aabbX.xy, 0.0);     // 交集尺寸
    return vec3(center, size.x * size.y / (K.x * K.y)); // 中心 + 面积占比
}


// ==================== 再整合（积分阶段核心） ====================

// 粒子再整合：遍历 5×5 邻域，把邻居粒子的信息按面积比例融合到当前网格
// ch: 输入纹理（historyTexture）
// P: 当前网格的粒子（累加器，inout 修改）
// pos: 当前网格坐标
void Reintegration(sampler2D ch, inout particle P, vec2 pos) {
    range(i, -2, 2) range(j, -2, 2) {          // 遍历 5×5 邻域
        vec2 tpos = pos + vec2(i, j);            // 邻居网格坐标
        particle P0 = getParticle(texel(ch, tpos), tpos); // 读邻居粒子
        
        vec2 difR = destimator(P0.X - tpos, P0.M.x); // 计算邻居的影响半径
        P0.X += P0.V * dt;                       // 预测邻居本帧的新位置
        
        vec3 D = distribution(P0.X, pos, difR);  // 计算邻居在当前网格的分布比例
        float m = P0.M.x * D.z;                  // 按面积占比分配质量
        
        P.X += D.xy * m;     // 位置加权累加
        P.V += P0.V * m;     // 速度加权累加
        P.M.y += P0.M.y * m; // 辅助量累加
        P.M.x += m;          // 总质量累加
    }
    
    if (P.M.x != 0.0) {     // 防止除零
        P.X /= P.M.x;       // 位置加权平均
        P.V /= P.M.x;       // 速度加权平均
        P.M.y /= P.M.x;     // 辅助量平均
    }
}


// ==================== 物理模拟（模拟阶段核心） ====================

// 粒子物理模拟：计算受力、更新速度、处理碰撞和注水
// ch: 输入纹理（particleTexture）
// P: 当前粒子（inout 修改）
// pos: 当前网格坐标
void Simulation(sampler2D ch, inout particle P, vec2 pos) {
    vec2 F = vec2(0.0);      // 合力累加器
    vec3 avgV = vec3(0.0);   // 邻居速度累加器（用于速度平滑）
    
    // ---------- 5×5 邻域遍历：粒子间相互作用 ----------
    range(i, -2, 2) range(j, -2, 2) {
        vec2 tpos = pos + vec2(i, j);
        particle P0 = getParticle(texel(ch, tpos), tpos);
        vec2 dx = P0.X - P.X;                               // 粒子间距离向量
        
        // 压力排斥力：质量越大、距离越近 → 排斥力越强
        // avgP = gravity * 0.1 * 邻居质量 * (自身质量 + 邻居质量)
        float avgP = gravity * 0.1 * P0.M.x * (P.M.x + P0.M.x);
        F -= 0.5 * G(dx) * avgP * dx;                       // 沿距离方向排斥
        
        // 速度平滑：收集邻居速度，用高斯核加权
        avgV += P0.M.x * G(dx) * vec3(P0.V, 1.0);
    }
    
    // ---------- 地形坡度力（水往低处流） ----------
    // terrainGrad 指向最陡上升方向，所以减号 = 沿下坡推
    F -= gravity * 0.232 * P.M.x * terrainGrad(pos);
    
    // ---------- 速度平滑 ----------
    avgV.xy /= max(avgV.z, 0.000001);  // 加权平均
    
    // ---------- 注水 ----------
    // 如果当前帧有水源，且当前网格在水源半径内
    if (hasWaterSource && distance(pos / float(textureSize), waterSource) < waterSourceRadius) {
        P.M.x += waterAddRate * dt;  // 增加粒子质量（加水）
    }
    
    // ---------- 阻尼 + 速度更新 ----------
    F -= P.V * 0.0005;                                    // 微小阻尼，防止无限振荡
    P.V += F * dt / max(P.M.x, 0.000001);                 // F = ma → a = F/m → v += a*dt
    
    // ---------- 边界碰撞检测与反弹 ----------
    vec3 N = bN(P.X);                                     // 获取边界法线
    float vdotN = step(N.z, border_h) * dot(-N.xy, P.V);  // 速度在法线方向的分量
    P.V += 0.5 * (N.xy * vdotN + N.xy * abs(vdotN));     // 沿法线反弹
    if (N.z < 0.0) P.V = vec2(0.0);                       // 撞墙就停
    
    // ---------- 速度截断（防止数值爆炸） ----------
    float v = length(P.V);
    P.V /= max(v, 1.0);  // 速度上限为 1.0 网格/帧
}


// ==================== 光线与盒子求交（渲染阶段用） ====================

// 射线与单位盒子求交（Slab 方法）
// orig: 射线起点
// dir: 射线方向
// 返回: vec2(tmin, tmax) 进入和离开盒子的时间
// 用于体积渲染时的光线步进范围确定
vec2 hitBox(vec3 orig, vec3 dir) {
    const vec3 box_min = vec3(-0.5);  // 单位盒子最小角
    const vec3 box_max = vec3(0.5);   // 单位盒子最大角
    vec3 inv_dir = 1.0 / dir;          // 方向倒数（避免除零）
    vec3 tmin_tmp = (box_min - orig) * inv_dir;
    vec3 tmax_tmp = (box_max - orig) * inv_dir;
    vec3 tmin = min(tmin_tmp, tmax_tmp); // 每个轴的近交点
    vec3 tmax = max(tmin_tmp, tmax_tmp); // 每个轴的远交点
    return vec2(
        max(tmin.x, max(tmin.y, tmin.z)), // 所有轴的最大近交点 = 进入盒子
        min(tmax.x, min(tmax.y, tmax.z))  // 所有轴的最小远交点 = 离开盒子
    );
}
`

//积分阶段：第一帧随机撒粒子（60% 网格有粒子），后续帧调用 Reintegration() 重新分配网格归属
const particleIntegrationSource = `
// ============================================================
// particleIntegrationSource — 粒子积分/再整合阶段
// 每个像素 = 一个网格，每个网格维护一个粒子
// 职责：后续帧做 Reintegration（邻域粒子重新分配）
//       第一帧做随机初始化（撒粒子）
// ============================================================

uniform sampler2D iChannel0;  // 输入纹理：上一帧的粒子存档（historyTexture）
uniform int iFrame;           // 帧计数器：0 = 第一帧，>0 = 后续帧

void main() {
    // 当前像素坐标 = 当前网格的 2D 坐标 (0~1023)
    vec2 pos = gl_FragCoord.xy;
    
    // 安全保护：超出 1024×1024 范围的像素直接丢弃
    // 防止某些 GPU 上 gl_FragCoord 超出预期范围导致越界采样
    if (max(pos.x, pos.y) > float(textureSize)) discard;

    // 声明粒子结构体并清零
    particle P;
    P.X = vec2(0.0);  // 位置累加器
    P.V = vec2(0.0);  // 速度累加器
    P.M = vec2(0.0);  // 质量累加器（M.x=质量, M.y=辅助量）

    // ============================================================
    // 核心：粒子再整合
    // 遍历周围 5×5 邻域，把邻居粒子的信息按面积比例融合到当前网格
    // 这解决了"粒子移动后归属哪个网格"的问题
    // 
    // 第一帧时 iChannel0 全是空的，Reintegration 后 P 还是零向量
    // 所以下面 iFrame < 1 的分支会覆盖掉这个结果
    // ============================================================
    Reintegration(iChannel0, P, pos);

    if (iFrame < 1) {
        // ========================================================
        // 第一帧：随机初始化粒子
        // ========================================================
        
        // 用带偏移的 pos 做随机种子，确保和 sphKernelSource 里
        // 其他 hash32 调用不重复（避免伪影相关性）
        // +0.28 是任意偏移量，打破对称性
        vec3 rand = hash32(pos + vec2(0.0, 1.0) + 0.28);
        
        // rand.z < 0.6 → 60% 的网格生成粒子，40% 留空
        // 这是一个稀疏初始化策略，避免全满网格导致计算浪费
        // initialMass > 0.0 → 确保外部配置了初始水量
        if (rand.z < 0.6 && initialMass > 0.0) {
            // 粒子位置 = 网格中心 + 随机偏移（±0.15 网格）
            // 0.3 * (rand.yz - 0.5) 范围 = [-0.15, +0.15]
            // 注意这里用的是 rand.yz（不是 rand.xy），和上面 hash32 的偏移配合
            P.X = pos + 0.3 * (rand.yz - 0.5);
            
            // 初始速度 = 随机小扰动（±0.325 网格/帧）
            // 0.65 * (rand.xy - 0.5) 范围 = [-0.325, +0.325]
            P.V = 0.65 * (rand.xy - 0.5);
            
            // M.x = 初始质量（水量），M.y = 0（辅助量清零）
            P.M = vec2(initialMass, 0.0);
            
        } else {
            // ====================================================
            // 40% 的网格：不生成粒子（或只给极小质量）
            // ====================================================
            P.X = pos;                    // 位置就在网格中心
            P.V = vec2(0.0);              // 零速度
            P.M = vec2(1e-6);             // 极小质量（不是 0！）
            // 为什么给 1e-6 而不是 0？
            // 因为后续 Simulation() 里有 P.M.x 做分母的地方
            // 如果全零会导致除零异常，1e-6 足够小又安全
        }
    }
    // 注意：iFrame >= 1 时，P 保持 Reintegration() 的结果
    // 不做额外处理，直接写入
    
    // 编码粒子数据并输出到 particleTexture
    // 下一阶段（simulationStage）会读这张纹理
    out_FragColor = saveParticle(P, pos);
}
`
//模拟阶段：读入整合后的粒子，有质量就调用 Simulation() 算受力更新，零质量直接跳过
const particleSimulationSource = `
// ============================================================
// particleSimulationSource — 物理模拟阶段
// 每个像素 = 一个粒子，并行处理约100万个粒子
// 职责：读入再整合后的粒子 → 算受力 → 更新速度位置 → 写回
// ============================================================

uniform sampler2D iChannel0;  // 输入纹理：积分阶段的输出（particleTexture）

void main() {
    // 当前像素坐标 = 当前网格坐标 (0~1023)
    vec2 pos = gl_FragCoord.xy;
    
    // 安全保护：超出范围的像素直接丢弃
    if (max(pos.x, pos.y) > float(textureSize)) discard;
    
    // 从纹理读取当前网格的粒子数据并解码
    // texel(iChannel0, pos) → 采样 RGBA 四个通道
    // getParticle() → decode 位置偏移 + 网格坐标 = 世界坐标
    //                decode 速度
    //                直接读质量 M.x 和辅助量 M.y
    particle P = getParticle(texel(iChannel0, pos), pos);
    
    // ============================================================
    // 关键判断：质量为 0 的网格直接跳过
    // ============================================================
    // 为什么？没有水的网格不需要算受力
    // 省掉大量无意义计算（大约 40% 的网格是空的）
    // 同时避免 Simulation() 里除零
    if (P.M.x != 0.0) {
        // ========================================================
        // 核心物理计算！在 sphKernelSource 里定义
        //
        // 内部做了这些事（回顾一下）：
        // 1. 遍历 5×5 邻域，算粒子间压力排斥力（不可压缩性）
        //    F -= 0.5 * G(dx) * avgP * dx
        // 2. 沿地形坡度施加重力分量（水往低处流）
        //    F -= gravity * 0.232 * M * terrainGrad(pos)
        // 3. 如果 hasWaterSource && 在水源半径内 → 加水
        //    P.M.x += waterAddRate * dt
        // 4. 微小阻尼防止无限振荡
        //    F -= P.V * 0.0005
        // 5. 更新速度：v += F * dt / m
        // 6. 边界碰撞检测：bN() 拿法线，沿法线反弹
        // 7. 速度截断：上限 1.0 网格/帧（防数值爆炸）
        // ========================================================
        Simulation(iChannel0, P, pos);
    }
    // 注意：如果 P.M.x == 0，P 保持原样（零质量粒子不动）
    
    // 编码粒子数据写回 simulationTexture
    // saveParticle 把世界坐标转回相对偏移，encode 压缩进 float
    // 后续 surfaceStage 和 historyStage 都会读这张纹理
    out_FragColor = saveParticle(P, pos);
}
`

//平滑阶段：用 5×5 高斯核做加权平均，输出归一化密度（R 通道）和地形高度（G 通道），把离散粒子"糊"成连续水面
const surfaceSmoothingSource = `
// ============================================================
// surfaceSmoothingSource — 水面平滑/密度场重建阶段
// 职责：把离散粒子的质量"糊"成连续的水面密度场和地形高度场
// 用高斯核做空间加权平均，输出给渲染阶段采样
// ============================================================

uniform sampler2D iChannel0;  // 输入：simulationTexture（模拟阶段输出的粒子）

void main() {
    // 当前网格坐标
    vec2 pos = gl_FragCoord.xy;
    if (max(pos.x, pos.y) > float(textureSize)) discard;

    float rho = 0.0;     // 密度累加器（质量 × 权重 的总和）
    float hei = 0.0;     // 地形高度累加器（高度 × 权重 的总和）
    float weight = 0.0;  // 总权重累加器（用于归一化）

    // 5×5 邻域遍历（range 宏展开为双重 for，i/j 从 -2 到 +2）
    range(i, -2, 2) range(j, -2, 2) {
        // 邻居网格坐标
        vec2 pos0 = pos + vec2(float(i), float(j));
        
        // 计算高斯权重
        // pos - pos0 = 当前网格到邻居的网格距离（比如 (1,0)、(2,2) 等）
        // × 0.75 缩小距离 → 让高斯核更"宽"，5×5 邻域内的权重衰减更平缓
        // 如果不用 0.75，距离稍大 e^(-d²) 就直接趋近 0，5×5 邻域外圈几乎没贡献
        float w = G(0.75 * (pos - pos0));
        
        weight += w;  // 累加总权重
        
        // 密度累加：邻居粒子的质量 × 高斯权重
        // getParticle(...).M.x = 邻居粒子的水量
        rho += getParticle(texel(iChannel0, pos0), pos0).M.x * w;
        
        // 地形高度累加：邻居位置的地形高度 × 高斯权重
        // 加权平均得到当前位置"等效"的地形高度
        hei += terrainHeight(pos0) * w;
    }
    
    // ============================================================
    // 输出到 surfaceTexture
    // ============================================================
    // R = rho / weight → 归一化密度（单位面积的平均水量）
    // G = hei / weight → 归一化地形高度（当前位置的平滑地形高程）
    // B = 0.0         → 预留
    // A = (rho + hei) / weight → 密度+高度的混合值
    //     渲染阶段用 alpha 做阈值判断：这个值越大 = 水越厚/地势越高
    out_FragColor = vec4(rho / weight, hei / weight, 0.0, (rho + hei) / weight);
}
`
//渲染阶段：用光线步进找水面和地形交点，结合菲涅尔反射、Beer-Lambert 水下衰减、Phong 高光，合成出物理感的水面颜色和透明度
const fluidVolumeFragmentSource = `
// ============================================================
// fluidVolumeFragmentSource — 水体体积渲染（片元着色器）
// 渲染方式：光线步进（Ray Marching）+ 深度测试
// 输入：surfaceTexture（密度场 + 地形高度场）
// 输出：最终水面颜色 + 透明度
// ============================================================

uniform sampler2D iChannel0;  // surfaceTexture（R=密度, G=地形高度, A=混合值）
uniform int depth;            // 光线步进最大迭代次数（通常 20~50）
uniform vec3 shallow;         // 浅水颜色（RGB，外部配置）
uniform vec3 deep;            // 深水颜色（RGB，外部配置）
uniform float waterAlpha;     // 水的基础不透明度
in vec3 vo;                   // 射线起点（相机位置，从顶点着色器插值传入）
in vec3 vd;                   // 射线方向（从顶点着色器插值传入）

const vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));  // 平行光方向（右上方打下来）
const float heightScale = 0.15;  // 高度缩放系数（把纹理里的 0~1 值映射到世界高度）


// ==================== 高度采样 ====================

// 从 surfaceTexture 采样，返回两个高度值
// 返回 .x = 地形高度（基准面）
// 返回 .y = 水面高度（地形 + 水深）
vec2 getHeight(in vec3 p) {
    // p.xz 是水平面坐标，+0.5 把 [-0.5, 0.5] 映射到 [0, 1] UV
    // clamp 防止越界采样
    vec4 data = texture(iChannel0, clamp(p.xz + 0.5, 0.0, 1.0));
    
    // data.y = 地形高度（G通道，之前 surfaceSmoothing 输出的归一化高度）
    // data.x = 密度/水深（R通道）
    //
    // .x = 地形高度 * 0.15 - 0.5 → 地形基准面
    // .y = (地形高度 + 水深) * 0.15 - 0.5 → 水面高度
    return vec2(data.y * heightScale - 0.5, (data.y + data.x) * heightScale - 0.5);
}

// 获取指定位置的"水深"（水面到地形的垂直距离）
float getWaterDepth(in vec3 p) {
    return texture(iChannel0, clamp(p.xz + 0.5, 0.0, 1.0)).x * heightScale;
}


// ==================== 法线计算 ====================

// 用中心差分算水面法线
// p: 世界坐标
// comp: 0=地形法线, 1=水面法线
vec3 getNormal(in vec3 p, int comp) {
    float d = 2.0 / float(textureSize);  // 差分步长（2个网格单元映射到世界坐标）
    
    // 采样当前点、右侧点、上方点的高度
    float hMid = comp == 0 ? getHeight(p).x : getHeight(p).y;  // 当前高度
    float hRight = comp == 0 ? getHeight(p + vec3(d, 0.0, 0.0)).x : getHeight(p + vec3(d, 0.0, 0.0)).y;  // 右
    float hTop = comp == 0 ? getHeight(p + vec3(0.0, 0.0, d)).x : getHeight(p + vec3(0.0, 0.0, d)).y;      // 上
    
    // 用两个切线向量的叉积算法线
    // 切线1: (0, hTop - hMid, d) → 沿Z方向的边
    // 切线2: (d, hRight - hMid, 0) → 沿X方向的边
    // cross(切线1, 切线2) → 法线（指向水面外侧）
    return normalize(cross(vec3(0.0, hTop - hMid, d), vec3(d, hRight - hMid, 0.0)));
}


// ==================== 菲涅尔反射 ====================

// Schlick 菲涅尔近似：视线越掠射（grazing angle），反射越强
// viewDir: 视线方向（从相机指向像素）
// normal: 水面法线
float fresnel(vec3 viewDir, vec3 normal) {
    float cosTheta = max(dot(-viewDir, normal), 0.0);  // 视线与法线的夹角余弦
    return 0.02 + 0.98 * pow(1.0 - cosTheta, 5.0);    // F0=0.02（水的典型值）
}


// ==================== 核心：体积光线步进 ====================

vec4 renderVolume(in vec3 ro, in vec3 rd) {
    vec3 rayDir = normalize(rd);
    
    // 射线与单位盒子求交，得到进入和离开盒子的时间 t
    vec2 ret = hitBox(ro, rayDir);
    if (ret.x > ret.y) discard;        // 射线没碰到盒子，直接丢弃
    ret.x = max(ret.x, 0.0);           // 如果相机在盒子内部，从 t=0 开始
    
    // ==================== 第一遍步进：找地形表面 ====================
    float tt = ret.x;  // tt = terrain t（地形交点距离）
    for (int i = 0; i < depth; i++) {
        vec3 p = ro + rd * tt;              // 当前采样点
        float h = p.y - getHeight(p).x;     // 采样点到地形表面的有向距离
        // h < 0.0002 → 穿透地形了，找到了交点
        // tt > ret.y → 超出盒子范围，停止
        if (h < 0.0002 || tt > ret.y) break;
        tt += h * 0.4;  // 步长 = 距离的 40%（保守步长，防止穿透薄层）
    }
    
    // ==================== 第二遍步进：找水面 ====================
    float wt = ret.x;  // wt = water t（水面交点距离）
    for (int i = 0; i < depth; i++) {
        vec3 p = ro + rd * wt;
        float h = p.y - getHeight(p).y;     // 采样点到水面的有向距离
        if (h < 0.0002 || wt > min(tt, ret.y)) break;  // 不能超过地形交点
        wt += h * 0.4;
    }
    
    // ==================== 着色 ====================
    vec3 color = vec3(0.0);
    float alpha = 0.0;
    
    // 只有射线先碰到水面（wt < tt = 水面在地形前面），才渲染水
    if (wt < ret.y) {
        vec3 waterPos = ro + rd * wt;           // 水面交点世界坐标
        float waterDepth = getWaterDepth(waterPos);  // 该位置的水深
        
        if (waterDepth > 0.001) {  // 有足够深的水才渲染
            // ---- 水面法线 ----
            vec3 waterNormal = getNormal(waterPos, 1);  // comp=1 用水面高度算
            
            // ---- 菲涅尔 ----
            float F = fresnel(rayDir, waterNormal);
            
            // ---- 反射方向 & 天空颜色 ----
            vec3 reflectDir = reflect(rayDir, waterNormal);
            // 根据反射方向的仰角混合两种天空色（浅蓝→深蓝）
            vec3 skyColor = mix(
                czm_gammaCorrect(vec3(0.5, 0.7, 1.0)),   // 地平线附近的天空色
                czm_gammaCorrect(vec3(0.2, 0.4, 0.8)),   // 天顶方向的天空色
                reflectDir.y * 0.5 + 0.5
            );
            
            // ---- 水下衰减（Beer-Lambert 定律） ----
            // tt - wt = 视线穿过水体的距离（从水面到地形）
            float underwaterDist = min(tt - wt, 0.3);  // 限制最大衰减距离
            // 红光衰减最快(1.0)，绿光次之(0.467)，蓝光最慢(0.180)
            // 这就是为什么水看起来偏蓝绿——红光被吸收掉了
            vec3 underwaterColor = exp(-0.18 * vec3(1.0, 0.467, 0.180) * max(underwaterDist * 100.0, 0.0));
            
            // ---- 水体颜色（浅水↔深水混合） ----
            vec3 waterColor = mix(
                czm_gammaCorrect(shallow),  // 浅水区颜色
                czm_gammaCorrect(deep),     // 深水区颜色
                smoothstep(0.0, 0.1, waterDepth)  // 根据水深平滑过渡
            );
            
            // ---- 高光（Phong 模型） ----
            float spec = pow(max(dot(lightDir, reflectDir), 0.0), 64.0);
            
            // ---- 最终颜色合成 ----
            // 基础颜色 = 水体颜色 × 水下衰减（模拟光在水中的吸收）
            // 反射颜色 = 天空颜色 × 菲涅尔系数
            color = mix(waterColor * underwaterColor, skyColor, F * 0.5);
            color += spec * vec3(1.0) * 0.8;  // 叠加高光
            
            // ---- 透明度 ----
            // 浅水区更透明，深水区更不透明
            alpha = mix(0.3, waterAlpha, smoothstep(0.0, 0.05, waterDepth));
            // 掠射角更不透明 + 高光处更不透明
            alpha = mix(alpha, 1.0, F * 0.3 + spec * 0.5);
        }
    }
    
    // 如果没渲染出水且没碰到地形，丢弃
    if (alpha < 0.01 && tt < ret.y) discard;
    return vec4(color, alpha);
}


// ==================== 入口 ====================

void main() {
    // 调用光线步进渲染
    vec4 color = renderVolume(vo, normalize(vd));
    if (color.a < 0.01) discard;          // 几乎透明的像素直接丢弃（省深度写入）
    out_FragColor = color;                 // 输出最终颜色
}
`
//ModelMatrix = ENU(位置) × RotationX × RotationY × RotationZ × Scale
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
//给定一个经纬度矩形，算出它在地球表面上的实际尺寸（宽和高，单位：米）
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
    private readonly volumeCenterElevation = (MIN_ELEVATION + MAX_ELEVATION) / 2//盒子中心
    private readonly volumeThickness = MAX_ELEVATION - MIN_ELEVATION//盒子厚度（高差）
    private readonly waterSourcePosition = new Cesium.Cartesian2(1.0, 0.0)
    private readonly textures: any[] = []
    private readonly stages: Array<FluidComputeStage | FluidVolumeStage> = []
    private readonly waterEntity: Cesium.Entity
    private readonly postRenderListener: () => void
    private frame = 0//帧计数器
    private hasWaterSource = false//当前帧是否有水源注入

    constructor(
        private readonly viewer: Cesium.Viewer,
        private readonly heightMapImage: any,
    ) {
        const metrics = getRectangleMetrics(Cesium.Rectangle.fromDegrees(...EXTENT))
        //边界盒子
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
            this.frame += 1//帧数加一
            this.hasWaterSource = false// 点击只产生一次有限水量，后续由粒子自身继续流动。
        }
        this.buildPipeline()
        viewer.scene.postRender.addEventListener(this.postRenderListener)
    }

    setWaterSource(position: Cesium.Cartesian2) {
        this.waterSourcePosition.x = position.x
        this.waterSourcePosition.y = position.y
        this.hasWaterSource = true
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

    /*
        ┌─────────────────────────────────────────────────────────────────┐
        │                                                                 │
        │   historyTexture ──(上一帧存档)──→ integrationStage              │
        │                                              │                  │
        │                                              ▼                  │
        │                                    particleTexture              │
        │                                    (当前粒子快照)                │
        │                                              │                  │
        │                                              ▼                  │
        │                                    simulationStage              │
        │                                    (物理模拟)                    │
        │                                              │                  │
        │                              ┌───────────────┼───────────────┐  │
        │                              ▼               ▼               ▼  │
        │                       surfaceStage    historyStage    (其他读取) │
        │                       (水面平滑)       (历史回写)                 │
        │                              │               │                  │
        │                              ▼               ▼                  │
        │                       surfaceTexture   historyTexture           │
        │                       (水面地图)       (存档供下帧用)             │
        │                              │                                  │
        │                              ▼                                  │
        │                       volumeStage                               │
        │                       (光线步进渲染水体)                          │
        │                                                                 │
        └─────────────────────────────────────────────────────────────────┘
    */

    private buildPipeline() {
        const context = (this.viewer.scene as any).context//Cesium内部WebGL上下文
        const particleTexture = this.addTexture(createSimulationTexture(context)) //粒子的"当前快照"，给模拟阶段用
        const simulationTexture = this.addTexture(createSimulationTexture(context))//物理模拟结果
        const surfaceTexture = this.addTexture(createSimulationTexture(context))//	把粒子糊成连续水面，给渲染用
        const historyTexture = this.addTexture(createSimulationTexture(context))//	上一帧的存档，给下一帧的初始化用
        const heightMapTexture = this.addTexture(new CesiumPrivate.Texture({
            context,
            width: TEXTURE_SIZE,
            height: TEXTURE_SIZE,
            pixelFormat: Cesium.PixelFormat.RGBA,
            pixelDatatype: Cesium.PixelDatatype.UNSIGNED_BYTE,//高程图是PNG图片，每个通道 0~255，不需要浮点
            flipY: false,
            sampler: new CesiumPrivate.Sampler({
                minificationFilter: Cesium.TextureMinificationFilter.LINEAR,//Shader 里采样时做双线性插值，地形高度更平滑
                magnificationFilter: Cesium.TextureMagnificationFilter.LINEAR,
                wrapS: CesiumPrivate.TextureWrap.CLAMP_TO_EDGE,//纹理坐标超出 0~1 时不重复（不出现镜像地形）
                wrapT: CesiumPrivate.TextureWrap.CLAMP_TO_EDGE,
            }),
            source: this.heightMapImage,//高度图
        }))

        const makeShader = (source: string) =>
            new CesiumPrivate.ShaderSource({ sources: [sphKernelSource, source] })//每个计算阶段都需要公共的 SPH 核函数（sphKernelSource）+ 各自的业务逻辑

        /*
            particleIntegrationSource​
            积分阶段：第一帧随机撒粒子（60% 网格有粒子），后续帧调用 Reintegration() 重新分配网格归属

            particleSimulationSource​
            模拟阶段：读入整合后的粒子，有质量就调用 Simulation() 算受力更新，零质量直接跳过

            surfaceSmoothingSource​
            平滑阶段：用 5×5 高斯核做加权平均，输出归一化密度（R 通道）和地形高度（G 通道），把离散粒子"糊"成连续水面

            fluidVolumeFragmentSource​
            渲染阶段：用光线步进找水面和地形交点，结合菲涅尔反射、Beer-Lambert 水下衰减、Phong 高光，合成出物理感的水面颜色和透明度
        */
        const integrationStage = new FluidComputeStage(//用一张纹理当输入 → 跑一段 Fragment Shader 做计算 → 把结果写到另一张纹理上
            makeShader(particleIntegrationSource),
            {
                iFrame: () => this.frame,// 帧数：判断是否是第一帧
                iChannel0: () => historyTexture,// 上一帧结果
                initialMass: () => options.initialWaterLevel,//初始水量，控制第一帧每个粒子分配多少质量
            },
            particleTexture,// 输出到 particleTexture
        )
        const simulationStage = new FluidComputeStage(
            makeShader(particleSimulationSource),// 把公共的 SPH 核函数（sphKernelSource）和 particleIntegrationSource（积分逻辑）拼在一起，交给 WebGL 编译
            {
                iChannel0: () => particleTexture,
                heightMap: () => heightMapTexture,
                waterSource: () => this.waterSourcePosition,
                waterSourceRadius: () => options.waterSourceRadius,
                waterAddRate: () => options.waterAddRate,
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
                gravity: () => options.gravity,
                // 历史缓冲只传递本帧结果，避免同一次点击被重复注水。
                hasWaterSource: () => false,
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

function calculateNormalizedPosition(position: Cesium.Cartesian3) {
    const cartographic = Cesium.Cartographic.fromCartesian(position)
    const longitude = Cesium.Math.toDegrees(cartographic.longitude)
    const latitude = Cesium.Math.toDegrees(cartographic.latitude)
    return {
        x: (longitude - EXTENT[0]) / (EXTENT[2] - EXTENT[0]),
        y: 1 - (latitude - EXTENT[1]) / (EXTENT[3] - EXTENT[1]),
    }
}

const onMapReady = async (cesiumViewer: Cesium.Viewer) => {
    viewer = cesiumViewer

    try {
        await initCesiumBase(viewer, {
            terrain: true,
            requestVertexNormals: true,
            osm: true,
            depthTestAgainstTerrain: true,
            shouldAnimate: true,
        })
        viewer.scene.msaaSamples = 4//抗锯齿
        viewer.scene.highDynamicRange = true//高动态范围
        viewer.postProcessStages.fxaa.enabled = true//后处理抗锯齿

        viewer.camera.flyTo({
            destination: Cesium.Rectangle.fromDegrees(...EXTENT),
            duration: 1.0,//1秒
        })

        const heightMapImage = await Cesium.Resource.fetchImage({ url: HEIGHT_MAP_URL })
        simulation = new TerrainFluidSimulation(viewer, heightMapImage)

        clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
        clickHandler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
            if (!simulation || !viewer) return

            const ray = viewer.camera.getPickRay(movement.position)
            const pickedPosition = viewer.scene.pickPosition(movement.position)
                || (ray ? viewer.scene.globe.pick(ray, viewer.scene) : undefined)
            if (!Cesium.defined(pickedPosition)) return

            const normalized = calculateNormalizedPosition(pickedPosition)
            if (normalized.x < 0 || normalized.x > 1 || normalized.y < 0 || normalized.y > 1) return
            simulation.setWaterSource(new Cesium.Cartesian2(normalized.x, normalized.y))
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    } catch (error) {
        console.error('[SPH] 初始化失败', error)
    }
}

onBeforeUnmount(() => {
    clickHandler?.destroy()
    clickHandler = undefined
    simulation?.destroy()
    simulation = undefined
    viewer = undefined
})
</script>

<style scoped>
.page-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
}
</style>

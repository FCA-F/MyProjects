# RuoYi-Vue3 WebGIS 技术文档

## 1.位置说明
程序主页位于src/index.vue

Cesium功能主页位于src/views/cesium-function/index.vue(样式)
                 src/views/cesium-function/cards.ts(具体功能)

Cesium各项功能位于src/views/cesium-function

Cesium的Viewer创建位于src/components/CesiumMap/CesiumMap.vue

Cesium封装通用功能位于src/utils/cesium.ts(viewer初始化)

Cesium功能主页的图片位于src/assets/images/cesium-function

## 2.添加Cesium功能说明
以下步骤顺序无要求
1.建立vue文件：在src/views/cesium-function中建立.vue文件

2.主页面匹配功能：在src/views/cesium-function/cards.ts中增加功能卡片,仅需要增加一句(如

  { name: 'buffer-analysis', title: '缓冲区分析', path: '/cesium-function/spatial-analysis/buffer-analysis' })，

  name：vue文件名字
  title：标题名字
  path：路由地址

  所有功能会自动识别匹配(如路由、图片显示等)

3.设置图片：在src/assets/images/cesium-function功能添加对应的展示图片，名字需要与功能的vue文件名一致

4.在RuoYi网页的 系统管理-菜单管理-Cesium功能 中添加菜单，


以下为AI辅助生成版本：
## 1. 项目概述

本项目基于 RuoYi-Vue3 TypeScript 前端工程扩展 WebGIS 能力，核心目标是在 RuoYi 后台管理框架中集成 Cesium 三维地球、空间分析、测量工具和系统管理能力。

项目整体采用前后端分离架构：

- 前端：Vue 3、TypeScript、Vite、Element Plus、Pinia、Vue Router。
- 三维 GIS：CesiumJS、vite-plugin-cesium、Turf。
- 后端：沿用 RuoYi 通用后端接口体系，前端通过 Axios 封装请求。
- 构建：Vite 开发服务器与生产构建。

## 2. 技术栈

| 类型 | 技术 |
| --- | --- |
| 前端框架 | Vue 3.5.x |
| 开发语言 | TypeScript |
| 构建工具 | Vite 6.x |
| UI 组件 | Element Plus |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |
| 三维地图 | Cesium 1.144.x |
| GIS 计算 | Turf |
| HTTP 请求 | Axios |
| 图表 | ECharts |
| 富文本 | Vue Quill |
| 样式 | Sass |

## 3. 工程目录

```text
RuoYi-Vue3
├── public/                         # 静态资源
├── src/
│   ├── api/                        # 后端接口模块
│   ├── assets/                     # 图片、图标、全局样式
│   ├── components/                 # 通用组件
│   │   ├── CesiumMap/              # Cesium Viewer 容器组件
│   │   └── Common/                 # 通用弹窗等业务组件
│   ├── directives/                 # 自定义指令
│   ├── layout/                     # RuoYi 主布局
│   ├── plugins/                    # 插件注册
│   ├── router/                     # 路由配置
│   ├── store/                      # RuoYi 状态模块
│   ├── types/                      # TypeScript 类型声明
│   ├── utils/                      # 工具方法
│   │   └── cesium.ts               # Cesium 场景初始化工具
│   └── views/
│       ├── cesium-function/        # Cesium 功能主页和业务页面
│       │   ├── cards.ts            # 功能卡片配置
│       │   ├── index.vue           # Cesium 功能主页
│       │   ├── default/            # 默认影像、地形、建筑展示
│       │   ├── spatial-analysis/   # 空间分析功能
│       │   └── measurement/        # 测量功能
│       ├── system/                 # 系统管理
│       ├── monitor/                # 系统监控
│       └── tool/                   # 系统工具
├── vite.config.ts                  # Vite 配置
├── package.json                    # 依赖与脚本
└── README.md
```

## 4. 应用架构

### 4.1 页面布局

主布局位于 `src/layout/index.vue`，由以下部分组成：

- `Sidebar`：左侧菜单。
- `Navbar`：顶部导航。
- `TagsView`：页签导航。
- `AppMain`：路由页面渲染区域。
- `Settings`：主题与布局设置。

布局根据窗口宽度自动切换桌面端和移动端状态，移动端打开侧边栏时会显示遮罩层。

### 4.2 路由体系

路由入口位于 `src/router/index.ts`。

路由分为两类：

- `constantRoutes`：公共路由，例如登录、首页、404、401、个人中心。
- `dynamicRoutes`：权限路由，例如用户授权、角色授权、字典数据、调度日志、代码生成配置。

业务菜单通常由后端权限菜单返回并动态挂载，前端路由组件按 `component: () => import(...)` 方式懒加载。

### 4.3 状态管理

项目使用 Pinia 作为状态管理工具。

常见状态包括：

- 用户信息与权限。
- 侧边栏展开状态。
- 主题色、TagsView、固定头部等布局设置。
- 字典缓存。

Cesium 页面目前主要通过页面局部状态管理 `viewer`、绘制对象、分析参数和显示状态。

## 5. Cesium 功能架构

### 5.1 CesiumMap 组件

`src/components/CesiumMap/CesiumMap.vue` 是 Cesium Viewer 的基础容器组件。

职责：

- 渲染地图容器 `<div class="map">`。
- 在 `onMounted` 中创建 `Cesium.Viewer`。
- 关闭默认控件，例如 geocoder、timeline、animation、baseLayerPicker。
- 创建完成后通过 `emit('ready', viewer)` 把 Viewer 实例交给业务页面。
- 在 `onBeforeUnmount` 中销毁 Viewer，避免 WebGL 上下文泄漏。

业务页面一般按以下方式接收 Viewer：

```vue
<CesiumMap @ready="onMapReady" />
```

```ts
const onMapReady = (cesiumViewer: Cesium.Viewer) => {
  viewer = cesiumViewer
}
```

### 5.2 Cesium 初始化工具

`src/utils/cesium.ts` 中的 `initCesiumBase` 负责统一初始化 Cesium 场景。

主要能力：

- 设置相机位置和视角。
- 加载 Cesium World Terrain。
- 加载 OSM Buildings。
- 设置地形深度检测。
- 设置光照、阴影和时间动画。

空间分析中有两个重要参数：

- `terrain: true`：启用真实地形。
- `requestVertexNormals: true`：请求地形法线，坡度分析和坡向分析依赖该参数。

坡度和坡向分析使用 Cesium 内置材质 `SlopeRamp`、`AspectRamp`，这类材质依赖地形法线。未开启 `requestVertexNormals` 时，材质虽然能设置成功，但画面可能没有预期效果。

### 5.3 Cesium 功能主页

`src/views/cesium-function/index.vue` 是 Cesium 功能入口页。

功能卡片数据来自 `src/views/cesium-function/cards.ts`，图片通过 `import.meta.glob` 从以下目录自动导入：

```text
src/assets/images/cesiumFunction/*.png
```

新增功能卡片时需要同时补充：

1. 功能页面。
2. 路由或菜单路径。
3. `cards.ts` 中的卡片配置。
4. 同名图片资源。

例如：

```ts
{ name: 'slope-analysis', title: '坡度分析', path: '/cesium-function/spatial-analysis/slope-analysis' }
```

对应图片：

```text
src/assets/images/cesiumFunction/slope-analysis.png
```

### 5.4 默认场景模块

目录：

```text
src/views/cesium-function/default/
```

包含：

- `default-imagery.vue`：默认影像展示。
- `default-terrain.vue`：默认地形展示。
- `default-osm.vue`：OSM 建筑展示。

这些页面主要验证 Cesium 基础能力，包括影像、地形和 3D Tiles 建筑加载。

### 5.5 空间分析模块

目录：

```text
src/views/cesium-function/spatial-analysis/
```

主要功能：

| 页面 | 功能 |
| --- | --- |
| `inundation-analysis.vue` | 淹没分析 |
| `viewshed-terrain-analysis.vue` | 地形可视域分析 |
| `viewshed-model-analysis.vue` | 模型可视域分析 |
| `contour-analysis.vue` | 等高线分析 |
| `slope-analysis.vue` | 坡度分析 |
| `aspect-analysis.vue` | 坡向分析 |
| `buffer-analysis.vue` | 缓冲区分析 |

关键实现方式：

- 等高线使用 `Cesium.Material.fromType('ElevationContour')`。
- 坡度分析使用 `Cesium.Material.fromType('SlopeRamp')`。
- 坡向分析使用 `Cesium.Material.fromType('AspectRamp')`。
- 地形、坡度、坡向类分析需要真实地形和地形法线支持。
- 交互类分析通过 Cesium 事件处理器监听鼠标点击、移动和绘制动作。

### 5.6 测量模块

目录：

```text
src/views/cesium-function/measurement/
```

主要功能：

- `coordinate-measurement.vue`：坐标拾取。
- `distance-measurement.vue`：距离测量。
- `area-measurement.vue`：面积测量。

这类页面通常依赖：

- `ScreenSpaceEventHandler` 监听鼠标事件。
- `viewer.scene.pickPosition` 或 `viewer.camera.pickEllipsoid` 获取空间位置。
- `Entity`、`Label`、`Polyline`、`Polygon` 显示测量结果。

## 6. 数据与请求流程

系统管理、监控、工具等 RuoYi 原生模块通过 `src/api/` 封装接口，统一走 Axios 请求工具。

典型流程：

```text
Vue 页面
  -> api 模块方法
  -> request 工具封装
  -> 后端 RuoYi 接口
  -> 返回数据
  -> 页面表格、表单、图表渲染
```

Cesium 空间分析功能多数在前端完成，主要依赖 Cesium 场景对象、地形数据和用户交互，不一定需要后端接口参与。

## 7. 开发与运行

### 7.1 安装依赖

```bash
npm install --registry=https://registry.npmmirror.com
```

### 7.2 启动开发环境

```bash
npm run dev
```

本项目 Vite 服务端口以 `vite.config.ts` 中配置为准。若 80 端口权限不足，建议改为 8081 等普通端口。

### 7.3 生产构建

```bash
npm run build:prod
```

### 7.4 测试环境构建

```bash
npm run build:stage
```

### 7.5 本地预览构建结果

```bash
npm run preview
```

## 8. 新增 Cesium 功能页面流程

1. 在对应目录新增页面，例如：

```text
src/views/cesium-function/spatial-analysis/example-analysis.vue
```

2. 页面中引入基础地图组件：

```ts
import * as Cesium from 'cesium'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import { initCesiumBase } from '@/utils/cesium'
```

3. 在 `onMapReady` 中初始化场景：

```ts
const onMapReady = async (cesiumViewer: Cesium.Viewer) => {
  viewer = cesiumViewer

  await initCesiumBase(viewer, {
    destination: { lng: 117.12043, lat: 36.68173, height: 2000 },
    orientation: { heading: 140, pitch: -30, roll: 0 },
    terrain: true,
    requestVertexNormals: true,
    depthTestAgainstTerrain: true,
  })
}
```

4. 在 `cards.ts` 中补充功能卡片。

5. 在 `src/assets/images/cesiumFunction/` 下放入与 `name` 同名的预览图。

6. 配置对应菜单或路由路径，保证 `router.push(item.path)` 能访问页面。

## 9. 关键注意事项

### 9.1 Cesium Ion Token

当前 `CesiumMap.vue` 中直接写入了 `Cesium.Ion.defaultAccessToken`。从维护角度看，建议后续迁移到环境变量中，例如：

```text
VITE_CESIUM_ION_TOKEN=xxxx
```

然后在代码中读取：

```ts
Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN
```

这样可以避免 Token 暴露在源码中，也便于不同环境切换。

### 9.2 地形法线

坡度分析和坡向分析必须在创建地形时开启：

```ts
await Cesium.createWorldTerrainAsync({
  requestVertexNormals: true,
})
```

不要在地形创建完成后再写：

```ts
terrainProvider.requestVertexNormals = true
```

该方式通常不会生效，并且可能触发类型或运行时错误。

### 9.3 异步初始化顺序

`initCesiumBase` 是异步函数。业务页面如果依赖 terrain、OSM Buildings 或其他异步资源，应使用 `await`：

```ts
await initCesiumBase(viewer, options)
```

如果不等待，后续材质设置、分析计算或相机定位可能发生在资源加载完成之前。

### 9.4 材质作用范围

`viewer.scene.globe.material` 只作用于地球表面，不会直接作用于 OSM Buildings 或其他 3D Tiles 模型。

因此坡度、坡向、等高线等地形材质在建筑密集区域可能被模型遮挡，看起来像没有生效。调试时建议先切到山地区域或关闭建筑图层。

### 9.5 组件销毁

创建 `ScreenSpaceEventHandler`、Primitive、Entity、PostProcessStage 等对象后，应在组件卸载或清除按钮中释放：

- `handler.destroy()`
- `viewer.entities.remove(...)`
- `viewer.scene.primitives.remove(...)`
- `viewer.scene.globe.material = undefined`

避免多次进入页面后事件重复触发或内存泄漏。

## 10. 代码规范建议

- Cesium Viewer 实例统一命名为 `viewer`，并在 `onMapReady` 后使用。
- 页面级临时对象使用 `let` 存储，清除逻辑集中在 `clear` 或 `remove` 方法中。
- 需要用户输入的分析参数使用 `ref`，多个参数联动时使用 `watch([a, b], callback)`。
- 与地形相关的功能在初始化参数中明确标注 `terrain: true` 和 `requestVertexNormals: true`。
- 新增功能卡片时保证 `cards.ts` 的 `name` 与图片文件名一致。
- 不要把 Cesium Token、后端地址、账号密码硬编码在业务组件中。

## 11. 部署说明

生产环境构建后生成静态资源，可部署到 Nginx、IIS 或其他静态服务中。

需要注意：

- 前端接口代理在生产环境不会自动生效，需要由 Nginx 或后端网关配置。
- 如果使用 history 路由，需要服务端配置回退到 `index.html`。
- Cesium 静态资源由 `vite-plugin-cesium` 处理，构建后应确认 `Workers`、`Assets`、`Widgets` 等资源路径正常。
- 网络环境需要能访问 Cesium Ion 相关服务，或替换为本地/私有地形和影像服务。

## 12. 常见问题

### 12.1 坡度或坡向材质设置成功但画面没变化

检查：

1. 是否启用了真实地形。
2. 创建地形时是否传入 `requestVertexNormals: true`。
3. 是否等待 `initCesiumBase` 完成。
4. 当前视角是否被 OSM Buildings 或 3D Tiles 遮挡。
5. 是否正在看平坦区域，坡度变化不明显。

### 12.2 功能主页卡片没有图片

检查：

1. `cards.ts` 中 `name` 是否正确。
2. `src/assets/images/cesiumFunction/` 下是否存在同名 PNG。
3. 文件扩展名是否为 `.png`。
4. Vite 是否已重新加载资源。

### 12.3 页面切换后事件重复触发

通常是事件处理器没有销毁。需要在清除函数或 `onBeforeUnmount` 中执行：

```ts
if (handler) {
  handler.destroy()
}
```

### 12.4 80 端口启动失败

Windows 下 80 端口可能需要管理员权限或已被其他程序占用。建议在 `vite.config.ts` 中将端口改为 8081：

```ts
server: {
  port: 8081,
}
```

## 13. 后续优化建议

- 把 Cesium Ion Token 移入环境变量。
- 将空间分析公共逻辑提取为 composable，例如 `useCesiumViewer`、`useDrawPolygon`、`useTerrainMaterial`。
- 为 Cesium 分析功能增加统一清除接口。
- 为坡度、坡向、等高线增加图例和参数校验。
- 抽离功能卡片配置与路由配置，减少重复维护。
- 为测量和绘制功能增加单元测试或最小交互测试。
- 统一中文编码，避免 README 或页面文案出现乱码。

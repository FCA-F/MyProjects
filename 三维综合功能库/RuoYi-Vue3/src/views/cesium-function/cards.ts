// ============================================
// 类型定义
// ============================================

export interface FeatureCard {
    name: string
    title: string
    /** 路径由系统自动生成，无需手动输入 */
    path?: string
    image?: string
}

export interface FeatureSection {
    name: string
    title: string
    items: FeatureCard[]
}

// ============================================
// 图片自动加载
// ============================================

const imageModules = import.meta.glob('/src/assets/images/cesium-function/*.png', {
    eager: true,
    import: 'default',
}) as Record<string, string>

const getImage = (name: string) => imageModules[`/src/assets/images/cesium-function/${name}.png`]

// ============================================
// 数据源（只管 name + title，path/image 全自动）
// ============================================

export const sections: FeatureSection[] = [
    {
        name: 'layer',
        title: '图层',
        items: [
            { name: 'default-imagery', title: '默认影像' },
            { name: 'default-terrain', title: '默认地形' },
            { name: 'default-osm', title: '默认OSM建筑' },
            { name: 'tianditu', title: '天地图' },
            { name: 'gaode', title: '高德' },
        ],
    },
    {
        name: 'basic',
        title: '基础模板',
        items: [
            { name: 'graphics-drawing', title: '图形绘制' },
            { name: 'glsl-box', title: 'GLSL体积盒' },
        ],
    },
    {
        name: 'editor',
        title: '场景编辑',
        items: [
            { name: 'model-transformation', title: '模型变换' },
            { name: '3dtiles-transform', title: '3DTiles仿射变换' },
            { name: 'drawing-exporting-GeoJSON', title: 'GeoJSON绘制与导出' },
            { name: '3dtiles-optimize', title: '3DTiles性能优化' },
            { name: 'keyboard-flying', title: '键盘飞行' },
            { name: 'military-mapping', title: '军事标绘' },
            { name: 'video-rendering', title: '视频绘制' },
            { name: 'div-popup', title: 'DIV弹窗' },
        ],
    },
    {
        name: 'performance',
        title: '性能',
        items: [
            { name: 'point-aggregation', title: '点聚合' },
            { name: 'massive-points', title: '海量点' },
            { name: 'massive-polygon', title: '海量面' },
            { name: 'massive-model', title: '海量模型' },
        ],
    },
    {
        name: 'spatial-analysis',
        title: '空间分析',
        items: [
            { name: 'inundation-analysis', title: '淹没分析' },
            { name: 'viewshed-terrain-analysis', title: '可视域分析（地形）' },
            { name: 'viewshed-model-analysis', title: '可视域分析（模型）' },
            { name: 'contour-analysis', title: '等高线分析' },
            { name: 'slope-analysis', title: '坡度分析' },
            { name: 'aspect-analysis', title: '坡向分析' },
            { name: 'buffer-analysis', title: '缓冲区分析' },
            { name: 'semantic-highlighting', title: '语义着色' },
            { name: 'visibility-analysis', title: '通视分析' },
            { name: 'flood-analysis', title: '水淹分析' },
            { name: 'height-limit-analysis', title: '限高分析' },
            { name: 'planing-analysis', title: '刨面分析' },
            { name: 'terrain-excavation', title: '地形开挖' },
            { name: 'skyline', title: '天际线' },
            { name: 'wind-farm', title: '风场' },
            { name: 'heatmap', title: '热力图' },
            { name: 'elevation-drawing-skyline', title: '立面图-天际线' },
        ],
    },
    {
        name: 'measurement',
        title: '测量',
        items: [
            { name: 'coordinate-measurement', title: '坐标测量' },
            { name: 'distance-measurement', title: '距离测量' },
            { name: 'area-measurement', title: '面积测量' },
        ],
    },
    {
        name: 'effect',
        title: '特效',
        items: [
            { name: 'fog', title: '雾' },
            { name: 'rain', title: '雨' },
            { name: 'snow', title: '雪' },
            { name: 'bloom-effect', title: '泛光特效' },
            { name: 'volumetric-cloud', title: '体积云' },
            { name: 'filter', title: '滤镜' },
            { name: 'point-light-source', title: '点光源' },
            { name: 'firework', title: '烟花' },
        ],
    },
    {
        name: 'animation',
        title: '动画',
        items: [
            { name: 'path-roaming', title: '路径漫游' },
            { name: 'circle-roaming', title: '绕点漫游' },
            { name: 'flying-projection', title: '飞行投影' },
        ],
    },
    {
        name: 'simulation',
        title: '模拟',
        items: [
            { name: 'water-flow', title: '水流' },
            { name: 'water-source', title: '水源' },
        ],
    },
    {
        name: 'data',
        title: '数据',
        items: [
            { name: 'nginx-3DTiles-load', title: 'nginx-3DTiles载入' },
            { name: 'wms', title: 'WMS' },
            { name: 'wmts', title: 'WMTS' },
            { name: 'wfs', title: 'WFS' },
            { name: 'mvt', title: 'MVT海量数据' },
            { name: 'postgis-load', title: 'PostGIS载入' },
            { name: 'czml', title: 'CZML' },
            { name: 'osm', title: 'OSM' },
            { name: 'point-cloud', title: '点云' },
            { name: 'postgis-edit', title: 'PostGIS编辑' },
            { name: 'bim', title: 'BIM' },
            { name: 'glb', title: 'GLB' },
            { name: 'video', title: '视频' },
        ],
    },
    {
        name: 'aaa',
        title: '测试',
        items: [
            { name: 'template', title: '模板' },
            { name: 'text1', title: '测试1' },
        ],
    },
].map((section) => ({
    ...section,
    items: section.items.map((item) => ({
        ...item,
        // 路径严格按规则自动生成，不接受任何手动输入
        path: `/cesium-function/${section.name}/${item.name}`,
        // 图片同步自动匹配
        image: getImage(item.name),
    })),
}))
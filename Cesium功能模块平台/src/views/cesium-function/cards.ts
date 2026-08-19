export interface FeatureCard {
    name: string
    title: string
    path?: string
    image?: string
}

export interface FeatureSection {
    name: string
    title: string
    items: FeatureCard[]
}

const imageModules = import.meta.glob('/src/assets/images/cesium-function/*.png', {
    eager: true,
    import: 'default',
}) as Record<string, string>

const getImage = (name: string) => imageModules[`/src/assets/images/cesium-function/${name}.png`]

export const sections: FeatureSection[] = [
    {
        name: 'default',
        title: '默认',
        items: [
            { name: 'default-imagery', title: '默认影像', path: '/cesium-function/default/default-imagery' },
            { name: 'default-terrain', title: '默认地形', path: '/cesium-function/default/default-terrain' },
            { name: 'default-osm', title: '默认OSM建筑', path: '/cesium-function/default/default-osm' },
            { name: 'text', title: '测试', path: '/cesium-function/default/text' }
        ],
    },
    {
        name: 'spatial-analysis',
        title: '空间分析',
        items: [
            { name: 'inundation-analysis', title: '淹没分析', path: '/cesium-function/spatial-analysis/inundation-analysis' },
            { name: 'viewshed-terrain-analysis', title: '可视域分析（地形）', path: '/cesium-function/spatial-analysis/viewshed-terrain-analysis' },
            { name: 'viewshed-model-analysis', title: '可视域分析（模型）', path: '/cesium-function/spatial-analysis/viewshed-model-analysis' },
            { name: 'contour-analysis', title: '等高线分析', path: '/cesium-function/spatial-analysis/contour-analysis' },
            { name: 'slope-analysis', title: '坡度分析', path: '/cesium-function/spatial-analysis/slope-analysis' },
            { name: 'aspect-analysis', title: '坡向分析', path: '/cesium-function/spatial-analysis/aspect-analysis' },
            { name: 'buffer-analysis', title: '缓冲区分析', path: '/cesium-function/spatial-analysis/buffer-analysis' },
            { name: 'semantic-highlighting', title: '语义着色', path: '/cesium-function/spatial-analysis/semantic-highlighting' },
            { name: 'visibility-analysis', title: '通视分析', path: '/cesium-function/spatial-analysis/visibility-analysis' },
            { name: 'flood-analysis', title: '水淹分析', path: '/cesium-function/spatial-analysis/flood-analysis' },
            { name: 'height-limit-analysis', title: '限高分析', path: '/cesium-function/spatial-analysis/height-limit-analysis' },
            { name: 'planing-analysis', title: '刨面分析', path: '/cesium-function/spatial-analysis/planing-analysis' },
            { name: 'terrain-excavation', title: '地形开挖', path: '/cesium-function/spatial-analysis/terrain-excavation' }
        ],
    },
    {
        name: 'measurement',
        title: '测量',
        items: [
            { name: 'coordinate-measurement', title: '坐标测量', path: '/cesium-function/measurement/coordinate-measurement' },
            { name: 'distance-measurement', title: '距离测量', path: '/cesium-function/measurement/distance-measurement' },
            { name: 'area-measurement', title: '面积测量', path: '/cesium-function/measurement/area-measurement' },

        ],
    },
    {
        name: 'effect',
        title: '特效',
        items: [
            { name: 'fog', title: '雾', path: '/cesium-function/effect/fog' },
            { name: 'rain', title: '雨', path: '/cesium-function/effect/rain' },
            { name: 'bloom-effect', title: '泛光特效', path: '/cesium-function/effect/bloom-effect' },
            { name: 'volumetric-cloud', title: '体积云', path: '/cesium-function/effect/volumetric-cloud' },

        ],
    },
    {
        name: 'data',
        title: '数据（需要外部数据）',
        items: [
            { name: 'nginx-3DTiles-load', title: 'nginx-3DTiles载入', path: '/cesium-function/data/nginx-3DTiles-load' },
            { name: 'building-tileset-optimize', title: '3DTiles性能优化', path: '/cesium-function/data/building-tileset-optimize' },
            { name: 'tianditu', title: '天地图', path: '/cesium-function/data/tianditu' },
            { name: 'wms', title: 'WMS', path: '/cesium-function/data/wms' },
            { name: 'wmts', title: 'WMTS', path: '/cesium-function/data/wmts' },
            { name: 'wfs', title: 'WFS', path: '/cesium-function/data/wfs' },
            { name: 'mvt', title: 'MVT海量数据', path: '/cesium-function/data/mvt' },
            { name: 'drawing-exporting-GeoJSON', title: 'GeoJSON绘制与导出', path: '/cesium-function/data/drawing-exporting-GeoJSON' },
            { name: 'postgis-load', title: 'PostGIS', path: '/cesium-function/data/postgis-load' },
        ]
    },
].map((section) => ({
    ...section,
    items: section.items.map((item) => ({
        ...item,
        image: getImage(item.name),
    })),
}))

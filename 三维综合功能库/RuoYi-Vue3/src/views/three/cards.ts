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

const imageModules = import.meta.glob('/src/assets/images/three/*.png', {
    eager: true,
    import: 'default',
}) as Record<string, string>

const getImage = (name: string) => imageModules[`/src/assets/images/three/${name}.png`]

export const sections: FeatureSection[] = [
    {
        name: 'model',
        title: '模型',
        items: [
            { name: 'model-rotation', title: '模型旋转' },
            { name: 'model-add-remove', title: '模型增删' },
            { name: 'basic-geometry', title: '基本几何体' },
            { name: 'advanced-geometry', title: '高级几何体' },
            { name: 'sprite', title: '精灵' },
            { name: 'points', title: '点' },
            { name: 'model-to-points', title: '模型转点' },
            { name: 'group', title: '组' },
            { name: 'instanced-mesh', title: '实例化网格' },
            { name: 'merge-geometry', title: '合并几何体' },
        ],
    },
    {
        name: 'edit',
        title: '编辑',
        items: [
            { name: 'controls', title: '控制器' },
            { name: 'select', title: '选择' },
            { name: 'drag', title: '拖拽' },
            { name: 'transform', title: '变换' },
            { name: 'coordinate-collection', title: '坐标采集' },
        ],
    },
    {
        name: 'environment',
        title: '环境',
        items: [
            { name: 'panorama-texture', title: '全景贴图' },
            { name: 'light-source', title: '光源' },
            { name: 'halo', title: '光晕' },
            { name: 'sound-source', title: '声源' },
        ],
    },
    {
        name: 'animation',
        title: '动画',
        items: [
            { name: 'camera-switch', title: '相机切换' },
            { name: 'sprite-parade', title: '精灵巡游' },
            { name: 'tween-animation', title: 'Tween动画' },
            { name: 'transform-animation', title: '变形动画' },
            { name: 'skin-animation', title: '蒙皮动画' },
        ],
    },
    {
        name: 'effect',
        title: '特效',
        items: [
            { name: 'model-material', title: '模型材质' },
            { name: 'line-material', title: '线材质' },
            { name: 'picture-texture', title: '贴图纹理' },
            { name: 'video-texture', title: '视频纹理' },
            { name: 'reflection-refraction', title: '反射 - 折射' },
            { name: 'realtime-reflection', title: '实时反射' },
            { name: 'pass', title: '通道' },
            { name: 'split-screen-pass', title: '分屏通道' },
            { name: 'passes', title: '多通道' },
            { name: 'custom-pass', title: '自定义通道' },
            { name: 'rain', title: '雨' },
        ],
    },
    {
        name: 'simulation',
        title: '模拟',
        items: [
            { name: 'object-falling', title: '物体下落' },
            { name: 'object-bouncing', title: '物体弹跳' },
            { name: 'domino', title: '多米诺骨牌' },
            { name: 'city-airdrop', title: '城市空投' },
            { name: 'chain', title: '链子' },
            { name: 'lever', title: '杠杆' },
        ],
    },
    {
        name: 'control',
        title: '操纵',
        items: [
            { name: 'third-fixed-person-control', title: '第三人称固定视角人物操控' },
            { name: 'third-flexible-person-control', title: '第三人称灵活视角人物操控' },
            { name: 'city-roaming', title: '城市漫游' },
        ],
    },
    {
        name: 'data',
        title: '数据',
        items: [
            { name: 'svg', title: 'SVG' },
            { name: 'json-text', title: 'JSON文字' },
            { name: 'troika-text', title: 'Troika文字' },
            { name: 'export-load-JSON', title: 'JSON导出载入' },
            { name: 'gltf', title: 'GLTF' },
            { name: 'obj-mtl', title: 'OBJ-MTL' },
            { name: 'lego-mpd', title: '乐高MPD' },
            { name: 'vox', title: 'VOX' },
            { name: 'pdb', title: 'PDB' },
            { name: 'points-ply', title: '点云PLY' }
        ],
    },
    {
        name: 'aaa',
        title: '测试',
        items: [
            { name: 'test1', title: '测试1' },
            { name: 'test2', title: '测试2' }
        ],
    },

].map((section) => ({
    ...section,
    items: section.items.map((item) => ({
        ...item,
        image: getImage(item.name),
        path: (item as FeatureCard).path ?? `/three/three-${section.name}/three-${item.name}`,
    })),
}))
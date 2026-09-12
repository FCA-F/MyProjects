import { useCesiumStore } from '@/stores/cesium.ts'
import * as Cesium from 'cesium'
export function initCesiumScene() {
    const cesiumStore = useCesiumStore()
    const viewer = cesiumStore.viewer as Cesium.Viewer
    const osmBuildingTile = cesiumStore.osmBuildingTile as Cesium.Cesium3DTileset

    initLayer(viewer)
    initBuildingStyle(osmBuildingTile)
}

const initLayer = (viewer: Cesium.Viewer) => {
    const tianditu_Token = '424afc8601af28396bb101c3eae3b754';  // ← 换成你申请的 Key
    const imgImageryLayer = new Cesium.WebMapTileServiceImageryProvider({
        url: `http://t0.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&tk=${tianditu_Token}`,
        layer: 'img',
        style: 'default',
        format: 'tiles',
        tileMatrixSetID: 'w',
        maximumLevel: 18,
        subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7']  // 8 个子域负载均衡
    });
    const ciaImageryLayer = new Cesium.WebMapTileServiceImageryProvider({
        url: `http://t0.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&tk=${tianditu_Token}`,
        layer: 'cva',
        style: 'default',
        format: 'tiles',
        tileMatrixSetID: 'w',
        maximumLevel: 18,
        subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7']  // 8 个子域负载均衡
    });
    viewer.imageryLayers.addImageryProvider(imgImageryLayer);
    viewer.imageryLayers.addImageryProvider(ciaImageryLayer)
}

const initBuildingStyle = (osmBuildingTile: Cesium.Cesium3DTileset) => {
    osmBuildingTile.showOutline = false
    const customShader = new Cesium.CustomShader({
        //不考虑光照模型
        lightingModel: Cesium.LightingModel.UNLIT,
        fragmentShaderText: `
        void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {  //参数：信息结构体、材质
            //周期高度
            float periodHeight = fract(czm_frameNumber / 5000.0) ;   //czm_frameNumber:Cesium 内置全局变量，每渲染1帧自动+1​,Shader 里唯一的时间基准（没有它就没法做动画）；fract:取小数部分
            //建筑
            float groundHeight = 80.0;   // 地面高度
            float gradientRange = 70.0;   // 高亮的范围
            float relativeHeight = fsInput.attributes.positionMC.z-groundHeight;  //像点高度-地面高度=像点相对高度
            float modelGray = relativeHeight / gradientRange + sin(periodHeight*czm_twoPi) * 0.1;    //底部暗，高处明，加上sin呼吸随机
           material.diffuse = mix(vec3(0.01, 0.05, 0.2), vec3(0.2, 0.6, 1.0), modelGray);   //material.diffuse：当前像素的“底色”，浅蓝与深蓝混合
            //光圈
            float haloMovementRange = 200.0;  // 光环的移动范围(高度)
            float haloRelativeHeight = clamp(relativeHeight / haloMovementRange, 0.0, 1.0);   //当前像素在光环活动范围内的相对位置
            float periodHeight101 = abs(periodHeight - 0.5) * 2.0;   //[0,1]->[1,0,1]，上升->上升+下降
            float isHalo = step(0.01, abs(haloRelativeHeight - periodHeight101)); //像素是否是光环，距离接近就是光环
            material.diffuse += material.diffuse*(1.0-isHalo);  //如果是光环，光环加亮
        }     
        `
        /*
        坐标系说明
            positionMC: 模型自身坐标（建模时的坐标）
        positionWC: 世界坐标（地球坐标）
        positionEC: 相机坐标
        */
    });
    //将定义好的着色器作用域建筑tilesets
    osmBuildingTile.style = undefined
    osmBuildingTile.customShader = customShader;
}
import * as Cesium from 'cesium'
interface InitCesiumBaseOptions {
    destination?: { lng: number, lat: number, height: number },
    orientation?: { heading: number, pitch: number, roll: number },
    terrain?: boolean,
    requestVertexNormals?: boolean
    osm?: boolean,
    depthTestAgainstTerrain?: boolean,
    enableCollisionDetection?: boolean,
    shadows?: boolean,
    enableLighting?: boolean,
    shouldAnimate?: boolean,
    debugShowFramesPerSecond?: boolean
}
//初始化viewer参数
export async function initCesiumBase(
    viewer: Cesium.Viewer, options: InitCesiumBaseOptions = {}) {
    const { destination, orientation, terrain, requestVertexNormals, osm, depthTestAgainstTerrain, enableCollisionDetection, shadows, enableLighting, shouldAnimate, debugShowFramesPerSecond } = options
    let terrainProvider: Cesium.TerrainProvider | undefined
    let osmBuildings: Cesium.Cesium3DTileset | undefined

    initLayer(viewer)

    try {
        //目的地
        if (destination) {
            //有朝向
            if (orientation) {
                viewer.camera.setView({
                    destination: Cesium.Cartesian3.fromDegrees(
                        destination.lng,
                        destination.lat,
                        destination.height
                    ),
                    orientation: {
                        heading: Cesium.Math.toRadians(orientation.heading),
                        pitch: Cesium.Math.toRadians(orientation.pitch),
                        roll: Cesium.Math.toRadians(orientation.roll)
                    }
                })
            }
            //无朝向
            else {
                viewer.camera.setView({
                    destination: Cesium.Cartesian3.fromDegrees(
                        destination.lng,
                        destination.lat,
                        destination.height
                    )
                })
            }
        }
        //地形
        if (terrain) {
            if (requestVertexNormals)
                terrainProvider = await Cesium.createWorldTerrainAsync({ requestVertexNormals: true })
            else
                terrainProvider = await Cesium.createWorldTerrainAsync()
            viewer.terrainProvider = terrainProvider
        }
        //osm
        if (osm) {
            //osmBuildings = await Cesium.Cesium3DTileset.fromUrl("http://localhost:82/jinan_OSM/tileset.json")
            osmBuildings = await Cesium.createOsmBuildingsAsync()
            viewer.scene.primitives.add(osmBuildings)
            osmBuildings.showOutline = false


        }
        //深度测试
        viewer.scene.globe.depthTestAgainstTerrain = depthTestAgainstTerrain ?? false
        //地下模式
        viewer.scene.screenSpaceCameraController.enableCollisionDetection = enableCollisionDetection ?? true
        //阴影
        viewer.shadows = shadows ?? false
        //光照
        viewer.scene.globe.enableLighting = enableLighting ?? false
        //时间
        viewer.clock.shouldAnimate = shouldAnimate ?? false
        //帧率显示
        viewer.scene.debugShowFramesPerSecond = debugShowFramesPerSecond ?? false
        return { terrainProvider: terrainProvider, osmBuildings: osmBuildings }
    }
    catch (e) {
        console.log('Viewer参数初始化失败!')
    }
}

const initLayer = (viewer: Cesium.Viewer) => {
    const tianditu_Token = '';  // ← 换成你申请的 Key
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
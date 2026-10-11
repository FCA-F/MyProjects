// stores/cesium.ts
import { defineStore } from 'pinia'
import { ref, shallowRef, watch } from 'vue'
import * as Cesium from 'cesium'

export const useCesiumStore = defineStore('cesium', () => {
    // ========== state ==========
    const viewer = shallowRef<Cesium.Viewer | undefined>(undefined)
    const terrain = shallowRef<Cesium.TerrainProvider | undefined>(undefined)
    const osmBuildingTile = shallowRef<Cesium.Cesium3DTileset | undefined>(undefined)
    const annotations = shallowRef<Cesium.LabelCollection | undefined>(undefined)
    const viewerPosition = ref({ x: 117.0183, y: 36.6772, z: 8000 })
    // 地形开关（给工具栏用，自动同步）
    const isTerrain = ref(false)

    // ========== actions ==========
    const initViewer = async (containerId: string) => {
        Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxYTdiYzE2NC1lOTkyLTQyZmEtYWIxNy1kYzUyOWEzZWI5ODAiLCJpZCI6NDEzOTI0LCJpYXQiOjE3NzUzNTc3MzZ9.GKTAtYPpDqexLD4sF7vBfZx_1NbTsqh26FImdc4HWkY'

        const v = new Cesium.Viewer(containerId, {
            geocoder: false,
            homeButton: false,
            sceneModePicker: false,
            baseLayerPicker: false,
            navigationHelpButton: false,
            animation: false,
            timeline: false,
            fullscreenButton: false,
        });
        (v.cesiumWidget.creditContainer as any).style.display = "none";//关掉cesium标识
        v.scene.globe.depthTestAgainstTerrain = true

        // 标签
        const ann = v.scene.primitives.add(new Cesium.LabelCollection())

        // 地形
        const t = await Cesium.createWorldTerrainAsync({ requestVertexNormals: true })
        //v.terrainProvider = t

        // OSM建筑
        const osm = await Cesium.Cesium3DTileset.fromUrl("http://localhost:82/jinan_OSM/tileset.json")
        v.scene.primitives.add(osm)

        // 视角
        v.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(
                viewerPosition.value.x,
                viewerPosition.value.y,
                viewerPosition.value.z
            )
        })

        // 写入 state
        viewer.value = v
        terrain.value = t
        osmBuildingTile.value = osm
        annotations.value = ann
        isTerrain.value = false // 初始化时地形是开的
    }

    const destroyViewer = () => {
        if (viewer.value) {
            viewer.value.destroy()
        }
        viewer.value = undefined
        terrain.value = undefined
        osmBuildingTile.value = undefined
        annotations.value = undefined
        isTerrain.value = false
    }


    watch(isTerrain, async () => {
        if (!viewer.value) return
        if (isTerrain.value) {
            viewer.value.scene.globe.depthTestAgainstTerrain = true
            const t = await Cesium.createWorldTerrainAsync({ requestVertexNormals: true })
            viewer.value.terrainProvider = t
            terrain.value = t
        } else {
            viewer.value.scene.globe.depthTestAgainstTerrain = false
            viewer.value.terrainProvider = new Cesium.EllipsoidTerrainProvider()
            terrain.value = undefined
        }
    })

    return {
        viewer,
        terrain,
        osmBuildingTile,
        annotations,
        viewerPosition,
        isTerrain,
        initViewer,
        destroyViewer,
    }
})
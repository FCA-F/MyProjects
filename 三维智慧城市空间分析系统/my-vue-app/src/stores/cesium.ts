import {defineStore} from 'pinia'
import {shallowRef} from 'vue'
import * as Cesium from 'cesium'
export const useCesiumStore=defineStore('cesium',{
    state:()=>({
        viewer:shallowRef<Cesium.Viewer|undefined>(undefined),
        terrain:shallowRef<Cesium.TerrainProvider|undefined>(undefined),
        osmBuildingTile:shallowRef<Cesium.Cesium3DTileset|undefined>(undefined),
        annotations:shallowRef<Cesium.LabelCollection|undefined>(undefined)
    }),
    actions:{
        async initViewer(containerId:string){
            let viewer:Cesium.Viewer;
            let terrain:Cesium.TerrainProvider;
            let osmBuildingTile:Cesium.Cesium3DTileset;
            let annotations:Cesium.LabelCollection;

            Cesium.Ion.defaultAccessToken='您的Token';
            viewer=new Cesium.Viewer(containerId,{
                geocoder:false,
                homeButton:false,
                sceneModePicker:false,
                baseLayerPicker:false,
                navigationHelpButton:false,
                animation:false,
                timeline:false,
                fullscreenButton:false,
                //contextOptions:{webgl:{preserveDrawingBuffer:true}}//截图设置
                });
            viewer.scene.globe.depthTestAgainstTerrain=true;
            annotations=viewer.scene.primitives.add(new Cesium.LabelCollection());//标签对象
            terrain=await Cesium.createWorldTerrainAsync({requestVertexNormals:true});//坡度坡向设置：requestVertexNormals:true
            osmBuildingTile=await Cesium.createOsmBuildingsAsync();
            viewer.terrainProvider=terrain;
            viewer.scene.primitives.add(osmBuildingTile);
            viewer.camera.setView({destination:Cesium.Cartesian3.fromDegrees(114.39564,30.52214,2000)});

            this.viewer=viewer;
            this.terrain=terrain;
            this.osmBuildingTile=osmBuildingTile;
            this.annotations=annotations;
        },
        destoryViewer(){
            if(this.viewer){
                this.viewer.destroy();
            }
            this.viewer=undefined
            this.terrain=undefined
            this.osmBuildingTile=undefined
            this.annotations=undefined
        }
    }
})
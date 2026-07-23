import {defineStore} from 'pinia'
import {shallowRef} from 'vue'
import * as Cesium from 'cesium'

export const useCesiumStore=defineStore('cesium',{
    state:()=>({
        viewer:shallowRef<Cesium.Viewer|undefined>(undefined),
        terrain:shallowRef<Cesium.TerrainProvider|undefined>(undefined),
        osmBuildingTile:shallowRef<Cesium.Cesium3DTileset|undefined>(undefined),
        annotations:shallowRef<Cesium.LabelCollection|undefined>(undefined),
        viewerPosition:{x:114.39564,y:30.52214,z:2000}
    }),
    actions:{
        async initViewer(containerId:string){
            let viewer:Cesium.Viewer;
            let terrain:Cesium.TerrainProvider;
            let osmBuildingTile:Cesium.Cesium3DTileset;
            let annotations:Cesium.LabelCollection;

            Cesium.Ion.defaultAccessToken='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxYTdiYzE2NC1lOTkyLTQyZmEtYWIxNy1kYzUyOWEzZWI5ODAiLCJpZCI6NDEzOTI0LCJpYXQiOjE3NzUzNTc3MzZ9.GKTAtYPpDqexLD4sF7vBfZx_1NbTsqh26FImdc4HWkY';
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
            viewer.camera.setView({destination:Cesium.Cartesian3.fromDegrees(
                this.viewerPosition.x,this.viewerPosition.y,this.viewerPosition.z
            )});
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
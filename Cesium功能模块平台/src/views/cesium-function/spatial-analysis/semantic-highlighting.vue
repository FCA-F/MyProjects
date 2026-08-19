<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady"/>
        <DraggableModal title="语义着色" v-if="osmBuildings">
            <div class="row">
                <label class="label">着色类型</label>
                <el-select v-model="colorStyle" placeholder="请选择类型" class="input">
                    <el-option 
                        v-for="item in colorOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                    />
                </el-select>
            </div>
            <div v-if="colorStyle=='colorByBuildingDistance'">
                <div class="row">
                    <label class="label">距离(米)</label>
                    <el-input v-model="distance" class="input"></el-input>
                </div>
            </div>
            <div v-if="colorStyle=='colorByBuildingType'">
                <div class="row">
                    <label class="label">属性类型</label>
                    <el-select v-model="showBuildingType" class="input">
                        <el-option 
                            v-for="item in buildingsTypeOptions"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value"
                        />
                    </el-select>
                </div>
            </div>
            
        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import {initCesiumBase} from '@/utils/cesium'
import { ElMessage } from 'element-plus'
import '@/components/Common/draggable-modal.css'

let viewer:Cesium.Viewer
let osmBuildings=shallowRef<Cesium.Cesium3DTileset>()
let handler:Cesium.ScreenSpaceEventHandler

const showBuildingType=ref('residential')
const colorStyle=ref<string>();
const distance=ref(500)

const onMapReady=async (cesiumViewer:Cesium.Viewer)=>{
    viewer=cesiumViewer
    handler=new Cesium.ScreenSpaceEventHandler(viewer.canvas);

    let initResult=await initCesiumBase(viewer,{
        destination:{lng: 114.407404963,lat: 30.50721243,height:1000},
        orientation:{heading:185,pitch:-30,roll:0},
        terrain:true,
        osm:true,
        depthTestAgainstTerrain:true,
    })
    osmBuildings.value=initResult!.osmBuildings!
}


const colorOptions=[
    {value:'null',label:''},
    {value:'colorBycolorStyle',label:'建筑类型着色'},
    {value:'colorByBuildingDistance',label:'位置距离着色'},
    {value:'interactiveRendering',label:'交互着色'},
    {value:'colorByBuildingType',label:'属性着色'}
]

const buildingsTypeOptions=[
    {value:'null',label:''},
    {value:'residential',label:'住宅'},
    {value:'commercial',label:'商场'},
    {value:'retail',label:'商店'},
    {value:'dormitory',label:'宿舍'},

]

watch(colorStyle,(colorStyle)=>{
    handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);

    osmBuildings.value!.style=new Cesium.Cesium3DTileStyle();

    switch(colorStyle)
    {
        case 'null':
            break;
        case 'colorBycolorStyle':
            colorBycolorStyle();break;
        case 'colorByBuildingDistance':
            colorByBuildingDistance();break;
        case 'interactiveRendering':
            interactiveRendering();break;
        case 'colorByBuildingType':
            colorByBuildingType();break;
        default:break;
    }
})
watch(showBuildingType,(showBuildingType)=>{
    colorByBuildingType()
})
//按建筑类型设置颜色
const colorBycolorStyle=()=>
{
    let style=new Cesium.Cesium3DTileStyle({
        color:{
            conditions:[
                ["${feature['building']}==='residential'","color('purple')"],
                ["${feature['building']}==='university'","color('red')"],
                ["${feature['building']}==='dormitory'","color('yellow')"],
                ["${feature['building']}==='yes'","color('green')"],
                ["true","color('pink')"]
            ]
                
        }
    })
    osmBuildings.value!.style=style;
}
//按指定位置的距离选择颜色
const colorByBuildingDistance=()=>
{
    ElMessage.primary( '请点击建筑进行着色')
    handler.setInputAction((event:Cesium.ScreenSpaceEventHandler.PositionedEvent)=>{
        let pickFeature=viewer.scene.pick(event.position);
        if(!(pickFeature instanceof Cesium.Cesium3DTileFeature))
        return;
        let pickFeatureLon=parseFloat(pickFeature.getProperty("cesium#longitude"));
        let pickFeatureLat=parseFloat(pickFeature.getProperty("cesium#latitude"));

         // 将经纬度差近似换算成米
        const metersPerLongitudeDegree=
                111320*Math.cos(
                    Cesium.Math.toRadians(pickFeatureLat)
                );
        const metersPerLatitudeDegree=110540;

        const longitudeMeters="(${feature['cesium#longitude']}-"+pickFeatureLon+")*"+metersPerLongitudeDegree
        const latitudeMeters="(${feature['cesium#latitude']} - " +pickFeatureLat +") * " +metersPerLatitudeDegree
        let style=new Cesium.Cesium3DTileStyle({
            defines:{
                distanceMeters:
                    "sqrt("+longitudeMeters+"*"+longitudeMeters+"+"+latitudeMeters+"*"+latitudeMeters+")",
            },
            color:{
                conditions:[
                    ["${distanceMeters}>="+distance.value*4,"color('black')"],
                    ["${distanceMeters}>="+distance.value*3,"color('blue')"],
                    ["${distanceMeters}>="+distance.value*2,"color('green')"],
                    ["${distanceMeters}>="+distance.value,"color('yellow')"],
                    ["true","color('red')"]
                ]
            }
        });
        osmBuildings.value!.style=style;
    },Cesium.ScreenSpaceEventType.LEFT_CLICK);
}
//交互渲染
const interactiveRendering=()=>
{
    ElMessage.primary( '请点击建筑进行着色')
    handler.setInputAction((event:Cesium.ScreenSpaceEventHandler.PositionedEvent)=>{
        let pickFeature=viewer.scene.pick(event.position);
        if(!(pickFeature instanceof Cesium.Cesium3DTileFeature))
        return;
        let pickFeatureElementId=pickFeature.getProperty('elementId');
        let style=new Cesium.Cesium3DTileStyle({
            color:{
                conditions:[
                    ["${feature['elementId']}==="+pickFeatureElementId,"color('red')"]
                ]
            }
        })
        osmBuildings.value!.style=style;
    },Cesium.ScreenSpaceEventType.LEFT_CLICK);
}
//根据建筑属性着色
const colorByBuildingType=()=>
{
    let style=new Cesium.Cesium3DTileStyle({
        color:{
            conditions:[
                ["${feature['building']}==="+"'"+showBuildingType.value+"'","color('red')"]
            ]
        }
    });
    osmBuildings.value!.style=style;
}


onUnmounted(()=>{
    handler.destroy();
})

</script>
<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>
<template>
    <div class="toolbar">
        <div class="oneText">建筑着色</div>
        <el-select v-model="buildingStyle" class="select" placeholder="请选择类型">
            <el-option 
            v-for="item in options"
            :key="item.value"
            :label="item.label"
            :value="item.value"
            />
        </el-select>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import {ref,watch,onMounted,onUnmounted} from 'vue'
import {useCesiumStore} from '../../stores/cesium.ts'

const cesiumStore=useCesiumStore();
const viewer=cesiumStore.viewer as Cesium.Viewer;
const osmBuildingTile=cesiumStore.osmBuildingTile as Cesium.Cesium3DTileset;

const buildingStyle=ref<string>();
const options=[
    {value:'null',label:''},
    {value:'按建筑类型着色',label:'按建筑类型着色'},
    {value:'按指定位置的距离着色',label:'按指定位置的距离着色'},
    {value:'交互着色',label:'交互着色'},
    {value:'building属性为dormitory',label:'building属性为dormitory'}
]

let handler:Cesium.ScreenSpaceEventHandler;

onMounted(()=>{
    handler=new Cesium.ScreenSpaceEventHandler(viewer.canvas);
})

watch(buildingStyle,(buildingStyle)=>{
    try{
        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    }
    catch(e){};

    switch(buildingStyle)
    {
        case 'null':
            osmBuildingTile.style=new Cesium.Cesium3DTileStyle();break;
        case '按建筑类型着色':
            colorByBuildingStyle();break;
        case '按指定位置的距离着色':
            colorByBuildingDistance();break;
        case '交互着色':
            interactiveRendering();break;
        case 'building属性为dormitory':
            showBybuildingType('dormitory');break;
        default:break;
    }
})
//按建筑类型设置颜色
const colorByBuildingStyle=()=>
{
    let style=new Cesium.Cesium3DTileStyle({
        color:{
            conditions:[
                ["${feature['building']}==='university'","color('red')"],
                ["${feature['building']}==='dormitory'","color('yellow')"],
                ["${feature['building']}==='residential'","color('purple')"],
                ["${feature['building']}==='yes'","color('green')"],
                ["true","color('pink')"]
            ]
                
        }
    })
    osmBuildingTile.style=style;
}
//按指定位置的距离选择颜色
const colorByBuildingDistance=()=>
{
    handler.setInputAction(function (event:Cesium.ScreenSpaceEventHandler.PositionedEvent){
        let pickFeature=viewer.scene.pick(event.position);
        if(!(pickFeature instanceof Cesium.Cesium3DTileFeature))
        return;
        let pickFeatureLon=parseFloat(pickFeature.getProperty("cesium#longitude"));
        let pickFeatureLat=parseFloat(pickFeature.getProperty("cesium#latitude"));
        let style=new Cesium.Cesium3DTileStyle({
            defines:{
                distance:
                    "distance(vec2(${feature['cesium#longitude']},${feature['cesium#latitude']}),vec2("+
                    pickFeatureLon+","+pickFeatureLat+"))"
                    },
            color:{
                conditions:[
                    ["${distance}>0.014","color('red')"],
                    ["${distance}>0.010","color('yellow')"],
                    ["${distance}>0.006","color('green')"],
                    ["${distance}>0.001","color('blue')"],
                    ["true","color('black')"]
                ]
            }
        });
        osmBuildingTile.style=style;
    },Cesium.ScreenSpaceEventType.LEFT_CLICK);
}
//交互渲染
const interactiveRendering=()=>
{
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
        osmBuildingTile.style=style;
    },Cesium.ScreenSpaceEventType.LEFT_CLICK);
}
//building属性为dormitory
const showBybuildingType=(showBuildingType:string)=>
{
    let style=new Cesium.Cesium3DTileStyle({
        color:{
            conditions:[
                ["${feature['building']}==="+"'"+showBuildingType+"'","color('red')"]
            ]
        }
    });
    osmBuildingTile.style=style;
}

onUnmounted(()=>
{
    if(handler)
    handler.destroy();
})

</script>
<style scoped>
    .toolbar {
    display: flex;
    flex-direction: column;
    gap:6px;
    }
    .oneText{text-align:center;
    font-size:20px;
    font-weight:600; /* 加粗 */
    color:#45a0eb; /* 浅蓝，和顶部系统标题同色系、略浅一点 */
    margin-bottom:8px;
    }
    .select{width:350px;height:24px}
</style>
<template>
    <div class="toolbar">
        <label class="oneText">建筑着色</label>
        <select v-model="buildingStyle" class="select input">
            <option value="null"></option>
            <option value="按建筑类型着色">按建筑类型着色</option>
            <option value="按指定位置的距离着色">按指定位置的距离着色</option>
            <option value="交互着色">交互着色</option>
            <option value="building属性为dormitory">building属性为dormitory</option>
        </select>
    </div>
</template>

<script setup>
import * as Cesium from 'cesium'
import {ref,watch,onMounted,onUnmounted} from 'vue'

const props=defineProps({viewer:{type:Object,required:true},osmBuildingTile:{type:Object,required:true}});
const viewer=props.viewer;
const osmBuildingTile=props.osmBuildingTile;

const buildingStyle=ref();

let handler;

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
    handler.setInputAction(function (event){
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
    handler.setInputAction(function (event){
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
const showBybuildingType=(showBuildingType)=>
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
    .select{width:250px;height:24px}
</style>
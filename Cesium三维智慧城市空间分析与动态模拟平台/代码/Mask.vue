<template>
    <div class="toolbar">
        <button @click="drawMask()" :class="['functionBtn',isMask?'red':'']">遮罩</button>
    </div>
</template>
<script setup>
import * as Cesium from 'cesium'
import {ref} from 'vue'

const props=defineProps({viewer:{type:Object,required:true}});
const viewer=props.viewer;

const isMask=ref(false);

let outPositions=Cesium.Cartesian3.fromDegreesArray([
    114.3815897138, 30.5293157082,
    114.4222129992, 30.5215044975, 
    114.4169151630, 30.4986448451,
    114.3738463718, 30.5077117652,
    114.3815897138, 30.5293157082  
])
let inPositions=Cesium.Cartesian3.fromDegreesArray([
    114.3951448863, 30.5174477974,
    114.3988386722, 30.5174379468, 
    114.3987966663, 30.5144658150, 
    114.3946572094, 30.5154496278,
    114.3951448863, 30.5174477974
])

let mask,maskPolyline;
const drawMask=()=>
{
    if(!isMask.value)
    {
        isMask.value=true;

        //遮罩
        mask=viewer.entities.add({
            polygon:{
                hierarchy:{
                    positions:outPositions,
                    holes:[{positions:inPositions}]
                },
                material:Cesium.Color.BLACK.withAlpha(0.7),
                fill:true,
            }
        })
        //内轮廓线
        maskPolyline=viewer.entities.add({
            polyline:{
                positions:inPositions,
                width:5,
                material:Cesium.Color.RED,
            }
        })
    }
    else
    {
        isMask.value=false;

        viewer.entities.remove(mask);
        viewer.entities.remove(maskPolyline);
    }
}

</script>
<style scoped>

</style>
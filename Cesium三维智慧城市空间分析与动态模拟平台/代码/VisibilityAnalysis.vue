<template>
    <div class="toolbar">
        <div class="row">
            <label class="oneText">通视分析</label>
            <button @click="drawPolyline" :class="['drawBtn',isDraw?'red':'']">绘制</button>
        </div>
    </div>
</template>
<script setup>
import * as Cesium from 'cesium'
import {ref,onMounted,onUnmounted} from 'vue'

const props=defineProps({viewer:{type:Object,required:true}});
const viewer=props.viewer;

const isDraw=ref(false);
let positions=[];
let handler;

onMounted(()=>{
    handler=new Cesium.ScreenSpaceEventHandler(viewer.canvas);
})

const drawPolyline=()=>
{
    if(!isDraw.value)
    {
        isDraw.value=true;

        handler.setInputAction((event)=>{
            let pickPosition=viewer.scene.pickPosition(event.position);
            if(!Cesium.defined(pickPosition))
            return;
            drawPoint(pickPosition);
            if(positions.length==0)
            {
                positions.push(pickPosition);
            }
            else if(positions.length==1)
            {
                positions.push(pickPosition);
                selectPolyine(positions);
                positions=[];
            }
        },Cesium.ScreenSpaceEventType.LEFT_CLICK);
    }
    else
    {
        isDraw.value=false;

        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    }
}

const selectPolyine=(positions)=>
{
    let subtract=Cesium.Cartesian3.subtract(positions[1],positions[0],new Cesium.Cartesian3());
    let direction=Cesium.Cartesian3.normalize(subtract,new Cesium.Cartesian3());
    let ray=new Cesium.Ray(positions[0],direction);
    let pickObject=viewer.scene.pickFromRay(ray,[]);
    let middlePoint;
    if(Cesium.defined(pickObject))
    middlePoint=pickObject.position;
    if(middlePoint==undefined||
        Cesium.Cartesian3.distance(positions[0],middlePoint)>Cesium.Cartesian3.distance(positions[0],positions[1])
    )
    {
        addPolyline(positions[0],positions[1],'GREEN');
    }
    else
    {
        addPolyline(positions[0],middlePoint,'GREEN');
        addPolyline(middlePoint,positions[1],'RED');
    }
}

const addPolyline=(point1,point2,color)=>
{
    let positions=[point1,point2];
    viewer.entities.add({
        polyline:{
            positions:positions,
            material:Cesium.Color[color],
            width:6,
            depthFailMaterial:Cesium.Color[color]
        }
    })
}

const drawPoint=(position)=>
{
    viewer.entities.add({
        position:position,
        point:{
            pixelSize:8,
            color:Cesium.Color.YELLOW,
            disableDepthTestDistance:Number.POSITIVE_INFINITY
        }
    })
}

onUnmounted(()=>
{
    handler.destroy();
})

</script>
<style scoped>
</style>
<template>
    <div class="toolbar">
        <div class="row">
            <label class="oneText">通视分析</label>
            <button @click="drawPolyline" :class="['drawBtn',isDraw?'red':'']">绘制</button>
        </div>
    </div>
</template>
<script setup lang="ts">
import * as Cesium from 'cesium'
import {ref,onMounted,onUnmounted} from 'vue'

const {viewer}=defineProps<{viewer:Cesium.Viewer}>();

const isDraw=ref(false);
let positions:Cesium.Cartesian3[]=[];
let handler:Cesium.ScreenSpaceEventHandler;

onMounted(()=>{
    handler=new Cesium.ScreenSpaceEventHandler(viewer.canvas);
})

const drawPolyline=()=>
{
    if(!isDraw.value)
    {
        isDraw.value=true;

        handler.setInputAction((event:Cesium.ScreenSpaceEventHandler.PositionedEvent)=>{
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

const selectPolyine=(positions:Cesium.Cartesian3[])=>
{
    let subtract=Cesium.Cartesian3.subtract(positions[1],positions[0],new Cesium.Cartesian3());
    let direction=Cesium.Cartesian3.normalize(subtract,new Cesium.Cartesian3());
    let ray=new Cesium.Ray(positions[0],direction);
    let pickObject=(viewer.scene as any).pickFromRay(ray,[]);
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

const addPolyline=(point1:Cesium.Cartesian3,point2:Cesium.Cartesian3,color:keyof typeof Cesium.Color)=>//keyof:取所有键,typeof:取类型
{
    let positions=[point1,point2];
    viewer.entities.add({
        polyline:{
            positions:positions,
            material:Cesium.Color[color] as Cesium.Color,
            width:6,
            depthFailMaterial:Cesium.Color[color] as Cesium.Color
        }
    })
}

const drawPoint=(position:Cesium.Cartesian3)=>
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
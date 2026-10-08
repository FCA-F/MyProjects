<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady"/>
        <DraggableModal title="地形开挖">
           <div class="row">
                <el-button
                    class="draw-button"
                    :color="isDraw ? 'red' : 'greenyellow'"
                    @click="switchDraw"
                >
                    {{ isDraw ? '结束绘制' : '绘制范围' }}
                </el-button>
            </div>
            <div class="row">
                <label class="label">开挖深度</label>
                <el-input v-model="excavateDepth" class="input"/>
                <label class="label-end">米</label>
            </div>
            <div class="row">
                <el-button @click="runAnalysis()" color="#1E88E5" class="draw-button">分析</el-button>
            </div>
        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import {initCesiumBase} from '@/utils/cesium'
import { ElMessage } from 'element-plus';
import '@/components/Common/draggable-modal.css'

let viewer:Cesium.Viewer
let handler:Cesium.ScreenSpaceEventHandler

const isDraw=ref<boolean>(false)
const excavateDepth=ref<number>(200)

let regionCartesians:Cesium.Cartesian3[]//区域点坐标
let regionPolygon:Cesium.Entity|undefined//区域面实体
let regionPolyline:Cesium.Entity|undefined//区域边界线
let excavatePolygons:Cesium.Entity[]=[]
let sampledPoints:Cesium.Cartesian3[]=[]

let bottomHeight:number

const onMapReady=(cesiumViewer:Cesium.Viewer)=>{
    viewer=cesiumViewer
    handler=new Cesium.ScreenSpaceEventHandler(viewer.canvas)

    initCesiumBase(viewer,{
        destination:{lng:117.12043,lat:36.68173,height:2000},
        orientation:{heading:140,pitch:-30,roll:0},
        terrain:true,
        depthTestAgainstTerrain:true,
    })
}

const switchDraw=()=>{
    if(isDraw.value){
        isDraw.value=false
        closeDraw()
    }
    else{
        isDraw.value=true
        openDraw()
    }
}

const openDraw=()=>{
    clearData()
    let activePositions:Cesium.Cartesian3[]=[]
    let dynamicPositions:Cesium.CallbackProperty|undefined
    let dynamicShape:Cesium.Entity|undefined
    let isMouse=false

    handler.setInputAction((event:Cesium.ScreenSpaceEventHandler.PositionedEvent)=>{
        let pickPosition=viewer.scene.pickPosition(event.position);
        if(!Cesium.defined(pickPosition))
        return;
        if(!activePositions.length)
        {
            isMouse=true;
            activePositions.push(pickPosition);
            dynamicPositions=new Cesium.CallbackProperty(
                ()=>{return new Cesium.PolygonHierarchy(activePositions)},false);
            dynamicShape=drawPolygon(dynamicPositions);
        }
        else
        {
            activePositions.push(pickPosition)         
        }
    },Cesium.ScreenSpaceEventType.LEFT_CLICK)

    //移动追踪绘制（移动）
    handler.setInputAction((event:Cesium.ScreenSpaceEventHandler.MotionEvent)=>{
        if(!isMouse)
        return;
        let pickPosition=viewer.scene.pickPosition(event.endPosition);
        if(!Cesium.defined(pickPosition))
        return;
        if(activePositions.length>1)
        activePositions.pop();
        activePositions.push(pickPosition);
    },Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    //确认，终止（右键）
    handler.setInputAction(()=>{
        activePositions.pop();
        if(activePositions.length<3) return

        activePositions.push(activePositions[0])//闭合

        //把区域赋值
        regionCartesians=activePositions
        regionPolyline=drawPolyline(activePositions)
        regionPolygon=drawPolygon(new Cesium.PolygonHierarchy(activePositions));

        viewer.entities.remove(dynamicShape!);
        isMouse=false;
        activePositions=[];
        dynamicShape=undefined;
        dynamicPositions=undefined
        closeDraw()
        
    },Cesium.ScreenSpaceEventType.RIGHT_CLICK);

    //绘制面
    const drawPolygon=(positions:Cesium.PolygonHierarchy|Cesium.CallbackProperty)=>
    {
        let polygon=viewer.entities.add({
            polygon:{
                hierarchy:positions,
                material:Cesium.Color.RED.withAlpha(0.5)
            }
        })
        return polygon;
    }

    //绘制边界线
    const drawPolyline=(positions:Cesium.Cartesian3[])=>{
        let polyline=viewer.entities.add({
            polyline:{
                positions:positions,
                width:3,
                material:Cesium.Color.BLUE.withAlpha(0.8),
                clampToGround:true,
            }
        })
        return polyline
    }
}

const closeDraw=()=>{
    isDraw.value=false
    handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
}

const clearData=()=>{
    viewer.scene.globe.clippingPlanes=undefined as any
    excavatePolygons.map(entity=>viewer.entities.remove(entity))
    viewer.entities.remove(regionPolygon!)
    viewer.entities.remove(regionPolyline!)
    bottomHeight=Infinity
    sampledPoints=[]
    excavatePolygons=[]
}

const runAnalysis=()=>{

    if(regionCartesians.length<3){
        ElMessage.warning('未绘制区域')
        return
    }
    //清除
    clearData()
    
    excavateTerrain()//挖地形
    createSampledPoints(regionCartesians)//获取插值采样点以及最小高度
    drawbottom()//绘制坑底
    drawWall()//绘制坑壁
}
//挖地形
const excavateTerrain=()=>{
    if(regionCartesians.length<3) return
    let clippingPlanes:Cesium.ClippingPlane[]=[]//挖掘面
    for(let i=0;i<regionCartesians.length-1;i++){
        let point1=regionCartesians[i]
        let point2=regionCartesians[i+1]

        let midPoint=Cesium.Cartesian3.midpoint(point1,point2,new Cesium.Cartesian3())//中点，地心到中点，上方向
        let up=Cesium.Cartesian3.normalize(midPoint,new Cesium.Cartesian3())

        let right=Cesium.Cartesian3.subtract(point2,point1,new Cesium.Cartesian3())//右方向
        right=Cesium.Cartesian3.normalize(right,new Cesium.Cartesian3())

        let normal=Cesium.Cartesian3.cross(right,up,new Cesium.Cartesian3())//垂直于up和right，指向坑内
        normal=Cesium.Cartesian3.normalize(normal,new Cesium.Cartesian3())

        let originPlane=new Cesium.Plane(normal,0)//数学平面（方向，距地心距离）
        let distance=Cesium.Plane.getPointDistance(originPlane,midPoint)//距离

        clippingPlanes.push(new Cesium.ClippingPlane(normal,distance))////数学平面（方向，距地心距离）->坑侧面
    }
    viewer.scene.globe.clippingPlanes=new Cesium.ClippingPlaneCollection({
        planes:clippingPlanes,
        edgeWidth:1,
        edgeColor:Cesium.Color.ORANGE
    })
}
//获取采样点以及最小高度
const createSampledPoints=(positions:Cesium.Cartesian3[])=>{
    //console.log(positions)
    if(positions.length<=2) return

    bottomHeight=Infinity//坑底高度

    for(let i=0;i<positions.length-1;i++){
        let position1=positions[i]//当前点
        let position2=positions[i+1]//下一个点
        
        let spline=new Cesium.LinearSpline({//线性插值工具
            times:[0,1],//参数范围：当 t = 0 时对应 position1，t = 1 时对应 position2
            points:[position1,position2]//线的起点和终点
        })
        for(let j=0;j<150;j++){//采样150个点
            let cartesian=spline.evaluate(j/150) as Cesium.Cartesian3//插值坐标
            //获取高程
            let cartographic=Cesium.Cartographic.fromCartesian(cartesian)
            cartographic.height=viewer.scene.globe.getHeight(cartographic) as number
            cartesian=Cesium.Cartesian3.fromRadians(cartographic.longitude,cartographic.latitude,cartographic.height)

            sampledPoints.push(cartesian)
            bottomHeight=Math.min(bottomHeight,cartographic.height)
        }
    }
    bottomHeight-=excavateDepth.value//最低深度-开挖深度
    sampledPoints.push(sampledPoints[0])//闭合
}

//绘制坑底
const drawbottom=()=>{
    let bottomCartesian3=regionCartesians.map(cartesian=>{
        let cartographic=Cesium.Cartographic.fromCartesian(cartesian)
        cartographic.height=bottomHeight
        cartesian=Cesium.Cartesian3.fromRadians(cartographic.longitude,cartographic.latitude,cartographic.height)
        return cartesian
    })
    excavatePolygons.push(viewer.entities.add({
        polygon:{
            hierarchy:new Cesium.PolygonHierarchy(bottomCartesian3),
            material: Cesium.Color.fromCssColorString('#7b6547'),
            perPositionHeight:true
        }
    }))
}
//绘制坑壁
const drawWall=()=>{
    for(let i=0;i<sampledPoints.length-1;i++){
        let cartographic1=Cesium.Cartographic.fromCartesian(sampledPoints[i])
        let cartographic2=Cesium.Cartographic.fromCartesian(sampledPoints[i+1])
        let wallPositions=Cesium.Cartesian3.fromRadiansArrayHeights([
            cartographic1.longitude,cartographic1.latitude,cartographic1.height,
            cartographic2.longitude,cartographic2.latitude,cartographic2.height,
            cartographic2.longitude,cartographic2.latitude,bottomHeight,
            cartographic1.longitude,cartographic1.latitude,bottomHeight,
        ])
        excavatePolygons.push(viewer.entities.add({
        polygon:{
            hierarchy:new Cesium.PolygonHierarchy(wallPositions),
            material:Cesium.Color.fromCssColorString('#8a5a2b'),
            perPositionHeight:true
        }
    }))
    }
}

</script>
<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>
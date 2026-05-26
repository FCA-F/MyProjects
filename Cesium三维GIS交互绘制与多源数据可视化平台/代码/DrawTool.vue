<template>
    <div class="drawToolbar">
        <select v-model="drawingMode" style="width:150px;height:30px">
        <option value=""></option>
        <option value="point">绘制点</option>
        <option value="model">绘制模型</option>
        <option value="line">绘制线</option>
        <option value="polygon">绘制面</option>
        <option value="rectangle">绘制矩形</option>
        <option value="circle">绘制圆</option>
        <option value="delete">删除</option>
        </select>
        <button class="exportBtn" @click="exportEntities()">导出数据</button>
    </div>
</template>

<script setup>
import * as Cesium from 'cesium'
import {ref,watch,onMounted,onUnmounted} from 'vue'

const props=defineProps({
    viewer:{type:Object,required:true}
})

const viewer=props.viewer;

const drawingMode=ref(undefined)

let openDraw=false
let dynamicShape=undefined
let activeShapePoints=[]
let dynamicPositions=undefined
let tempPoints=[]
let handler=null

//绘制点
const drawPoint=(position)=>
{
    let shape=viewer.entities.add(
        {
            position:position,
            point:{
                color:Cesium.Color.BLUE,
                pixelSize:12
            }
        }
    )
    return shape;
}
//绘制模型
const drawModel=(position)=>
{
    let shape=viewer.entities.add(
        {
            position:position,
            model:{
                uri:'/data/glTF/car/scene.gltf',
                scale:10
            }
        }
    )
    return shape;
}
//绘制线和面
const drawShape=(position)=>
{
    let shape;
    //线
    if(drawingMode.value==='line')
    {
        shape=viewer.entities.add(
            {
                polyline:{
                    positions:position,
                    width:5,
                    material:new Cesium.PolylineGlowMaterialProperty({color:Cesium.Color.RED}),
                    clampToGround:true
                }
            }
        )
    }
    //面
    else if(drawingMode.value==='polygon')
    {
        shape=viewer.entities.add(
            {
                polygon:{
                    hierarchy:position,
                    material:Cesium.Color.RED,
                }
            }
        )
    }
    //矩形
    else if(drawingMode.value==='rectangle')
    {
        let arr=typeof position.getValue==='function'?position.getValue(0):position;
        shape=viewer.entities.add(
            {
                rectangle:{
                    coordinates:new Cesium.CallbackProperty(()=>
                    {
                        return Cesium.Rectangle.fromCartesianArray(arr);
                    },false),
                    material:Cesium.Color.RED
                }
            }
        )
    }
    //圆
    else if(drawingMode.value==='circle')
    {
        let arr=typeof position.getValue==='function'?position.getValue(0):position;
        shape=viewer.entities.add(
            {
                position:activeShapePoints[0],
                ellipse:{
                    semiMinorAxis:new Cesium.CallbackProperty(()=>
                    {
                        let distance=Cesium.Cartesian3.distance(arr[0],arr[arr.length-1]);
                        return Math.max(distance,1e-8);//若只有一个点，距离为0会报错
                    },false),
                    semiMajorAxis:new Cesium.CallbackProperty(()=>
                    {
                        let distance=Cesium.Cartesian3.distance(arr[0],arr[arr.length-1]);
                        return Math.max(distance,1e-8);
                    },false),
                    material:Cesium.Color.RED
                }
            }
        )
    }
    return shape;
}
onMounted(() => {
  handler=new Cesium.ScreenSpaceEventHandler(viewer.canvas);
  handler.setInputAction((event)=>
  {
      let position=viewer.scene.pickPosition(event.position);
      if(!Cesium.defined(position))
      return;
      if(drawingMode.value=='point'){drawPoint(position)}
      else if(drawingMode.value=='model'){drawModel(position)}
      else if(drawingMode.value=='line'||drawingMode.value=='polygon'||drawingMode.value=='circle'||drawingMode.value=='rectangle')
      {
            if(!openDraw)//第一次点击
            {
                openDraw=true;
                activeShapePoints.push(position);
                dynamicPositions=new Cesium.CallbackProperty(()=>
                {
                    if(drawingMode.value==='polygon')
                    return new Cesium.PolygonHierarchy(activeShapePoints);
                    else
                    return activeShapePoints;
                },false)
                dynamicShape=drawShape(dynamicPositions)
            }
            else
            {
                activeShapePoints.push(position)
                tempPoints.push(drawPoint(position))
            }
        }
        else if(drawingMode.value=='delete')
        {
            let obj=viewer.scene.pick(event.position);
            if(Cesium.defined(obj)&&Cesium.defined(obj.id))
                viewer.entities.remove(obj.id);
        }
  },Cesium.ScreenSpaceEventType.LEFT_CLICK)

  //鼠标移动事件
  handler.setInputAction((event)=>
  {
        if(!openDraw)
        return;
        let position=viewer.scene.pickPosition(event.endPosition)
        if(Cesium.defined(position))
        {
            if(activeShapePoints.length>1)
            activeShapePoints.pop();
            activeShapePoints.push(position);
        }
  },Cesium.ScreenSpaceEventType.MOUSE_MOVE)

  //鼠标右击事件
  handler.setInputAction((event)=>
  {
        openDraw=false;
        activeShapePoints.pop();
        if(activeShapePoints.length)
        drawShape(activeShapePoints)
        viewer.entities.remove(dynamicShape);
        tempPoints.forEach(point=>viewer.entities.remove(point))
        tempPoints=[];
        dynamicShape=undefined;
        activeShapePoints=[];
  },Cesium.ScreenSpaceEventType.RIGHT_CLICK)
});
//防止切换报错
watch(drawingMode,()=>{
    if(Cesium.defined(dynamicShape))
    viewer.entities.remove(dynamicShape);
    openDraw=false
    dynamicShape=undefined
    activeShapePoints=[]
    dynamicPositions=undefined
    tempPoints=[]
})

onUnmounted(()=>{
  handler.destroy()
})

function generateCircleCoordinates(centerCartographic,radius,steps=64){
    const coords=[];
    const lon=Cesium.Math.toDegrees(centerCartographic.longitude);
    const lat=Cesium.Math.toDegrees(centerCartographic.latitude);
    const angleStep=360/steps;
    //圆心角(弧度)=弧长(半径米)/地球最大半径(WGS84椭球)
    const radiusRadians=radius/Cesium.Ellipsoid.WGS84.maximumRadius;

    for (let i=0;i<=steps;i++) {
        const angle=Cesium.Math.toRadians(i*angleStep);
        //y=y0+r·sinθ
        const pLat=lat+Cesium.Math.toDegrees(Math.sin(angle)*radiusRadians);
        //x=x0+r·cosθ且缩放补偿
        const pLon=lon+Cesium.Math.toDegrees(Math.cos(angle)*radiusRadians/Math.cos(Cesium.Math.toRadians(lat)));
        coords.push([pLon,pLat,0]);
    }
    return coords;
}

//导出函数
const exportEntities=()=>{
    let features=[];
    let entities=viewer.entities.values;
    let now=Cesium.JulianDate.now();

    entities.forEach(entity=>{
        //1.点
        if (entity.point&&entity.position) {
            let position=entity.position.getValue(now);
            let cartographic=Cesium.Cartographic.fromCartesian(position);
            features.push({
                type:"Feature",
                geometry: {
                    type:"Point",
                    coordinates:[Cesium.Math.toDegrees(cartographic.longitude), Cesium.Math.toDegrees(cartographic.latitude), 0]
                },
                properties: {}
            });
        }
        //2.线
        else if (entity.polyline&&entity.polyline.positions) {
            let positions=entity.polyline.positions.getValue(now);
            let coords=positions.map(point=>{
                let cartographic=Cesium.Cartographic.fromCartesian(point);
                return [Cesium.Math.toDegrees(cartographic.longitude), Cesium.Math.toDegrees(cartographic.latitude), 0];
            });

            features.push({
                type:"Feature",
                geometry:{type:"LineString",coordinates:coords},
                properties:{}
            });
        }
        //3.面
        else if(entity.polygon&&entity.polygon.hierarchy){
            let hierarchy=entity.polygon.hierarchy.getValue(now);
            let coords=hierarchy.positions.map(point=>{
                let cartographic=Cesium.Cartographic.fromCartesian(point);
                return [Cesium.Math.toDegrees(cartographic.longitude),Cesium.Math.toDegrees(cartographic.latitude), 0];
            });
            coords.push(coords[0]);
            features.push({
                type:"Feature",
                geometry:{type:"Polygon",coordinates:[coords]},
                properties:{}
            });
        }
        // 4.矩形
        else if(entity.rectangle&&entity.rectangle.coordinates){
            let rect=entity.rectangle.coordinates.getValue(now);
            let coords=[
                [Cesium.Math.toDegrees(rect.west),Cesium.Math.toDegrees(rect.south),0],
                [Cesium.Math.toDegrees(rect.east),Cesium.Math.toDegrees(rect.south),0],
                [Cesium.Math.toDegrees(rect.east),Cesium.Math.toDegrees(rect.north),0],
                [Cesium.Math.toDegrees(rect.west),Cesium.Math.toDegrees(rect.north),0],
                [Cesium.Math.toDegrees(rect.west),Cesium.Math.toDegrees(rect.south),0]
            ];
            features.push({
                type:"Feature",
                geometry:{type:"Polygon",coordinates:[coords]},
                properties:{}
            });
        }
        //5.圆
        else if (entity.ellipse&&entity.position) {
            let center=entity.position.getValue(now);
            let centerCartographic=Cesium.Cartographic.fromCartesian(center);
            let radius=entity.ellipse.semiMajorAxis.getValue(now)||0;//加0防止异常
            let coords=generateCircleCoordinates(centerCartographic,radius);
            coords.push(coords[0]);
            features.push({
                type:"Feature",
                geometry:{
                    type:"Polygon",
                    coordinates:[coords]
                },
                properties:{
                    type:"circle",
                    radius:radius.toFixed(2)//半径保留2位小数
                }
            });
        }
    });

    let geojson={type:"FeatureCollection",features:features};
    //blob=Binary Large Object(二进制大对象)
    let blob=new Blob([JSON.stringify(geojson,null,2)],{type:"application/json"});
    let url=URL.createObjectURL(blob);
    let a=document.createElement('a');
    a.href=url;
    a.download="绘制数据.geojson";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert("导出成功！");
}

</script>
  
<style scoped>
  .drawToolbar{position:absolute;top:10px;left:20px;}
  .exportBtn{position:absolute;top:10px;left:220px;width:100px;height:30px;background:red;color:white;border:none;cursor:pointer}
</style>
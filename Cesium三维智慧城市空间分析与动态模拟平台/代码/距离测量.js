let distancePositions=[],distance=0;//计算距离数组，当前距离

let measureDistanceButton=document.getElementById('measureDistanceButton');
let ismeasureDistance=false;

function measureDistance()
{
    if(!ismeasureDistance)
    {
        ismeasureDistance=true;
        measureDistanceButton.style.backgroundColor='red';
        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
        distancePositions=[],distance=0,activePositions=[],dynamicShape=undefined,dynamicPositions=undefined,openDraw=false;

        //采点
        handler.setInputAction(function (event){
        let pickPosition=viewer.scene.pickPosition(event.position);
        if(!Cesium.defined(pickPosition))
        return;
        if(!activePositions.length)//第一次
        {
            //距离与标签
            distancePositions.push(pickPosition);
            drawDistanceLable(pickPosition,0);
            //线
            openDraw=true;
            activePositions.push(pickPosition);
            let dynamicPositions=new Cesium.CallbackProperty(function (){return activePositions},false);
            dynamicShape=drawDistanceLine(dynamicPositions);
        }
        else
        {
            distancePositions.push(pickPosition);
            distance=getDistance(distancePositions);
            drawDistanceLable(pickPosition,distance);
            activePositions.push(pickPosition);
        }
        },Cesium.ScreenSpaceEventType.LEFT_CLICK);
        //追踪
        handler.setInputAction(function (event){
            if(!openDraw)
            return;
            let pickPosition=viewer.scene.pickPosition(event.endPosition);
            if(!Cesium.defined(pickPosition))
            return;
            if(activePositions.length>1)
            activePositions.pop();
            activePositions.push(pickPosition);
        },Cesium.ScreenSpaceEventType.MOUSE_MOVE)
        //确认图形，结束
        handler.setInputAction(function (event){
            activePositions.pop();
            drawDistanceLine(activePositions);
            viewer.entities.remove(dynamicShape);
            openDraw=false;
            distance=0;
            distancePositions=[];
            activePositions=[];
            dynamicShape=undefined;
        },Cesium.ScreenSpaceEventType.RIGHT_CLICK)
    }
    else
    {
        ismeasureDistance=false;
        measureDistanceButton.style.backgroundColor='greenyellow';

        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
        distancePositions=[],distance=0,activePositions=[],dynamicShape=undefined,dynamicPositions=undefined,openDraw=false;
    }
}
    

//计算距离函数
function getDistance(distancePositions)
{
    let distance=0;
    for(let i=0;i<=distancePositions.length-2;i++)
    {
        distance+=Cesium.Cartesian3.distance(distancePositions[i],distancePositions[i+1]);
    }
    return distance;
}
//画点、标签函数
function drawDistanceLable(pickPosition,distance)
{
    viewer.entities.add({
        position:pickPosition,
        point:{
            pixelSize:8,
            color:Cesium.Color.YELLOW,
            disableDepthTestDistance:Number.POSITIVE_INFINITY
        },
        label:{
            text:distance.toFixed(2)+'meter',
            font:'20px',
            showBackground:true,
            horizontalOrigin:Cesium.HorizontalOrigin.LEFT,
            verticalOrigin:Cesium.VerticalOrigin.BOTTOM,
            disableDepthTestDistance:Number.POSITIVE_INFINITY
        }
    })
}
//画线函数
function drawDistanceLine(positions)
{
    let shape=viewer.entities.add({
        polyline:{
            positions:positions,
            material:Cesium.Color.RED,
            width:4,
            depthFailMaterial:Cesium.Color.RED}
    })
    return shape;
}
let maxWaterHeightText=document.getElementById('maxWaterHeightText');
let stepText=document.getElementById('stepText');
let waterAnalysisButton=document.getElementById('waterAnalysisButton');
let drawWaterButton=document.getElementById('drawWaterButton');
let waterHeightText=document.getElementById('waterHeightText');
let isDrawWater=false;

function drawWaterRegion()
{
    if(!isDrawWater)
    {
        isDrawWater=true;
        drawWaterButton.style.backgroundColor='red';

        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
        dymaticShape=undefined,openDraw=false,activePositions=[];//动态点坐标

        //采点(左键)
        handler.setInputAction(function (event){
            let pickPosition=viewer.scene.pickPosition(event.position);
            if(!Cesium.defined(pickPosition))
            return;
            if(!activePositions.length)
            {
                openDraw=true;
                activePositions.push(pickPosition);
                let dymaticPositions=new Cesium.CallbackProperty(
                    function (){return new Cesium.PolygonHierarchy(activePositions)},false);
                dymaticShape=drawPolygon(dymaticPositions);
            }
            else
            {
                activePositions.push(pickPosition);
            }
        },Cesium.ScreenSpaceEventType.LEFT_CLICK)

        //移动追踪绘制（移动）
        handler.setInputAction(function (event){
            if(!openDraw)
            return;
            let pickPosition=viewer.scene.pickPosition(event.endPosition);
            if(!Cesium.defined(pickPosition))
            return;
            if(activePositions.length>1)
            activePositions.pop();
            activePositions.push(pickPosition);
        },Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        //确认，终止（右键）
        handler.setInputAction(function (event){
            activePositions.pop();
            viewer.entities.remove(dymaticShape);
            drawWaterPolygon(activePositions);
            openDraw=false;
            activePositions=[];
            dymaticShape=undefined;
        },Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    }
    else
    {
        isDrawWater=false;
        drawWaterButton.style.backgroundColor='greenyellow';

        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
        dymaticShape=undefined,openDraw=false,activePositions=[];//保险
    }
}
    

//绘制普通静态面
function drawPolygon(positions)
{
    let polygon=viewer.entities.add({
        polygon:{
            hierarchy:positions,
            material:Cesium.Color.RED
        }
    })
    return polygon;
}

//绘制动态水面
function drawWaterPolygon(positions){
    let polygon=viewer.entities.add({
        polygon:{
            hierarchy:positions,
            height:new Cesium.CallbackProperty(updateHeight,false),
            extrudedHeight:0,
            material:Cesium.Color.BLUE
        }
    })
    return polygon;
}

//开始/终止涨水
let openWater=false;//是否涨水
function F_waterAnalysis()
{
    if(!openWater)
    {
        openWater=true;
        waterAnalysisButton.style.backgroundColor='red';
        waterAnalysisButton.textContent='结束';
    }
    else
    {
        openWater=false;
        waterAnalysisButton.style.backgroundColor='green';
        waterAnalysisButton.textContent='开始';
    }
}
function F_zero()
{
    waterHeight=0;
}

//涨水
let waterHeight=0;//当前水位高度
function updateHeight()
{
    let maxWaterHeight=Number(maxWaterHeightText.value);
    let step=Number(stepText.value);
    waterHeightText.value=waterHeight.toFixed(2);//显示水位高度
    if(!openWater)
    return waterHeight;
    waterHeight+=step;
    return waterHeight;
}

function F_waterHeightText()
{
    waterHeight=Number(waterHeightText.value);
}
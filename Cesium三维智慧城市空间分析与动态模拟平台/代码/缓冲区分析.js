let drawTypeSelect=document.getElementById('drawTypeSelect');
let drawType=undefined;
let bufferSizeText=document.getElementById('bufferSizeText');
let bufferSize=Number(bufferSizeText.value);

function F_drawTypeSelect()
{
    openDraw=false,dynamicShape=undefined,activePositions=[],dynamicPositions=undefined;
    drawType=drawTypeSelect.value;
    //按钮着色
    if(drawType!='undefined')
    drawTypeSelect.style.backgroundColor='red';
    else
    drawTypeSelect.style.backgroundColor='white';

    handler.setInputAction(function (event){
        if(drawType==undefined)
        return;
        let pickPosition=viewer.scene.pickPosition(event.position);
        if(!Cesium.defined(pickPosition))
        return;
        if(drawType=='point')
        {
            drawShape(pickPosition);
            drawBuffer([pickPosition]);
            return;
        }
        if(activePositions.length==0)//开始
        {
            openDraw=true;
            activePositions.push(pickPosition);
            dynamicPositions=new Cesium.CallbackProperty(function (){
                if(drawType=='polygon'){return new Cesium.PolygonHierarchy(activePositions)}
                else{return activePositions};
            },false);
            dynamicShape=drawShape(dynamicPositions);
        }
        else
        {
            activePositions.push(pickPosition);
        }
    },Cesium.ScreenSpaceEventType.LEFT_CLICK);

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

    handler.setInputAction(function (event){
        activePositions.pop();
        viewer.entities.remove(dynamicShape);
        if(activePositions.length)
        {
            if(drawType=='polygon')
            drawShape(new Cesium.PolygonHierarchy(activePositions));
            else
            drawShape(activePositions);
        }
        drawBuffer(activePositions);
        openDraw=false;
        dynamicPositions=undefined;
        dynamicShape=undefined;
        activePositions=[];
    },Cesium.ScreenSpaceEventType.RIGHT_CLICK)
}

function F_bufferSizeText()
{
    bufferSize=Number(bufferSizeText.value);
}

function drawShape(positions)
{
    let shape;
    if(!positions)
    return;
    if(drawType=='point')
    {
        shape=viewer.entities.add({
            position:positions,
            point:{
                pixelSize:5,
                color:Cesium.Color.RED,
                zIndex:1
            }
        })
    }
    else if(drawType=='polyline')
    {
        shape=viewer.entities.add({
            polyline:{
            positions:positions,
            material:Cesium.Color.RED,
            width:5,
            clampToGround:true,
            zIndex:1
            }
        })
    }
    else if(drawType=='polygon')
    {
        shape=viewer.entities.add({
            polygon:{
                hierarchy:positions,
                material:Cesium.Color.RED,
                zIndex:1
            }
        })
    }
    return shape;
}

function drawBuffer(cartesianArray)
{
    if(cartesianArray.length==0)
    return;
    let cartographicArray=cartesianArray.map(cartesian=>Cesium.Cartographic.fromCartesian(cartesian));
    let degreeArray=cartographicArray.map(function (cartographic){
        let lon=Cesium.Math.toDegrees(cartographic.longitude);
        let lat=Cesium.Math.toDegrees(cartographic.latitude);
        return [lon,lat];
    })

    let bufferShape;
    if(drawType=='point')
    bufferShape=turf.point(degreeArray[0]);
    else if(drawType=='polyline'&&cartesianArray.length>=2)
    bufferShape=turf.lineString(degreeArray);
    else if(drawType=='polygon'&&cartesianArray.length>=3)
    {
        degreeArray.push(degreeArray[0]);
        bufferShape=turf.polygon([degreeArray]);
    }
    if(bufferShape==undefined)
    return;

    let buffer=turf.buffer(bufferShape,bufferSize,{units:'meters'});

    let bufferDegreeArray=buffer.geometry.coordinates[0];
    let bufferCartesianArray=bufferDegreeArray.map(degree=>Cesium.Cartesian3.fromDegrees(degree[0],degree[1]));
    let hierarchy=new Cesium.PolygonHierarchy(bufferCartesianArray);

    viewer.entities.add({
        polygon:{
            hierarchy:hierarchy,
            material:Cesium.Color.YELLOW.withAlpha(0.5),
        }
    })
}
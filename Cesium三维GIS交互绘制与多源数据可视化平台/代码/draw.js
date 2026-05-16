let floatingPoint,activeShape,drawingMode;//初始点，运动图形，画模型种类
let activeShapePoints=[],dynamicPositions=[],tempPoints=[];//运动点集，运动点集（Callbackproperty）,临时点集

//鼠标左击事件
drawHandler.setInputAction(function(event)
{
    let earthPosition=viewer.scene.pickPosition(event.position);
    if(drawingMode=='point'){F_drawPoint(earthPosition)}
    else if(drawingMode=='model'){F_drawModel(earthPosition)}
    else if(drawingMode=='line'||drawingMode=='polygon'||drawingMode=='circle'||drawingMode=='rectangle')
    {
        if(Cesium.defined(earthPosition)&&activeShapePoints.length===0)//第一次点击
        {
            floatingPoint=F_drawPoint(earthPosition);
            activeShapePoints.push(earthPosition);
            dynamicPositions=new Cesium.CallbackProperty(function()
            {
                if(drawingMode==='polygon')
                return new Cesium.PolygonHierarchy(activeShapePoints);
                else
                return activeShapePoints;
            },false)
            activeShape=F_drawShape(dynamicPositions)
        }
        else
        {
            activeShapePoints.push(earthPosition)
            tempPoints.push(F_drawPoint(earthPosition))
        }
    }
    else if(drawingMode=='delete')
    {
        let obj=viewer.scene.pick(event.position);
        if(Cesium.defined(obj)&&Cesium.defined(obj.id))
            viewer.entities.remove(obj.id);
    }
},Cesium.ScreenSpaceEventType.LEFT_CLICK)

//鼠标移动事件
drawHandler.setInputAction(function(event)
{
    if(Cesium.defined(floatingPoint))
    {
        let newPosition=viewer.scene.pickPosition(event.endPosition)
        if(Cesium.defined(newPosition))
        {
            if(activeShapePoints.length>1)
            activeShapePoints.pop();
            activeShapePoints.push(newPosition);
        }
    }
},Cesium.ScreenSpaceEventType.MOUSE_MOVE)

//鼠标右击事件
drawHandler.setInputAction(function(event)
{
    activeShapePoints.pop();
    if(activeShapePoints.length)
    F_drawShape(activeShapePoints)
    viewer.entities.remove(floatingPoint);
    viewer.entities.remove(activeShape);
    tempPoints.forEach(point=>viewer.entities.remove(point))
    floatingPoint=undefined;
    activeShape=undefined;
    activeShapePoints=[];
},Cesium.ScreenSpaceEventType.RIGHT_CLICK)

//定义下拉函数
let dropdown=document.getElementById('dropdown');
function F_draw()
{
    switch(dropdown.value)
    {
        case 'null':
            drawingMode=null;break;
        case 'drawPoint': 
            drawingMode='point';break;
        case 'drawModel':
            drawingMode='model';break;
        case 'drawLine':
            drawingMode='line';break;
        case 'drawPolygon':
            drawingMode='polygon';break;
        case 'drawRectangle':
            drawingMode='rectangle';break;
        case 'drawCircle':
            drawingMode='circle';break;
        case 'delete':
            drawingMode='delete';break;
        default:break;
    }
}

//绘制点
function F_drawPoint(positionData)
{
    let shape=viewer.entities.add(
        {
            position:positionData,
            point:{
                color:Cesium.Color.BLUE,
                pixelSize:12
            }
        }
    )
    return shape;
}
//绘制模型
function F_drawModel(positionData)
{
    let shape=viewer.entities.add(
        {
            position:positionData,
            model:{
                uri:'./data/glTF/car/scene.gltf',
                scale:10
            }
        }
    )
    return shape;
}
//绘制线和面
function F_drawShape(positionData)
{
    let shape;
    //线
    if(drawingMode==='line')
    {
        shape=viewer.entities.add(
            {
                polyline:{
                    positions:positionData,
                    width:5,
                    material:new Cesium.PolylineGlowMaterialProperty({color:Cesium.Color.RED}),
                    clampToGround:true
                }
            }
        )
    }
    //面
    else if(drawingMode==='polygon')
    {
        shape=viewer.entities.add(
            {
                polygon:{
                    hierarchy:positionData,
                    material:Cesium.Color.RED,
                }
            }
        )
    }
    //矩形
    else if(drawingMode==='rectangle')
    {
        let arr=typeof positionData.getValue==='function'?positionData.getValue(0):positionData;
        shape=viewer.entities.add(
            {
                rectangle:{
                    coordinates:new Cesium.CallbackProperty(function()
                    {
                        return Cesium.Rectangle.fromCartesianArray(arr);
                    }),
                    material:Cesium.Color.RED
                }
            }
        )
    }
    //圆
    else if(drawingMode==='circle')
    {
        let arr=typeof positionData.getValue==='function'?positionData.getValue(0):positionData;
        shape=viewer.entities.add(
            {
                position:activeShapePoints[0],
                ellipse:{
                    semiMinorAxis:new Cesium.CallbackProperty(function()
                    {
                        return Cesium.Cartesian3.distance(arr[0],arr[arr.length-1])
                    },false),
                    semiMajorAxis:new Cesium.CallbackProperty(function()
                    {
                        return Cesium.Cartesian3.distance(arr[0],arr[arr.length-1])
                    },false),
                    material:Cesium.Color.RED
                }
            }
        )
    }
    return shape;
}

//圆形坐标生成工具
function generateCircleCoordinates(centerCartographic,radius,steps=64) {
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
function F_export(){
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
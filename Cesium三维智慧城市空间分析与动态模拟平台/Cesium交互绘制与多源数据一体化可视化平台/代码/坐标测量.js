let measureCoordinateButton=document.getElementById('measureCoordinateButton');
let ismeasureCoordinate=false;

function measureCoordinate()
{
    if(!ismeasureCoordinate)
    {
        ismeasureCoordinate=true;
        measureCoordinateButton.style.backgroundColor='red';

        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
        //采点
        handler.setInputAction(function (event){
            let pickPosition=viewer.scene.pickPosition(event.position);
            if(!pickPosition)
            return;
            createLabel(pickPosition);
        },Cesium.ScreenSpaceEventType.LEFT_CLICK);
        //删点
        handler.setInputAction(function (event){
            viewer.entities.removeAll();
            annotations.removeAll();
        },Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    }
    else
    {
        ismeasureCoordinate=false;
        measureCoordinateButton.style.backgroundColor='greenyellow';

        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    }
}

let annotations=viewer.scene.primitives.add(new Cesium.LabelCollection());//标签对象

//绘制点与标签
function createLabel(cartesian)
{
    let cartographic=Cesium.Cartographic.fromCartesian(cartesian);
    let lon=Cesium.Math.toDegrees(cartographic.longitude);
    let lat=Cesium.Math.toDegrees(cartographic.latitude);
    let height=cartographic.height;
    //添加点
    viewer.entities.add({
        position:cartesian,
        point:{
            pixelSize:8,
            color:Cesium.Color.RED,
            outlineColor:Cesium.Color.YELLOW,
            outlineWidth:2,
            disableDepthTestDistance:1000
        }
    })
    //添加标签
    annotations.add({
        position:cartesian,
        text:'Lon: '+lon.toFixed(10)+'\u00B0\n'+
                'Lat: '+lat.toFixed(10)+'\u00B0\n'+
                'Height: '+height.toFixed(10)+'\u00B0'+'m',
        showBackground:true,
        font:'15px',
        horizontalOrigin:Cesium.HorizontalOrigin.LEFT,
        verticalOrigin:Cesium.VerticalOrigin.BOTTOM,
        disableDepthTestDistance:1000
    })
}
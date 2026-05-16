let coordinateText=document.getElementById("coordinateText");

coordinateHandler.setInputAction(function(event)
{
    try
    {
        let tilesetCartesian=viewer.scene.pickPosition(event.endPosition); //瓦片及地形坐标（高）
        let ellipsoidCartesian=viewer.scene.camera.pickEllipsoid(event.endPosition);//椭球面坐标（经纬）
        if(!Cesium.defined(ellipsoidCartesian)||!Cesium.defined(tilesetCartesian))
        {
            coordinateText.value="---";
            return;
        }
        let tilesetCartographic=Cesium.Cartographic.fromCartesian(tilesetCartesian);
        let ellipoidCartographic=Cesium.Cartographic.fromCartesian(ellipsoidCartesian);
        let lon=Cesium.Math.toDegrees(ellipoidCartographic.longitude);
        let lat=Cesium.Math.toDegrees(ellipoidCartographic.latitude);
        let height=tilesetCartographic.height;
        let lonLatHeight=lon.toFixed(3)+"  ,  "+lat.toFixed(3)+"  ,  "+height.toFixed(3);
        coordinateText.value=lonLatHeight;
    }
    catch
    {
        coordinateText.value="---"
    }
},Cesium.ScreenSpaceEventType.MOUSE_MOVE) 
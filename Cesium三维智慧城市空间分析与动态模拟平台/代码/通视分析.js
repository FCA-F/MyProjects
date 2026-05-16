let watchPositions=[];

let watchButton=document.getElementById('watchButton');
let isWatch=false;

function drawWatchPolyline()
{
    if(!isWatch)
    {
        isWatch=true;
        watchButton.style.backgroundColor='red';

        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);

        handler.setInputAction(function (event){
            let pickPosition=viewer.scene.pickPosition(event.position);
            if(!Cesium.defined(pickPosition))
            return;
            drawPoint(pickPosition);
            if(watchPositions.length==0)
            {
                watchPositions.push(pickPosition);
            }
            else if(watchPositions.length==1)
            {
                watchPositions.push(pickPosition);
                selectLine(watchPositions);
                watchPositions=[];
            }
        },Cesium.ScreenSpaceEventType.LEFT_CLICK);
    }
    else
    {
        isWatch=false;
        watchButton.style.backgroundColor='greenyellow';

        handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    }
}

function selectLine(positions)
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
        drawLine(positions[0],positions[1],'GREEN');
    }
    else
    {
        drawLine(positions[0],middlePoint,'GREEN');
        drawLine(middlePoint,positions[1],'RED');
    }
}

function drawLine(point1,point2,color)
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

function drawPoint(position)
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
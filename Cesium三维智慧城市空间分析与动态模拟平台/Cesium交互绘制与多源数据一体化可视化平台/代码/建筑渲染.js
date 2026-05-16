
let buildingRenderSelect=document.getElementById('buildingRenderSelect');
function F_buildingRenderSelect()
{
    handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    osmBuildingTile.style=new Cesium.Cesium3DTileStyle();
    switch(buildingRenderSelect.value)
    {
        case '按建筑类型着色':
            colorByBuildingStyle();break;
        case '按指定位置的距离着色':
            colorByBuildingDistance();break;
        case '交互着色':
            interactiveRendering();break;
        case 'building属性为dormitory':
            showBybuildingType('dormitory');break;
        default:break;
    }
}
//按建筑类型设置颜色
function colorByBuildingStyle()
{
    let style=new Cesium.Cesium3DTileStyle({
        color:{
            conditions:[
                ["${feature['building']}==='university'","color('red')"],
                ["${feature['building']}==='dormitory'","color('yellow')"],
                ["${feature['building']}==='residential'","color('purple')"],
                ["${feature['building']}==='yes'","color('green')"],
                ["true","color('pink')"]
            ]
                
        }
    })
    osmBuildingTile.style=style;
}
//按指定位置的距离选择颜色
function colorByBuildingDistance()
{
    
    handler.setInputAction(function (event){
        let pickFeature=viewer.scene.pick(event.position);
        if(!(pickFeature instanceof Cesium.Cesium3DTileFeature))
        return;
        let pickFeatureLon=parseFloat(pickFeature.getProperty("cesium#longitude"));
        let pickFeatureLat=parseFloat(pickFeature.getProperty("cesium#latitude"));
        let style=new Cesium.Cesium3DTileStyle({
            defines:{
                distance:
                    "distance(vec2(${feature['cesium#longitude']},${feature['cesium#latitude']}),vec2("+
                    pickFeatureLon+","+pickFeatureLat+"))"
                    },
            color:{
                conditions:[
                    ["${distance}>0.014","color('red')"],
                    ["${distance}>0.010","color('yellow')"],
                    ["${distance}>0.006","color('green')"],
                    ["${distance}>0.001","color('blue')"],
                    ["true","color('black')"]
                ]
            }
        });
        osmBuildingTile.style=style;
    },Cesium.ScreenSpaceEventType.LEFT_CLICK);
}
//交互渲染
function interactiveRendering()
{
    handler.setInputAction(function (event){
        let pickFeature=viewer.scene.pick(event.position);
        if(!(pickFeature instanceof Cesium.Cesium3DTileFeature))
        return;
        let pickFeatureElementId=pickFeature.getProperty('elementId');
        let style=new Cesium.Cesium3DTileStyle({
            color:{
                conditions:[
                    ["${feature['elementId']}==="+pickFeatureElementId,"color('red')"]
                ]
            }
        })
        osmBuildingTile.style=style;
    },Cesium.ScreenSpaceEventType.LEFT_CLICK);
}
//building属性为dormitory
function showBybuildingType(showBuildingType)
{
    let style=new Cesium.Cesium3DTileStyle({
        color:{
            conditions:[
                ["${feature['building']}==="+"'"+showBuildingType+"'","color('red')"]
            ]
        }
    });
    osmBuildingTile.style=style;
}

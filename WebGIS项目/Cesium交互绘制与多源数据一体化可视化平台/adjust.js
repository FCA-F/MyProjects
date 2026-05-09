//高度调整
let heightRange=document.getElementById("heightRange");
let heightText=document.getElementById("heightText");
function F_heightRange()
{
    let height=Number(heightRange.value);
    heightText.value=height;
    if(isNaN(height))
    return;
    let surface=Cesium.Cartesian3.fromRadians(
        starCartographic.longitude,
        starCartographic.latitude
    )
    let offset=Cesium.Cartesian3.fromRadians(
        starCartographic.longitude,
        starCartographic.latitude,
        height
    )
    let translation=Cesium.Cartesian3.subtract(
        offset,
        surface,
        new Cesium.Cartesian3()
    )
    tileset.modelMatrix=Cesium.Matrix4.fromTranslation(translation);
}
function F_heightText()
{
    heightRange.value=heightText.value;
    F_heightRange();
}


//旋转
let rx=0,ry=0,rz=0;
let XRange=document.getElementById("XRange"),YRange=document.getElementById("YRange"),ZRange=document.getElementById("ZRange")
let XText=document.getElementById("XText"),YText=document.getElementById("YText"),ZText=document.getElementById("ZText");
//旋转矩阵
function F_rotationRange()
{
    rx=Number(XRange.value),ry=Number(YRange.value),rz=Number(ZRange.value);
    XText.value=rx,YText.value=ry,ZText.value=rz;
    if(isNaN(rx)||isNaN(ry)||isNaN(rz))
    return;
    F_updata();
}
//旋转文本框函数
function F_rotationText()
{
    XRange.value=Number(XText.value);
    YRange.value=Number(YText.value);
    ZRange.value=Number(ZText.value);
    F_rotationRange();
}

//平移
//滑动条平移函数
let lonRange=document.getElementById("lonRange"),lonText=document.getElementById("lonText");
let latRange=document.getElementById("latRange"),latText=document.getElementById("latText");
function F_translationRange()
{
    let tLon=Number(lonRange.value),tLat=Number(latRange.value);
    lonText.value=tLon,latText.value=tLat;
    if(isNaN(tLon)||isNaN(tLat))
    return;
    params.x=Cesium.Math.toDegrees(starCartographic.longitude)+tLon/10000;
    params.y=Cesium.Math.toDegrees(starCartographic.latitude)+tLat/10000;
    F_updata();
}
function F_translationText()
{
    lonRange.value=lonText.value,latRange.value=latText.value;
    F_translationRange();
}

//更新矩阵
function F_updata()
{

    //旋转
    let mrx3=Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(rx));
    let mry3=Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(ry));
    let mrz3=Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(rz));
    let mrx4=Cesium.Matrix4.fromRotationTranslation(mrx3);
    let mry4=Cesium.Matrix4.fromRotationTranslation(mry3);
    let mrz4=Cesium.Matrix4.fromRotationTranslation(mrz3);
    let center=Cesium.Cartesian3.fromDegrees(params.x,params.y,params.z);
    let m=Cesium.Transforms.eastNorthUpToFixedFrame(center);
    Cesium.Matrix4.multiply(m,mrx4,m);
    Cesium.Matrix4.multiply(m,mry4,m);
    Cesium.Matrix4.multiply(m,mrz4,m);
    tileset._root.transform=m;
}

//缩放
let scaleRange=document.getElementById("scaleRange"),scaleText=document.getElementById("scaleText");
//缩放滑动条函数
function F_scaleRange()
{
    let scale=Number(scaleRange.value);
    scaleText.value=scale;
    if(!scale)
    return;
    let mScale=Cesium.Matrix4.fromUniformScale(scale);
    let m=Cesium.Matrix4.multiply(mStar,mScale,new Cesium.Matrix4());
    tileset._root.transform=m;
}
//缩放文本框函数
function F_scaleText()
{
    scaleRange.value=scaleText.value;
    F_scaleRange();
}
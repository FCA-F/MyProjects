//截图
function F_savePictureButton()
{
    viewer.render();//刷新一次
    let saveLink=document.createElement('a');//创建链接
    saveLink.href=viewer.scene.canvas.toDataURL('image/png');//下载地址
    saveLink.download='截图';//截图的名字
    document.body.appendChild(saveLink);
    saveLink.click();
}
//定位
function F_setView()
{
    viewer.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(114.39564,30.52214,2000)});
}
//清空
function F_removeAllEntities()
{
    viewer.entities.removeAll();
    annotations.removeAll();
}
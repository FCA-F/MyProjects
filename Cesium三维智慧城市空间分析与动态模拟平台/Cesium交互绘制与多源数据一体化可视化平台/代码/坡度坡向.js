let slopeRamp=[0.0,0.1,0.2,0.3,0.4,0.5,0.6];//坡度梯度
let aspectRamp=[0.0,0.2,0.4,0.6,0.8,0.9,1.0];//坡向梯度

function F_slopeMaterial()
{
    //按钮控色
    defaultMaterialButton.style.backgroundColor='white';
    contourMaterialButton.style.backgroundColor='white';
    slopeMaterialButton.style.backgroundColor='red';
    aspectMaterialButton.style.backgroundColor='white';

    let material=Cesium.Material.fromType('SlopeRamp');
    material.uniforms.image=getSlopeRampCanvas();
    viewer.scene.globe.material=material;
}
function F_aspectMaterial()
{
    //按钮控色
    defaultMaterialButton.style.backgroundColor='white';
    contourMaterialButton.style.backgroundColor='white';
    slopeMaterialButton.style.backgroundColor='white';
    aspectMaterialButton.style.backgroundColor='red';

    let material=Cesium.Material.fromType('AspectRamp');
    material.uniforms.image=getAspectRampCanvas();
    viewer.scene.globe.material=material;
}

function getSlopeRampCanvas()
{
    let canvas=document.createElement('canvas');
    canvas.width=100;
    canvas.height=1;
    let context=canvas.getContext('2d');
    let gradient=context.createLinearGradient(0,0,100,0);//(x1,y1,x2,y2)
    gradient.addColorStop(slopeRamp[0],Cesium.Color.RED.toCssColorString());
    gradient.addColorStop(slopeRamp[1],Cesium.Color.ORANGE.toCssColorString());
    gradient.addColorStop(slopeRamp[2],Cesium.Color.YELLOW.toCssColorString());
    gradient.addColorStop(slopeRamp[3],Cesium.Color.GREEN.toCssColorString());
    gradient.addColorStop(slopeRamp[4],Cesium.Color.CYAN.toCssColorString());
    gradient.addColorStop(slopeRamp[5],Cesium.Color.BLUE.toCssColorString());
    gradient.addColorStop(slopeRamp[6],Cesium.Color.PURPLE.toCssColorString());
    context.fillStyle=gradient;
    context.fillRect(0,0,100,1);
    return canvas;
}
function getAspectRampCanvas()
{
    let canvas=document.createElement('canvas');
    canvas.width=100;
    canvas.height=1;
    let context=canvas.getContext('2d');
    let gradient=context.createLinearGradient(0,0,100,0);//(x1,y1,x2,y2)
    gradient.addColorStop(aspectRamp[0],Cesium.Color.RED.toCssColorString());
    gradient.addColorStop(aspectRamp[1],Cesium.Color.YELLOW.toCssColorString());
    gradient.addColorStop(aspectRamp[2],Cesium.Color.YELLOW.toCssColorString());
    gradient.addColorStop(aspectRamp[3],Cesium.Color.GREEN.toCssColorString());
    gradient.addColorStop(aspectRamp[4],Cesium.Color.CYAN.toCssColorString());
    gradient.addColorStop(aspectRamp[5],Cesium.Color.BLUE.toCssColorString());
    gradient.addColorStop(aspectRamp[6],Cesium.Color.PURPLE.toCssColorString());
    context.fillStyle=gradient;
    context.fillRect(0,0,100,1);
    return canvas;
}
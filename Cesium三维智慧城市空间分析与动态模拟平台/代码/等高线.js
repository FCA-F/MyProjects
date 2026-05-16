let contourMaterial=Cesium.Material.fromType('ElevationContour');
contourMaterial.spacing=150;
contourMaterial.width=2;
contourMaterial.color=Cesium.Color.RED;

let defaultMaterialButton=document.getElementById('defaultMaterialButton');
let contourMaterialButton=document.getElementById('contourMaterialButton');
let slopeMaterialButton=document.getElementById('slopeMaterialButton');
let aspectMaterialButton=document.getElementById('aspectMaterialButton');

function F_defaultMaterial()
{
    viewer.scene.globe.material=undefined;
    defaultMaterialButton.style.backgroundColor='red';
    contourMaterialButton.style.backgroundColor='white';
    slopeMaterialButton.style.backgroundColor='white';
    aspectMaterialButton.style.backgroundColor='white';
}
function F_contourMaterial()
{
    viewer.scene.globe.material=contourMaterial;
    defaultMaterialButton.style.backgroundColor='white';
    contourMaterialButton.style.backgroundColor='red';
    slopeMaterialButton.style.backgroundColor='white';
    aspectMaterialButton.style.backgroundColor='white';
}

let contourSpaceRange=document.getElementById('contourSpaceRange');
let contourSpaceText=document.getElementById('contourSpaceText');
function F_contourSpaceRange()
{
    let contourSpace=contourSpaceRange.value;
    contourSpaceText.value=contourSpace;
    contourMaterial.uniforms.spacing=contourSpace;
}
function F_contourSpaceText()
{
    contourSpaceRange.value=Number(contourSpaceText.value);
    F_contourSpaceRange();
}
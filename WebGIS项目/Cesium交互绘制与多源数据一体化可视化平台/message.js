let messageTileset;
let isShowMessageButton=document.getElementById("isShowMessageButton");
let isShowMessage=false;
async function F_messageLoad()
    {
        try
        {
            messageTileset=await Cesium.Cesium3DTileset.fromUrl('./data/shpTile/tileset.json');
            messageTileset.style=new Cesium.Cesium3DTileStyle({color:'rgba(0,0,0,0.01)'})//不能完全透明
            messageTileset.show=isShowMessage;
            viewer.scene.primitives.add(messageTileset);
        }
        catch{}
    }
    F_messageLoad();
function F_displayMessage()
{
    isShowMessage=isShowMessage?false:true;
    messageTileset.show=isShowMessage;
    if(isShowMessage)
        isShowMessageButton.innerText="显示信息";
    else
        isShowMessageButton.innerText="隐藏信息";
}
<template>
    <div class="displayMessage">
        <el-button  @click="displayMessage" style="width:100px;height:30px">{{ text }}</el-button>
    </div>
</template>
<script setup lang="ts">
import * as Cesium from 'cesium'
import {ref,onMounted} from 'vue'

const {viewer}=defineProps<{viewer:Cesium.Viewer}>();
const text=ref<string>("隐藏信息")
const isShowMessage=ref<boolean>(false);
let messageTileset:Cesium.Cesium3DTileset;


const displayMessage=()=>{
    isShowMessage.value=!isShowMessage.value;
    messageTileset.show=isShowMessage.value;
    if(isShowMessage.value)
    text.value="显示信息";
    else
    text.value="隐藏信息";
}

onMounted(async()=>{
    messageTileset=await Cesium.Cesium3DTileset.fromUrl('/data/shpTile/tileset.json');
    messageTileset.style=new Cesium.Cesium3DTileStyle({color:'rgba(0,0,0,0.01)'})//不能完全透明
    messageTileset.show=isShowMessage.value;
    viewer.scene.primitives.add(messageTileset);
})

</script>

<style scoped>
    .displayMessage{position:absolute;top:800px;left:25px};
</style>
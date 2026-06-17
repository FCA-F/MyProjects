<template>
  <div class="adjustDiv">
    <!--高度-->
    <div class="tool">
        <div style="color:white">高度</div>
        <el-slider v-model.number="height" :min="-500" :max="500" :step="1" style="width:180px"></el-slider>
        <el-input v-model.number="height" class="input"></el-input>
    </div>
    
    <!--X轴旋转-->
    <div class="tool">
        <div style="color:white">X轴旋转</div>
        <el-slider v-model.number="rx" :min="-100" :max="100" :step="1" style="width:180px"></el-slider>
        <el-input v-model.number="rx" class="input"></el-input>
    </div>
    
    <!--Y轴旋转-->
    <div class="tool">
        <div style="color:white">Y轴旋转</div>
        <el-slider v-model.number="ry" :min="-100" :max="100" :step="1" style="width:180px"></el-slider>
        <el-input v-model.number="ry" class="input"></el-input>
    </div>

    <!--Z轴旋转-->
    <div class="tool">
        <div style="color:white">Z轴旋转</div>
        <el-slider v-model.number="rz" :min="-100" :max="100" :step="1" style="width:180px"></el-slider>
        <el-input v-model.number="rz" class="input"></el-input>
    </div>

    <!--经度平移-->
    <div class="tool">
        <div style="color:white">经度平移</div>
        <el-slider v-model.number="tLon" :min="-100" :max="100" :step="1" style="width:180px"></el-slider>
        <el-input v-model.number="tLon" class="input"></el-input>
    </div>

    <!--纬度平移-->
    <div class="tool">
        <div style="color:white">维度平移</div>
        <el-slider v-model.number="tLat" :min="-100" :max="100" :step="1" style="width:180px"></el-slider>
        <el-input v-model.number="tLat" class="input"></el-input>
    </div>

    <!--缩放-->
    <div class="tool">
        <div style="color:white">缩放</div>
        <el-slider v-model.number="scale" :min="0.1" :max="10" :step="0.01" style="width:180px"></el-slider>
        <el-input v-model.number="scale" class="input"></el-input>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import { onMounted, ref, watch } from 'vue'

const { tileset } = defineProps<{ tileset: Cesium.Cesium3DTileset }>();

const height = ref(0);
const tLon = ref(0), tLat = ref(0), rx = ref(0), ry = ref(0), rz = ref(0);
const scale = ref(1);
let starCartographic: Cesium.Cartographic;
let mStar: Cesium.Matrix4;

interface ModelParams {
  x: number
  y: number
  z: number
}
let params: ModelParams = { x: 0, y: 0, z: 0 };


onMounted(async () => {
  starCartographic = Cesium.Cartographic.fromCartesian(tileset.boundingSphere.center);
  //获取模型中心坐标（弧度=>经纬度）
  params = {
    x: Cesium.Math.toDegrees(starCartographic.longitude),
    y: Cesium.Math.toDegrees(starCartographic.latitude),
    z: starCartographic.height
  }
  //获取模型矩阵
  mStar = tileset.root.transform
})


watch(height, (height) => {
  if (isNaN(height))
    return;
  let surface = Cesium.Cartesian3.fromRadians(
    starCartographic.longitude,
    starCartographic.latitude
  )
  let offset = Cesium.Cartesian3.fromRadians(
    starCartographic.longitude,
    starCartographic.latitude,
    height
  )
  let translation = Cesium.Cartesian3.subtract(
    offset,
    surface,
    new Cesium.Cartesian3()
  )
  tileset.modelMatrix = Cesium.Matrix4.fromTranslation(translation);
})
watch([tLon, tLat, rx, ry, rz], ([tLon, tLat, rx, ry, rz]) => {
  params.x = Cesium.Math.toDegrees(starCartographic.longitude) + tLon / 10000;
  params.y = Cesium.Math.toDegrees(starCartographic.latitude) + tLat / 10000;
  let mrx3 = Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(rx));
  let mry3 = Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(ry));
  let mrz3 = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(rz));
  let mrx4 = Cesium.Matrix4.fromRotationTranslation(mrx3);
  let mry4 = Cesium.Matrix4.fromRotationTranslation(mry3);
  let mrz4 = Cesium.Matrix4.fromRotationTranslation(mrz3);
  let center = Cesium.Cartesian3.fromDegrees(params.x, params.y, params.z);
  let m = Cesium.Transforms.eastNorthUpToFixedFrame(center);
  Cesium.Matrix4.multiply(m, mrx4, m);
  Cesium.Matrix4.multiply(m, mry4, m);
  Cesium.Matrix4.multiply(m, mrz4, m);
  tileset.root.transform = m;
})
watch(scale, (scale) => {
  let mScale = Cesium.Matrix4.fromUniformScale(scale);
  let m = Cesium.Matrix4.multiply(mStar, mScale, new Cesium.Matrix4());
  tileset.root.transform = m;
})
</script>

<style scoped>
.adjustDiv {
  position: absolute;
  top: 50px;
  left: 25px;
  text-align: left;
  background-color: rgba(0, 0, 0, 0.6);
  padding: 8px;
}
.tool{
    padding:7px
}
.input{
    width:200px;
    height:30px;
}
</style>
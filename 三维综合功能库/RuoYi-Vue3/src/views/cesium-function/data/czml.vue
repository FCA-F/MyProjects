<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady"/>
        <DraggableModal title="CZML">
            <div class="row">
                <el-button class="draw-button" @click="switchMove" :color="isMove?'red':'greenyellow'">{{ isMove?'停止':'移动' }}</el-button>
            </div>
            <div class="row">
                <span class="label">跟踪</span>
                <el-switch v-model="isTrack"></el-switch>
            </div>
        </DraggableModal>
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import {initCesiumBase} from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

let viewer:Cesium.Viewer
let handler:Cesium.ScreenSpaceEventHandler;
let car:Cesium.Entity

const isMove=ref(false)
const isTrack=ref(false)

let czml=[
    {
        'id':'document',
        'version':'1.0',
        'clock':{
            'interval':'2021-05-10T04:00:00Z/2021-05-10T04:00:30Z',
            'currentTime':'2021-05-10T04:00:00Z'
        }
    },
    {
        'id':'car',
        'model':{
            'gltf':'http://localhost:82/car/scene.gltf',
            'scale':100
        },
        'position':{
            'cartesian':[
            '2021-05-10T04:00:00Z',-2271346.7585718394,5008081.997720291,3220430.7645143294,
            '2021-05-10T04:00:02Z',-2271356.650543733,5008177.686692595,3220262.8977986122,
            '2021-05-10T04:00:04Z',-2271366.4277470224,5008284.675651967,3220092.136217338,
            '2021-05-10T04:00:06Z',-2271372.989133939,5008362.393619646,3219967.859412367,
            '2021-05-10T04:00:08Z',-2271385.571597765,5008469.653632369,3219788.8118289243,
            '2021-05-10T04:00:10Z',-2271399.599840785,5008580.966750882,3219603.791858696,
            '2021-05-10T04:00:12Z',-2271402.465493853,5008653.68652323,3219482.0757303513,
            '2021-05-10T04:00:14Z',-2271416.4697785107,5008703.647535272,3219393.8132029143,
            '2021-05-10T04:00:15Z',-2271449.9372667116,5008834.604125238,3219179.578691445,
            '2021-05-10T04:00:16Z',-2271416.4697785107,5008703.647535272,3219393.8132029143,
            '2021-05-10T04:00:18Z',-2271402.465493853,5008653.68652323,3219482.0757303513,
            '2021-05-10T04:00:20Z',-2271399.599840785,5008580.966750882,3219603.791858696,
            '2021-05-10T04:00:22Z',-2271385.571597765,5008469.653632369,3219788.8118289243,
            '2021-05-10T04:00:24Z',-2271372.989133939,5008362.393619646,3219967.859412367,
            '2021-05-10T04:00:26Z',-2271366.4277470224,5008284.675651967,3220092.136217338,
            '2021-05-10T04:00:28Z',-2271356.650543733,5008177.686692595,3220262.8977986122,
            '2021-05-10T04:00:30Z',-2271346.7585718394,5008081.997720291,3220430.7645143294
            ]
        },
        viewFrom: { cartesian: [15, 100, 20] }//视角跟踪
    },
]

let startTime=new Date('2021-05-10T04:00:00Z');
let stopTime=new Date('2021-05-10T04:00:30Z');

const onMapReady=(cesiumViewer:Cesium.Viewer)=>{
    viewer=cesiumViewer
    handler=new Cesium.ScreenSpaceEventHandler(viewer.canvas)
    initCesiumBase(viewer,{
        destination:{lng: 114.39564,lat: 30.52214,height: 2000},
        //orientation:{heading:140,pitch:-30,roll:0},
        terrain:true,
        osm:true,
        depthTestAgainstTerrain:true,
    })

    loadCZML()
    setTime()
}

const loadCZML=()=>{
    viewer.dataSources.add(Cesium.CzmlDataSource.load(czml)).then((dataSource)=>{
        car=dataSource.entities.getById('car') as Cesium.Entity;
        car.orientation=new Cesium.VelocityOrientationProperty(car.position);//车头朝向前进方向
        viewer.zoomTo(car)
    })
}

const setTime=()=>{
    viewer.clock.startTime=Cesium.JulianDate.fromDate(startTime);
    viewer.clock.stopTime=Cesium.JulianDate.fromDate(stopTime);
    viewer.clock.currentTime=Cesium.JulianDate.fromDate(startTime);
    viewer.clock.clockRange=Cesium.ClockRange.LOOP_STOP;
    viewer.clock.clockStep=Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER;
    viewer.clock.multiplier=1;
}

const switchMove=()=>{
    if(isMove.value){
        isMove.value=false
        stopMove()
    }
    else{
        isMove.value=true
        runMove()
    }
}

const runMove=()=>{
    viewer.clock.shouldAnimate=true
}

const stopMove=()=>{
    viewer.clock.shouldAnimate=false
}

watch(isTrack,(isTrack)=>{
    viewer.trackedEntity=isTrack?car:undefined
})

</script>
<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>
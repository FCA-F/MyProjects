<template>
    <div class="toolbar">
        <label class="oneText">汽车移动</label>
        <div class="row">
            <button @click="carMove()":class="['startOrStopBtn',carMoving?'red':'']">{{startOrStopText}}</button>
            <button @click="setViewCar()" class="AssistiveBtn">定位</button>
        </div>
    </div>
</template>
<script setup>
import* as Cesium from 'cesium'
import{ref,onMounted}from'vue'

const props=defineProps({viewer:{type:Object,required:true}});
const viewer=props.viewer;
const carMoving=ref(false);
const startOrStopText=ref('开始');
let car,carPositionProperty;//车，车位置属性(增加功能时可用)

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
            'gltf':'./data/car/scene.gltf',
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
        }
    }
]

//加载车
onMounted(()=>{
    viewer.dataSources.add(Cesium.CzmlDataSource.load(czml)).then((dataSource)=>{
    car=dataSource.entities.getById('car');
    car.orientation=new Cesium.VelocityOrientationProperty(car.position);
    carPositionProperty=car.position;
    });
});

//车移动
const carMove=()=>{
    let startTime=new Date('2021-05-10T04:00:00Z');
    let stopTime=new Date('2021-05-10T04:00:30Z');
    viewer.clock.startTime=Cesium.JulianDate.fromDate(startTime);
    viewer.clock.stopTime=Cesium.JulianDate.fromDate(stopTime);
    viewer.clock.currentTime=Cesium.JulianDate.fromDate(startTime);
    viewer.clock.clockRange=Cesium.ClockRange.LOOP_STOP;
    viewer.clock.clockStep=Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER;
    viewer.clock.multiplier=1;

    if(!carMoving.value)
    {
        carMoving.value=true;
        startOrStopText.value='结束';
        move();
    }
    else
    {
        carMoving.value=false;
        startOrStopText.value='开始';
        stopMove();
    }
}

let animationFrameId;

const move=()=>{
    viewer.clock.shouldAnimate=true;
    animationFrameId=requestAnimationFrame(animateCar);//执行一帧
}

const stopMove=()=>{
    viewer.clock.shouldAnimate=false;
    cancelAnimationFrame(animationFrameId);
    animationFrameId=null;
}
//帧渲染
const animateCar=()=>{
    animationFrameId=requestAnimationFrame(animateCar);
}

const setViewCar=()=>{
    viewer.zoomTo(car);
}
</script>
<style scoped>
</style>
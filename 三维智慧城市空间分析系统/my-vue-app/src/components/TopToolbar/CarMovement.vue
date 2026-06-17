<template>
    <div v-if="isShow"
        ref="modal"
        @mousedown="startMove"
        :style="{left:modal_x+'px',top:modal_y+'px'}"
        class="modal"
    >
        <!-- 标题栏 -->
        <div class="modal-header">
            <span class="title">汽车移动</span>
            <el-button @click="isShow=false" circle class="close-modal-btn" color="red" icon="closeBold"></el-button>
        </div>

        <!-- 表单内容区 -->
        <div class="modal-body">
            <div class="row" style="justify-content:center;">
                <el-button @click="carMove()" :color="carMoving?'red':'green'" class="button">{{startOrStopText}}</el-button>
                <el-button @click="setViewCar()" class="button" color="purple">定位</el-button>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import* as Cesium from 'cesium'
import{ref,onMounted,onUnmounted}from'vue'
import{useCesiumStore} from '../../stores/cesium.ts'

let viewer:Cesium.Viewer;

const carMoving=ref(false);
const startOrStopText=ref('开始');
let car:Cesium.Entity;

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

let startTime=new Date('2021-05-10T04:00:00Z');
let stopTime=new Date('2021-05-10T04:00:30Z');

//加载车
onMounted(()=>{
    const cesiumStore=useCesiumStore();
    viewer=cesiumStore.viewer as Cesium.Viewer

    viewer.clock.startTime=Cesium.JulianDate.fromDate(startTime);
    viewer.clock.stopTime=Cesium.JulianDate.fromDate(stopTime);
    viewer.clock.currentTime=Cesium.JulianDate.fromDate(startTime);
    viewer.clock.clockRange=Cesium.ClockRange.LOOP_STOP;
    viewer.clock.clockStep=Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER;
    viewer.clock.multiplier=1;

    viewer.dataSources.add(Cesium.CzmlDataSource.load(czml)).then((dataSource)=>{
    car=dataSource.entities.getById('car') as Cesium.Entity;
    car.orientation=new Cesium.VelocityOrientationProperty(car.position);
    });
});

//车移动
const carMove=()=>{
    if(!carMoving.value)
    {
        carMoving.value=true;
        startOrStopText.value='结束';
        carStartMove();
    }
    else
    {
        carMoving.value=false;
        startOrStopText.value='开始';
        carStopMove();
    }
}

const carStartMove=()=>{
    viewer.clock.shouldAnimate=true;
}

const carStopMove=()=>{
    viewer.clock.shouldAnimate=false;
}
const setViewCar=()=>{
    viewer.zoomTo(car);
}

//鼠标移动
const modal=ref();
const isShow=ref(true);
const modal_x=ref(200);
const modal_y=ref(200);

let offsetX:number,offsetY:number;

const startMove=(e:MouseEvent)=>{
    offsetX=e.clientX-modal.value.offsetLeft;
    offsetY=e.clientY-modal.value.offsetTop;
    document.addEventListener('mousemove',beMoving);
    document.addEventListener('mouseup',stopMove)
}

const beMoving=(e:MouseEvent)=>{
    modal_x.value=e.clientX-offsetX;
    modal_y.value=e.clientY-offsetY;
}

const stopMove=()=>{
    document.removeEventListener('mousemove',beMoving);
}

onUnmounted(()=>{
    document.removeEventListener('mousemove',beMoving);
    document.removeEventListener('mouseup',stopMove);
})
</script>
<style scoped>
.modal{position:absolute;width:400px;height:160px;background-color:#ffffff;
    border-radius:12px;z-index:1;overflow: hidden;
}
/* 弹窗标题栏 */
.modal-header {height:50px;background-color:#1E88E5;display:flex;align-items:center;justify-content:center;position:relative;}
.title {font-size:18px;font-weight:bold;color:#fff;}
/* 关闭按钮 */
.close-modal-btn{position:absolute;top:10px;right:15px;}
/*内容区域*/
.modal-body{padding:30px 25px;display:flex;flex-direction:column;gap:20px}
/*表单项行*/
.row{display:flex;align-items:center;gap:15px;}
/*标签文本*/
.label{width:80px;font-size:15px;font-weight:500;color:#333;text-align:left;}
/*输入*/
.input{width:300px;height:32px}
/*按钮*/
.button{width:130px;height:35px}
/*绘制按钮*/
.drawButton{width:150px;height:40px}
</style>
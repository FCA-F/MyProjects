<template>
    <div v-if="isShow"
        ref="modal"
        @mousedown="startMove"
        :style="{left:modal_x+'px',top:modal_y+'px'}"
        class="modal"
    >
        <!-- 标题栏 -->
        <div class="modal-header">
            <span class="title">添加模型</span>
            <el-button @click="closeModal" circle class="close-modal-btn" color="red" icon="closeBold"></el-button>
        </div>

        <!-- 表单内容区 -->
        <div class="modal-body">
            <div class="body-row">
                 <el-button id="树" class="grid-btn"
                    style="background-image: url(/data/AddModel/picture/树.png);"
                    @click='modelName="树"'
                    >树</el-button>

                <el-button id="石头" class="grid-btn"
                style="background-image: url(/data/AddModel/picture/石头.png);"
                @click="modelName='石头'"
                >石头</el-button>

                <el-button id="路灯" class="grid-btn"
                style="background-image: url(/data/AddModel/picture/路灯.png);"
                @click="modelName='路灯'"
                >路灯</el-button>

                <el-button id="亭子" class="grid-btn"
                style="background-image: url(/data/AddModel/picture/亭子.png);"
                @click="modelName='亭子'"
                >亭子</el-button>
            </div>
             <div class="body-row">
                <div class="grid-btn">树</div>
                <div class="grid-btn">石头</div>
                <div class="grid-btn">路灯</div>
                <div class="grid-btn">亭子</div>
            </div>
            <div class="body-row">
                <el-button class="grid-btn">自行车</el-button>
                <el-button class="grid-btn">汽车</el-button>
                <el-button class="grid-btn">船</el-button>
                <el-button class="grid-btn">飞机</el-button>
            </div>
            <div class="body-row">
                <el-button class="grid-btn">9</el-button>
                <el-button class="grid-btn">10</el-button>
                <el-button class="grid-btn">11</el-button>
                <el-button class="grid-btn">12</el-button>
            </div>
            <div class="body-row">
                <el-button class="grid-btn">13</el-button>
                <el-button class="grid-btn">14</el-button>
                <el-button class="grid-btn">15</el-button>
                <el-button class="grid-btn">16</el-button>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import* as Cesium from 'cesium'
import{ref,onMounted,onUnmounted}from'vue'
import{useCesiumStore} from '@/stores/cesium.ts'

let viewer:Cesium.Viewer
const cesiumStore=useCesiumStore();
let handler:Cesium.ScreenSpaceEventHandler;
const modelName=ref('')

onMounted(()=>{
    viewer=cesiumStore.viewer as Cesium.Viewer
    handler=new Cesium.ScreenSpaceEventHandler(viewer.canvas)

    //添加模型
    handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
    handler.setInputAction((event:Cesium.ScreenSpaceEventHandler.PositionedEvent)=>{
        let pickPosition=viewer.scene.pickPosition(event.position)
        if(!Cesium.defined(pickPosition))
        return;
        let model=viewer.entities.add({
            position:pickPosition,
            model:{
                uri:`/data/AddModel/model/${modelName.value}.glb`,
                scale:1
            }
        })
        if(Cesium.defined(model)){

        }
    },Cesium.ScreenSpaceEventType.LEFT_CLICK)
})

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

const closeModal=()=>{
    isShow.value=false;
    handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);

    document.removeEventListener('mousemove',beMoving);
    document.removeEventListener('mouseup',stopMove);
}

onUnmounted(()=>{
    modelName.value=''
    handler.destroy()

    document.removeEventListener('mousemove',beMoving);
    document.removeEventListener('mouseup',stopMove);
})
</script>
<style scoped>
.modal{position:absolute;width:600px;height:600px;background-color:#ffffff;
    border-radius:12px;z-index:1;overflow: hidden;
}
/* 弹窗标题栏 */
.modal-header {height:50px;background-color:#1E88E5;display:flex;align-items:center;justify-content:center;position:relative;}
.title {font-size:18px;font-weight:bold;color:#fff;}
/* 关闭按钮 */
.close-modal-btn{position:absolute;top:10px;right:15px;}

/*内容区域*/
.modal-body{padding:30px 25px;gap:28px;display: flex;flex-direction: column;}
/* 模型按钮网格布局 */
.grid-btn{width:100px;height:100px;
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;}

/* 单行按钮容器 一行4个均分排列 */
.body-row{display:flex;justify-content:space-between;}
.text{width:100px;height:100px;color:black;font-size:15px;text-align:center}

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
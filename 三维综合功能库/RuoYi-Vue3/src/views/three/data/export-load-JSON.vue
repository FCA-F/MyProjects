<template>
    <div class="page-container">
        <div ref="container" class="page-container"></div>
        <draggableModal title="添加、删除">
            <div class="row">
                <el-button @click="exportJSON" color="greenyellow">导出JSON</el-button>
            </div>
            <div class="row">
                <el-button @click="triggerFileInput" color="greenyellow">导入JSON</el-button>
                <input ref="fileInput" type="file" accept=".json" style="display: none" @change="loadJSON" />
            </div>
            <div class="row">
                <el-button @click="addMesh" color="green">添加</el-button>
                <el-button @click="reomveMesh" color="red">删除</el-button>
            </div>
        </draggableModal>
    </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import * as THREE from 'three'
import { initThree } from '@/utils/three';
import draggableModal from '@/components/Common/draggable-modal.vue';
import '@/components/Common/draggable-modal.css'

let scene: THREE.Scene

const container = ref<HTMLDivElement>()
const fileInput = ref<HTMLInputElement>();

onMounted(() => {
    const initResult = initThree(container.value!, { position: { x: 0, y: 5, z: 20 } })
    scene = initResult.scene

    addGround()
})


const addMesh = () => {
    const color = randomColor()
    const position = randomPosition()
    const rotation = randomRotation()

    const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5)
    const mat = new THREE.MeshStandardMaterial(
        {
            color: color,
            //roughness: 0.1,//粗糙度，1粗糙
            //metalness: 0.9//金属度，1金属
        }
    )
    const cube = new THREE.Mesh(geo, mat)
    cube.position.copy(position)
    cube.rotation.setFromVector3(rotation)
    cube.castShadow = true
    cube.userData.isExportable = true
    scene.add(cube)
}

const reomveMesh = () => {
    const children = scene.children[scene.children.length - 1]
    if (children instanceof THREE.Mesh && children.name != 'ground')
        scene.remove(children)
}

const randomColor = () => {
    const r = Math.random()
    const g = Math.random()
    const b = Math.random()
    return new THREE.Color(r, g, b)
}

const randomPosition = () => {
    const x = -8 + Math.random() * 8
    const y = Math.random() * 8
    const z = -4 + Math.random() * 8
    return new THREE.Vector3(x, y, z)
}

const randomRotation = () => {
    const x = Math.random() * (Math.PI * 2)
    const y = Math.random() * (Math.PI * 2)
    const z = Math.random() * (Math.PI * 2)
    return new THREE.Vector3(x, y, z)
}

const addGround = () => {
    const groundGeo = new THREE.PlaneGeometry(10000, 10000)
    const groundMat = new THREE.MeshLambertMaterial({ color: 0xffffff })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.name = 'ground'
    ground.position.set(0, -2, 0)
    ground.rotation.set(Math.PI / -2, 0, 0)
    ground.receiveShadow = true
    scene.add(ground)
}

const exportJSON = () => {
    const exportData: any[] = [];

    scene.traverse((child) => {
        // 只导出标记过的 Mesh
        if (child.userData.isExportable && child instanceof THREE.Mesh) {

            const meshData = child.toJSON();
            exportData.push(meshData);
        }
    });

    if (exportData.length === 0) {
        alert('没有可导出的模型！');
        return;
    }

    // 转成字符串并下载
    const jsonStr = JSON.stringify(exportData);//json->string
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });//string->二进制文件数据
    const url = URL.createObjectURL(blob);//​给Blob生成一个临时的UR 地址
    const link = document.createElement('a');//创建一个链接
    link.href = url;//链接地址
    link.download = `meshes_${Date.now()}.json`;//指明下载，下载名称
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// 触发文件选择框
const triggerFileInput = () => {
    fileInput.value?.click();
};

// 读取并加载 JSON 文件
const loadJSON = (event: Event) => {
    const target = event.target as HTMLInputElement;//事件
    const file = target.files?.[0];//取第一个文件

    if (!file) {
        alert('没有选择文件！');
        return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {//注册回调，e:事件
        try {
            const text = e.target?.result as string;//文本内容

            const dataArray = JSON.parse(text);

            if (!Array.isArray(dataArray)) {
                alert('JSON 格式不正确，期望是一个数组！');
                return;
            }

            const loader = new THREE.ObjectLoader();

            // 遍历数组，逐个解析并添加到场景
            dataArray.forEach((meshJson) => {

                const parsedObject = loader.parse(meshJson);

                if (parsedObject instanceof THREE.Object3D) {
                    // 重新打上导出标记，方便下次导出
                    parsedObject.userData.isExportable = true;

                    // 如果是 Mesh，重新开启阴影
                    if (parsedObject instanceof THREE.Mesh) {
                        parsedObject.castShadow = true;
                    }

                    // 添加到场景
                    scene.add(parsedObject);
                }
            });

            alert(`成功导入模型！`);

        } catch (error) {
            alert('文件解析失败，请检查 JSON 格式！');
        }
    };

    reader.readAsText(file);//读取信息

    // 清空 input 的 value，这样下次选同一个文件也能触发 change 事件
    target.value = '';
};

</script>

<style>
.page-container {
    width: 100%;
    height: 100%;
}
</style>
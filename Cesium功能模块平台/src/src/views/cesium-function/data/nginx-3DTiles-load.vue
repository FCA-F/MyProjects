<template>
    <div class="page-container">
        <CesiumMap @ready="onMapReady" />
    </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import CesiumMap from '@/components/CesiumMap/CesiumMap.vue'
import DraggableModal from '@/components/Common/draggable-modal.vue'
import {initCesiumBase} from '@/utils/cesium'
import '@/components/Common/draggable-modal.css'

let viewer:Cesium.Viewer
let tileset:Cesium.Cesium3DTileset

const onMapReady=async (cesiumViewer:Cesium.Viewer)=>{
    viewer=cesiumViewer

    tileset=await Cesium.Cesium3DTileset.fromUrl("http://localhost:82/daYanTa/tileset.json")
    viewer.scene.primitives.add(tileset)
    viewer.zoomTo(tileset)
}

/*

数据加载步骤：

一、准备 Nginx
        1. 下载 Nginx

        去官网下载 Windows 版本：

        https://nginx.org/en/download.html

        2. 解压到固定目录

        解压后里面应该有：

        text
        nginx.exe
        conf\
        logs\
        html\
        temp\
二、准备 3D Tiles 数据

把你的模型目录准备好，里面至少有tileset.json

三、修改 nginx.conf
打开：nginx-1.30.4\conf\nginx.conf
示例：
server {
        listen       82;
        server_name  localhost;

        #access_log  logs/host.access.log  main;

        location / {
            root   html;
            index  index.html index.htm;
        }

	# ==================== 3D Tiles 发布配置 ====================
        location /tiles/ {
        alias E:/study/WEBGIS/RuoYi/RuoYi/data/nginx_data/daYanTa_3DTiles/;
        autoindex on;
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods 'GET, OPTIONS';
        add_header Access-Control-Allow-Headers 'Range,DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';
        types {
            application/json json;
            model/gltf-binary glb;
            application/octet-stream b3dm;
            application/octet-stream pnts;
        }
    }

关键：路径一定要用 正斜杠 /，末尾要加/

四、检查配置是否正确

在Nginx目录打开cmd：

执行：nginx -t

如果看到类似：syntax is ok，test is successful说明配置没问题。

五、启动 Nginx

双击：nginx.exe

如果新建或更改文件配置需在cmd输入nginx -s reload
如果启动了多个nginx.exe，输入taskkill /F /IM nginx.exe关闭，否则线程被占用

六、访问测试

浏览器打开：

http://localhost:82/tiles/tileset.json。如果能看到 JSON 内容，说明发布成功。
http://localhost:82/daYanTa/tileset.json

七、Cesium 中加载

成功发布后，Cesium 里写：


const tileset = await Cesium.Cesium3DTileset.fromUrl(
  "http://localhost:82/tiles/tileset.json"
);

viewer.scene.primitives.add(tileset);
viewer.zoomTo(tileset);

*/

</script>
<style scoped>
.page-container {
  width: 100%;
  height: 100%;
}
</style>


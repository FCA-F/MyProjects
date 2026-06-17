import { createApp } from 'vue'
import {createPinia} from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'

//导入Element Plus和样式
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

//导入所有Element Plus图标
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const app=createApp(App)

//使用Element Plus插件
app.use(ElementPlus)
//使用路由
app.use(router)
//使用pinia
app.use(createPinia())

// 全局注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}


app.mount('#app')

import { createRouter, createWebHistory } from 'vue-router'

const routes=[
    {
        path:'/',
        name:'Login',
        component:()=>import('../views/Cesium.vue')//真实路径为../views/Login.vue
    },
    {
        path:'/Cesium',
        name:'Cesium',
        component:()=>import('../views/Cesium.vue')
    }
]

const router=createRouter({
  history:createWebHistory(), 
  routes
})

export default router
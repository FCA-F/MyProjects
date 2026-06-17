import { createRouter, createWebHistory } from 'vue-router'

const routes=[
    {
        path:'/',
        name:'Home',
        component:()=>import('../views/Login.vue')
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
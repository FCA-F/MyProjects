import {
    createRouter,
    createWebHistory,
} from 'vue-router'

const routes = [
    {
        path: '/',
        redirect: '/login',
    },
    {
        path: '/login',
        name: 'Login',
        component: () => import('../views/Login.vue'),
    },
    {
        path: '/cesium',
        name: 'Cesium',
        component: () => import('../views/Cesium.vue'),
        meta: {
            requiresAuth: true,
        },
    },
    {
        path: '/register',
        name: 'Rrgister',
        component: () => import('../views/Register.vue'),
    },
    {
        path: '/:pathMatch(.*)*',
        redirect: '/login',
    },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

router.beforeEach((to) => {
    const token = localStorage.getItem('token')

    if (to.meta.requiresAuth && !token) {
        return '/login'
    }

    if (to.path === '/login' && token) {
        return '/cesium'
    }

    return true
})

export default router
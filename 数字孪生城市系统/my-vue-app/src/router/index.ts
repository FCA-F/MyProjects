import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { validateToken } from '@/api/auth'

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        redirect: '/login',
    },
    {
        path: '/login',
        name: 'Login',
        component: () => import('@/views/auth/login.vue'),
    },
    {
        path: '/register',
        name: 'Register',
        component: () => import('@/views/auth/register.vue'),
    },
    {
        path: '/app',
        component: () => import('@/layouts/main-layout.vue'),
        meta: {
            requiresAuth: true,
        },
        redirect: '/app/home',
        children: [
            {
                path: 'home',
                name: 'home',
                component: () => import('@/views/app/home.vue'),
            },
            {
                path: 'spatial-analysis',
                name: 'spatial-analysis',
                component: () => import('@/views/app/spatial-analysis.vue'),
            },
            {
                path: 'city-roaming',
                name: 'city-roaming',
                component: () => import('@/views/app/city-roaming.vue'),
            },
            {
                path: 'road-management',
                name: 'road-management',
                component: () => import('@/views/app/road-management.vue'),
            },
            {
                path: 'drone-flying',
                name: 'drone-flying',
                component: () => import('@/views/app/drone-flying.vue'),
            },
            {
                path: 'ai-assistant',
                name: 'ai-assistant',
                component: () => import('@/views/app/ai-assistant.vue'),
            },
            {
                path: 'operation-logs',
                name: 'operation-logs',
                component: () => import('@/views/app/operation-logs.vue'),
                meta: {
                    adminOnly: true,
                },
            },
        ],
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

const TOKEN_VALIDATION_CACHE_MS = 30 * 1000
let validatedToken = ''
let validatedAt = 0
let validationPromise: Promise<boolean> | undefined

const clearStoredSession = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    validatedToken = ''
    validatedAt = 0
}

const checkToken = async (token: string) => {
    const now = Date.now()

    if (
        token === validatedToken &&
        now - validatedAt < TOKEN_VALIDATION_CACHE_MS
    ) {
        return true
    }

    if (validationPromise) {
        return validationPromise
    }

    validationPromise = validateToken(token)
        .then((response) => {
            const result = response.data
            const isValid = result.code === 200 && result.data === true

            if (isValid) {
                validatedToken = token
                validatedAt = Date.now()
                return true
            }

            clearStoredSession()
            return false
        })
        .catch((error: unknown) => {
            const status = (
                error as { response?: { status?: number } }
            ).response?.status

            if (status === 401) {
                clearStoredSession()
                return false
            }

            // 后端暂时不可用时保留本地登录状态，避免误登出。
            validatedToken = token
            validatedAt = Date.now()
            return true
        })
        .finally(() => {
            validationPromise = undefined
        })

    return validationPromise
}

router.beforeEach(async (to) => {
    const token = localStorage.getItem('token')
    const user = JSON.parse(localStorage.getItem('user') || 'null') as { role?: string } | null

    if (token) {
        const isValid = await checkToken(token)

        if (!isValid) {
            if (to.name === 'Login' || to.name === 'Register') {
                return true
            }

            return {
                name: 'Login',
                query: {
                    redirect: to.fullPath,
                },
            }
        }
    }

    if (to.meta.requiresAuth && !localStorage.getItem('token')) {
        return {
            name: 'Login',
            query: {
                redirect: to.fullPath,
            },
        }
    }

    if (
        (to.name === 'Login' || to.name === 'Register') &&
        localStorage.getItem('token')
    ) {
        return {
            name: 'home',
        }
    }

    if (
        to.matched.some((record) => record.meta.adminOnly) &&
        user?.role !== 'admin'
    ) {
        return {
            name: 'home',
        }
    }

    return true
})

export default router

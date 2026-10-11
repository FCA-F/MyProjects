import { API_BASE_URL } from '@/config/api'

export interface RequestOptions {
    url: string
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    data?: Record<string, unknown> | string
    timeout?: number
}

function getToken() {
    return uni.getStorageSync('smart-city-token') || ''
}

function clearSession() {
    uni.removeStorageSync('smart-city-token')
    uni.removeStorageSync('smart-city-user')
}

function getErrorMessage(data: unknown, fallback: string) {
    if (typeof data === 'object' && data !== null && 'message' in data) {
        const message = (data as { message?: unknown }).message
        if (typeof message === 'string' && message.trim()) {
            return message
        }
    }
    return fallback
}

export function request<T>(options: RequestOptions): Promise<T> {
    return new Promise((resolve, reject) => {
        const token = getToken()
        const header: Record<string, string> = {
            'Content-Type': 'application/json',
        }

        if (token) {
            header.Authorization = `Bearer ${token}`
        }

        uni.request({
            url: `${API_BASE_URL}${options.url}`,
            method: options.method || 'GET',
            data: options.data,
            header,
            timeout: options.timeout || 10000,
            success: (response) => {
                if (response.statusCode === 401) {
                    clearSession()
                    uni.showToast({
                        title: '登录已过期',
                        icon: 'none',
                    })
                    reject(new Error('登录已过期，请重新登录'))
                    return
                }

                if (response.statusCode < 200 || response.statusCode >= 300) {
                    reject(new Error(getErrorMessage(response.data, `请求失败（${response.statusCode}）`)))
                    return
                }

                resolve(response.data as T)
            },
            fail: (error) => {
                reject(new Error(error.errMsg || '网络连接失败，请检查服务是否可用'))
            },
        })
    })
}

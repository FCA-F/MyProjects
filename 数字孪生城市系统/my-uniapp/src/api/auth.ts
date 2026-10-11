import { request } from './request'

export interface LoginVO {
    id: number
    username: string
    nickname: string
    role: string
    token: string
}

export interface ApiResult<T> {
    code: number
    message: string
    data: T
}

export interface CurrentUser {
    id: number
    username: string
    nickname: string
    role: string
}

export function login(username: string, password: string) {
    return request<ApiResult<LoginVO>>({
        url: '/login',
        method: 'POST',
        data: { username, password },
    })
}

export function logout() {
    return request<unknown>({
        url: '/logout',
        method: 'POST',
    })
}

export function saveSession(loginData: LoginVO) {
    const user: CurrentUser = {
        id: loginData.id,
        username: loginData.username,
        nickname: loginData.nickname,
        role: loginData.role,
    }
    uni.setStorageSync('smart-city-token', loginData.token)
    uni.setStorageSync('smart-city-user', user)
    return user
}

export function getStoredUser() {
    return uni.getStorageSync('smart-city-user') as CurrentUser | null
}

export function hasSession() {
    return Boolean(uni.getStorageSync('smart-city-token'))
}

export function clearStoredSession() {
    uni.removeStorageSync('smart-city-token')
    uni.removeStorageSync('smart-city-user')
}


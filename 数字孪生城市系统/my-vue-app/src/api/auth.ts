import request from './request'

export interface LoginRequest {
    username: string
    password: string
}

export interface LoginVO {
    id: number
    username: string
    nickname: string
    role: string
    token: string
}

export interface Result<T> {
    code: number
    message: string
    data: T
}

export function login(data: LoginRequest) {
    return request.post<Result<LoginVO>>('/login', data)
}

export interface RegisterRequest {
    username: string
    password: string
    confirmPassword: string
    nickname?: string
}

export function register(data: RegisterRequest) {
    return request.post<Result<null>>('/register', data)
}

export function logout() {
    return request.post('/logout')
}

export function validateToken(token: string) {
    return request.get<Result<boolean>>('/validToken', { params: { token } })
}

// 保留旧名称，避免已有调用方因为拼写修正而失效。
export const vaildToken = validateToken

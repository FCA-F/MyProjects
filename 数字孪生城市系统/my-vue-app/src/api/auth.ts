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

export interface ApiResult<T> {
    code: number
    message: string
    data: T
}

export function login(data: LoginRequest) {
    return request.post<ApiResult<LoginVO>>('/login', data)
}

export interface RegisterRequest {
    username: string
    password: string
    confirmPassword: string
    nickname?: string
}

export function register(data: RegisterRequest) {
    return request.post<ApiResult<null>>('/register', data)
}
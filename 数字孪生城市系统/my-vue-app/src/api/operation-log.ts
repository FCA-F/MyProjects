import request from './request'

export interface OperationLog {
    id: number
    username: string | null
    role: string | null
    operation: string
    requestMethod: string | null
    requestUri: string | null
    statusCode: number | null
    success: number
    errorMessage: string | null
    costTime: number | null
    ip: string | null
    createTime: string
}

export interface OperationLogPage {
    total: number
    page: number
    size: number
    records: OperationLog[]
}

export function getOperationLogPage(params: {
    page: number
    size: number
    username?: string
    operation?: string
    success?: number
}) {
    return request.get<{
        code: number
        message: string
        data: OperationLogPage
    }>('/operation-logs/page', { params })
}
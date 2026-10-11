import request from './request'

export interface Result<T> {
    code: number
    message: string
    data: T
}

export interface ChatReplyVO {
    reply: string
}

export function sendChat(content: string) {
    return request.post<Result<ChatReplyVO>>(
        '/ai/chat',
        { content },//请求体
        {
            timeout: 90000,
        },
    )
}
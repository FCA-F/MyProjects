import { request } from './request'

export interface Result<T> {
    code: number
    message: string
    data: T
}

export interface ChatReply {
    reply: string
}

export function sendChat(content: string) {
    return request<Result<ChatReply>>({
        url: '/ai/chat',
        method: 'POST',
        data: { content },
        timeout: 90000,
    })
}

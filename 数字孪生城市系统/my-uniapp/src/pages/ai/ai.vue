<template>
    <view class="page">
        <view class="chat-header">
            <view>
                <text class="eyebrow">智能问答</text>
                <text class="title">AI 助手</text>
                <text class="subtitle">输入问题，获取辅助建议</text>
            </view>
            <button class="clear-button" hover-class="clear-button--pressed" @tap="clearMessages">
                清空
            </button>
        </view>

        <scroll-view
            class="message-list"
            scroll-y
            enhanced
            :scroll-top="scrollTop"
        >
            <view
                v-for="message in messages"
                :key="message.id"
                class="message-row"
                :class="message.role"
            >
                <view class="avatar">
                    <text>{{ message.role === 'user' ? '我' : 'AI' }}</text>
                </view>
                <view class="message-bubble">
                    <text>{{ message.content }}</text>
                </view>
            </view>

            <view v-if="isLoading" class="message-row assistant">
                <view class="avatar">
                    <text>AI</text>
                </view>
                <view class="message-bubble loading-bubble">
                    <text>正在思考...</text>
                </view>
            </view>
        </scroll-view>

        <view class="input-panel">
            <scroll-view class="quick-scroll" scroll-x enhanced>
                <view class="quick-list">
                    <button
                        v-for="item in quickQuestions"
                        :key="item"
                        class="quick-button"
                        hover-class="quick-button--pressed"
                        @tap="useQuickQuestion(item)"
                    >
                        {{ item }}
                    </button>
                </view>
            </scroll-view>

            <view class="input-row">
                <textarea
                    v-model="inputText"
                    class="chat-input"
                    placeholder="输入你的问题"
                    placeholder-class="input-placeholder"
                    maxlength="1000"
                    auto-height
                    :show-confirm-bar="false"
                    :disabled="isLoading"
                />
                <button
                    class="send-button"
                    :disabled="!inputText.trim() || isLoading"
                    hover-class="send-button--pressed"
                    @tap="sendMessage"
                >
                    {{ isLoading ? '发送中' : '发送' }}
                </button>
            </view>
        </view>
    </view>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getStoredUser } from '@/api/auth'
import { sendChat } from '@/api/chat'

interface ChatMessage {
    id: number
    role: 'user' | 'assistant'
    content: string
}

let messageId = 1

const inputText = ref('')
const isLoading = ref(false)
const scrollTop = ref(0)
const messages = ref<ChatMessage[]>([
    {
        id: messageId++,
        role: 'assistant',
        content: '你好，我是智慧城市 AI 助手。',
    },
])

const quickQuestions = [
    '介绍一下智慧城市系统',
    '道路管理可以做什么',
    '给我一份巡查工作建议',
]

function ensureSession() {
    if (!getStoredUser()) {
        uni.reLaunch({
            url: '/pages/login/login',
        })
    }
}

async function scrollToBottom() {
    await nextTick()
    scrollTop.value += 10000
}

function useQuickQuestion(question: string) {
    if (!isLoading.value) {
        inputText.value = question
    }
}

async function sendMessage() {
    const content = inputText.value.trim()
    if (!content || isLoading.value) {
        return
    }

    messages.value.push({
        id: messageId++,
        role: 'user',
        content,
    })
    inputText.value = ''
    isLoading.value = true
    await scrollToBottom()

    try {
        const result = await sendChat(content)
        if (result.code !== 200) {
            throw new Error(result.message || '请求失败')
        }

        messages.value.push({
            id: messageId++,
            role: 'assistant',
            content: result.data?.reply || '没有收到有效回答。',
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : '请求失败'
        uni.showToast({
            title: message,
            icon: 'none',
        })
        messages.value.push({
            id: messageId++,
            role: 'assistant',
            content: '暂时无法获取回答，请稍后再试。',
        })
    } finally {
        isLoading.value = false
        await scrollToBottom()
    }
}

function clearMessages() {
    messages.value = [
        {
            id: messageId++,
            role: 'assistant',
            content: '你好，我是智慧城市 AI 助手。',
        },
    ]
    inputText.value = ''
    void scrollToBottom()
}

onLoad(() => {
    ensureSession()
})
</script>

<style>
page {
    background: #f4f8fb;
}

.page {
    display: flex;
    min-height: 100vh;
    max-height: 100vh;
    flex-direction: column;
    background: #f4f8fb;
    color: #1f2933;
}

.chat-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 62rpx 34rpx 30rpx;
    background: #143553;
    color: #ffffff;
}

.eyebrow {
    display: block;
    color: #8fd3c7;
    font-size: 19rpx;
    font-weight: 700;
    letter-spacing: 2rpx;
}

.title {
    display: block;
    margin-top: 12rpx;
    font-size: 48rpx;
    font-weight: 700;
}

.subtitle {
    display: block;
    margin-top: 12rpx;
    color: #c7d8e4;
    font-size: 23rpx;
}

.clear-button {
    width: 112rpx;
    height: 56rpx;
    margin: 0;
    padding: 0;
    border: 2rpx solid rgba(143, 211, 199, 0.5);
    border-radius: 8rpx;
    background: transparent;
    color: #8fd3c7;
    font-size: 23rpx;
    line-height: 52rpx;
}

.clear-button--pressed {
    background: rgba(143, 211, 199, 0.12);
}

.message-list {
    flex: 1;
    min-height: 0;
    box-sizing: border-box;
    padding: 26rpx 26rpx 18rpx;
}

.message-row {
    display: flex;
    align-items: flex-start;
    margin-bottom: 24rpx;
}

.message-row.user {
    flex-direction: row-reverse;
}

.avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 58rpx;
    height: 58rpx;
    border-radius: 50%;
    background: #dff7f4;
    color: #227c7a;
    font-size: 22rpx;
    font-weight: 700;
}

.message-row.user .avatar {
    background: #dbeafe;
    color: #1d4ed8;
}

.message-bubble {
    max-width: 540rpx;
    box-sizing: border-box;
    margin-left: 16rpx;
    padding: 18rpx 20rpx;
    border: 2rpx solid #e1e8f0;
    border-radius: 10rpx;
    background: #ffffff;
    color: #243b53;
    font-size: 25rpx;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
}

.message-row.user .message-bubble {
    margin-right: 16rpx;
    margin-left: 0;
    border-color: #347eea;
    background: #347eea;
    color: #ffffff;
}

.loading-bubble {
    color: #627d98;
}

.input-panel {
    padding: 18rpx 24rpx 28rpx;
    border-top: 2rpx solid #dfeaf0;
    background: #ffffff;
}

.quick-scroll {
    width: 100%;
    white-space: nowrap;
}

.quick-list {
    display: flex;
    width: max-content;
}

.quick-button {
    height: 54rpx;
    margin: 0 12rpx 0 0;
    padding: 0 18rpx;
    border: 2rpx solid #d3e1e8;
    border-radius: 8rpx;
    background: #ffffff;
    color: #526a7d;
    font-size: 22rpx;
    line-height: 50rpx;
}

.quick-button--pressed {
    background: #eef8f5;
}

.input-row {
    display: flex;
    align-items: flex-end;
    margin-top: 16rpx;
}

.chat-input {
    flex: 1;
    min-height: 76rpx;
    max-height: 190rpx;
    box-sizing: border-box;
    padding: 18rpx 20rpx;
    border: 2rpx solid #dce6ec;
    border-radius: 8rpx;
    background: #f8fafb;
    color: #263746;
    font-size: 25rpx;
    line-height: 1.5;
}

.input-placeholder {
    color: #aab6bf;
}

.send-button {
    width: 124rpx;
    height: 76rpx;
    margin: 0 0 0 14rpx;
    padding: 0;
    border-radius: 8rpx;
    background: #347eea;
    color: #ffffff;
    font-size: 24rpx;
    line-height: 76rpx;
}

.send-button--pressed {
    background: #286fda;
}

.send-button[disabled] {
    background: #9dbce7;
    color: #ffffff;
}

.clear-button::after,
.quick-button::after,
.send-button::after {
    border: 0;
}
</style>

<template>
    <section class="ai-page">
        <div class="chat-panel">
            <header class="chat-header">
                <div class="title-group">
                    <div class="title-icon">
                        <el-icon>
                            <ChatDotRound />
                        </el-icon>
                    </div>
                    <div>
                        <h1>AI 助手</h1>
                        <span>DeepSeek</span>
                    </div>
                </div>

                <el-button :icon="Delete" plain @click="clearMessages">
                    清空
                </el-button>
            </header>

            <main ref="messageListRef" class="message-list">
                <div v-for="message in messages" :key="message.id" class="message-row" :class="message.role">
                    <div class="avatar">
                        <el-icon>
                            <User v-if="message.role === 'user'" />
                            <MagicStick v-else />
                        </el-icon>
                    </div>

                    <div class="message-bubble">
                        {{ message.content }}
                    </div>
                </div>

                <div v-if="loading" class="message-row assistant">
                    <div class="avatar">
                        <el-icon>
                            <MagicStick />
                        </el-icon>
                    </div>

                    <div class="message-bubble loading-bubble">
                        正在思考...
                    </div>
                </div>
            </main>

            <footer class="chat-input-area">
                <div class="quick-list">
                    <button v-for="item in quickQuestions" :key="item" type="button" @click="useQuickQuestion(item)">
                        {{ item }}
                    </button>
                </div>

                <div class="input-row">
                    <el-input v-model="inputText" type="textarea" resize="none" :autosize="{ minRows: 2, maxRows: 5 }"
                        maxlength="1000" show-word-limit placeholder="输入你的问题" @keydown.enter="handleEnter" />

                    <el-button class="send-button" type="primary" :icon="Promotion" :loading="loading"
                        :disabled="!inputText.trim()" @click="sendMessage">
                        发送
                    </el-button>
                </div>
            </footer>
        </div>
    </section>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
    ChatDotRound,
    Delete,
    MagicStick,
    Promotion,
    User,
} from '@element-plus/icons-vue'
import { sendChat } from '@/api/chat'

interface ChatMessage {
    id: number
    role: 'user' | 'assistant'
    content: string
}

let messageId = 1

const inputText = ref('')
const loading = ref(false)
const messageListRef = ref<HTMLElement>()

const messages = ref<ChatMessage[]>([
    {
        id: messageId++,
        role: 'assistant',
        content: '你好，我是智慧城市 AI 助手。',
    },
])

const quickQuestions = [
    '介绍一下智慧城市系统',
    '推荐一下城市的景点',
    '最近城市发生了什么趣事吗',
]
//滚动条滑到底部
const scrollToBottom = async () => {
    await nextTick()

    if (!messageListRef.value) {
        return
    }

    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
}

const useQuickQuestion = (question: string) => {
    inputText.value = question
}

const handleEnter = (event: KeyboardEvent) => {
    if (event.shiftKey) {
        return
    }

    event.preventDefault()
    sendMessage()
}

const sendMessage = async () => {
    const content = inputText.value.trim()

    if (!content || loading.value) {
        return
    }

    messages.value.push({
        id: messageId++,
        role: 'user',
        content,
    })

    inputText.value = ''
    loading.value = true

    await scrollToBottom()

    try {
        const response = await sendChat(content)
        const result = response.data

        if (result.code !== 200) {
            throw new Error(result.message || '请求失败')
        }

        messages.value.push({
            id: messageId++,
            role: 'assistant',
            content: result.data?.reply || '没有收到有效回答',
        })
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : 'AI 助手请求失败'

        ElMessage.error(message)

        messages.value.push({
            id: messageId++,
            role: 'assistant',
            content: '请求失败，请稍后再试。',
        })
    } finally {
        loading.value = false
        await scrollToBottom()
    }
}

const clearMessages = () => {
    messages.value = [
        {
            id: messageId++,
            role: 'assistant',
            content: '你好，我是智慧城市 AI 助手。',
        },
    ]
}
</script>

<style scoped>
.ai-page {
    display: flex;
    height: 100%;
    min-height: 0;
    padding: 20px;
    box-sizing: border-box;
    background: #f5f7fa;
}

.chat-panel {
    display: flex;
    width: min(1080px, 100%);
    min-height: 0;
    margin: 0 auto;
    overflow: hidden;
    flex: 1;
    flex-direction: column;
    border: 1px solid #d9e2ec;
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 12px 28px rgba(16, 42, 67, 0.08);
}

.chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 18px;
    border-bottom: 1px solid #e6edf3;
    background: #ffffff;
}

.title-group {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
}

.title-icon {
    display: grid;
    width: 40px;
    height: 40px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 8px;
    background: #e6fffa;
    color: #227c7a;
    font-size: 22px;
}

.title-group h1 {
    margin: 0;
    color: #102a43;
    font-size: 20px;
    line-height: 1.2;
}

.title-group span {
    display: block;
    margin-top: 2px;
    color: #829ab1;
    font-size: 12px;
}

.message-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 22px;
    box-sizing: border-box;
    background: #f8fafc;
}

.message-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 18px;
}

.message-row.user {
    flex-direction: row-reverse;
}

.avatar {
    display: grid;
    width: 34px;
    height: 34px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 50%;
    background: #d9e2ec;
    color: #486581;
    font-size: 18px;
}

.message-row.assistant .avatar {
    background: #dff7f4;
    color: #227c7a;
}

.message-row.user .avatar {
    background: #dbeafe;
    color: #1d4ed8;
}

.message-bubble {
    max-width: min(720px, calc(100% - 58px));
    padding: 11px 13px;
    border: 1px solid #e1e8f0;
    border-radius: 8px;
    background: #ffffff;
    color: #243b53;
    font-size: 14px;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
}

.message-row.user .message-bubble {
    border-color: #2563eb;
    background: #2563eb;
    color: #ffffff;
}

.loading-bubble {
    color: #627d98;
}

.chat-input-area {
    padding: 14px 18px 18px;
    border-top: 1px solid #e6edf3;
    background: #ffffff;
}

.quick-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
}

.quick-list button {
    height: 30px;
    padding: 0 11px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    background: #ffffff;
    color: #486581;
    cursor: pointer;
    font-size: 13px;
}

.quick-list button:hover {
    border-color: #2cb1a6;
    color: #227c7a;
}

.input-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 96px;
    gap: 12px;
    align-items: end;
}

.send-button {
    height: 54px;
}

@media (max-width: 720px) {
    .ai-page {
        padding: 12px;
    }

    .chat-header {
        padding: 14px;
    }

    .message-list {
        padding: 14px;
    }

    .input-row {
        grid-template-columns: 1fr;
    }

    .send-button {
        width: 100%;
        height: 42px;
    }
}
</style>
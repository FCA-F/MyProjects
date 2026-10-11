<template>
    <view class="page">
        <view class="hero">
            <view class="hero-top">
                <view>
                    <text class="eyebrow">智慧城市</text>
                    <text class="hero-title">工作台</text>
                    <text class="hero-subtitle">欢迎使用城市管理平台</text>
                </view>
                <view class="hero-mark">
                    <text>SC</text>
                </view>
            </view>

            <view class="user-bar">
                <view class="avatar">
                    <text>{{ userInitial }}</text>
                </view>
                <view class="user-copy">
                    <text class="user-name">{{ user?.nickname || user?.username || '未登录' }}</text>
                    <text class="user-state">已登录</text>
                </view>
                <text class="logout-link" @tap="handleLogout">退出</text>
            </view>
        </view>

        <view class="content">
            <view class="section-heading">
                <view>
                    <text class="section-title">常用功能</text>
                </view>
            </view>

            <view class="road-entry" hover-class="road-entry--pressed" @tap="openRoads">
                <view class="entry-icon">
                    <text>⌁</text>
                </view>
                <view class="entry-copy">
                    <text class="entry-title">道路数据管理</text>
                    <text class="entry-subtitle">查询、搜索和维护城市道路属性</text>
                </view>
                <text class="entry-arrow">→</text>
            </view>

            <view class="road-entry ai-entry" hover-class="road-entry--pressed" @tap="openAi">
                <view class="entry-icon">
                    <text>AI</text>
                </view>
                <view class="entry-copy">
                    <text class="entry-title">AI 助手</text>
                    <text class="entry-subtitle">对话咨询与信息问答</text>
                </view>
                <text class="entry-arrow">→</text>
            </view>

            <view class="future-space"></view>
        </view>
    </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { clearStoredSession, getStoredUser, logout } from '@/api/auth'
import type { CurrentUser } from '@/api/auth'

const user = ref<CurrentUser | null>(null)

const userInitial = computed(() => {//头像
    const name = user.value?.nickname || user.value?.username || 'S'
    return name.slice(0, 1).toUpperCase()
})

function ensureSession() {
    user.value = getStoredUser()
    if (!user.value) {
        uni.reLaunch({
            url: '/pages/login/login',
        })
    }
}

function openRoads() {
    uni.navigateTo({
        url: '/pages/roads/roads',
    })
}

function openAi() {
    uni.navigateTo({
        url: '/pages/ai/ai',
    })
}

function handleLogout() {
    uni.showModal({
        title: '退出登录',
        content: '退出后需要重新登录才能查看道路数据。',
        success: (result) => {
            if (!result.confirm) {
                return
            }

            logout()
                .catch(() => undefined)
                .finally(() => {
                    clearStoredSession()
                    uni.reLaunch({
                        url: '/pages/login/login',
                    })
                })
        },
    })
}

onShow(() => {
    ensureSession()
})
</script>

<style>
page {
    background: #f4f8fb;
}

.page {
    min-height: 100vh;
    background: #f4f8fb;
    color: #1f2933;
}

.hero {
    padding: 76rpx 44rpx 34rpx;
    background: #143553;
    color: #ffffff;
}

.hero-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
}

.eyebrow,
.section-kicker {
    display: block;
    color: #8fd3c7;
    font-size: 20rpx;
    font-weight: 700;
    letter-spacing: 2rpx;
}

.hero-title {
    display: block;
    margin-top: 16rpx;
    font-size: 58rpx;
    font-weight: 700;
    line-height: 1.15;
}

.hero-subtitle {
    display: block;
    max-width: 500rpx;
    margin-top: 16rpx;
    color: #c7d8e4;
    font-size: 25rpx;
    line-height: 1.5;
}

.hero-mark {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 94rpx;
    height: 94rpx;
    border: 2rpx solid #8fd3c7;
    border-radius: 24rpx;
    color: #8fd3c7;
    font-size: 26rpx;
    font-weight: 700;
    letter-spacing: 1rpx;
}

.user-bar {
    display: flex;
    align-items: center;
    margin-top: 58rpx;
    padding-top: 26rpx;
    border-top: 2rpx solid rgba(199, 216, 228, 0.18);
}

.avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    background: #e17c5f;
    color: #ffffff;
    font-size: 28rpx;
    font-weight: 700;
}

.user-copy {
    display: flex;
    flex: 1;
    flex-direction: column;
    margin-left: 16rpx;
}

.user-name {
    font-size: 27rpx;
    font-weight: 700;
}

.user-state {
    margin-top: 6rpx;
    color: #b5cbd8;
    font-size: 21rpx;
}

.logout-link {
    flex: 0 0 auto;
    padding: 12rpx 0 12rpx 24rpx;
    color: #b5cbd8;
    font-size: 23rpx;
}

.content {
    padding: 34rpx 32rpx 56rpx;
}

.section-title {
    display: block;
    color: #1c3d5a;
    font-size: 38rpx;
    font-weight: 700;
}

.road-entry {
    display: flex;
    align-items: center;
    margin-top: 28rpx;
    padding: 30rpx 26rpx;
    border: 2rpx solid #cce4e0;
    border-radius: 12rpx;
    background: #eef8f5;
    box-shadow: 0 12rpx 28rpx rgba(28, 61, 90, 0.06);
}

.road-entry--pressed {
    background: #e0f1ec;
}

.ai-entry {
    background: #f4f7ff;
    border-color: #d6e0fb;
}

.ai-entry.road-entry--pressed {
    background: #e8eefc;
}

.ai-entry .entry-icon {
    background: #347eea;
    font-size: 26rpx;
    font-weight: 700;
}

.entry-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 86rpx;
    height: 86rpx;
    border-radius: 14rpx;
    background: #57a99d;
    color: #ffffff;
    font-size: 58rpx;
}

.entry-copy {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    margin-left: 20rpx;
}

.entry-title {
    color: #1c3d5a;
    font-size: 30rpx;
    font-weight: 700;
}

.entry-subtitle {
    margin-top: 8rpx;
    color: #6d8a8b;
    font-size: 22rpx;
}

.entry-arrow {
    flex: 0 0 auto;
    margin-left: 12rpx;
    color: #4b958b;
    font-size: 40rpx;
}

.future-space {
    min-height: 240rpx;
}
</style>

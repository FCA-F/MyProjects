<template>
    <view class="page">
        <view class="top-glow"></view>
        <view class="brand">
            <view class="brand-mark">
                <text class="brand-mark-line"></text>
                <text class="brand-mark-dot"></text>
            </view>
            <text class="brand-name">智慧城市</text>
            <text class="brand-caption">城市管理平台</text>
        </view>

        <view class="login-card">
            <text class="card-title">账号登录</text>
            <text class="card-subtitle">请输入账号和密码</text>

            <view class="form-item">
                <text class="form-label">用户名</text>
                <input
                    v-model="username"
                    class="form-input"
                    placeholder="请输入用户名"
                    placeholder-class="input-placeholder"
                    maxlength="40"
                    confirm-type="next"
                    @confirm="focusPassword"
                />
            </view>

            <view class="form-item">
                <text class="form-label">密码</text>
                <input
                    v-model="password"
                    class="form-input"
                    type="password"
                    placeholder="请输入密码"
                    placeholder-class="input-placeholder"
                    maxlength="80"
                    confirm-type="done"
                    @confirm="handleLogin"
                />
            </view>

            <button
                class="login-button"
                :disabled="isLoading"
                hover-class="login-button--pressed"
                @tap="handleLogin"
            >
                {{ isLoading ? '登录中...' : '登录' }}
            </button>
        </view>
    </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { hasSession, login, saveSession } from '@/api/auth'
import { ref } from 'vue'

const username = ref('')
const password = ref('')
const isLoading = ref(false)

function focusPassword() {
    // 微信小程序中使用 confirm-type 让用户自然进入密码框。
}

function handleLogin() {
    if (isLoading.value) {
        return
    }

    if (!username.value.trim() || !password.value) {
        uni.showToast({
            title: '请输入用户名和密码',
            icon: 'none',
        })
        return
    }

    isLoading.value = true
    login(username.value.trim(), password.value)
        .then((result) => {
            if (result.code !== 200 || !result.data) {
                throw new Error(result.message || '登录失败')
            }

            const user = saveSession(result.data)
            uni.showToast({
                title: `欢迎，${user.nickname || user.username}`,
                icon: 'success',
            })
            setTimeout(() => {
                uni.reLaunch({
                    url: '/pages/home/home',
                })
            }, 350)
        })
        .catch((error: Error) => {
            uni.showToast({
                title: error.message || '登录失败',
                icon: 'none',
            })
        })
        .finally(() => {
            isLoading.value = false
        })
}

onLoad(() => {
    if (hasSession()) {
        uni.reLaunch({
            url: '/pages/home/home',
        })
    }
})
</script>

<style>
page {
    background: #143553;
}

.page {
    position: relative;
    display: flex;
    min-height: 100vh;
    box-sizing: border-box;
    flex-direction: column;
    align-items: center;
    overflow: hidden;
    padding: 118rpx 42rpx 48rpx;
    background:
        linear-gradient(145deg, rgba(34, 90, 110, 0.26), transparent 48%),
        #143553;
    color: #ffffff;
}

.top-glow {
    position: absolute;
    top: -160rpx;
    right: -100rpx;
    width: 460rpx;
    height: 460rpx;
    border: 2rpx solid rgba(143, 211, 199, 0.15);
    border-radius: 50%;
}

.top-glow::after {
    position: absolute;
    top: 84rpx;
    right: 84rpx;
    width: 280rpx;
    height: 280rpx;
    border: 2rpx solid rgba(143, 211, 199, 0.12);
    border-radius: 50%;
    content: '';
}

.brand {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.brand-mark {
    position: relative;
    width: 92rpx;
    height: 92rpx;
    margin-bottom: 24rpx;
    border: 2rpx solid #8fd3c7;
    border-radius: 24rpx;
}

.brand-mark-line {
    position: absolute;
    top: 20rpx;
    left: 28rpx;
    width: 30rpx;
    height: 48rpx;
    border-left: 4rpx solid #8fd3c7;
    border-bottom: 4rpx solid #8fd3c7;
    transform: skewY(-30deg);
}

.brand-mark-dot {
    position: absolute;
    right: 17rpx;
    bottom: 18rpx;
    width: 12rpx;
    height: 12rpx;
    border-radius: 50%;
    background: #e17c5f;
}

.brand-name {
    color: #8fd3c7;
    font-size: 30rpx;
    font-weight: 700;
    letter-spacing: 2rpx;
}

.brand-caption {
    margin-top: 12rpx;
    color: #c7d8e4;
    font-size: 24rpx;
}

.login-card {
    position: relative;
    width: 100%;
    box-sizing: border-box;
    margin-top: 72rpx;
    padding: 42rpx 34rpx 34rpx;
    border-radius: 14rpx;
    background: #ffffff;
    box-shadow: 0 24rpx 60rpx rgba(4, 23, 42, 0.24);
    color: #1f2933;
}

.card-title {
    display: block;
    color: #1c3d5a;
    font-size: 42rpx;
    font-weight: 700;
}

.card-subtitle {
    display: block;
    margin-top: 12rpx;
    color: #8a98a6;
    font-size: 23rpx;
    line-height: 1.5;
}

.form-item {
    margin-top: 34rpx;
}

.form-item + .form-item {
    margin-top: 22rpx;
}

.form-label {
    display: block;
    margin-bottom: 12rpx;
    color: #526575;
    font-size: 24rpx;
    font-weight: 700;
}

.form-input {
    width: 100%;
    height: 84rpx;
    box-sizing: border-box;
    padding: 0 24rpx;
    border: 2rpx solid #dce6ec;
    border-radius: 8rpx;
    background: #f8fafb;
    color: #263746;
    font-size: 28rpx;
}

.input-placeholder {
    color: #aab6bf;
}

.login-button {
    width: 100%;
    height: 84rpx;
    margin: 34rpx 0 0;
    padding: 0;
    border-radius: 8rpx;
    background: #e17c5f;
    color: #ffffff;
    font-size: 28rpx;
    font-weight: 700;
    line-height: 84rpx;
}

.login-button--pressed {
    background: #c9684e;
}

.login-button[disabled] {
    background: #e8b1a2;
    color: #ffffff;
}

.login-button::after {
    border: 0;
}

</style>

<template>
    <div class="register-page">
        <div class="register-card">
            <h2 class="register-title">
                注册智慧城市系统
            </h2>

            <el-form ref="registerFormRef" :model="registerForm" :rules="registerRules" label-width="90px"
                @submit.prevent>
                <el-form-item label="用户名" prop="username">
                    <el-input v-model="registerForm.username" placeholder="请输入用户名" clearable />
                </el-form-item>

                <el-form-item label="昵称" prop="nickname">
                    <el-input v-model="registerForm.nickname" placeholder="请输入昵称，可不填" clearable />
                </el-form-item>

                <el-form-item label="密码" prop="password">
                    <el-input v-model="registerForm.password" type="password" placeholder="请输入密码" show-password
                        clearable />
                </el-form-item>

                <el-form-item label="确认密码" prop="confirmPassword">
                    <el-input v-model="registerForm.confirmPassword" type="password" placeholder="请再次输入密码" show-password
                        clearable />
                </el-form-item>

                <el-form-item>
                    <el-button type="primary" class="register-btn" :loading="loading" @click="handleRegister">
                        注册
                    </el-button>
                </el-form-item>

                <div class="login-link">
                    已有账号？
                    <el-button link type="primary" @click="goLogin">
                        返回登录
                    </el-button>
                </div>
            </el-form>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type {
    FormInstance,
    FormRules,
} from 'element-plus'
import { ElMessage } from 'element-plus'

import { register } from '@/api/auth'

const router = useRouter()

const loading = ref(false)
const registerFormRef = ref<FormInstance>()

const registerForm = ref({
    username: '',
    nickname: '',
    password: '',
    confirmPassword: '',
})

const validateConfirmPassword = (
    _rule: unknown,
    value: string,
    callback: (error?: Error) => void,
) => {
    if (!value) {
        callback(new Error('请确认密码'))
    } else if (value !== registerForm.value.password) {
        callback(new Error('两次密码不一致'))
    } else {
        callback()
    }
}

const registerRules: FormRules = {
    username: [
        {
            required: true,
            message: '请输入用户名',
            trigger: 'blur',
        },
        {
            min: 3,
            max: 20,
            message: '用户名长度为3到20位',
            trigger: 'blur',
        },
    ],
    password: [
        {
            required: true,
            message: '请输入密码',
            trigger: 'blur',
        },
        {
            min: 6,
            max: 20,
            message: '密码长度为6到20位',
            trigger: 'blur',
        },
    ],
    confirmPassword: [
        {
            validator: validateConfirmPassword,
            trigger: 'blur',
        },
    ],
}

const handleRegister = async () => {
    if (!registerFormRef.value) {
        return
    }

    const valid = await registerFormRef.value.validate()

    if (!valid) {
        return
    }

    loading.value = true

    try {
        const response = await register({
            username: registerForm.value.username,
            nickname: registerForm.value.nickname,
            password: registerForm.value.password,
            confirmPassword: registerForm.value.confirmPassword,
        })

        const result = response.data

        if (result.code !== 200) {
            ElMessage.error(result.message || '注册失败')
            return
        }

        ElMessage.success('注册成功，请登录')

        await router.replace('/login')
    } catch (error: any) {
        const message =
            error.response?.data?.message ||
            error.message ||
            '注册失败'

        ElMessage.error(message)
    } finally {
        loading.value = false
    }
}

const goLogin = () => {
    router.push('/login')
}
</script>

<style scoped>
.register-page {
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-image: url('/data/登录界面背景.png');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
}

.register-card {
    width: 420px;
    padding: 36px 40px;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.register-title {
    margin: 0 0 28px;
    text-align: center;
    color: #333333;
}

.register-btn {
    width: 100%;
}

.login-link {
    text-align: center;
    color: #666666;
}
</style>